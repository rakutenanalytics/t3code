import { describe, expect, it } from "vite-plus/test";
import { upstreamAppIdentity } from "@t3tools/shared/appIdentity";
import { loadBakedAppIdentity } from "../lib/app-identity.ts";

const safeIdentity = loadBakedAppIdentity();

describe("security/app-identity.json", () => {
  it("should differ from the upstream identity in every field that can make two installs share state", () => {
    expect(safeIdentity.homeDirName).not.toBe(upstreamAppIdentity.homeDirName);
    expect(safeIdentity.homeEnvVar).not.toBe(upstreamAppIdentity.homeEnvVar);
    expect(safeIdentity.appId).not.toBe(upstreamAppIdentity.appId);
    expect(safeIdentity.userDataDirName).not.toBe(upstreamAppIdentity.userDataDirName);
    expect(safeIdentity.cliCommand).not.toBe(upstreamAppIdentity.cliCommand);
    expect(safeIdentity.urlScheme).not.toBe(upstreamAppIdentity.urlScheme);
    expect(safeIdentity.defaultPort).not.toBe(upstreamAppIdentity.defaultPort);
  });

  it("should list no legacy profiles to import", () => {
    expect(safeIdentity.legacyProfileNames).toEqual([]);
  });

  it("should start its port range at [3873], past the upstream first port [3773]", () => {
    expect(safeIdentity.defaultPort).toBe(3873);
  });
});
