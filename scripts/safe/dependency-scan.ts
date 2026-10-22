import {
  digest,
  finishScan,
  jsonFile,
  repositoryFiles,
  sourceText,
  writeBaseline,
} from "./repository.ts";

interface PackageManifest {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}
interface DependencyBaseline {
  lockfileSha256: string;
  workspaceSha256: string;
  packages: string[];
  manifests: Record<string, PackageManifest>;
}

const lockfile = sourceText("pnpm-lock.yaml");
const packageSection = lockfile.split("\npackages:\n")[1]?.split("\nsnapshots:\n")[0];
if (packageSection === undefined)
  throw new Error("Unsupported lockfile layout; review dependency scanner before updating");
const packages = [...packageSection.matchAll(/^  (\S.*):$/gm)].map((match) => match[1]!).sort();
const manifests: DependencyBaseline["manifests"] = {};
for (const file of repositoryFiles().filter(
  (file) => /(^|\/)package.json$/.test(file) && !file.startsWith(".repos/"),
)) {
  const manifest = jsonFile<PackageManifest>(file);
  manifests[file] = {
    scripts: manifest.scripts ?? {},
    dependencies: manifest.dependencies ?? {},
    devDependencies: manifest.devDependencies ?? {},
    peerDependencies: manifest.peerDependencies ?? {},
    optionalDependencies: manifest.optionalDependencies ?? {},
  };
}
const current: DependencyBaseline = {
  lockfileSha256: digest(lockfile),
  workspaceSha256: digest(sourceText("pnpm-workspace.yaml")),
  packages,
  manifests,
};
const baselinePath = "security/dependency-baseline.json";
if (process.argv.includes("--write-baseline")) {
  writeBaseline(baselinePath, current);
  process.stdout.write(
    "Wrote dependency baseline. Review lockfile, lifecycle scripts, binary downloads and build permissions before committing.\n",
  );
} else {
  const baseline = jsonFile<DependencyBaseline>(baselinePath);
  const violations: string[] = [];
  for (const name of packages) {
    if (!baseline.packages.includes(name)) violations.push(`new locked dependency: ${name}`);
  }
  for (const [file, manifest] of Object.entries(manifests)) {
    if (JSON.stringify(manifest) !== JSON.stringify(baseline.manifests[file]))
      violations.push(
        `${file}: dependency or script changed; inspect preinstall/install/postinstall and binary downloads`,
      );
  }
  if (current.lockfileSha256 !== baseline.lockfileSha256)
    violations.push(
      "lockfile changed: review versions, integrity, tarballs, requiresBuild and transitive lifecycle/download behavior",
    );
  if (current.workspaceSha256 !== baseline.workspaceSha256)
    violations.push(
      "pnpm-workspace.yaml changed: review catalogs, overrides and allowed lifecycle builds",
    );
  finishScan(
    "dependencies",
    violations,
    `${packages.length} locked packages; ${Object.keys(manifests).length} manifests; scripts, lockfile and build permissions unchanged`,
  );
}
