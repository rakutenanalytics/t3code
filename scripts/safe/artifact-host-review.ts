import { digest } from "./repository.ts";
import { literalNetworkUrls } from "./egress-detection.ts";

export function collectArtifactHosts(
  files: Iterable<{ file: string; text: string }>,
  telemetryDomains: string[] = [],
) {
  const hostFiles = new Map<string, Map<string, ArtifactLiteral>>();
  for (const { file, text } of files) {
    const hosts = new Set<string>();
    const encodedHostUrls = new Map<string, Set<string>>();
    for (const match of text.matchAll(/(?:https?|wss?):\/\/([a-zA-Z0-9.-]+)(?=[:/\s'"`?#)]|$)/g)) {
      hosts.add(match[1]!.toLowerCase());
    }
    // A minified line can contain thousands of dotted identifiers. Require the host's own property.
    for (const match of text.matchAll(
      /\b(?:host(?:name)?|origin|endpoint|domain)["'`]?\s*[:=]\s*["'`]([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)["'`]/gi,
    )) {
      hosts.add(match[1]!.toLowerCase());
    }
    // Denied domains also fail as bare constants, regardless of the surrounding property's name.
    for (const match of text.matchAll(/["'`]([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+\.?)["'`]/g)) {
      const host = match[1]!.toLowerCase();
      if (isBlockedArtifactHost(host, telemetryDomains)) hosts.add(host);
    }
    for (const url of literalNetworkUrls(text)) {
      try {
        const host = new URL(url).hostname;
        hosts.add(host);
        // URL normalizes encoded hosts; fingerprints must retain the actual bundle spelling.
        // https://url.spec.whatwg.org/#concept-host-parser
        if (!url.toLowerCase().includes(host.toLowerCase())) {
          const spellings = encodedHostUrls.get(host) ?? new Set<string>();
          spellings.add(url);
          encodedHostUrls.set(host, spellings);
        }
      } catch {
        // Bundled strings can contain incomplete URL templates; the authority match retains their host.
      }
    }
    for (const host of hosts) {
      const literals = hostFiles.get(host) ?? new Map<string, ArtifactLiteral>();
      const spellings = [host, ...(encodedHostUrls.get(host) ?? [])];
      const escapedSpellings = spellings.map((spelling) =>
        spelling.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      );
      const hostPattern = escapedSpellings.join("|");
      for (const match of text.matchAll(
        new RegExp(`(?<![a-z0-9.-])(?:${hostPattern})(?![a-z0-9.-])`, "gi"),
      )) {
        const context = text.slice(
          Math.max(0, match.index - 80),
          match.index + match[0].length + 80,
        );
        const contextSha256 = digest(normalizeChunkNames(context));
        const filePattern = normalizeChunkNames(file);
        const literal = { file, filePattern, contextSha256 };
        literals.set(`${file}:${contextSha256}`, literal);
      }
      hostFiles.set(host, literals);
    }
  }
  const inventory: ArtifactHost[] = [];
  for (const [host, paths] of hostFiles) {
    inventory.push({
      host,
      category: categorizeArtifactHost(host),
      sampleFile: paths.values().next().value!.file,
      fileCount: new Set([...paths.values()].map((literal) => literal.file)).size,
      literals: [...paths.values()],
    });
  }
  return inventory.sort((left, right) => left.host.localeCompare(right.host));
}

export function reviewArtifactHosts(
  hosts: ArtifactHost[],
  baseline: ReviewedArtifactHost[],
  gatedLiterals: GatedArtifactLiteral[] = [],
  telemetryDomains: string[] = [],
  providerSdkPaths: string[] = [],
) {
  const reviewedHosts = new Set(baseline.map((entry) => entry.host));
  const forbiddenHosts: ArtifactHost[] = [];
  for (const entry of hosts) {
    if (!isBlockedArtifactHost(entry.host, telemetryDomains)) continue;
    const literals = entry.literals.filter((literal) => {
      if (isT3OwnedHost(entry.host)) return true;
      return !isProviderSdkPath(literal.file, providerSdkPaths);
    });
    if (literals.length === 0) continue;
    const sampleFile = literals[0]!.file;
    const fileCount = new Set(literals.map((literal) => literal.file)).size;
    forbiddenHosts.push({ ...entry, literals, sampleFile, fileCount });
  }
  const unapprovedForbiddenLiterals: GatedArtifactLiteral[] = [];
  for (const entry of forbiddenHosts) {
    for (const literal of entry.literals) {
      const accepted = gatedLiterals.some(
        (gated) =>
          gated.host === entry.host &&
          gated.filePattern === literal.filePattern &&
          gated.contextSha256 === literal.contextSha256 &&
          gated.note.trim().length > 0,
      );
      if (!accepted) unapprovedForbiddenLiterals.push({ host: entry.host, ...literal, note: "" });
    }
  }
  // Seen hosts are informational; only the context-bound ledger can approve denied literals.
  const unreviewedHosts = hosts.filter(
    (entry) =>
      !isBlockedArtifactHost(entry.host, telemetryDomains) && !reviewedHosts.has(entry.host),
  );
  const passed = unapprovedForbiddenLiterals.length === 0;
  return { unreviewedHosts, forbiddenHosts, unapprovedForbiddenLiterals, passed };
}

export function formatArtifactHostReview(
  hosts: ArtifactHost[],
  review: ReturnType<typeof reviewArtifactHosts>,
  limit = 20,
) {
  const status = review.passed ? "PASS" : "FAIL";
  const lines = [
    `${status} artifact hosts: ${hosts.length} unique hosts; ${review.unreviewedHosts.length} NEW; ${review.forbiddenHosts.length} forbidden; ${review.unapprovedForbiddenLiterals.length} unapproved literals`,
  ];
  const categoryCounts = new Map<ArtifactHostCategory, number>();
  for (const { category } of hosts) {
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }
  for (const [category, count] of categoryCounts) lines.push(`  ${category}: ${count}`);
  // Accepted forbidden literals remain visible so the summary never implies their removal.
  for (const entry of review.forbiddenHosts.slice(0, limit)) {
    lines.push(`  FORBIDDEN ${entry.host.slice(0, 300)}: ${entry.sampleFile.slice(0, 300)}`);
  }
  if (review.forbiddenHosts.length > limit) {
    lines.push(`  ${review.forbiddenHosts.length - limit} additional FORBIDDEN host(s) omitted`);
  }
  for (const entry of review.unapprovedForbiddenLiterals.slice(0, limit)) {
    lines.push(`  UNAPPROVED ${entry.host}: ${entry.file} contextSha256=${entry.contextSha256}`);
  }
  if (review.unapprovedForbiddenLiterals.length > limit) {
    lines.push(
      `  ${review.unapprovedForbiddenLiterals.length - limit} additional UNAPPROVED literal(s) omitted`,
    );
  }
  for (const entry of review.unreviewedHosts.slice(0, limit)) {
    lines.push(
      `  NEW ${entry.host.slice(0, 300)} [${entry.category}]: ${entry.sampleFile.slice(0, 300)}`,
    );
  }
  if (review.unreviewedHosts.length > limit) {
    lines.push(`  ${review.unreviewedHosts.length - limit} additional NEW host(s) omitted`);
  }
  return `${lines.join("\n")}\n`;
}

export type ArtifactHostCategory =
  | "schema/namespace"
  | "docs/source/license"
  | "package-metadata"
  | "unexpected/other";

export interface ReviewedArtifactHost {
  host: string;
  category: ArtifactHostCategory;
  note?: string;
}

export interface GatedArtifactLiteral {
  host: string;
  file: string;
  filePattern: string;
  contextSha256: string;
  note: string;
}

export interface ArtifactHostBaseline {
  justification: string;
  seenHosts: ReviewedArtifactHost[];
  telemetryDomains: string[];
  providerSdkPaths: string[];
  gatedLiterals: GatedArtifactLiteral[];
}

interface ArtifactHost extends ReviewedArtifactHost {
  sampleFile: string;
  fileCount: number;
  literals: ArtifactLiteral[];
}

function categorizeArtifactHost(host: string): ArtifactHostCategory {
  if (matchesDomain(host, ["w3.org", "json-schema.org", "schemastore.org", "whatwg.org"])) {
    return "schema/namespace";
  }
  if (
    matchesDomain(host, [
      "github.com",
      "mozilla.org",
      "opensource.org",
      "spdx.org",
      "creativecommons.org",
      "gnu.org",
    ])
  ) {
    return "docs/source/license";
  }
  if (matchesDomain(host, ["npmjs.com", "npmjs.org"])) return "package-metadata";
  return "unexpected/other";
}

type ArtifactLiteral = Omit<GatedArtifactLiteral, "host" | "note">;

function isBlockedArtifactHost(host: string, telemetryDomains: string[]) {
  if (isT3OwnedHost(host)) return true;
  // Documentation under telemetry vendors is reference material, not an ingestion endpoint.
  if (/^(?:docs|documentation)\./.test(host)) return false;
  return matchesDomain(host, telemetryDomains);
}

function isT3OwnedHost(host: string) {
  return matchesDomain(host, ["t3.codes", "pingdotgg.com"]);
}

function isProviderSdkPath(file: string, prefixes: string[]) {
  // Archive roots vary by release; match an entire directory prefix at any depth.
  return prefixes.some((prefix) => `/${file}`.includes(`/${prefix}`));
}

function normalizeChunkNames(value: string) {
  // Bundlers change chunk suffixes after unrelated edits. Keep call-site context in the fingerprint.
  return value.replace(/[-.][A-Za-z0-9_-]{8}(?=\.[cm]?js\b)/g, "-*");
}

function matchesDomain(host: string, domains: string[]) {
  const normalized = host.toLowerCase().replace(/\.$/, "");
  return domains.some((domain) => normalized === domain || normalized.endsWith(`.${domain}`));
}
