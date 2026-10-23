// @effect-diagnostics nodeBuiltinImport:off - This audit runs before dependency installation.
import {
  isAuditedSource,
  isNetworkRelated,
  literalHosts,
  literalNetworkUrls,
} from "./egress-detection.ts";
import {
  digest,
  finishScan,
  jsonFile,
  repositoryFiles,
  sourceText,
  writeBaseline,
} from "./repository.ts";

interface EgressAllowlist {
  hosts: { host: string; purpose: string }[];
  reviewedSourceHosts: {
    file: string;
    host?: string;
    hostSha256?: string;
    justification: string;
  }[];
}
interface NetworkBaseline {
  justification: string;
  sites: Record<string, Record<string, number>>;
  literalHosts?: Record<string, string[]>;
  literalUrls?: Record<string, string[]>;
}

const allowlist = jsonFile<EgressAllowlist>("security/allowlist.json");
const baselinePath = "security/network-baseline.json";
const sites: NetworkBaseline["sites"] = {};
const reviewedBaseline = jsonFile<NetworkBaseline>(baselinePath);
const fileHosts: Record<string, string[]> = {};
const fileUrls: Record<string, string[]> = {};
const violations: string[] = [];
const sourceFiles = repositoryFiles().filter(isAuditedSource);
const allowedHosts = new Set(
  allowlist.hosts.filter((entry) => entry.purpose.trim()).map((entry) => entry.host),
);

for (const file of sourceFiles) {
  const text = sourceText(file);
  const fingerprint = digest(text);
  const hosts = [...literalHosts(text)].sort();
  const urls = literalNetworkUrls(text);
  if (urls.length > 0) fileUrls[file] = urls;
  if (hosts.length > 0) fileHosts[file] = hosts;
  for (const host of hosts) {
    const reviewed = allowlist.reviewedSourceHosts.some(
      (entry) =>
        entry.file === file &&
        (entry.host === host || entry.hostSha256 === digest(host)) &&
        entry.justification.trim(),
    );
    const unchangedReview =
      reviewedBaseline.sites[file]?.[fingerprint] &&
      reviewedBaseline.literalHosts?.[file]?.includes(host);
    if (
      !process.argv.includes("--write-baseline") &&
      !allowedHosts.has(host) &&
      !reviewed &&
      !unchangedReview
    )
      violations.push(`${file}: unreviewed host ${host}`);
  }
  // A whole-file fingerprint binds wrapped calls, aliases and computed destinations to their context.
  // Line-only hashes miss a changed argument on the next line (audit A5).
  if (isNetworkRelated(text) || hosts.length > 0 || urls.length > 0)
    sites[file] = { [fingerprint]: 1 };
}

if (process.argv.includes("--write-baseline")) {
  writeBaseline(baselinePath, {
    justification:
      "Whole-file network fingerprints, including generated and fixture source. Review the complete source diff and egress-inventory.md before refreshing; hashes are review prompts, not proof of zero egress.",
    sites,
    literalHosts: fileHosts,
    literalUrls: fileUrls,
  });
  process.stdout.write("Wrote network baseline. Review its diff before committing.\n");
} else {
  const baseline = reviewedBaseline;
  for (const [file, fingerprints] of Object.entries(sites)) {
    for (const [fingerprint, count] of Object.entries(fingerprints)) {
      if (count <= (baseline.sites[file]?.[fingerprint] ?? 0)) continue;
      violations.push(
        `${file}: new/changed network file ${fingerprint.slice(0, 12)}; review diff, gate or justify, then refresh baseline`,
      );
    }
  }
}
finishScan(
  "egress",
  violations,
  `${sourceFiles.length} source files; literal hosts and network statements reviewed`,
);
