// @effect-diagnostics nodeBuiltinImport:off - Reads the reviewed identity file the bundlers bake.
import * as NodeFS from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const safeIdentityFile = new URL("../../../security/app-identity.json", import.meta.url);

beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("app identity", () => {
  it("should open [t3safe://new] prompt links when the safe identity is baked", async () => {
    vi.stubGlobal(
      "__T3CODE_APP_IDENTITY__",
      JSON.parse(NodeFS.readFileSync(safeIdentityFile, "utf8")),
    );
    const { promptLinkAppPath, promptLinkDeepLink } = await import("./promptLinks.ts");

    const appLink = promptLinkDeepLink("/new?prompt=hello");

    expect(appLink).toBe("t3safe://new?prompt=hello");
    expect(promptLinkAppPath(appLink)).toBe("/new?prompt=hello");
  });

  it("should default to home dir [.t3], env var [T3CODE_HOME], CLI [t3], scheme [t3code] and port [3773] when no identity is baked", async () => {
    // Target
    const { appIdentity } = await import("./appIdentity.ts");

    // Assertions
    expect(appIdentity).toMatchObject({
      homeDirName: ".t3",
      homeEnvVar: "T3CODE_HOME",
      cliCommand: "t3",
      urlScheme: "t3code",
      defaultPort: 3773,
    });
  });

  it("should use home dir [.t3-safe], env var [T3SAFE_HOME], CLI [t3safe], scheme [t3safe] and port [3873] when the reviewed identity is baked", async () => {
    // Setup
    vi.stubGlobal(
      "__T3CODE_APP_IDENTITY__",
      JSON.parse(NodeFS.readFileSync(safeIdentityFile, "utf8")),
    );

    // Target
    const { appIdentity } = await import("./appIdentity.ts");

    // Assertions
    expect(appIdentity).toMatchObject({
      homeDirName: ".t3-safe",
      homeEnvVar: "T3SAFE_HOME",
      cliCommand: "t3safe",
      urlScheme: "t3safe",
      defaultPort: 3873,
    });
  });

  it("should create and open [t3safe://pair] links when the safe identity is baked", async () => {
    vi.stubGlobal(
      "__T3CODE_APP_IDENTITY__",
      JSON.parse(NodeFS.readFileSync(safeIdentityFile, "utf8")),
    );
    const pairingUrl = "https://example.test/pair#token=fixed-token";
    const { buildPairingAppLink, readPairingAppLink } = await import("./remote.ts");

    const appLink = buildPairingAppLink(pairingUrl);

    expect(appLink).toBe(`t3safe://pair?pairingUrl=${encodeURIComponent(pairingUrl)}`);
    expect(readPairingAppLink(appLink)).toBe(pairingUrl);
  });
});
