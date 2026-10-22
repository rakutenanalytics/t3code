// @effect-diagnostics nodeBuiltinImport:off - Standalone audit commands run before dependencies are installed.
import * as NodeCrypto from "node:crypto";
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

export const root = NodeURL.fileURLToPath(new URL("../../", import.meta.url));

export function repositoryFiles() {
  const output = NodeChildProcess.execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", ".", ":(exclude).repos"],
    { cwd: root, encoding: "utf8" },
  );
  return [...new Set(output.split("\0").filter(Boolean))]
    .filter((file) => NodeFS.existsSync(NodePath.join(root, file)))
    .sort();
}

export function sourceText(file: string) {
  return NodeFS.readFileSync(NodePath.resolve(root, file), "utf8");
}

export function digest(text: string) {
  return NodeCrypto.createHash("sha256").update(text).digest("hex");
}

export function jsonFile<TValue>(file: string): TValue {
  return JSON.parse(sourceText(file));
}

export function writeBaseline(file: string, value: unknown) {
  NodeFS.writeFileSync(NodePath.resolve(root, file), `${JSON.stringify(value, null, 2)}\n`);
}

export function finishScan(name: string, violations: string[], summary: string) {
  if (violations.length === 0) {
    process.stdout.write(`PASS ${name}: ${summary}\n`);
    return;
  }
  process.stderr.write(`FAIL ${name}: ${violations.length} violation(s)\n`);
  for (const violation of violations) process.stderr.write(`  ${violation}\n`);
  process.exitCode = 1;
}

export function fileDigest(file: string) {
  return NodeCrypto.createHash("sha256")
    .update(NodeFS.readFileSync(NodePath.resolve(root, file)))
    .digest("hex");
}
