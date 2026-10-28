import { digest } from "./repository.ts";

export function compareDependencyPackages(
  previous: Record<string, string>,
  current: Record<string, string>,
) {
  const versionsByName = new Map<string, string[]>();
  for (const id of Object.keys(previous)) {
    const { name, version } = packageIdentity(id);
    const versions = versionsByName.get(name) ?? [];
    versions.push(version);
    versionsByName.set(name, versions);
  }
  const changes: { id: string; kind: "added" | "changed"; previousVersions: string[] }[] = [];
  for (const [id, sha256] of Object.entries(current)) {
    if (previous[id] === sha256) continue;
    const { name } = packageIdentity(id);
    const previousVersions = versionsByName.get(name) ?? [];
    let kind: "added" | "changed" = "added";
    if (previous[id] !== undefined) kind = "changed";
    changes.push({ id, kind, previousVersions });
  }
  return changes;
}

export function parseDependencyLockfile(lockfile: string) {
  // pnpm 12 separates toolchain and application locks; this parser would scan only the first.
  const documents = lockfile.split(/^---[\t ]*(?:#.*)?\r?$/m).filter((document) => document.trim());
  if (documents.length !== 1)
    throw new Error("Unsupported lockfile with multiple YAML documents; review every document");
  if (!/^lockfileVersion: ['"]?9\.0['"]?$/m.test(lockfile))
    throw new Error("Unsupported lockfile version; review the dependency scanner");
  const packageBlocks = lockfileBlocks(lockfile, "packages");
  const packages: Record<string, string> = {};
  for (const [id, body] of packageBlocks) packages[id] = digest(body.trim());

  const graph = new Map<string, string[]>();
  for (const [id, body] of lockfileBlocks(lockfile, "snapshots")) {
    const dependencies: string[] = [];
    for (const match of body.matchAll(/^      (.+?): (.+)$/gm)) {
      dependencies.push(dependencyId(yamlScalar(match[1]!), yamlScalar(match[2]!)));
    }
    graph.set(id, dependencies);
  }

  const queue: string[][] = [];
  for (const [importer, body] of lockfileBlocks(lockfile, "importers")) {
    let dependencyName = "";
    for (const line of body.split("\n")) {
      const nameMatch = /^      (.+):$/.exec(line);
      if (nameMatch) dependencyName = yamlScalar(nameMatch[1]!);
      const versionMatch = /^        version: (.+)$/.exec(line);
      if (!versionMatch) continue;
      const version = yamlScalar(versionMatch[1]!);
      if (version.startsWith("link:")) continue;
      queue.push([importer, dependencyId(dependencyName, version)]);
    }
  }

  const dependentPaths: Record<string, string[]> = {};
  const visited = new Set<string>();
  for (let index = 0; index < queue.length; index++) {
    const path = queue[index]!;
    const id = path.at(-1)!;
    if (visited.has(id)) continue;
    visited.add(id);
    const packageId = id.split("(")[0]!;
    dependentPaths[packageId] ??= path;
    for (const dependency of graph.get(id) ?? []) queue.push([...path, dependency]);
  }
  return { packages, packageBlocks, dependentPaths };
}

export function packageIdentity(id: string) {
  const separator = id.indexOf("@", 1);
  if (separator === -1) return { name: id, version: "unknown source" };
  return { name: id.slice(0, separator), version: id.slice(separator + 1) };
}

// Only pnpm's generated v9 block layout is accepted. This keeps pre-install scans dependency-free.
function lockfileBlocks(lockfile: string, sectionName: string) {
  const section = lockfile.split(`\n${sectionName}:\n`)[1]?.split(/^\S/m)[0];
  if (section === undefined) throw new Error(`Missing lockfile section: ${sectionName}`);
  const headers = [...section.matchAll(/^  (\S.*):(?: \{\})?$/gm)];
  const blocks = new Map<string, string>();
  for (const [index, header] of headers.entries()) {
    const body = section.slice(header.index + header[0].length, headers[index + 1]?.index);
    blocks.set(yamlScalar(header[1]!), body);
  }
  return blocks;
}

function dependencyId(name: string, version: string) {
  if (/^(?:@[^/]+\/)?[^@():/]+@/.test(version)) return version;
  return `${name}@${version}`;
}

function yamlScalar(value: string) {
  if (value.startsWith('"')) return JSON.parse(value) as string;
  if (value.startsWith("'")) return value.slice(1, -1).replaceAll("''", "'");
  return value;
}
