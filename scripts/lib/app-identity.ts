// @effect-diagnostics nodeBuiltinImport:off - Build configuration reads the baked file before an Effect runtime exists.
import * as NodeFS from "node:fs";
import * as Schema from "effect/Schema";

import type { AppIdentity } from "@t3tools/shared/appIdentity";

const AppIdentitySchema = Schema.Struct({
  baseName: Schema.String,
  showStageLabel: Schema.Boolean,
  appId: Schema.String,
  slug: Schema.String,
  homeDirName: Schema.String,
  homeEnvVar: Schema.String,
  userDataDirName: Schema.String,
  legacyProfileNames: Schema.Array(Schema.String),
  cliCommand: Schema.String,
  urlScheme: Schema.String,
  defaultPort: Schema.Int,
});

const decodeAppIdentity = Schema.decodeSync(Schema.fromJsonString(AppIdentitySchema));

export function loadBakedAppIdentity(
  identityFile = new URL("../../security/app-identity.json", import.meta.url),
): AppIdentity {
  return decodeAppIdentity(NodeFS.readFileSync(identityFile, "utf8"));
}

/**
 * Dev bundles keep the upstream identity so `vp run dev:desktop` shares the
 * dev-runner's T3CODE_HOME; only production bundles carry the safe identity.
 */
export const appIdentityDefine =
  process.env.T3CODE_DESKTOP_DEV === "1"
    ? {}
    : { __T3CODE_APP_IDENTITY__: JSON.stringify(loadBakedAppIdentity()) };
