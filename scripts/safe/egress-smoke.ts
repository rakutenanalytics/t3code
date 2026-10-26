// @effect-diagnostics nodeBuiltinImport:off - Smoke the built executable without starting a server.
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { finishScan, jsonFile } from "./repository.ts";

const executable = process.argv[2];
if (!executable) throw new Error("Usage: node scripts/safe/egress-smoke.ts <built-t3>");
const isolatedHome = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3safe-smoke-"));

function runBuiltExecutable(command: string): string {
  const result = NodeChildProcess.spawnSync(NodePath.resolve(executable!), [command], {
    cwd: isolatedHome,
    env: {
      PATH: process.env.PATH,
      HOME: isolatedHome,
      // An ambient official-T3 home must not redirect the safe build.
      T3CODE_HOME: NodePath.join(isolatedHome, "official-home"),
      T3CODE_TELEMETRY_ENABLED: "true",
      T3CODE_DISABLE_AUTO_UPDATE: "false",
      T3CODE_MANAGED_POLICY: '{"allow":["t3Connect","productAnalytics","desktopAutoUpdate"]}',
    },
    encoding: "utf8",
    timeout: 30_000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} command exited ${result.status}: ${result.stderr}`);
  return result.stdout;
}

function runBuiltCommand(command: string): unknown {
  return JSON.parse(runBuiltExecutable(command));
}

function sortedKeys(value: unknown) {
  return JSON.stringify(value, Object.keys(value as object).sort());
}

try {
  const violations: string[] = [];
  const expectedPolicy = jsonFile<unknown>("security/managed-policy.json");
  if (JSON.stringify(runBuiltCommand("managed-policy")) !== JSON.stringify(expectedPolicy))
    violations.push("built executable policy differs from reviewed source policy");
  const expectedIdentity = jsonFile<unknown>("security/app-identity.json");
  if (sortedKeys(runBuiltCommand("app-identity")) !== sortedKeys(expectedIdentity))
    violations.push("built executable app identity differs from reviewed source identity");
  // Offline `home` must resolve the isolated default, never the decoy official home.
  const expectedHome = `Home: ${NodePath.join(isolatedHome, jsonFile<{ homeDirName: string }>("security/app-identity.json").homeDirName)}\nSource: default\n`;
  if (runBuiltExecutable("home") !== expectedHome)
    violations.push("built executable `home` does not report the isolated default home");
  finishScan(
    "baked policy and identity smoke",
    violations,
    "built executable reports reviewed policy and app identity; no listener/provider launch; environment flags alone do not prove gate enforcement",
  );
} finally {
  NodeFS.rmSync(isolatedHome, { recursive: true, force: true });
}
