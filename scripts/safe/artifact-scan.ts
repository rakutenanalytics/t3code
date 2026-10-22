// @effect-diagnostics nodeBuiltinImport:off - Built artifact inventory does not execute shipped code.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import { literalHosts, literalNetworkUrls } from "./egress-detection.ts";
import { textFiles } from "./bundle-policy.ts";
import { finishScan, jsonFile, writeBaseline } from "./repository.ts";

const directory = process.argv[2];
if (!directory)
  throw new Error(
    "Usage: node scripts/safe/artifact-scan.ts <extracted-bundle-or-dist> [--write-baseline]",
  );
const baselinePath = "security/artifact-hosts.json";
const baseline = jsonFile<{ urls: Record<string, string>; hosts: Record<string, string> }>(
  baselinePath,
);
const sourceBaseline = jsonFile<{
  literalUrls?: Record<string, string[]>;
  literalHosts?: Record<string, string[]>;
}>("security/network-baseline.json");
const reviewedSourceUrls = new Set(Object.values(sourceBaseline.literalUrls ?? {}).flat());
const reviewedSourceHosts = new Set(Object.values(sourceBaseline.literalHosts ?? {}).flat());
if (!NodeFS.existsSync(directory)) throw new Error(`Artifact directory is missing: ${directory}`);
const urls = new Map<string, string[]>();
const hosts = new Map<string, string[]>();
for (const file of textFiles(NodePath.resolve(directory))) {
  const text = NodeFS.readFileSync(file, "utf8");
  const relative = NodePath.relative(NodePath.resolve(directory), file);
  for (const url of literalNetworkUrls(text)) {
    const files = urls.get(url) ?? [];
    if (!files.includes(relative)) files.push(relative);
    urls.set(url, files);
  }
  for (const host of literalHosts(text)) {
    const files = hosts.get(host) ?? [];
    if (!files.includes(relative)) files.push(relative);
    hosts.set(host, files);
  }
}
const inventory = {
  urls: Object.fromEntries([...urls].sort(([left], [right]) => left.localeCompare(right))),
  hosts: Object.fromEntries([...hosts].sort(([left], [right]) => left.localeCompare(right))),
};
if (process.argv.includes("--write-baseline")) {
  // Candidates stay separate from approvals: building an artifact cannot approve its own endpoints.
  writeBaseline(`${baselinePath}.candidates.json`, inventory);
  process.stdout.write(
    `Wrote ${baselinePath}.candidates.json; review and justify each new URL in ${baselinePath}\n`,
  );
}
const violations: string[] = [];
for (const [url, files] of urls) {
  if (reviewedSourceUrls.has(url) || baseline.urls[url]?.trim()) continue;
  violations.push(`${url}: unreviewed bundled destination in ${files.slice(0, 3).join(", ")}`);
}
for (const [host, files] of hosts) {
  if (reviewedSourceHosts.has(host) || baseline.hosts[host]?.trim()) continue;
  violations.push(`${host}: unreviewed bundled host in ${files.slice(0, 3).join(", ")}`);
}
finishScan(
  "artifact URLs and hosts",
  violations,
  `${urls.size} literal URLs and ${hosts.size} hosts match reviewed source or justified artifact entries`,
);
