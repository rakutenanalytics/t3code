// @effect-diagnostics nodeBuiltinImport:off - Bundle fixtures never execute application code.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { upstreamAppIdentity } from "@t3tools/shared/appIdentity";
import {
  bundleIdentityViolations,
  bundlePolicyViolations,
  cliBundlePolicyViolations,
  packagedAppIdentityViolations,
} from "./bundle-policy.ts";

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
  it("accepts the reviewed policy in staged CLI source and client assets", () => {
    const bundle = createBundleFixture({
      "bin.mjs": 'const policy={allow:["remoteAccess.network"]};',
      "client/assets/runtime.js": 'const policy={allow:["remoteAccess.network"]};',
    });

    const violations = cliBundlePolicyViolations(bundle);

    expect(violations).toEqual([]);
  });

  it("rejects staged CLI source with a missing policy or unexpanded constant", () => {
    const bundle = createBundleFixture({
      "bin.mjs": "const policy=__T3CODE_MANAGED_POLICY__;",
      "client/assets/runtime.js": 'const policy={allow:["remoteAccess.network"]};',
    });

    const violations = cliBundlePolicyViolations(bundle);

    expect(violations).toEqual([
      "CLI source: reviewed policy literal is missing",
      "bin.mjs: unexpanded policy build constant",
    ]);
  });

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

describe("packaged app identity", () => {
  const reviewedIdentity = NodeFS.readFileSync("security/app-identity.json", "utf8");
  const minifiedIdentity = JSON.stringify(JSON.parse(reviewedIdentity));

  it("should accept main, server and web chunks that contain the reviewed identity literal", () => {
    const bundle = createBundleFixture({
      "apps/desktop/dist-electron/main.cjs": `const identity = ${reviewedIdentity};`,
      "apps/server/dist/appIdentity.mjs": `const identity = ${minifiedIdentity};`,
      "apps/server/dist/client/assets/appIdentity.js": `var e=${minifiedIdentity};`,
    });

    const violations = bundleIdentityViolations(bundle);

    expect(violations).toEqual([]);
  });

  it("should report a missing literal, an upstream literal, an unexpanded constant and a hard-coded $HOME/.t3 path", () => {
    const bundle = createBundleFixture({
      "apps/desktop/dist-electron/main.cjs": `const identity = ${JSON.stringify(upstreamAppIdentity)}; const baked = __T3CODE_APP_IDENTITY__;`,
      "apps/server/dist/appIdentity.mjs": `const identity = ${minifiedIdentity}; const home = "$HOME/.t3";`,
    });

    const violations = bundleIdentityViolations(bundle);

    expect(violations).toEqual([
      "desktop main: reviewed app identity literal is missing",
      "web client: reviewed app identity literal is missing",
      "apps/desktop/dist-electron/main.cjs: unexpanded app identity build constant",
      "apps/desktop/dist-electron/main.cjs: upstream app identity literal (default home ~/.t3)",
      "apps/server/dist/appIdentity.mjs: hard-coded ~/.t3 path",
    ]);
  });

  it("should accept an app named [T3 Code Safe.app] with bundle id [com.rakuten.t3code-safe] and scheme [t3safe]", () => {
    const violations = packagedAppIdentityViolations({
      directoryName: "T3 Code Safe.app",
      bundleIdentifier: "com.rakuten.t3code-safe",
      urlSchemes: ["t3safe", "t3safe-dev", "http", "https"],
    });

    expect(violations).toEqual([]);
  });

  it("should reject the official app name, bundle id [com.t3tools.t3code] and scheme [t3code]", () => {
    const violations = packagedAppIdentityViolations({
      directoryName: "T3 Code (Beta).app",
      bundleIdentifier: "com.t3tools.t3code",
      urlSchemes: ["t3code", "t3code-dev"],
    });

    expect(violations).toEqual([
      "app bundle is T3 Code (Beta).app, expected T3 Code Safe.app",
      "bundle identifier is com.t3tools.t3code, expected com.rakuten.t3code-safe",
      "URL scheme t3safe is not registered",
      "URL scheme t3code would collide with official T3",
    ]);
  });
});
