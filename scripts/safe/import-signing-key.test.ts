// @effect-diagnostics nodeBuiltinImport:off - Exercises the importer with isolated system-command fakes.
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { describe, expect, it } from "vite-plus/test";

const identity = "A".repeat(40);
const fingerprint = "b".repeat(64);
const existingKeychains = ["/existing user/login.keychain-db", "/existing/system.keychain-db"];

function createSigningRunner(
  options: {
    validIdentity?: boolean;
    signingFailure?: "sign" | "verify";
    certificateFingerprint?: string;
  } = {},
) {
  const root = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3safe-signing-test-"));
  const bin = NodePath.join(root, "bin");
  const runner = NodePath.join(root, "runner temp");
  const importer = NodePath.join(root, "import-signing-key.sh");
  NodeFS.mkdirSync(bin);
  NodeFS.mkdirSync(runner);
  NodeFS.mkdirSync(NodePath.join(root, "security"));
  NodeFS.copyFileSync("scripts/safe/import-signing-key.sh", importer);
  NodeFS.writeFileSync(NodePath.join(root, "security/signing-certificate.sha256"), fingerprint);
  NodeFS.writeFileSync(NodePath.join(root, "keychains.json"), JSON.stringify(existingKeychains));
  NodeFS.writeFileSync(NodePath.join(root, "github-env"), "");
  const fakeCommand = `#!${process.execPath}
const fs = require("node:fs");
const path = require("node:path");
const command = path.basename(process.argv[1]);
const args = process.argv.slice(2);
const root = process.env.SIGNING_FIXTURES;
const keychainsFile = path.join(root, "keychains.json");
const runner = path.join(root, "runner temp");
if (command === "security") {
  if (args[0] === "list-keychains") {
    if (args.includes("-s")) {
      fs.writeFileSync(keychainsFile, JSON.stringify(args.slice(args.indexOf("-s") + 1)));
    } else {
      for (const keychain of JSON.parse(fs.readFileSync(keychainsFile, "utf8"))) {
        console.log('    "' + keychain + '"');
      }
    }
  }
  if (args[0] === "find-certificate") console.log("public certificate fixture");
  if (args[0] === "find-identity") {
    if (process.env.VALID_IDENTITY === "true") console.log('  1) ${identity} "Release signing"');
    else console.log("     0 valid identities found");
  }
}
if (command === "openssl") {
  if (args[0] === "rand") console.log("throwaway-keychain-password");
  if (args.includes("-sha1")) console.log("sha1 Fingerprint=${identity}");
  if (args.includes("-sha256")) console.log("sha256 Fingerprint=" + process.env.CERTIFICATE_FINGERPRINT);
}
if (command === "codesign") {
  const keychains = JSON.parse(fs.readFileSync(keychainsFile, "utf8"));
  if (!keychains.includes(path.join(runner, "t3safe-signing.keychain-db"))) {
    console.error("error: The specified item could not be found in the keychain.");
    process.exit(1);
  }
  const operation = args.includes("--sign") ? "sign" : "verify";
  if (process.env.SIGNING_FAILURE === operation) {
    console.error("probe " + operation + " failed");
    process.exit(1);
  }
  fs.appendFileSync(path.join(root, "probe-results"), operation + "\\n");
}
`;
  for (const command of ["security", "openssl", "codesign"]) {
    NodeFS.writeFileSync(NodePath.join(bin, command), fakeCommand, { mode: 0o755 });
  }
  // The real trust command must never run on the test host.
  NodeFS.writeFileSync(NodePath.join(bin, "sudo"), "#!/bin/bash\nexit 0\n", { mode: 0o755 });

  return {
    runner,
    run: () =>
      NodeChildProcess.spawnSync("/bin/bash", [importer], {
        cwd: root,
        encoding: "utf8",
        env: {
          PATH: `${bin}:/usr/bin:/bin`,
          GITHUB_REPOSITORY: "rakutenanalytics/t3code",
          GITHUB_REF: "refs/heads/main",
          RUNNER_TEMP: runner,
          GITHUB_ENV: NodePath.join(root, "github-env"),
          SAFE_SIGNING_P12_BASE64: Buffer.from("throwaway archive").toString("base64"),
          SAFE_SIGNING_P12_PASSWORD: "throwaway-password",
          SIGNING_FIXTURES: root,
          VALID_IDENTITY: String(options.validIdentity ?? true),
          SIGNING_FAILURE: options.signingFailure,
          CERTIFICATE_FINGERPRINT: options.certificateFingerprint ?? fingerprint,
        },
      }),
    exportedEnvironment: () => NodeFS.readFileSync(NodePath.join(root, "github-env"), "utf8"),
    keychains: () => JSON.parse(NodeFS.readFileSync(NodePath.join(root, "keychains.json"), "utf8")),
    probeResults: () => NodeFS.readFileSync(NodePath.join(root, "probe-results"), "utf8"),
    [Symbol.dispose]: () => NodeFS.rmSync(root, { recursive: true, force: true }),
  };
}

describe("release signing import", () => {
  it("should preserve existing keychains and export the identity after signing and verifying a probe", () => {
    using runner = createSigningRunner();

    const result = runner.run();

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(runner.keychains()).toEqual([
      NodePath.join(runner.runner, "t3safe-signing.keychain-db"),
      ...existingKeychains,
    ]);
    expect(runner.probeResults()).toBe("sign\nverify\n");
    expect(runner.exportedEnvironment()).toBe(
      `SAFE_SIGNING_KEYCHAIN=${runner.runner}/t3safe-signing.keychain-db\nSAFE_SIGNING_IDENTITY=${identity}\n`,
    );
    expect(NodeFS.existsSync(NodePath.join(runner.runner, "t3safe-signing.p12"))).toBe(false);
    expect(NodeFS.existsSync(NodePath.join(runner.runner, "t3safe-signing-probe"))).toBe(false);
  });

  it("should refuse to export an identity absent from the valid code-signing identities", () => {
    using runner = createSigningRunner({ validIdentity: false });

    const result = runner.run();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Release identity is not valid for code signing");
    expect(runner.exportedEnvironment()).toBe("");
  });

  it.each(["sign", "verify"] as const)(
    "should refuse to export the identity and remove the probe when probe [%s] fails",
    (signingFailure) => {
      using runner = createSigningRunner({ signingFailure });

      const result = runner.run();

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`probe ${signingFailure} failed`);
      expect(runner.exportedEnvironment()).toBe("");
      expect(NodeFS.existsSync(NodePath.join(runner.runner, "t3safe-signing-probe"))).toBe(false);
      expect(NodeFS.existsSync(NodePath.join(runner.runner, "t3safe-signing.p12"))).toBe(false);
    },
  );

  it("should refuse a certificate that differs from the reviewed SHA-256 fingerprint", () => {
    using runner = createSigningRunner({ certificateFingerprint: "c".repeat(64) });

    const result = runner.run();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Release certificate differs from the reviewed fingerprint");
    expect(runner.exportedEnvironment()).toBe("");
  });
});
