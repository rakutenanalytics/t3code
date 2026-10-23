// @effect-diagnostics nodeBuiltinImport:off - Built artifact inventory does not execute shipped code.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import {
  collectArtifactHosts,
  formatArtifactHostReview,
  reviewArtifactHosts,
  type ReviewedArtifactHost,
} from "./artifact-host-review.ts";
import { textFiles } from "./bundle-policy.ts";
import { jsonFile, writeBaseline } from "./repository.ts";

const args = process.argv.slice(2);
const directory = args.find((argument) => !argument.startsWith("--"));
if (!directory)
  throw new Error(
    "Usage: node scripts/safe/artifact-scan.ts <extracted-bundle-or-dist> [--write-baseline]",
  );
if (!NodeFS.existsSync(directory)) throw new Error(`Artifact directory is missing: ${directory}`);
const baselinePath = "security/artifact-hosts.json";
const storedBaseline = jsonFile<ReviewedArtifactHost[] | { hosts: Record<string, string> }>(
  baselinePath,
);
// The initial empty URL inventory remains unapproved until the host list is reviewed.
const baseline = Array.isArray(storedBaseline) ? storedBaseline : [];
const hosts = collectArtifactHosts(artifactTextFiles(NodePath.resolve(directory)));
const review = reviewArtifactHosts(hosts, baseline);

if (args.includes("--write-baseline") && review.forbiddenHosts.length === 0) {
  const reviewedHosts = new Map(baseline.map((entry) => [entry.host, entry]));
  for (const { host, category } of hosts) {
    if (!reviewedHosts.has(host)) reviewedHosts.set(host, { host, category });
  }
  const entries = [...reviewedHosts.values()].sort((left, right) =>
    left.host.localeCompare(right.host),
  );
  writeBaseline(baselinePath, entries);
  process.stdout.write(`Wrote ${baselinePath}. Review its diff before committing.\n`);
} else {
  const summary = formatArtifactHostReview(hosts, review);
  if (review.passed) process.stdout.write(summary);
  else {
    process.stderr.write(summary);
    process.exitCode = 1;
  }
}

function* artifactTextFiles(directory: string) {
  for (const file of textFiles(directory)) {
    yield {
      file: NodePath.relative(directory, file),
      text: NodeFS.readFileSync(file, "utf8"),
    };
  }
}
