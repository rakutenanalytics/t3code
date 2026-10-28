// @effect-diagnostics nodeBuiltinImport:off - Exercise the standalone scanner before installation.
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { expect, it } from "vite-plus/test";

it("accepts an age-qualified upgrade in the age-only job while the full scan still rejects baseline drift", () => {
  const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3safe-age-scan-"));
  try {
    const root = NodePath.resolve(import.meta.dirname, "../..");
    const baseline = JSON.parse(
      NodeFS.readFileSync(NodePath.join(root, "security/dependency-baseline.json"), "utf8"),
    );
    delete baseline.packages["pele@1.8.0"];
    baseline.lockfileSha256 = "previous-reviewed-lockfile";
    const baselinePath = NodePath.join(directory, "baseline.json");
    const reportPath = NodePath.join(directory, "report.json");
    const registryPath = NodePath.join(directory, "registry.mjs");
    NodeFS.writeFileSync(baselinePath, JSON.stringify(baseline));
    NodeFS.writeFileSync(
      registryPath,
      `globalThis.fetch = async () => Response.json({ time: { "1.8.0": "2020-01-01T00:00:00Z" }, versions: { "1.8.0": {} } });`,
    );
    const args = [
      "--import",
      registryPath,
      "scripts/safe/dependency-scan.ts",
      "--online",
      "--baseline",
      baselinePath,
      "--report",
      reportPath,
    ];

    const ageScan = NodeChildProcess.spawnSync(process.execPath, [...args, "--age-only"], {
      cwd: root,
      encoding: "utf8",
    });
    const fullScan = NodeChildProcess.spawnSync(process.execPath, args, {
      cwd: root,
      encoding: "utf8",
    });

    expect(ageScan.status, ageScan.stderr).toBe(0);
    expect(ageScan.stdout).toContain("added pele@1.8.0");
    expect(fullScan.status, fullScan.stderr).toBe(1);
    expect(fullScan.stderr).toContain("lockfile changed");
    expect(JSON.parse(NodeFS.readFileSync(reportPath, "utf8")).packages).toEqual([]);
  } finally {
    NodeFS.rmSync(directory, { recursive: true, force: true });
  }
});
