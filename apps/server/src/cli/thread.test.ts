import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { assert, it } from "@effect/vitest";
import { RunId, ThreadId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as NetService from "@t3tools/shared/Net";
import { Command } from "effect/cli";
import { vi } from "vite-plus/test";

import { readLatestMessages, type ThreadTools, titleFromMessage, waitForRun } from "./thread.ts";
import { cli } from "../binCli.ts";
import * as ServerConfig from "../config.ts";
import * as RuntimeState from "../serverRuntimeState.ts";
import * as McpBridge from "../mcp/AcpMcpStdioBridge.ts";
import { ThreadServerNotRunningError } from "./thread.ts";

const threadId = ThreadId.make("thread-1");
const runId = RunId.make("run-1");

it.effect(
  "thread list rejects stale server state before opening an authenticated MCP connection",
  () =>
    Effect.gen(function* () {
      using _process = vi.spyOn(RuntimeState, "isProcessAlive").mockReturnValue(false);
      using transport = vi
        .spyOn(McpBridge, "mcpToolSession")
        .mockReturnValue(Effect.die("authenticated connection escaped the stale-server check"));
      const fs = yield* FileSystem.FileSystem;
      const baseDir = yield* fs.makeTempDirectoryScoped({ prefix: "t3-thread-stale-server-" });
      const paths = yield* ServerConfig.deriveServerPaths(baseDir, undefined);
      yield* fs.makeDirectory(paths.stateDir, { recursive: true });
      const state = yield* RuntimeState.makePersistedServerRuntimeState({
        config: { host: "127.0.0.1", devUrl: undefined },
        port: 3773,
      });
      yield* RuntimeState.persistServerRuntimeState({ path: paths.serverRuntimeStatePath, state });

      const error = yield* Command.runWith(cli, { version: "0.0.0" })([
        "thread",
        "list",
        "--base-dir",
        baseDir,
      ]).pipe(Effect.flip);

      assert.instanceOf(error, ThreadServerNotRunningError);
      assert.strictEqual(transport.mock.calls.length, 0);
    }).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer, NetService.layer))),
);

/** Answers each tool call with the next scripted response for that tool. */
const scriptedTools = (script: Record<string, Array<unknown>>) => {
  const calls: Array<{ readonly tool: string; readonly args: unknown }> = [];
  const call = ((tool: string, args: unknown) => {
    calls.push({ tool, args });
    const next = script[tool]?.shift();
    return next === undefined ? Effect.die(`unscripted ${tool} call`) : Effect.succeed(next);
  }) as ThreadTools["call"];
  return { tools: { call } satisfies ThreadTools, calls };
};

it.effect("--wait follows the sent run to its continuation's terminal status", () =>
  Effect.gen(function* () {
    const continuation = RunId.make("run-2");
    const { tools, calls } = scriptedTools({
      t3_thread_wait: [
        { threadId, runId, status: "running", timedOut: true },
        { threadId, runId: continuation, status: "failed", timedOut: false },
      ],
      t3_thread_read: [{ thread: { pendingRequestCount: 0 } }],
    });

    const outcome = yield* waitForRun(tools, threadId, runId);

    assert.deepStrictEqual(outcome, { type: "ended", runId: continuation, status: "failed" });
    assert.deepStrictEqual(
      calls.filter((entry) => entry.tool === "t3_thread_wait").map((entry) => entry.args),
      [
        { threadId, runId, timeoutMs: 15_000 },
        { threadId, runId, timeoutMs: 15_000 },
      ],
    );
  }),
);

it.effect("--wait stops when the thread waits for an answer instead of polling forever", () =>
  Effect.gen(function* () {
    const { tools } = scriptedTools({
      t3_thread_wait: [
        { threadId, runId, status: "queued", timedOut: true },
        { threadId, runId, status: "queued", timedOut: true },
      ],
      t3_thread_read: [{ thread: { pendingRequestCount: 1 } }],
    });

    assert.deepStrictEqual(yield* waitForRun(tools, threadId, runId), { type: "needs_input" });
  }),
);

