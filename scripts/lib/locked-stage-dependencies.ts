// @effect-diagnostics nodeBuiltinImport:off - Packaging validates the on-disk dependency stage.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as Schema from "effect/Schema";
import { fromYaml } from "@t3tools/shared/schemaYaml";

export function createLockedStageFiles(input: {
  lockfile: string;
  workspace: string;
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  supportedArchitectures: {
    os: ReadonlyArray<string>;
    cpu: ReadonlyArray<string>;
    libc?: ReadonlyArray<string> | undefined;
  };
  nodeLinker?: "hoisted";
}) {
  const lockfile = decodeLockfile(input.lockfile);
  const workspace = decodeYamlRecord(input.workspace);
  const dependencies = selectLockedDependencies(input.dependencies, lockfile);
  const devDependencies = selectLockedDependencies(input.devDependencies ?? {}, lockfile);
  const importer = { dependencies, devDependencies };
  const stageLockfile = { ...decodeYamlRecord(input.lockfile), importers: { ".": importer } };
  const stageWorkspace = { ...workspace };
  delete stageWorkspace.packages;
  stageWorkspace.supportedArchitectures = input.supportedArchitectures;
  if (input.nodeLinker) stageWorkspace.nodeLinker = input.nodeLinker;
  return {
    lockfile: `${JSON.stringify(stageLockfile, null, 2)}\n`,
    workspace: `${JSON.stringify(stageWorkspace, null, 2)}\n`,
  };
}

export function assertStagedDependencyVersions(stageDirectory: string, reviewedLockfile: string) {
  const lockfile = decodeLockfile(reviewedLockfile);
  const locked = new Set(Object.keys(lockfile.packages));
  const nodeModules = NodePath.join(stageDirectory, "node_modules");
  for (const entry of NodeFS.readdirSync(nodeModules, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || entry.name !== "package.json") continue;
    const file = NodePath.join(entry.parentPath, entry.name);
    const relative = NodePath.relative(nodeModules, file).replaceAll("\\", "/");
    if (
      !/(?:^|\/)node_modules\/(?:@[^/]+\/)?[^/]+\/package\.json$/.test(`node_modules/${relative}`)
    )
      continue;
    const manifest: { name?: string; version?: string } = JSON.parse(
      NodeFS.readFileSync(file, "utf8"),
    );
    if (!manifest.name || !manifest.version || !locked.has(`${manifest.name}@${manifest.version}`))
      throw new Error(`Staged dependency is absent from the reviewed lockfile: ${file}`);
  }
}

const LockedDependency = Schema.Struct({ specifier: Schema.String, version: Schema.String });
const DependencyGroup = Schema.Record(Schema.String, LockedDependency);
const Lockfile = Schema.Struct({
  importers: Schema.Record(
    Schema.String,
    Schema.Struct({
      dependencies: Schema.optional(DependencyGroup),
      devDependencies: Schema.optional(DependencyGroup),
      optionalDependencies: Schema.optional(DependencyGroup),
    }),
  ),
  packages: Schema.Record(Schema.String, Schema.Unknown),
  snapshots: Schema.Record(Schema.String, Schema.Unknown),
});
const decodeLockfile = Schema.decodeSync(fromYaml(Lockfile));
const decodeYamlRecord = Schema.decodeSync(fromYaml(Schema.Record(Schema.String, Schema.Unknown)));

function selectLockedDependencies(
  dependencies: Record<string, string>,
  lockfile: typeof Lockfile.Type,
) {
  const selected: Record<string, { specifier: string; version: string }> = {};
  for (const [name, specifier] of Object.entries(dependencies)) {
    const versions = new Set<string>();
    for (const importer of Object.values(lockfile.importers)) {
      const dependency =
        importer.dependencies?.[name] ??
        importer.devDependencies?.[name] ??
        importer.optionalDependencies?.[name];
      if (!dependency) continue;
      const matches =
        dependency.specifier === specifier || dependency.version.split("(")[0] === specifier;
      if (matches) versions.add(dependency.version);
    }
    if (versions.size === 0 && Object.hasOwn(lockfile.snapshots, `${name}@${specifier}`))
      versions.add(specifier);
    if (versions.size !== 1)
      throw new Error(
        `Stage dependency needs one reviewed lockfile resolution: ${name}@${specifier}`,
      );
    const version = [...versions][0]!;
    if (!Object.hasOwn(lockfile.snapshots, `${name}@${version}`))
      throw new Error(`Missing reviewed dependency closure: ${name}@${version}`);
    selected[name] = { specifier, version };
  }
  return selected;
}
