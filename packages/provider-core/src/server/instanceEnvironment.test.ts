import { managedPolicy } from "@t3tools/shared/managedPolicy";
import { afterEach, beforeEach, vi } from "vite-plus/test";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Path from "effect/Path";
import * as HostProcess from "@t3tools/shared/HostProcess";

import { mergeProviderInstanceEnvironment } from "./instanceEnvironment.ts";

beforeEach(() => {
  vi.spyOn(managedPolicy, "allows").mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());

describe("mergeProviderInstanceEnvironment", () => {
  it.effect.each([
    { value: "~/.account", tail: ".account" },
    { value: "~\\.account\\work", tail: ".account\\work" },
  ])("expands configured provider homes set to $value", ({ value, tail }) =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const baseEnv = {
        CODEX_HOME: "~/.inherited-codex",
        CLAUDE_CONFIG_DIR: "~/.inherited-claude",
      };
      const environment = yield* mergeProviderInstanceEnvironment(
        [
          { name: "CODEX_HOME", value, sensitive: false },
          { name: "CLAUDE_CONFIG_DIR", value, sensitive: false },
          { name: "CUSTOM_VALUE", value, sensitive: false },
        ],
        baseEnv,
      );

      expect(environment).toEqual({
        CODEX_HOME: path.join("/home/ada", tail),
        CLAUDE_CONFIG_DIR: path.join("/home/ada", tail),
        CUSTOM_VALUE: value,
      });
      expect(baseEnv).toEqual({
        CODEX_HOME: "~/.inherited-codex",
        CLAUDE_CONFIG_DIR: "~/.inherited-claude",
      });
    }).pipe(
      Effect.provideService(HostProcess.HomeDirectory, "/home/ada"),
      Effect.provide(NodeServices.layer),
    ),
  );

  it.effect("leaves inherited provider homes unchanged", () =>
    Effect.gen(function* () {
      const baseEnv = { CODEX_HOME: "~/.codex", CLAUDE_CONFIG_DIR: "~\\.claude" };

      expect(
        yield* mergeProviderInstanceEnvironment(
          [{ name: "CUSTOM_VALUE", value: "~/.custom", sensitive: false }],
          baseEnv,
        ),
      ).toEqual({ ...baseEnv, CUSTOM_VALUE: "~/.custom" });
    }),
  );

  it.effect("overrides inherited environment values and preserves empty strings", () =>
    Effect.gen(function* () {
      expect(
        yield* mergeProviderInstanceEnvironment(
          [
            { name: "OPENROUTER_API_KEY", value: "sk-or-test", sensitive: true },
            { name: "ANTHROPIC_API_KEY", value: "", sensitive: false },
          ],
          { ANTHROPIC_API_KEY: "inherited", PATH: "/bin" },
        ),
      ).toMatchObject({
        OPENROUTER_API_KEY: "sk-or-test",
        ANTHROPIC_API_KEY: "",
        PATH: "/bin",
      });
    }),
  );
});

it.effect(
  "should force telemetry opt-outs to 1 and preserve ANTHROPIC_API_KEY when instance settings try to enable telemetry",
  () =>
    Effect.gen(function* () {
      vi.mocked(managedPolicy.allows).mockReturnValue(false);
      const baseEnv = {
        ANTHROPIC_API_KEY: "fixed-auth-key",
        PATH: "/bin",
        OTEL_EXPORTER_OTLP_ENDPOINT: "https://collector.example",
      };

      const environment = yield* mergeProviderInstanceEnvironment(
        [
          { name: "DISABLE_TELEMETRY", value: "0", sensitive: false },
          { name: "DO_NOT_TRACK", value: "0", sensitive: false },
        ],
        baseEnv,
      );

      expect(environment).toEqual({
        ANTHROPIC_API_KEY: "fixed-auth-key",
        PATH: "/bin",
        DO_NOT_TRACK: "1",
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
        DISABLE_TELEMETRY: "1",
        DISABLE_ERROR_REPORTING: "1",
        OTEL_SDK_DISABLED: "true",
      });
      expect(baseEnv.OTEL_EXPORTER_OTLP_ENDPOINT).toBe("https://collector.example");
    }).pipe(Effect.provideService(HostProcess.HomeDirectory, "/home/ada")),
);
