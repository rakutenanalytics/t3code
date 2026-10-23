import type { AppIdentity } from "./appIdentity.ts";

/**
 * The official T3 Code identity. Kept out of `appIdentity.ts` so that module's exports
 * never include it: a bundle that dynamic-imports `appIdentity` keeps every export
 * of that module, which would leave this literal in safe builds that baked their own.
 */
export const upstreamAppIdentity: AppIdentity = {
  baseName: "T3 Code",
  showStageLabel: true,
  appId: "com.t3tools.t3code",
  slug: "t3code",
  homeDirName: ".t3",
  homeEnvVar: "T3CODE_HOME",
  userDataDirName: "t3code-v2",
  legacyProfileNames: ["T3 Code (Alpha)", "t3code"],
  cliCommand: "t3",
  urlScheme: "t3code",
  defaultPort: 3773,
};
