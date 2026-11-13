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
  githubAuth?: "authenticated" | "unauthenticated" | "unavailable";
  githubDownloadFails?: boolean;
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
  NodeFS.writeFileSync(
    NodePath.join(bin, "curl"),
    '#!/bin/bash\nprintf "Unexpected public download\\n" >&2\nexit 99\n',
    { mode: 0o755 },
  );
  const githubAuth = options.githubAuth ?? "authenticated";
  if (githubAuth !== "unavailable") {
    NodeFS.writeFileSync(
      NodePath.join(bin, "gh"),
      `#!/bin/bash
set -euo pipefail
if [[ "$*" == 'auth status --hostname github.com' ]]; then exit ${githubAuth === "authenticated" ? 0 : 1}; fi
${githubAuth === "unauthenticated" ? "exit 1" : ""}
if [[ "$*" == 'release view --repo rakutenanalytics/t3code --json tagName --jq .tagName' ]]; then
  printf '%s\\n' v0.1.2-safe.1
  exit 0
fi
[[ "$1 $2 $3 $4" == 'release download --repo rakutenanalytics/t3code' ]] || exit 1
[[ "$5" == v0.1.2-safe.[12] && "$6" == --pattern && "$8" == --output ]] || exit 1
${options.githubDownloadFails ? "exit 1" : 'cp "$UPDATE_FIXTURES/$7" "$9"'}
`,
      { mode: 0o755 },
    );
  }

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

describe("t3safe release access", () => {
  it("should run the checksum-verified latest installer when gh is authenticated", () => {
    using installation = createUpdateInstallation({
      mode: "combined",
      githubAuth: "authenticated",
    });

    const result = installation.run();

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(installation.installerArguments()).toEqual(["--version", "v0.1.2-safe.1"]);
  });

  it.each(["unavailable", "unauthenticated"] as const)(
    "should fail with login guidance without running the installer when gh is [%s]",
    (githubAuth) => {
      using installation = createUpdateInstallation({ mode: "combined", githubAuth });

      const result = installation.run();

      expect(result.status).toBe(1);
      const message =
        githubAuth === "unavailable" ? "GitHub CLI required" : "GitHub CLI login required";
      expect(result.stderr).toContain(message);
      expect(result.stderr).toContain("gh auth login --hostname github.com");
      expect(result.stderr.trim().split("\n")).toHaveLength(1);
      expect(installation.wasInstallerRun()).toBe(false);
    },
  );

  it("should use the explicit private tag without looking up the latest release", () => {
    using installation = createUpdateInstallation({
      mode: "combined",
      githubAuth: "authenticated",
    });

    const result = installation.run("--version", "v0.1.2-safe.2");

    expect(result.status).toBe(0);
    expect(installation.installerArguments()).toEqual(["--version", "v0.1.2-safe.2"]);
  });

  it("should reject a private installer checksum mismatch without executing it", () => {
    using installation = createUpdateInstallation({
      mode: "combined",
      githubAuth: "authenticated",
    });
    installation.tamperWithInstaller();

    const result = installation.run();

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("t3safe: Installer checksum mismatch.\n");
    expect(installation.wasInstallerRun()).toBe(false);
  });

  it("should stop without executing the installer when an authenticated gh download fails", () => {
    using installation = createUpdateInstallation({
      mode: "combined",
      githubAuth: "authenticated",
      githubDownloadFails: true,
    });

    const result = installation.run();

    expect(result.status).toBe(1);
    expect(installation.wasInstallerRun()).toBe(false);
  });
});
