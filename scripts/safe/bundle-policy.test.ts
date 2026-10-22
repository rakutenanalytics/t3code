// @effect-diagnostics nodeBuiltinImport:off - Bundle fixtures never execute application code.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { bundlePolicyViolations } from "./bundle-policy.ts";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    NodeFS.rmSync(directory, { recursive: true, force: true });
});

function createBundleFixture(files: Record<string, string>) {
  const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3safe-bundle-"));
  directories.push(directory);
  const entries = {
    "apps/desktop/dist-electron/main.cjs": 'const policy = {allow:["remoteAccess.network"]};',
    "apps/desktop/dist-electron/preload.cjs": 'const policy = {allow:["remoteAccess.network"]};',
    "apps/server/dist/bin.mjs": 'import "./managedPolicy.mjs";',
    ...files,
  };
  for (const [relative, contents] of Object.entries(entries)) {
    const file = NodePath.join(directory, relative);
    NodeFS.mkdirSync(NodePath.dirname(file), { recursive: true });
    NodeFS.writeFileSync(file, contents);
  }
  return directory;
}

describe("packaged managed policy", () => {
  it("should accept the reviewed policy in a server chunk and a web chunk using backtick strings", () => {
    const bundle = createBundleFixture({
      "apps/server/dist/managedPolicy.mjs":
        'export const policy = {"allow":["remoteAccess.network"]};',
      "apps/server/dist/client/assets/runtime.js": "const policy={allow:[`remoteAccess.network`]};",
    });

    const violations = bundlePolicyViolations(bundle);

    expect(violations).toEqual([]);
  });

  it("should report a missing server policy when only the web client contains the reviewed literal", () => {
    const bundle = createBundleFixture({
      "apps/server/dist/managedPolicy.mjs": "export const policy = null;",
      "apps/server/dist/client/assets/runtime.js": 'const policy={allow:["remoteAccess.network"]};',
    });

    const violations = bundlePolicyViolations(bundle);

    expect(violations).toEqual(["server: reviewed policy literal is missing"]);
  });

  it("should report a missing web policy when only the server contains the reviewed literal", () => {
    const bundle = createBundleFixture({
      "apps/server/dist/managedPolicy.mjs":
        'export const policy = {allow:["remoteAccess.network"]};',
      "apps/server/dist/client/assets/runtime.js": "const policy=null;",
    });

    const violations = bundlePolicyViolations(bundle);

    expect(violations).toEqual(["web client: reviewed policy literal is missing"]);
  });

  it("should reject a different policy and an unexpanded policy build constant", () => {
    const bundle = createBundleFixture({
      "apps/server/dist/managedPolicy.mjs": "export const policy = {allow:[`t3Connect`]};",
      "apps/server/dist/client/assets/runtime.js": "const policy=__T3CODE_MANAGED_POLICY__;",
    });

    const violations = bundlePolicyViolations(bundle);

    expect(violations).toEqual([
      "server: reviewed policy literal is missing",
      "web client: reviewed policy literal is missing",
      "apps/server/dist/client/assets/runtime.js: unexpanded policy build constant",
    ]);
  });
});
