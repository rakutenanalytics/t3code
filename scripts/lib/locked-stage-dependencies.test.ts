import { expect, it } from "vite-plus/test";
import { createLockedStageFiles } from "./locked-stage-dependencies.ts";

it("projects the reviewed node-pty override into a frozen release stage", () => {
  const lockfile = JSON.stringify({
    lockfileVersion: "9.0",
    importers: {
      "apps/server": {
        dependencies: {
          "node-pty": { specifier: "1.2.0-beta.15", version: "1.2.0-beta.15(patch_hash=fixed)" },
        },
      },
    },
    packages: { "node-pty@1.2.0-beta.15": { resolution: { integrity: "fixed-integrity" } } },
    snapshots: { "node-pty@1.2.0-beta.15(patch_hash=fixed)": {} },
  });
  const workspace = JSON.stringify({ overrides: { "node-pty": "1.2.0-beta.15" } });

  const stage = createLockedStageFiles({
    lockfile,
    workspace,
    dependencies: { "node-pty": "^1.2.0-beta.15" },
    supportedArchitectures: { os: ["darwin"], cpu: ["arm64"] },
  });

  expect(JSON.parse(stage.lockfile).importers["."].dependencies["node-pty"]).toEqual({
    specifier: "1.2.0-beta.15",
    version: "1.2.0-beta.15(patch_hash=fixed)",
  });
});
