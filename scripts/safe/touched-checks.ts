// @effect-diagnostics nodeBuiltinImport:off - CI runs the repo tools as subprocesses.
import * as NodeChildProcess from "node:child_process";
import { root } from "./repository.ts";

const base = process.argv[2];
if (!base) throw new Error("Usage: node scripts/safe/touched-checks.ts <base-sha>");
const output = NodeChildProcess.execFileSync(
  "git",
  ["diff", "--name-only", "--diff-filter=ACMR", "-z", base, "--", ".", ":(exclude).repos"],
  { cwd: root, encoding: "utf8" },
);
const files = output.split("\0").filter((file) => file && !file.startsWith(".repos/"));
const lintFiles = files.filter((file) => /\.[cm]?[jt]sx?$/.test(file));
const formatFiles = files.filter((file) => /\.(?:[cm]?[jt]sx?|json|md|ya?ml)$/.test(file));
for (const [command, targets] of [
  ["lint", lintFiles],
  ["fmt", formatFiles],
] as const) {
  if (targets.length === 0) continue;
  const args: string[] = [command];
  if (command === "fmt") args.push("--check");
  for (let offset = 0; offset < targets.length; offset += 100) {
    const batch = targets.slice(offset, offset + 100);
    const result = NodeChildProcess.spawnSync("vp", [...args, ...batch], {
      cwd: root,
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
