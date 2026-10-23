// @effect-diagnostics nodeBuiltinImport:off - Runs the installer's cleanup block in a temporary prefix.
import * as NodeChildProcess from "node:child_process";
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
