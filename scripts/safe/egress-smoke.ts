// @effect-diagnostics nodeBuiltinImport:off - Smoke the built executable without starting a server.
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { finishScan, jsonFile } from "./repository.ts";

const executable = process.argv[2];
if (!executable) throw new Error("Usage: node scripts/safe/egress-smoke.ts <built-t3>");
const isolatedHome = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3safe-smoke-"));
try {
  const result = NodeChildProcess.spawnSync(NodePath.resolve(executable), ["managed-policy"], {
    cwd: isolatedHome,
    env: {
      PATH: process.env.PATH,
      HOME: isolatedHome,
      T3CODE_HOME: isolatedHome,
      T3CODE_TELEMETRY_ENABLED: "true",
      T3CODE_DISABLE_AUTO_UPDATE: "false",
      T3CODE_MANAGED_POLICY: '{"allow":["t3Connect","productAnalytics","desktopAutoUpdate"]}',
    },
    encoding: "utf8",
    timeout: 30_000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`policy command exited ${result.status}: ${result.stderr}`);
  const actual: unknown = JSON.parse(result.stdout);
  const expected = jsonFile<unknown>("security/managed-policy.json");
  const violations: string[] = [];
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    violations.push("built executable policy differs from reviewed source policy");
  finishScan(
    "baked policy smoke",
    violations,
    "built executable reports reviewed policy despite environment overrides; no listener/provider launch",
  );
} finally {
  NodeFS.rmSync(isolatedHome, { recursive: true, force: true });
}
