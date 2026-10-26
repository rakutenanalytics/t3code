import { appIdentity } from "@t3tools/shared/appIdentity";
import { resolveHome, type HomeChoice } from "@t3tools/shared/homeChoice";
import * as Option from "effect/Option";

export type JoinPath = (first: string, ...segments: string[]) => string;

function normalizeConfiguredBaseDir(t3Home: Option.Option<string>): Option.Option<string> {
  if (Option.isNone(t3Home)) {
    return Option.none();
  }
  const trimmed = t3Home.value.trim();
  return trimmed.length > 0 ? Option.some(trimmed) : Option.none();
}

export function resolveDesktopBaseDir(input: {
  readonly homeDirectory: string;
  readonly t3Home: Option.Option<string>;
  readonly savedChoice: HomeChoice | undefined;
}): string {
  return resolveHome({
    identity: appIdentity,
    homeDirectory: input.homeDirectory,
    env: { [appIdentity.homeEnvVar]: Option.getOrUndefined(input.t3Home) },
    savedChoice: input.savedChoice,
  }).dir;
}

export function resolveDesktopStateDir(input: {
  readonly baseDir: string;
  readonly isDevelopment: boolean;
  readonly joinPath: JoinPath;
  readonly t3Home: Option.Option<string>;
}): string {
  const useDevSubdir =
    input.isDevelopment && Option.isNone(normalizeConfiguredBaseDir(input.t3Home));
  return input.joinPath(input.baseDir, useDevSubdir ? "dev" : "userdata");
}
