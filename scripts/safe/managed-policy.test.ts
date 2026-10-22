// @effect-diagnostics nodeBuiltinImport:off - Build-loader tests use isolated policy files.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { ManagedCapability } from "@t3tools/contracts";
import { createManagedPolicy, managedPolicy } from "@t3tools/shared/managedPolicy";
import { loadBakedManagedPolicy } from "../lib/managed-policy.ts";

const temporaryDirectories: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  for (const directory of temporaryDirectories.splice(0))
    NodeFS.rmSync(directory, { recursive: true });
});

function isolatedPolicyFile() {
  const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3safe-policy-"));
  temporaryDirectories.push(directory);
  return NodeURL.pathToFileURL(NodePath.join(directory, "managed-policy.json"));
}

describe("managed capability policy", () => {
  it("should deny every capability not listed in allow", () => {
    const policy = createManagedPolicy({ policy: { allow: ["remoteAccess.network"] } });

    const decisions = ManagedCapability.literals.map((capability) => [
      capability,
      policy.allows(capability),
    ]);

    expect(decisions).toEqual([
      ["productAnalytics", false],
      ["t3Connect", false],
      ["desktopAutoUpdate", false],
      ["remoteAccess.network", true],
      ["telemetryExport", false],
      ["providerFeedback", false],
      ["upstreamUpdate", false],
      ["remoteContent", false],
      ["providerMetadata", false],
      ["providerTelemetry", false],
    ]);
  });

  it("should preserve the raw helper's permissive null contract when the build loader returns null", () => {
    const missingFile = isolatedPolicyFile();

    const policy = createManagedPolicy({ policy: loadBakedManagedPolicy(missingFile) });

    expect(ManagedCapability.literals.every((capability) => policy.allows(capability))).toBe(true);
  });

  it("should fail the build when managed-policy.json names an unknown capability", () => {
    const policyFile = isolatedPolicyFile();
    NodeFS.writeFileSync(policyFile, JSON.stringify({ allow: ["unknownCapability"] }));

    const loadBuildInput = () => loadBakedManagedPolicy(policyFile);

    expect(loadBuildInput).toThrow();
  });

  it("should keep a denied capability denied when T3CODE_* env overrides try to enable it", async () => {
    vi.stubEnv("T3CODE_MANAGED_POLICY", '{"allow":["t3Connect"]}');
    vi.stubEnv("T3CODE_MANAGED_POLICY_PATH", "/tmp/unmanaged-policy.json");
    vi.stubEnv("T3CODE_TELEMETRY_ENABLED", "true");
    vi.stubEnv("T3CODE_DISABLE_AUTO_UPDATE", "false");
    vi.resetModules();

    const { managedPolicy: reloaded } = await import("@t3tools/shared/managedPolicy");

    expect(reloaded.policy).toEqual(managedPolicy.policy);
    expect(reloaded.allows("t3Connect")).toBe(false);
    expect(reloaded.allows("productAnalytics")).toBe(false);
    expect(reloaded.allows("desktopAutoUpdate")).toBe(false);
  });
});
