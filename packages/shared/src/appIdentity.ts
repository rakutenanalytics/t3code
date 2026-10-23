/**
 * Who this build is: the names, directories and ports that must differ between
 * installs sharing one machine. Release builds from the company-safe fork bake
 * `security/app-identity.json` over the upstream defaults so the two never share
 * state, bundle ids, URL schemes, commands or ports.
 *
 * Plain data on purpose: the standalone service launcher imports this module and
 * must not pull in the Effect runtime.
 */
export interface AppIdentity {
  /** Product name without a release-stage suffix, e.g. "T3 Code". */
  readonly baseName: string;
  /** Upstream appends "(Beta)" or "(Nightly)" to `baseName`; the safe fork does not. */
  readonly showStageLabel: boolean;
  /** Bundle id / app user model id of packaged production builds. */
  readonly appId: string;
  /** Lowercase name for process, service and desktop-entry identifiers. */
  readonly slug: string;
  /** Directory below the user's home that holds all T3 state. */
  readonly homeDirName: string;
  /** Environment variable that overrides the home directory. */
  readonly homeEnvVar: string;
  /** Electron userData directory (browser storage, safeStorage keys). */
  readonly userDataDirName: string;
  /** Profiles of other T3 installs whose settings may be imported; empty means never. */
  readonly legacyProfileNames: readonly string[];
  /** Terminal command that runs the bundled CLI. */
  readonly cliCommand: string;
  /** Custom URL scheme for deep links and the desktop renderer origin. */
  readonly urlScheme: string;
  /** First port the desktop backend and standalone server try. */
  readonly defaultPort: number;
}

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

/** Replaced by the reviewed identity in safe release bundles; absent in dev, tests and upstream builds. */
declare const __T3CODE_APP_IDENTITY__: AppIdentity | undefined;

export const appIdentity: AppIdentity =
  typeof __T3CODE_APP_IDENTITY__ === "undefined" ? upstreamAppIdentity : __T3CODE_APP_IDENTITY__;
