// @effect-diagnostics nodeBuiltinImport:off - Persistence is observed through a real temporary home directory.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import {
  homeChoiceFilePath,
  readSavedHomeChoice,
  resolveHomeFromHost,
  saveHomeChoice,
  type HomeChoiceHost,
} from "./homeChoice.ts";

const safeIdentity = {
  homeDirName: ".t3-safe",
  homeEnvVar: "T3SAFE_HOME",
  userDataDirName: "t3code-safe",
};

let homeDirectory: string;

const hostWith = (env: HomeChoiceHost["env"] = {}): HomeChoiceHost => ({
  identity: safeIdentity,
  platform: "darwin",
  homeDirectory,
  env,
});

beforeEach(() => {
  homeDirectory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "home-choice-"));
});

afterEach(() => {
  NodeFS.rmSync(homeDirectory, { recursive: true, force: true });
});

describe("safe home resolution", () => {
  it("uses ~/.t3-safe when no env var and no saved choice", () => {
    const home = resolveHomeFromHost(hostWith());

    expect(home).toEqual({ dir: NodePath.join(homeDirectory, ".t3-safe"), source: "default" });
  });

  it("uses ~/.t3 after the saved choice is [official]", () => {
    saveHomeChoice(hostWith(), "official");

    const home = resolveHomeFromHost(hostWith());

    expect(home).toEqual({ dir: NodePath.join(homeDirectory, ".t3"), source: "choice" });
  });

  it("uses T3SAFE_HOME over a saved [official] choice", () => {
    saveHomeChoice(hostWith(), "official");

    const home = resolveHomeFromHost(hostWith({ T3SAFE_HOME: "/work/safe-home" }));

    expect(home).toEqual({ dir: "/work/safe-home", source: "env" });
  });

  it("ignores ambient T3CODE_HOME", () => {
    const home = resolveHomeFromHost(hostWith({ T3CODE_HOME: "/official/elsewhere" }));

    expect(home).toEqual({ dir: NodePath.join(homeDirectory, ".t3-safe"), source: "default" });
  });

  it("returns to ~/.t3-safe after use-isolated", () => {
    saveHomeChoice(hostWith(), "official");
    saveHomeChoice(hostWith(), "isolated");

    const home = resolveHomeFromHost(hostWith());

    expect(home).toEqual({ dir: NodePath.join(homeDirectory, ".t3-safe"), source: "choice" });
  });

  it("keeps the saved choice inside the Electron profile, outside both homes, on macOS", () => {
    const filePath = homeChoiceFilePath(hostWith());

    expect(filePath).toBe(
      NodePath.join(homeDirectory, "Library/Application Support/t3code-safe/home-choice.json"),
    );
  });

  it("treats an unreadable choice file as no choice", () => {
    const filePath = homeChoiceFilePath(hostWith());
    NodeFS.mkdirSync(NodePath.dirname(filePath), { recursive: true });
    NodeFS.writeFileSync(filePath, "{not json");

    const choice = readSavedHomeChoice(hostWith());

    expect(choice).toBeUndefined();
  });
});
