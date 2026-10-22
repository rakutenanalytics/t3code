// @effect-diagnostics nodeBuiltinImport:off - Verify generated files with the repository formatter.
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { root, writeBaseline } from "./repository.ts";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    NodeFS.rmSync(directory, { recursive: true, force: true });
});

describe("security baseline output", () => {
  it("should write JSON that passes the repository formatter and preserves its data", () => {
    const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3safe-baseline-"));
    directories.push(directory);
    const file = NodePath.join(directory, "baseline.json");
    const baseline = { packages: ["reviewed"] };

    writeBaseline(file, baseline);

    const formatted = NodeChildProcess.spawnSync(
      NodePath.join(root, "node_modules/.bin/vp"),
      ["fmt", "--check", file],
      { cwd: root, encoding: "utf8" },
    );
    expect(formatted.status, formatted.stdout + formatted.stderr).toBe(0);
    expect(JSON.parse(NodeFS.readFileSync(file, "utf8"))).toEqual(baseline);
  });
});
