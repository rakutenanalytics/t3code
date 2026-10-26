// @effect-diagnostics nodeBuiltinImport:off - Reads the reviewed identity file and joins POSIX paths like the Electron main process.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { it as effectIt } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type * as DesktopEnvironment from "./DesktopEnvironment.ts";

const reviewedIdentity = JSON.parse(
  NodeFS.readFileSync(new URL("../../../../security/app-identity.json", import.meta.url), "utf8"),
);
const machinePath = process.env.PATH;

// The bundler replaces this constant at build time; stubbing it before import is the same seam.
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("__T3CODE_APP_IDENTITY__", reviewedIdentity);
  process.env.PATH = "";
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  process.env.PATH = machinePath;
});

describe("safe-bound desktop", () => {
  it("should resolve the default home to [/Users/alice/.t3-safe] and the state dir to [/Users/alice/.t3-safe/userdata]", async () => {
    const { resolveDesktopBaseDir, resolveDesktopStateDir } =
      await import("./DesktopStatePaths.ts");

    const baseDir = resolveDesktopBaseDir({
      homeDirectory: "/Users/alice",
      t3Home: Option.none(),
      savedChoice: undefined,
    });
    const stateDir = resolveDesktopStateDir({
      baseDir,
      isDevelopment: false,
      joinPath: NodePath.posix.join,
      t3Home: Option.none(),
    });

    expect(baseDir).toBe("/Users/alice/.t3-safe");
    expect(stateDir).toBe("/Users/alice/.t3-safe/userdata");
  });

  it("should read early settings from [T3SAFE_HOME] and ignore an ambient [T3CODE_HOME]", async () => {
    const { resolveEarlyLinuxPasswordStorePreference } =
      await import("./DesktopEarlyElectronStartup.ts");
    const readPaths: string[] = [];
    const resolveSettingsPathFor = (env: NodeJS.ProcessEnv) => {
      resolveEarlyLinuxPasswordStorePreference({
        env,
        homeDirectory: "/Users/alice",
        joinPath: NodePath.posix.join,
        readFileString: (path) => {
          readPaths.push(path);
          return "{}";
        },
      });
    };

    resolveSettingsPathFor({ T3CODE_HOME: "/Users/alice/.t3" });
    resolveSettingsPathFor({ T3SAFE_HOME: "/Volumes/safe" });

    expect(readPaths).toEqual([
      "/Users/alice/.t3-safe/userdata/desktop-settings.json",
      "/Volumes/safe/userdata/desktop-settings.json",
    ]);
  });

  effectIt.effect(
    "should keep the Electron profile at [t3code-safe] on win32 without copying from an existing [T3 Code (Alpha)] profile",
    () =>
      Effect.gen(function* () {
        // Setup
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const appData = yield* fs.makeTempDirectoryScoped({ prefix: "t3safe-profile-" });
        yield* fs.makeDirectory(path.join(appData, "T3 Code (Alpha)"), { recursive: true });
        yield* fs.writeFileString(path.join(appData, "T3 Code (Alpha)", "Local State"), "{}");
        const { resolveUserDataPath } = yield* Effect.promise(() => import("./DesktopUserData.ts"));

        // Target
        const userData = yield* resolveUserDataPath({
          appDataDirectory: appData,
          isDevelopment: false,
          platform: "win32",
        });

        // Assertions
        expect(userData).toBe(path.join(appData, "t3code-safe"));
        expect(yield* fs.exists(path.join(userData, "Local State"))).toBe(false);
      }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );

  effectIt.effect(
    "should link [t3safe] onto PATH, never [t3], and keep its launcher in the safe home",
    () =>
      Effect.gen(function* () {
        // Setup
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const home = yield* fs.makeTempDirectoryScoped({ prefix: "t3safe-cli-" });
        const command = yield* makeCommandIn(path, fs, home);

        // Target
        const installed = yield* command.install;

        // Assertions
        const link = path.join(home, ".local", "bin", "t3safe");
        expect(installed).toMatchObject({ command: "t3safe", installedPath: link });
        expect(yield* fs.readLink(link)).toBe(path.join(home, ".t3-safe", "bin", "t3safe"));
        expect(yield* fs.exists(path.join(home, ".local", "bin", "t3"))).toBe(false);
      }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );

  effectIt.effect(
    "should keep an official [t3] launcher link in place when uninstalling [t3safe]",
    () =>
      Effect.gen(function* () {
        // Setup
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const home = yield* fs.makeTempDirectoryScoped({ prefix: "t3safe-cli-" });
        const officialLauncher = path.join(home, ".t3", "bin", "t3");
        const officialLink = path.join(home, ".local", "bin", "t3");
        yield* fs.makeDirectory(path.dirname(officialLauncher), { recursive: true });
        yield* fs.writeFileString(
          officialLauncher,
          "# Written by T3 Code: runs the desktop app's bundled t3 CLI.\n",
        );
        yield* fs.makeDirectory(path.dirname(officialLink), { recursive: true });
        yield* fs.symlink(officialLauncher, officialLink);
        const command = yield* makeCommandIn(path, fs, home);

        // Target
        yield* command.install;
        yield* command.uninstall;

        // Assertions
        expect(yield* fs.readLink(officialLink)).toBe(officialLauncher);
      }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );
});

const makeCommandIn = (path: Path.Path, fs: FileSystem.FileSystem, home: string) =>
  Effect.gen(function* () {
    const { make } = yield* Effect.promise(() => import("./DesktopCliCommand.ts"));
    const { DesktopEnvironment } = yield* Effect.promise(() => import("./DesktopEnvironment.ts"));
    const baseDir = path.join(home, ".t3-safe");
    yield* fs.makeDirectory(path.join(baseDir, "userdata"), { recursive: true });
    const environment = DesktopEnvironment.of({
      path,
      platform: "linux",
      isPackaged: true,
      homeDirectory: home,
      baseDir,
      stateDir: path.join(baseDir, "userdata"),
      serverRoot: "/opt/T3 Code Safe/resources/app.asar",
      appImagePath: Option.none(),
    } as unknown as DesktopEnvironment.DesktopEnvironment["Service"]);
    return yield* make.pipe(Effect.provideService(DesktopEnvironment, environment));
  });
