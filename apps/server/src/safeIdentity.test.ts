// @effect-diagnostics nodeBuiltinImport:off - Reads the reviewed identity file the bundlers bake.
import * as NodeFS from "node:fs";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { it as effectIt } from "@effect/vitest";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const reviewedIdentity = JSON.parse(
  NodeFS.readFileSync(new URL("../../../security/app-identity.json", import.meta.url), "utf8"),
);

// The bundler replaces this constant at build time; stubbing it before import is the same seam.
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("__T3CODE_APP_IDENTITY__", reviewedIdentity);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("safe-bound server", () => {
  effectIt.effect("should resolve the default base dir to [/Users/alice/.t3-safe]", () =>
    Effect.gen(function* () {
      const { resolveBaseDir } = yield* Effect.promise(() => import("./os-jank.ts"));

      const baseDir = yield* resolveBaseDir(undefined);

      expect(baseDir).toBe("/Users/alice/.t3-safe");
    }).pipe(
      Effect.provideService(HostProcess.HomeDirectory, "/Users/alice"),
      Effect.provide(NodeServices.layer),
    ),
  );

  it("should start its default port at [3873]", async () => {
    const { DEFAULT_PORT } = await import("./config.ts");

    expect(DEFAULT_PORT).toBe(3873);
  });
});
