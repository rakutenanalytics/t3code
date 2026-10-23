// @effect-diagnostics nodeBuiltinImport:off - Built artifact inventory does not execute shipped code.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import {
  collectArtifactHosts,
  formatArtifactHostReview,
  reviewArtifactHosts,
  type ArtifactHostBaseline,
} from "./artifact-host-review.ts";
import { textFiles } from "./bundle-policy.ts";
import { runDesktopSmokeCommand } from "./desktop-smoke-command.ts";
import { jsonFile, root, writeBaseline, writeJsonFile } from "./repository.ts";

const args = process.argv.slice(2);
const directory = args[0];
if (!directory || directory.startsWith("--"))
  throw new Error(
    "Usage: node scripts/safe/artifact-scan.ts <extracted-bundle-or-dist> [--write-baseline | --accept-gated-literals --note <review>] [--report <json-path>]",
  );
if (!NodeFS.existsSync(directory)) throw new Error(`Artifact directory is missing: ${directory}`);
const acceptGatedLiterals = args.includes("--accept-gated-literals");
const writeHostBaseline = args.includes("--write-baseline");
const modes = [acceptGatedLiterals, writeHostBaseline].filter(Boolean);
if (modes.length > 1) throw new Error("Baseline-writing modes are mutually exclusive");
const note = argumentValue("--note");
if (acceptGatedLiterals && !note?.trim())
  throw new Error("--accept-gated-literals requires --note with the policy-gating review evidence");
const baselinePath = "security/artifact-hosts.json";
const baseline = jsonFile<ArtifactHostBaseline>(baselinePath);
const hosts = collectArtifactHosts(
  artifactTextFiles(NodePath.resolve(directory)),
  baseline.telemetryDomains,
);
const review = reviewArtifactHosts(
  hosts,
  baseline.seenHosts,
  baseline.gatedLiterals,
  baseline.telemetryDomains,
);

if (acceptGatedLiterals) {
  // Literal fingerprints do not prove reachability. Require the packaged policy check as well as review.
  runDesktopSmokeCommand(process.execPath, [
    "scripts/safe/policy-verify.ts",
    "--bundle",
    NodePath.resolve(directory),
  ]);
  const accepted = review.unapprovedForbiddenLiterals.map((literal) => ({
    ...literal,
    note: note!,
  }));
  writeBaseline(baselinePath, {
    ...baseline,
    gatedLiterals: [...baseline.gatedLiterals, ...accepted],
  });
  process.stdout.write(
    `Wrote ${accepted.length} gated literal(s) to ${baselinePath}. Review its diff before committing.\n`,
  );
} else if (writeHostBaseline) {
  const reviewedHosts = new Map(baseline.seenHosts.map((entry) => [entry.host, entry]));
  for (const { host, category } of review.unreviewedHosts) {
    reviewedHosts.set(host, { host, category });
  }
  const entries = [...reviewedHosts.values()].sort((left, right) =>
    left.host.localeCompare(right.host),
  );
  writeBaseline(baselinePath, { ...baseline, seenHosts: entries });
  process.stdout.write(`Wrote ${baselinePath}. Review its diff before committing.\n`);
} else {
  const summary = formatArtifactHostReview(hosts, review);
  if (review.passed) process.stdout.write(summary);
  else {
    process.stderr.write(summary);
    process.exitCode = 1;
  }
}

const reportPath = argumentValue("--report");
if (reportPath) {
  NodeFS.mkdirSync(NodePath.dirname(NodePath.resolve(root, reportPath)), { recursive: true });
  writeJsonFile(reportPath, { hosts, ...review });
}

function* artifactTextFiles(directory: string) {
  for (const file of textFiles(directory)) {
    yield {
      file: NodePath.relative(directory, file),
      text: NodeFS.readFileSync(file, "utf8"),
    };
  }
}

function argumentValue(flag: string) {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
  return value;
}
