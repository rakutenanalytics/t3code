// @effect-diagnostics nodeBuiltinImport:off - Runs the installer's cleanup block in a temporary prefix.
import * as NodeChildProcess from "node:child_process";
import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

const prefixes: string[] = [];
afterEach(() => {
  for (const prefix of prefixes.splice(0)) NodeFS.rmSync(prefix, { recursive: true, force: true });
});

function createPrefix() {
  const prefix = NodeFS.realpathSync(NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3safe-")));
  prefixes.push(prefix);
  NodeFS.mkdirSync(NodePath.join(prefix, "bin"), { recursive: true });
  NodeFS.mkdirSync(NodePath.join(prefix, "share/t3safe/versions/v0.1.0-safe.1"), {
    recursive: true,
  });
  return prefix;
}

/** Runs only the marked block of install.sh, so no download or install happens. */
function runLegacyLinkCleanup(installRoot: string) {
  const installer = NodeFS.readFileSync("install.sh", "utf8");
  const block = /# BEGIN legacy-t3-link-cleanup\n([\s\S]*?)# END legacy-t3-link-cleanup/.exec(
    installer,
  )?.[1];
  if (block === undefined) throw new Error("install.sh lost its legacy-t3-link-cleanup block");
  return NodeChildProcess.execFileSync(
    "bash",
    ["-c", `install_root=$1\n${block}`, "bash", installRoot],
    {
      encoding: "utf8",
    },
  );
}

describe("legacy t3 link cleanup", () => {
  it("should remove a [t3] symlink pointing into <prefix>/share/t3safe and print what it removed", () => {
    // Setup
    const prefix = createPrefix();
    const target = NodePath.join(prefix, "share/t3safe/versions/v0.1.0-safe.1/t3");
    NodeFS.symlinkSync(target, NodePath.join(prefix, "bin/t3"));

    // Target
    const output = runLegacyLinkCleanup(prefix);

    // Assertions
    expect(NodeFS.existsSync(NodePath.join(prefix, "bin/t3"))).toBe(false);
    expect(output).toContain(`Removed legacy link ${prefix}/bin/t3 -> ${target}`);
  });

  it("should leave a [t3] symlink pointing elsewhere untouched", () => {
    // Setup
    const prefix = createPrefix();
    const official = NodePath.join(prefix, "official/bin/t3");
    NodeFS.symlinkSync(official, NodePath.join(prefix, "bin/t3"));

    // Target
    const output = runLegacyLinkCleanup(prefix);

    // Assertions
    expect(NodeFS.readlinkSync(NodePath.join(prefix, "bin/t3"))).toBe(official);
    expect(output).toContain("Left");
  });

  it("should leave a regular file named [t3] untouched", () => {
    // Setup
    const prefix = createPrefix();
    NodeFS.writeFileSync(NodePath.join(prefix, "bin/t3"), "official launcher\n");

    // Target
    runLegacyLinkCleanup(prefix);

    // Assertions
    expect(NodeFS.readFileSync(NodePath.join(prefix, "bin/t3"), "utf8")).toBe(
      "official launcher\n",
    );
  });
});

