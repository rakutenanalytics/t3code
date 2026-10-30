// @effect-diagnostics nodeBuiltinImport:off - Exercises the installed wrapper with offline subprocess fixtures.
import * as NodeChildProcess from "node:child_process";
import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { describe, expect, it } from "vite-plus/test";

function createUpdateInstallation(options: {
  mode: "combined" | "cli-only" | "app-only";
  customPrefix?: boolean;
}) {
  const root = NodeFS.realpathSync(
    NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3safe-update-")),
  );
  const home = NodePath.join(root, "test home");
  const prefix = options.customPrefix
    ? NodePath.join(root, "custom prefix")
    : NodePath.join(home, ".local");
  const release = NodePath.join(prefix, "share/t3safe/versions/v0.1.2-safe.0");
  const bin = NodePath.join(root, "bin");
  const launcher = NodePath.join(prefix, "bin/t3safe");
  const installerArguments = NodePath.join(root, "installer-arguments");
  const installer =
    '#!/bin/bash\nset -euo pipefail\nprintf "%s\\0" "$@" > "$INSTALLER_ARGUMENTS"\n';
  const checksum = NodeCrypto.createHash("sha256").update(installer).digest("hex");
  NodeFS.mkdirSync(release, { recursive: true });
  NodeFS.mkdirSync(NodePath.dirname(launcher), { recursive: true });
  NodeFS.mkdirSync(bin);
  NodeFS.copyFileSync("scripts/safe/t3safe", NodePath.join(release, "t3safe"));
  NodeFS.symlinkSync(NodePath.join(release, "t3safe"), launcher);
  if (options.mode !== "cli-only") {
    NodeFS.writeFileSync(NodePath.join(release, "APP_PATH"), "/unused/T3 Safe.app\n");
  }
  if (options.mode !== "app-only") {
    NodeFS.writeFileSync(NodePath.join(release, "t3"), "#!/bin/bash\nexit 1\n", { mode: 0o755 });
  }
  NodeFS.writeFileSync(NodePath.join(root, "install.sh"), installer);
  NodeFS.writeFileSync(NodePath.join(root, "SHA256SUMS"), `${checksum}  install.sh\n`);
  NodeFS.writeFileSync(NodePath.join(root, "release.json"), '{"tag_name":"v0.1.2-safe.1"}\n');
  NodeFS.writeFileSync(
    NodePath.join(bin, "curl"),
    `#!/bin/bash
set -euo pipefail
while [[ $# -gt 0 ]]; do
  case "$1" in
    https://*) url=$1; shift ;;
    -o) output=$2; shift 2 ;;
    *) shift ;;
  esac
done
case "$url" in
  https://api.github.com/repos/rakutenanalytics/t3code/releases/latest) fixture=release.json ;;
  https://github.com/rakutenanalytics/t3code/releases/download/v0.1.2-safe.[12]/SHA256SUMS) fixture=SHA256SUMS ;;
  https://github.com/rakutenanalytics/t3code/releases/download/v0.1.2-safe.[12]/install.sh) fixture=install.sh ;;
  *) exit 1 ;;
esac
cp "$UPDATE_FIXTURES/$fixture" "$output"
`,
    { mode: 0o755 },
  );
  NodeFS.writeFileSync(
    NodePath.join(bin, "plutil"),
    '#!/bin/bash\nprintf "%s\\n" v0.1.2-safe.1\n',
    {
      mode: 0o755,
    },
  );

  return {
    prefix,
    tamperWithInstaller: () =>
      NodeFS.appendFileSync(NodePath.join(root, "install.sh"), "# tampered\n"),
    wasInstallerRun: () => NodeFS.existsSync(installerArguments),
    run: (...options: string[]) =>
      NodeChildProcess.spawnSync("/bin/bash", [launcher, "update", ...options], {
        encoding: "utf8",
        env: {
          HOME: home,
          PATH: `${bin}:/usr/bin:/bin`,
          TMPDIR: root,
          UPDATE_FIXTURES: root,
          INSTALLER_ARGUMENTS: installerArguments,
        },
      }),
    installerArguments: () =>
      NodeFS.readFileSync(installerArguments, "utf8").split("\0").slice(0, -1),
    [Symbol.dispose]: () => NodeFS.rmSync(root, { recursive: true, force: true }),
  };
}

describe("t3safe update", () => {
  it("should update the default app and CLI installation with only the latest version when no options are supplied", () => {
    using installation = createUpdateInstallation({ mode: "combined" });

    const result = installation.run();

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(installation.installerArguments()).toEqual(["--version", "v0.1.2-safe.1"]);
  });

  it.each(["cli-only", "app-only"] as const)(
    "should preserve [%s] mode without forwarded options at the default prefix",
    (mode) => {
      using installation = createUpdateInstallation({ mode });

      const result = installation.run();

      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
      expect(installation.installerArguments()).toEqual([
        "--version",
        "v0.1.2-safe.1",
        `--${mode}`,
      ]);
    },
  );

  it("should preserve the custom prefix, app-only mode, explicit version and supplied installer options in order", () => {
    using installation = createUpdateInstallation({ mode: "app-only", customPrefix: true });

    const result = installation.run(
      "--version",
      "v0.1.2-safe.2",
      "--app-dir",
      "/custom apps",
      "--dry-run",
    );

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(installation.installerArguments()).toEqual([
      "--version",
      "v0.1.2-safe.2",
      "--prefix",
      installation.prefix,
      "--app-only",
      "--app-dir",
      "/custom apps",
      "--dry-run",
    ]);
  });

  it("should forward supplied options without inserting an empty prefix or mode argument for a default combined install", () => {
    using installation = createUpdateInstallation({ mode: "combined" });

    const result = installation.run("--prefix", "/custom prefix", "--cli-only");

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(installation.installerArguments()).toEqual([
      "--version",
      "v0.1.2-safe.1",
      "--prefix",
      "/custom prefix",
      "--cli-only",
    ]);
  });

  it("should reject a checksum mismatch without running the installer", () => {
    using installation = createUpdateInstallation({ mode: "combined" });
    installation.tamperWithInstaller();

    const result = installation.run();

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("t3safe: Installer checksum mismatch.\n");
    expect(installation.wasInstallerRun()).toBe(false);
  });
});
