import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as Stream from "effect/Stream";
import { afterEach, beforeEach, vi } from "vite-plus/test";
import * as DesktopShellEnvironment from "../shell/DesktopShellEnvironment.ts";
import * as SafeGitHubUpdates from "./SafeGitHubUpdates.ts";
import { makeHarness } from "./updatesTestHarness.ts";

const commands = vi.hoisted(() => ({
  access: vi.fn(),
  execFile: vi.fn(),
}));
vi.mock("node:fs/promises", () => ({ access: commands.access }));
vi.mock("node:child_process", () => ({ execFile: commands.execFile }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
beforeEach(() => {
  vi.stubEnv("PATH", "/synthetic/bin");
  commands.access.mockResolvedValue(undefined);
});

function credentialCheck(discover = Effect.succeed(true)) {
  const harness = makeHarness();
  const shellLayer = Layer.succeed(DesktopShellEnvironment.DesktopShellEnvironment, {
    awaitDiscovery: discover,
    installIntoProcess: Effect.succeed(true),
    updates: Stream.empty,
  });
  const layer = SafeGitHubUpdates.layer.pipe(
    Layer.provide(shellLayer),
    Layer.provide(harness.layer),
  );
  const check = Effect.gen(function* () {
    const updates = yield* SafeGitHubUpdates.SafeGitHubUpdates;
    yield* updates.check;
  }).pipe(Effect.scoped, Effect.provide(layer));
  return { harness, check };
}

function returnCredential(token: string) {
  commands.execFile.mockImplementation((_file, _args, _options, callback) => {
    callback(null, token);
    return { stdin: { end: vi.fn() } };
  });
}

describe("safe GitHub credential checks", () => {
  it.effect(
    "should wait for shell discovery and use the stored login without changing inherited token variables",
    () => {
      vi.stubEnv("GH_TOKEN", "FAKE_INHERITED_GH");
      vi.stubEnv("GITHUB_TOKEN", "FAKE_INHERITED_GITHUB");
      returnCredential("  FAKE_STORED_LOGIN\n");
      const discovery = Effect.sync(() => {
        expect(commands.execFile).not.toHaveBeenCalled();
        vi.stubEnv("PATH", "/discovered/bin");
        return true;
      });
      const { harness, check } = credentialCheck(discovery);

      return check.pipe(
        Effect.andThen(
          Effect.sync(() => {
            expect(commands.execFile).toHaveBeenCalledWith(
              "/discovered/bin/gh",
              ["auth", "token", "--hostname", "github.com"],
              expect.objectContaining({ timeout: 5000, killSignal: "SIGKILL", maxBuffer: 16384 }),
              expect.any(Function),
            );
            const childEnvironment = commands.execFile.mock.calls[0]![2].env;
            expect(childEnvironment.GH_TOKEN).toBeUndefined();
            expect(childEnvironment.GITHUB_TOKEN).toBeUndefined();
            expect(process.env.GH_TOKEN).toBe("FAKE_INHERITED_GH");
            expect(process.env.GITHUB_TOKEN).toBe("FAKE_INHERITED_GITHUB");
            expect(harness.feedUrls()).toEqual([
              {
                provider: "github",
                owner: "rakutenanalytics",
                repo: "t3code",
                channel: "latest",
                token: "FAKE_STORED_LOGIN",
              },
            ]);
            expect(harness.checkCount()).toBe(1);
          }),
        ),
      );
    },
  );

  it.effect.each(["missing", "not logged in", "timeout", "empty"] as const)(
    "should require login without checking a feed or logging credentials when gh is [%s]",
    (failure) => {
      if (failure === "missing") commands.access.mockRejectedValue(new Error("ENOENT"));
      if (failure === "empty") returnCredential(" \n");
      if (failure === "not logged in" || failure === "timeout") {
        commands.execFile.mockImplementation((_file, _args, _options, callback) => {
          callback(new Error(`FAKE_SECRET ${failure}`), "FAKE_STDOUT_SECRET", "FAKE_STDERR_SECRET");
          return { stdin: { end: vi.fn() } };
        });
      }
      const messages: unknown[] = [];
      const logger = Logger.make((options) => {
        messages.push(options.message);
      });
      const { harness, check } = credentialCheck();

      return check.pipe(
        Effect.provide(Logger.layer([logger])),
        Effect.flip,
        Effect.andThen((error) =>
          Effect.sync(() => {
            expect(error._tag).toBe("GitHubUpdateLoginRequiredError");
            expect(error.message).toBe(
              "GitHub CLI login required to check for updates. Run: gh auth login --hostname github.com",
            );
            expect(harness.feedUrls()).toEqual([]);
            expect(harness.checkCount()).toBe(0);
            expect(JSON.stringify(messages)).not.toContain("FAKE_");
            if (failure === "missing") expect(commands.execFile).not.toHaveBeenCalled();
          }),
        ),
      );
    },
  );
});
