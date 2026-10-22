// @effect-diagnostics nodeBuiltinImport:off - Preserve scanner diagnostics when a smoke subprocess fails.
import * as NodeChildProcess from "node:child_process";
import { root } from "./repository.ts";

export function runDesktopSmokeCommand(executable: string, args: string[]) {
  const result = NodeChildProcess.spawnSync(executable, args, { cwd: root, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(
      `Command failed (${result.status ?? result.signal}): ${executable} ${args.join(" ")}\n${output}`,
    );
  }
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
}
