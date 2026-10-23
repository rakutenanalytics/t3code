import { literalNetworkUrls } from "./egress-detection.ts";

export function collectArtifactHosts(files: Iterable<{ file: string; text: string }>) {
  const hostFiles = new Map<string, Set<string>>();
  for (const { file, text } of files) {
    const hosts = new Set<string>();
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
      if (isForbiddenArtifactHost(host)) hosts.add(host);
    }
    for (const url of literalNetworkUrls(text)) {
      try {
        hosts.add(new URL(url).hostname);
      } catch {
        // Bundled strings can contain incomplete URL templates; the authority match retains their host.
      }
    }
    for (const host of hosts) {
      const paths = hostFiles.get(host) ?? new Set<string>();
      paths.add(file);
      hostFiles.set(host, paths);
    }
  }
  const inventory: ArtifactHost[] = [];
  for (const [host, paths] of hostFiles) {
    inventory.push({
      host,
      category: categorizeArtifactHost(host),
      sampleFile: paths.values().next().value!,
      fileCount: paths.size,
    });
  }
  return inventory.sort((left, right) => left.host.localeCompare(right.host));
}

export function reviewArtifactHosts(hosts: ArtifactHost[], baseline: ReviewedArtifactHost[]) {
  const reviewedHosts = new Set(baseline.map((entry) => entry.host));
  const newHosts = hosts.filter((entry) => !reviewedHosts.has(entry.host));
  const forbiddenHosts = hosts.filter((entry) => isForbiddenArtifactHost(entry.host));
  const passed = newHosts.length === 0 && forbiddenHosts.length === 0;
  return { newHosts, forbiddenHosts, passed };
}

export function formatArtifactHostReview(
  hosts: ArtifactHost[],
  review: ReturnType<typeof reviewArtifactHosts>,
  limit = 100,
) {
  const status = review.passed ? "PASS" : "FAIL";
  const lines = [
    `${status} artifact hosts: ${hosts.length} unique hosts; ${review.newHosts.length} NEW; ${review.forbiddenHosts.length} forbidden`,
  ];
  const categoryCounts = new Map<ArtifactHostCategory, number>();
  for (const { category } of hosts) {
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }
  for (const [category, count] of categoryCounts) lines.push(`  ${category}: ${count}`);
  // Forbidden entries stay visible even if a baseline mistakenly includes them.
  for (const entry of review.forbiddenHosts.slice(0, limit)) {
    lines.push(`  FORBIDDEN ${entry.host.slice(0, 300)}: ${entry.sampleFile.slice(0, 300)}`);
  }
  if (review.forbiddenHosts.length > limit) {
    lines.push(`  ${review.forbiddenHosts.length - limit} additional FORBIDDEN host(s) omitted`);
  }
  for (const entry of review.newHosts.slice(0, limit)) {
    lines.push(
      `  NEW ${entry.host.slice(0, 300)} [${entry.category}]: ${entry.sampleFile.slice(0, 300)}`,
    );
  }
  if (review.newHosts.length > limit) {
    lines.push(`  ${review.newHosts.length - limit} additional NEW host(s) omitted`);
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

interface ArtifactHost extends ReviewedArtifactHost {
  sampleFile: string;
  fileCount: number;
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

function isForbiddenArtifactHost(host: string) {
  return matchesDomain(host, [
    "t3.codes",
    "pingdotgg.com",
    "posthog.com",
    "sentry.io",
    "sentry.dev",
    "segment.io",
    "segment.com",
    "amplitude.com",
    "mixpanel.com",
    "datadoghq.com",
    "bugsnag.com",
    "rollbar.com",
    "axiom.co",
  ]);
}

function matchesDomain(host: string, domains: string[]) {
  const normalized = host.toLowerCase().replace(/\.$/, "");
  return domains.some((domain) => normalized === domain || normalized.endsWith(`.${domain}`));
}
