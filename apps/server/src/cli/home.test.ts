// @effect-diagnostics nodeBuiltinImport:off - The command persists to disk, observed through a real temporary home directory.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { runHomeCommand } from "./home.ts";

const homeDirectory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "home-command-"));
const host = {
  identity: { homeDirName: ".t3-safe", homeEnvVar: "T3SAFE_HOME", userDataDirName: "t3code-safe" },
  platform: "darwin" as const,
  homeDirectory,
  env: {},
};

beforeEach(() => {
  NodeFS.rmSync(NodePath.join(homeDirectory, "Library"), { recursive: true, force: true });
});

afterEach(() => {
  NodeFS.rmSync(NodePath.join(homeDirectory, "Library"), { recursive: true, force: true });
});

describe("home command", () => {
  it("shows ~/.t3-safe with source [default] before any choice", () => {
    const { output, exitCode } = runHomeCommand([], host);

    expect(exitCode).toBe(0);
    expect(output).toBe(`Home: ${homeDirectory}/.t3-safe\nSource: default`);
  });

  it("shows ~/.t3 with source [saved choice] and the shared-data note after use-official", () => {
    runHomeCommand(["use-official"], host);

    const { output } = runHomeCommand([], host);

    expect(output).toBe(
      `Home: ${homeDirectory}/.t3\nSource: saved choice\nShares data with official T3 Code.`,
    );
  });

  it("warns that data is shared with official T3 Code when use-official saves the choice", () => {
    const { output, exitCode } = runHomeCommand(["use-official"], host);

    expect(exitCode).toBe(0);
    expect(output).toContain("shares every project, thread and setting with official T3 Code");
  });

  it("tells the user T3SAFE_HOME still wins when use-official runs with it set", () => {
    const { output } = runHomeCommand(["use-official"], {
      ...host,
      env: { T3SAFE_HOME: "/work/home" },
    });

    expect(output).toContain("T3SAFE_HOME is set and wins over the saved choice");
  });

  it("fails with usage for an unknown subcommand", () => {
    const { output, exitCode } = runHomeCommand(["use-both"], host);

    expect(exitCode).toBe(1);
    expect(output).toBe("Usage: t3 home [use-official | use-isolated]");
  });
});
