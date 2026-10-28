// @effect-diagnostics globalDate:off - Standalone audit uses wall-clock package age before installation.
import {
  compareDependencyPackages,
  packageIdentity,
  parseDependencyLockfile,
} from "./dependency-lockfile.ts";
import { queryDependencyRegistry, registryReview } from "./dependency-registry.ts";
import {
  digest,
  fileDigest,
  finishScan,
  jsonFile,
  repositoryFiles,
  sourceText,
  writeBaseline,
  writeJsonFile,
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
  supplyChainFiles: Record<string, string>;
  packages: Record<string, string>;
  manifests: Record<string, PackageManifest>;
}
interface ReviewedException {
  package: string;
  resolutionSha256: string;
  reason: string;
  date: string;
}

const online = process.argv.includes("--online");
const write = process.argv.includes("--write-baseline");
const ageOnly = process.argv.includes("--age-only");
if (ageOnly && (!online || write))
  throw new Error("--age-only requires --online and cannot write a baseline");
const baselinePath = argumentValue("--baseline", "security/dependency-baseline.json");
const reportPath = argumentValue("--report", "security/young-or-unknown.json");
const lockfile = sourceText("pnpm-lock.yaml");
const workspace = sourceText("pnpm-workspace.yaml");
const minimumAge = /^minimumReleaseAge: (\d+)$/m.exec(workspace);
if (!minimumAge) throw new Error("Set an explicit minimumReleaseAge in pnpm-workspace.yaml");
const minimumAgeMinutes = Number(minimumAge[1]);
const { packages, packageBlocks, dependentPaths } = parseDependencyLockfile(lockfile);
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
const supplyChainFiles: Record<string, string> = {};
for (const file of repositoryFiles()) {
  if (
    /(?:^|\/)(?:\.npmrc|\.pnpmfile\.[cm]?js|Cargo.lock)$/.test(file) ||
    file === "security/stage-lock-baseline.json" ||
    file.startsWith("patches/") ||
    /^apps\/mobile\/deps\/.*\.tgz$/.test(file)
  )
    supplyChainFiles[file] = fileDigest(file);
}
const current: DependencyBaseline = {
  supplyChainFiles,
  lockfileSha256: digest(lockfile),
  workspaceSha256: digest(workspace),
  packages,
  manifests,
};
const baseline = jsonFile<DependencyBaseline>(baselinePath);
// The old format had only IDs. Migrate it only while its reviewed lockfile is unchanged.
if (Array.isArray(baseline.packages)) {
  if (current.lockfileSha256 !== baseline.lockfileSha256)
    throw new Error("Migrate the dependency baseline before changing the lockfile");
  baseline.packages = packages;
}
const changes = compareDependencyPackages(baseline.packages, packages);
const registryChanges = changes.filter((change) => {
  const { version } = packageIdentity(change.id);
  const packageBlock = packageBlocks.get(change.id)!;
  return (
    /^\d+\.\d+\.\d+(?:[-+][\w.+-]+)?$/.test(version) &&
    !/\b(?:tarball|directory|repo|commit|type):/.test(packageBlock)
  );
});
const exceptions = jsonFile<ReviewedException[]>("security/dependency-exceptions.json");
for (const exception of exceptions) {
  if (
    !exception.reason?.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(exception.date) ||
    !/^[a-f0-9]{64}$/.test(exception.resolutionSha256)
  )
    throw new Error(`Incomplete reviewed dependency exception: ${exception.package}`);
}

const metadata = new Map<string, Awaited<ReturnType<typeof queryDependencyRegistry>> | null>();
if (online) {
  const names = [...new Set(registryChanges.map((change) => packageIdentity(change.id).name))];
  // Four bounded registry reads at a time; never execute package code or inherit npm credentials.
  for (let index = 0; index < names.length; index += 4) {
    await Promise.all(
      names.slice(index, index + 4).map(async (name) => {
        try {
          metadata.set(name, await queryDependencyRegistry(name));
        } catch {
          metadata.set(name, null);
          process.stderr.write(`Registry lookup failed for ${name}; publication age unresolved\n`);
        }
      }),
    );
  }
}

