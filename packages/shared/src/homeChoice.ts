// @effect-diagnostics nodeBuiltinImport:off - Plain Node so the offline `home` command and Electron main share one implementation.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import type { AppIdentity } from "./appIdentity.ts";

/**
 * Which T3 home a build uses when nothing is set in the environment. The safe fork
 * defaults to its own isolated home; the user may opt in to the official one.
 * Upstream builds have a single home, so both choices resolve to it.
 */
export type HomeChoice = "official" | "isolated";

export type HomeSource = "env" | "choice" | "default";

export interface ResolvedHome {
  readonly dir: string;
  readonly source: HomeSource;
}

type HomeIdentity = Pick<AppIdentity, "homeDirName" | "homeEnvVar" | "userDataDirName">;

/** Where the choice lives: platform path math only, so Electron main and the CLI agree. */
export interface HomeChoiceHost {
  readonly identity: HomeIdentity;
  readonly platform: NodeJS.Platform;
  readonly homeDirectory: string;
  readonly env: Readonly<Record<string, string | undefined>>;
}

/**
 * The official home directory name, kept apart from the identity modules: the safe
 * bundle policy rejects any bundle that reaches the upstream identity literal.
 */
const OFFICIAL_HOME_DIR_NAME = ".t3";
const CHOICE_FILE_NAME = "home-choice.json";

/** Precedence: the identity's env var, then the saved choice, then the build's default home. */
export function resolveHome(input: {
  readonly identity: HomeIdentity;
  readonly homeDirectory: string;
  readonly env: HomeChoiceHost["env"];
  readonly savedChoice: HomeChoice | undefined;
}): ResolvedHome {
  const fromEnv = input.env[input.identity.homeEnvVar]?.trim();
  if (fromEnv) return { dir: fromEnv, source: "env" };

  if (input.savedChoice === "official") {
    return { dir: officialHomeDir(input.homeDirectory), source: "choice" };
  }
  const dir = NodePath.join(input.homeDirectory, input.identity.homeDirName);
  return { dir, source: input.savedChoice === "isolated" ? "choice" : "default" };
}

export function officialHomeDir(homeDirectory: string): string {
  return NodePath.join(homeDirectory, OFFICIAL_HOME_DIR_NAME);
}

export function resolveHomeFromHost(host: HomeChoiceHost): ResolvedHome {
  return resolveHome({
    identity: host.identity,
    homeDirectory: host.homeDirectory,
    env: host.env,
    savedChoice: readSavedHomeChoice(host),
  });
}

/** Mirrors the Electron profile directory, which lies outside every T3 home. */
export function homeChoiceFilePath(host: HomeChoiceHost): string {
  return NodePath.join(profilesRoot(host), host.identity.userDataDirName, CHOICE_FILE_NAME);
}

function profilesRoot(host: HomeChoiceHost): string {
  if (host.platform === "darwin") {
    return NodePath.join(host.homeDirectory, "Library", "Application Support");
  }
  if (host.platform === "win32") {
    return host.env.APPDATA ?? NodePath.join(host.homeDirectory, "AppData", "Roaming");
  }
  return host.env.XDG_CONFIG_HOME ?? NodePath.join(host.homeDirectory, ".config");
}

export function readSavedHomeChoice(host: HomeChoiceHost): HomeChoice | undefined {
  try {
    const saved = JSON.parse(NodeFS.readFileSync(homeChoiceFilePath(host), "utf8")) as {
      home?: unknown;
    };
    return saved.home === "official" || saved.home === "isolated" ? saved.home : undefined;
  } catch {
    // Missing or unreadable means no choice: the build's default home applies.
    return undefined;
  }
}

export function saveHomeChoice(host: HomeChoiceHost, choice: HomeChoice): void {
  const filePath = homeChoiceFilePath(host);
  NodeFS.mkdirSync(NodePath.dirname(filePath), { recursive: true });
  NodeFS.writeFileSync(filePath, `${JSON.stringify({ home: choice })}\n`);
}