it.effect("--wait reports its run's result when a later run is the one waiting", () =>
  Effect.gen(function* () {
    const { tools } = scriptedTools({
      t3_thread_wait: [
        { threadId, runId, status: "running", timedOut: true },
        { threadId, runId, status: "completed", timedOut: false },
      ],
      t3_thread_read: [{ thread: { pendingRequestCount: 1 } }],
    });

    assert.deepStrictEqual(yield* waitForRun(tools, threadId, runId), {
      type: "ended",
      runId,
      status: "completed",
    });
  }),
);

/** Serves t3_thread_read pages the way the server does: positions count every item. */
const timelineTools = (types: ReadonlyArray<string>) => {
  const items = types.map((type, position) => ({ position, itemId: `item-${position}`, type }));
  const served: Array<number> = [];
  const call = ((_tool: string, input: unknown) => {
    const args = input as { readonly afterPosition?: number; readonly limit: number };
    // Scanning one match past the page keeps reads of huge fixtures linear.
    const matching: typeof items = [];
    for (let position = (args.afterPosition ?? -1) + 1; position < items.length; position++) {
      const item = items[position]!;
      if (["user_message", "assistant_message", "proposed_plan"].includes(item.type)) {
        matching.push(item);
        if (matching.length > args.limit) break;
      }
    }
    const page = matching.slice(0, args.limit);
    served.push(page.length);
    return Effect.succeed({
      thread: { itemCount: items.length },
      items: page,
      nextPosition: page.at(-1)?.position ?? null,
      hasMore: matching.length > page.length,
    });
  }) as ThreadTools["call"];
  const latest = (count: number) =>
    items
      .filter((item) => item.type === "user_message" || item.type === "assistant_message")
      .slice(-count)
      .map((item) => item.itemId);
  return { tools: { call } satisfies ThreadTools, served, latest };
};

const tail = (tools: number) => [...Array<string>(tools).fill("tool_call"), "assistant_message"];

it.effect("show reads the end of a long thread, not its whole history", () =>
  Effect.gen(function* () {
    const { tools, served, latest } = timelineTools([
      ...Array.from({ length: 1000 }, (_, index) =>
        index % 2 === 0 ? "user_message" : "assistant_message",
      ),
      ...Array.from({ length: 10 }, () => tail(30)).flat(),
      "proposed_plan",
    ]);

    const { messages } = yield* readLatestMessages(tools, threadId, 10);

    assert.deepStrictEqual(
      messages.map((item) => item.itemId),
      latest(10),
    );
    assert.isBelow(
      served.reduce((sum, count) => sum + count, 0),
      100,
    );
  }),
);

it.effect("show widens back to the first item when the thread has fewer messages", () =>
  Effect.gen(function* () {
    const { tools, latest } = timelineTools([
      "user_message",
      ...Array.from({ length: 4 }, () => tail(150)).flat(),
    ]);

    const { messages } = yield* readLatestMessages(tools, threadId, 10);

    assert.deepStrictEqual(
      messages.map((item) => item.itemId),
      latest(10),
    );
    assert.lengthOf(messages, 5);
  }),
);

it.effect("show returns a --messages count larger than one call can spread", () =>
  Effect.gen(function* () {
    const { tools, latest } = timelineTools(Array<string>(200_000).fill("assistant_message"));

    const { messages } = yield* readLatestMessages(tools, threadId, 200_000);

    assert.deepStrictEqual(
      messages.map((item) => item.itemId),
      latest(200_000),
    );
  }),
);

it("titles from a long first line without splitting an emoji", () => {
  const title = titleFromMessage(`${"a".repeat(78)}😀 and the rest of a long first line`);
  assert.strictEqual(title, `${"a".repeat(78)}…`);
});