const now = Date.now();
const reviews = [];
for (const change of changes) {
  const { name, version } = packageIdentity(change.id);
  process.stdout.write(
    `${change.kind} ${change.id}; previous: ${change.previousVersions.join(", ") || "none"}\n`,
  );
  if (!registryChanges.includes(change)) {
    process.stdout.write("  non-registry source: review changed supply-chain input in the diff\n");
    continue;
  }
  const reasons: string[] = [];
  const registryMetadata = metadata.get(name);
  let registry = null;
  if (registryMetadata) {
    registry = registryReview(
      registryMetadata,
      version,
      change.previousVersions,
      minimumAgeMinutes,
      now,
    );
    if (!registry.requiresAgeReview) {
      process.stdout.write(
        `  accepted by age: ${registry.ageMinutes} minutes >= ${minimumAgeMinutes}\n`,
      );
      continue;
    }
    reasons.push(...registry.reasons);
  } else if (online)
    reasons.push("unknown publish time and lifecycle metadata: registry lookup failed");
  else reasons.push("unknown publish time: needs --online age lookup");

  const resolutionSha256 = packages[change.id]!;
  const approved = exceptions.some(
    (exception) =>
      exception.package === change.id && exception.resolutionSha256 === resolutionSha256,
  );
  if (approved && registry && registry.ageMinutes !== null) {
    process.stdout.write(`  reviewed exception: ${change.id}\n`);
    continue;
  }
  const dependentPath = dependentPaths[change.id] ?? ["unresolved importer path", change.id];
  const review = {
    name,
    version,
    ageMinutes: registry?.ageMinutes ?? null,
    publishedAt: registry?.publishedAt ?? null,
    previousVersions: change.previousVersions,
    resolutionSha256,
    dependentPath,
    lifecycleScripts: registry?.lifecycleScripts ?? null,
    maintainers: registry?.maintainers ?? null,
    repository: registry?.repository ?? null,
    tarball: registry?.tarball ?? null,
    registryIntegrity: registry?.registryIntegrity ?? null,
    reasons,
  };
  reviews.push(review);
  for (const reason of reasons) process.stdout.write(`  review: ${reason}\n`);
}
// Reports also run before installation, when the baseline formatter is unavailable.
writeJsonFile(reportPath, {
  mode: online ? "online" : "offline",
  minimumAgeMinutes,
  packages: reviews,
});
process.stdout.write(
  `Review report: ${reportPath}; ${reviews.length} package(s) need age resolution or approved exceptions\n`,
);

if (ageOnly) {
  const unresolvedAges = reviews.map(
    (review) => `${review.name}@${review.version}: ${review.reasons.join("; ")}`,
  );
  finishScan(
    "dependency release age",
    unresolvedAges,
    "changed registry releases meet the age policy or have exact approved exceptions",
  );
  process.exit(process.exitCode ?? 0);
}

const violations: string[] = [];
for (const match of workspace.matchAll(/^  ["']?([^"'\n]+?)["']?: true\s*$/gm)) {
  const build = match[1]!;
  if (!Object.hasOwn(packages, build))
    violations.push(`allowBuilds grant must name an exact locked package version: ${build}`);
}
if (JSON.stringify(supplyChainFiles) !== JSON.stringify(baseline.supplyChainFiles ?? {}))
  violations.push(
    "supply-chain inputs changed: review patches, hooks, vendored archives and all Cargo.lock files",
  );
for (const [file, manifest] of Object.entries(manifests)) {
  if (JSON.stringify(manifest) !== JSON.stringify(baseline.manifests[file]))
    violations.push(
      `${file}: dependency or script changed; inspect lifecycle scripts and binary downloads`,
    );
  for (const stage of ["preinstall", "install", "postinstall", "prepare"]) {
    const command = manifest.scripts?.[stage];
    if (!command || command === baseline.manifests[file]?.scripts?.[stage]) continue;
    violations.push(`${file}: new/changed ${stage}: ${command}; inspect install-time network`);
  }
}
if (current.lockfileSha256 !== baseline.lockfileSha256)
  violations.push("lockfile changed: review package changes, removed entries and dependency paths");
if (current.workspaceSha256 !== baseline.workspaceSha256)
  violations.push(
    "pnpm-workspace.yaml changed: review catalogs, supply-chain policy and allowed builds",
  );
if (reviews.length > 0)
  violations.push(`${reviews.length} dependency age check(s) unresolved; see ${reportPath}`);
if (
  write &&
  reviews.length === 0 &&
  !violations.some((violation) => violation.startsWith("allowBuilds"))
) {
  writeBaseline(baselinePath, current);
  process.stdout.write("Wrote dependency baseline. Inspect its diff before committing.\n");
} else {
  finishScan(
    "dependencies",
    violations,
    `${Object.keys(packages).length} locked packages; ${Object.keys(manifests).length} manifests; scripts, lockfile and build permissions unchanged`,
  );
}

function argumentValue(flag: string, fallback: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
  return value;
}
