// @effect-diagnostics nodeBuiltinImport:off - Hash the deterministic Apple Silicon release-stage locks without installing.
import * as Schema from "effect/Schema";
import { fromYaml } from "@t3tools/shared/schemaYaml";
import { createLockedStageFiles } from "../lib/locked-stage-dependencies.ts";
import { resolveCatalogDependencies } from "../lib/resolve-catalog.ts";
import { selectCliRuntimeExternalDependencies } from "../lib/cli-external-packages.ts";
import { selectDesktopRuntimeExternalDependencies } from "../lib/desktop-external-packages.ts";
import { digest, finishScan, jsonFile, sourceText, writeBaseline } from "./repository.ts";

const lockfile = sourceText("pnpm-lock.yaml");
const workspace = sourceText("pnpm-workspace.yaml");
const config = Schema.decodeSync(
  fromYaml(Schema.Struct({ catalog: Schema.Record(Schema.String, Schema.String) })),
)(workspace);
const server = jsonFile<{ dependencies: Record<string, string> }>("apps/server/package.json");
const desktop = jsonFile<{ dependencies: Record<string, string> }>("apps/desktop/package.json");
const serverDependencies = resolveCatalogDependencies(
  server.dependencies,
  config.catalog,
  "apps/server",
);
const desktopDependencies = resolveCatalogDependencies(
  desktop.dependencies,
  config.catalog,
  "apps/desktop",
);
const cliDependencies = selectCliRuntimeExternalDependencies(serverDependencies);
cliDependencies["@ff-labs/fff-bin-darwin-arm64"] = serverDependencies["@ff-labs/fff-node"]!;
const mergedDependencies = {
  ...cliDependencies,
  ...selectDesktopRuntimeExternalDependencies(desktopDependencies),
};
const supportedArchitectures = { os: ["darwin"], cpu: ["arm64"] };
const desktopFiles = createLockedStageFiles({
  lockfile,
  workspace,
  dependencies: mergedDependencies,
  devDependencies: { electron: desktopDependencies.electron! },
  supportedArchitectures,
});
const cliFiles = createLockedStageFiles({
  lockfile,
  workspace,
  dependencies: cliDependencies,
  supportedArchitectures,
  nodeLinker: "hoisted",
});
const current = {
  desktopDarwinArm64: digest(desktopFiles.lockfile),
  cliDarwinArm64: digest(cliFiles.lockfile),
};
const baselinePath = "security/stage-lock-baseline.json";
if (process.argv.includes("--write-baseline")) {
  writeBaseline(baselinePath, current);
  process.stdout.write(
    "Wrote projected stage dependency lock hashes; review root resolutions before committing.\n",
  );
} else {
  const baseline = jsonFile<Record<string, string>>(baselinePath);
  const violations: string[] = [];
  for (const [stage, fingerprint] of Object.entries(current)) {
    if (baseline[stage] !== fingerprint)
      violations.push(
        `${stage}: generated stage dependency lock changed; review projection and refresh baseline`,
      );
  }
  finishScan(
    "stage dependency locks",
    violations,
    "DMG and CLI use reviewed deterministic lock projections",
  );
}