function createReleaseInstallation(options: {
  githubAuth: "unavailable" | "authenticated" | "unauthenticated";
  tamperWithVersion?: boolean;
}) {
  const root = createPrefix();
  const bin = NodePath.join(root, "commands");
  const assets = NodePath.join(root, "assets");
  const prefix = NodePath.join(root, "installed");
  const archiveRoot = NodePath.join(root, "t3-0.1.2-safe.1-darwin-arm64");
  NodeFS.mkdirSync(bin);
  NodeFS.mkdirSync(assets);
  NodeFS.mkdirSync(archiveRoot);
  NodeFS.writeFileSync(NodePath.join(archiveRoot, "t3"), "#!/bin/bash\nexit 0\n", { mode: 0o755 });
  NodeChildProcess.execFileSync("tar", [
    "-czf",
    NodePath.join(assets, "t3safe-0.1.2-safe.1-darwin-arm64.tar.gz"),
    "-C",
    root,
    "t3-0.1.2-safe.1-darwin-arm64",
  ]);
  NodeFS.copyFileSync("scripts/safe/t3safe", NodePath.join(assets, "t3safe"));
  for (const name of ["managed-policy.json", "app-identity.json"]) {
    NodeFS.writeFileSync(NodePath.join(assets, name), "{}\n");
  }
  NodeFS.writeFileSync(NodePath.join(assets, "VERSION"), "v0.1.2-safe.1\n");
  NodeFS.copyFileSync(
    "security/signing-certificate.sha256",
    NodePath.join(assets, "signing-certificate.sha256"),
  );
  const checksums = NodeFS.readdirSync(assets)
    .map((name) => {
      const hash = NodeCrypto.createHash("sha256")
        .update(NodeFS.readFileSync(NodePath.join(assets, name)))
        .digest("hex");
      return `${hash}  ${name}\n`;
    })
    .join("");
  NodeFS.writeFileSync(NodePath.join(assets, "SHA256SUMS"), checksums);
  NodeFS.writeFileSync(NodePath.join(assets, "release.json"), '{"tag_name":"v0.1.2-safe.1"}');
  if (options.tamperWithVersion)
    NodeFS.appendFileSync(NodePath.join(assets, "VERSION"), "tampered\n");
  const commands = {
    uname: '#!/bin/bash\nif [[ "$1" == -s ]]; then echo Darwin; else echo arm64; fi\n',
    plutil: "#!/bin/bash\necho v0.1.2-safe.1\n",
    codesign: "#!/bin/bash\nexit 0\n",
    xattr: "#!/bin/bash\nexit 0\n",
    hdiutil: "#!/bin/bash\nexit 1\n",
    ditto: '#!/bin/bash\ncp -R "$1/." "$2/"\n',
    curl: `#!/bin/bash
set -euo pipefail
${options.githubAuth === "authenticated" ? "exit 1" : ""}
while [[ $# -gt 0 ]]; do
  case "$1" in
    https://*) url=$1; shift ;;
    -o) output=$2; shift 2 ;;
    *) shift ;;
  esac
done
if [[ "$url" == https://api.github.com/repos/rakutenanalytics/t3code/releases/latest ]]; then
  name=release.json
else
  [[ "$url" == https://github.com/rakutenanalytics/t3code/releases/download/v0.1.2-safe.1/* ]] || exit 1
  name=\${url##*/}
fi
cp "$RELEASE_FIXTURES/$name" "$output"
`,
  };
  for (const [name, script] of Object.entries(commands)) {
    NodeFS.writeFileSync(NodePath.join(bin, name), script, { mode: 0o755 });
  }
  if (options.githubAuth !== "unavailable") {
    NodeFS.writeFileSync(
      NodePath.join(bin, "gh"),
      `#!/bin/bash
set -euo pipefail
if [[ "$*" == 'auth status' ]]; then exit ${options.githubAuth === "authenticated" ? 0 : 1}; fi
${options.githubAuth === "unauthenticated" ? "exit 1" : ""}
if [[ "$*" == 'release view --repo rakutenanalytics/t3code --json tagName --jq .tagName' ]]; then
  echo v0.1.2-safe.1
  exit 0
fi
[[ "$1 $2 $3 $4" == 'release download --repo rakutenanalytics/t3code' ]] || exit 1
[[ "$5" == v0.1.2-safe.1 && "$6" == --pattern && "$8" == --output ]] || exit 1
cp "$RELEASE_FIXTURES/$7" "$9"
`,
      { mode: 0o755 },
    );
  }
  return {
    run: (...args: string[]) =>
      NodeChildProcess.spawnSync(
        "/bin/bash",
        ["install.sh", "--cli-only", "--prefix", prefix, ...args],
        {
          encoding: "utf8",
          env: { HOME: root, PATH: `${bin}:/usr/bin:/bin`, TMPDIR: root, RELEASE_FIXTURES: assets },
        },
      ),
    installedVersion: () =>
      NodeFS.readFileSync(
        NodePath.join(prefix, "share/t3safe/versions/v0.1.2-safe.1/VERSION"),
        "utf8",
      ),
    installedCertificate: () =>
      NodeFS.readFileSync(
        NodePath.join(prefix, "share/t3safe/versions/v0.1.2-safe.1/signing-certificate.sha256"),
        "utf8",
      ),
    wasInstalled: () => NodeFS.existsSync(NodePath.join(prefix, "bin/t3safe")),
  };
}

describe("installer release access", () => {
  it.each(["unavailable", "unauthenticated", "authenticated"] as const)(
    "should install the checksum-verified latest CLI when gh is [%s]",
    (githubAuth) => {
      const installation = createReleaseInstallation({ githubAuth });

      const result = installation.run();

      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
      expect(installation.installedVersion()).toBe("v0.1.2-safe.1\n");
      expect(installation.installedCertificate()).toBe(
        NodeFS.readFileSync("security/signing-certificate.sha256", "utf8"),
      );
    },
  );

  it("should install the explicit private release tag", () => {
    const installation = createReleaseInstallation({ githubAuth: "authenticated" });

    const result = installation.run("--version", "v0.1.2-safe.1");

    expect(result.status).toBe(0);
    expect(installation.installedVersion()).toBe("v0.1.2-safe.1\n");
  });

  it("should reject a private asset checksum mismatch before installing", () => {
    const installation = createReleaseInstallation({
      githubAuth: "authenticated",
      tamperWithVersion: true,
    });

    const result = installation.run();

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("t3safe: Checksum mismatch: VERSION\n");
    expect(installation.wasInstalled()).toBe(false);
  });
});
