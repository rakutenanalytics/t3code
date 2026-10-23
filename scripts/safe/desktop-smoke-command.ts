// @effect-diagnostics nodeBuiltinImport:off - Preserve scanner diagnostics when a smoke subprocess fails.
import * as NodeChildProcess from "node:child_process";
import { root } from "./repository.ts";

export function runDesktopSmokeCommand(executable: string, args: string[]) {
  const result = NodeChildProcess.spawnSync(executable, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    const output = [result.stdout, result.stderr]
      .filter(Boolean)
      .map((stream) => stream.trimEnd())
      .join("\n");
    const diagnostics = truncateCommandOutput(output);
    const reason = result.error?.message ?? result.status ?? result.signal;
    throw new Error(`Command failed (${reason}): ${executable} ${args.join(" ")}\n${diagnostics}`, {
      cause: result.error,
    });
  }
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
}

function truncateCommandOutput(output: string) {
  const lines = output.trimEnd().split("\n");
  const preview = lines.slice(0, 200).map((line) => {
    if (line.length <= 1000) return line;
    return `${line.slice(0, 1000)} [${line.length - 1000} character(s) omitted]`;
  });
  if (lines.length > 200) {
    preview.push(`[${lines.length - 200} additional output line(s) omitted]`);
  }
  return preview.join("\n");
}
