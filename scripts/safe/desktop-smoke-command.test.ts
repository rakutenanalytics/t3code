// @effect-diagnostics nodeBuiltinImport:off - A failing child fixture proves smoke diagnostics survive subprocess failure.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { runDesktopSmokeCommand } from "./desktop-smoke-command.ts";

describe("desktop smoke failures", () => {
  it("should preserve the child exit failure for output above 1 MiB and print only 200 lines with an omitted count", () => {
    const child = [
      'process.stdout.write("diagnostic".repeat(600) + "\\n");',
      'process.stderr.write(("failure line\\n").repeat(100000));',
      "process.exitCode = 7;",
    ].join("\n");

    let failure: unknown;
    try {
      runDesktopSmokeCommand(process.execPath, ["-e", child]);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(Error);
    const message = String(failure);
    expect(message).toContain("Command failed (7)");
    expect(message).not.toContain("ENOBUFS");
    expect(message).toContain("diagnostic");
    expect(message).toContain("99801 additional output line(s) omitted");
    expect(message.match(/^failure line$/gm)).toHaveLength(199);
    expect(message.length).toBeLessThan(20000);
  });

  it("should include the child's FAIL line and stdout in the command failure", () => {
    const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3safe-smoke-"));
    const childFile = NodePath.join(directory, "fail.cjs");
    const child = [
      'process.stdout.write("inspecting fixture\\n");',
      'process.stderr.write("FAIL policy: reviewed policy literal is missing\\n");',
      "process.exitCode = 1;",
    ].join("\n");
    NodeFS.writeFileSync(childFile, child);

    try {
      const runFailingChild = () => runDesktopSmokeCommand(process.execPath, [childFile]);

      expect(runFailingChild).toThrow(
        /inspecting fixture[\s\S]*FAIL policy: reviewed policy literal is missing/,
      );
    } finally {
      NodeFS.rmSync(directory, { recursive: true, force: true });
    }
  });
});
