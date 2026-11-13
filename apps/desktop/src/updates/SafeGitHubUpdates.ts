// @effect-diagnostics nodeBuiltinImport:off -- This credential boundary uses executable access checks and a bounded execFile capture without publishing subprocess errors.
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as DesktopEnvironment from "../app/DesktopEnvironment.ts";
import * as ElectronUpdater from "../electron/ElectronUpdater.ts";
import * as DesktopShellEnvironment from "../shell/DesktopShellEnvironment.ts";

export class SafeGitHubUpdates extends Context.Service<
  SafeGitHubUpdates,
  { readonly check: Effect.Effect<void, ElectronUpdater.ElectronUpdaterCheckForUpdatesError> }
>()("@t3tools/desktop/updates/SafeGitHubUpdates") {}

export class GitHubUpdateCredential extends Context.Service<
  GitHubUpdateCredential,
  { readonly obtain: Effect.Effect<string | undefined> }
>()("@t3tools/desktop/updates/SafeGitHubUpdates/GitHubUpdateCredential") {}

/** @public */
export const make = Effect.gen(function* () {
  const credential = yield* GitHubUpdateCredential;
  const updater = yield* ElectronUpdater.ElectronUpdater;

  return SafeGitHubUpdates.of({
    check: Effect.gen(function* () {
      const token = yield* credential.obtain;
      if (!token) {
        yield* Effect.logInfo(
          "GitHub update credential unavailable; using the public release feed.",
        );
      }
      yield* updater.configureSafeGitHubFeed(token);
      yield* updater.checkForUpdates;
    }),
  });
});

const credentialLayer = Layer.effect(
  GitHubUpdateCredential,
  Effect.gen(function* () {
    const shell = yield* DesktopShellEnvironment.DesktopShellEnvironment;
    const environment = yield* DesktopEnvironment.DesktopEnvironment;

    return GitHubUpdateCredential.of({
      obtain: Effect.gen(function* () {
        yield* shell.awaitDiscovery;
        return yield* Effect.promise(() =>
          obtainGitHubToken(environment.homeDirectory, environment.platform),
        );
      }),
    });
  }),
);

export const layer = Layer.effect(SafeGitHubUpdates, make).pipe(Layer.provide(credentialLayer));

async function obtainGitHubToken(
  homeDirectory: string,
  platform: NodeJS.Platform,
): Promise<string | undefined> {
  const executableName = platform === "win32" ? "gh.exe" : "gh";
  for (const directory of (process.env.PATH ?? "").split(NodePath.delimiter)) {
    if (!NodePath.isAbsolute(directory)) continue;
    const executable = NodePath.join(directory, executableName);
    try {
      await NodeFSP.access(executable, NodeFS.constants.X_OK);
    } catch {
      continue;
    }
    return executeGitHubTokenCommand(executable, homeDirectory);
  }
  return undefined;
}

function executeGitHubTokenCommand(
  executable: string,
  homeDirectory: string,
): Promise<string | undefined> {
  const childEnvironment = { ...process.env };
  // Select the developer's stored github.com login, independently of inherited CI credentials.
  delete childEnvironment.GH_TOKEN;
  delete childEnvironment.GITHUB_TOKEN;
  return new Promise((resolve) => {
    const child = NodeChildProcess.execFile(
      executable,
      ["auth", "token", "--hostname", "github.com"],
      {
        cwd: homeDirectory,
        env: childEnvironment,
        timeout: 5_000,
        killSignal: "SIGKILL",
        maxBuffer: 16_384,
      },
      (error, stdout) => {
        if (error) {
          resolve(undefined);
          return;
        }
        resolve(stdout.trim() || undefined);
      },
    );
    child.stdin?.end();
  });
}
