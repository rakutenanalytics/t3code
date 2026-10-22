// @effect-diagnostics nodeBuiltinImport:off - This audit runs before dependency installation.
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
}

const allowlist = jsonFile<EgressAllowlist>("security/allowlist.json");
const baselinePath = "security/network-baseline.json";
const sites: NetworkBaseline["sites"] = {};
const violations: string[] = [];
const sourceFiles = repositoryFiles().filter(isAuditedSource);
const allowedHosts = new Set(
  allowlist.hosts.filter((entry) => entry.purpose.trim()).map((entry) => entry.host),
);

for (const file of sourceFiles) {
  const fingerprints: Record<string, number> = {};
  const lines = sourceText(file).split("\n");
  for (const [index, line] of lines.entries()) {
    for (const host of literalHosts(line)) {
      const reviewed = allowlist.reviewedSourceHosts.some(
        (entry) =>
          entry.file === file &&
          (entry.host === host || entry.hostSha256 === digest(host)) &&
          entry.justification.trim(),
      );
      if (!allowedHosts.has(host) && !reviewed)
        violations.push(`${file}:${index + 1}: unreviewed host ${host}`);
    }
    if (!isNetworkRelated(line)) continue;
    const fingerprint = digest(line.trim());
    fingerprints[fingerprint] = (fingerprints[fingerprint] ?? 0) + 1;
  }
  if (Object.keys(fingerprints).length > 0) sites[file] = fingerprints;
}

if (process.argv.includes("--write-baseline")) {
  writeBaseline(baselinePath, {
    justification:
      "Reviewed source call sites; see egress-inventory.md for gates and accepted dynamic destinations. Every changed or added matching line requires diff review.",
    sites,
  });
  process.stdout.write("Wrote network baseline. Review its diff before committing.\n");
} else {
  const baseline = jsonFile<NetworkBaseline>(baselinePath);
  for (const [file, fingerprints] of Object.entries(sites)) {
    for (const [fingerprint, count] of Object.entries(fingerprints)) {
      if (count <= (baseline.sites[file]?.[fingerprint] ?? 0)) continue;
      const lines = sourceText(file).split("\n");
      const lineNumber = lines.findIndex((line) => digest(line.trim()) === fingerprint) + 1;
      violations.push(
        `${file}:${lineNumber}: new/changed network statement ${fingerprint.slice(0, 12)}; review diff, gate or justify, then refresh baseline`,
      );
    }
  }
}
finishScan(
  "egress",
  violations,
  `${sourceFiles.length} source files; literal hosts and network statements reviewed`,
);

export function isAuditedSource(file: string) {
  const isRootFile = !file.includes("/");
  const isSourceDirectory = /^(apps|packages|scripts|native|\.github)\//.test(file);
  if (!isRootFile && !isSourceDirectory) return false;
  if (
    !/\.(?:[cm]?[jt]sx?|sh|ps1|swift|kt|rs|json|ya?ml)$/.test(file) &&
    file !== "scripts/safe/t3safe"
  )
    return false;
  return !/(?:\.generated\.|\.gen\.|\/_generated\/|\.test\.|\.spec\.|\.testkit\.|\.graphql\.|routeTree\.gen\.|\/fixtures\/|\/__fixtures__\/|\/testUtils\/|\/schema\/|\/Vendor\/|\/vendor\/|\/dist\/|\/node_modules\/)/.test(
    file,
  );
}

export function literalHosts(line: string) {
  const hosts = new Set<string>();
  for (const match of line.matchAll(/(?:https?|wss?):\/\/([a-zA-Z0-9.-]+)(?=[:/\s'"`?#)]|$)/g)) {
    const host = match[1]!.toLowerCase();
    if (host.includes(".")) hosts.add(host);
  }
  if (/host|origin|endpoint|domain/i.test(line)) {
    for (const match of line.matchAll(
      /["'`]([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.(?:com|org|net|io|dev|ai|app|codes|co|sh|cloud))["'`]/g,
    ))
      hosts.add(match[1]!.toLowerCase());
  }
  return hosts;
}

function isNetworkRelated(line: string) {
  return /https?:\/\/|wss?:\/\/|\bfetch\b|WebSocket|HttpClient|child_process|(?:Node)?ChildProcess|\bcurl\b|\bwget\b|download|postinstall|preinstall|crashReporter|sentry|posthog|analytics|telemetry|expo-updates|autoUpdater|LaunchDarkly|\b(?:npm|pnpm|bun|uv|brew)\b|XMLHttpRequest|EventSource|axios/i.test(
    line,
  );
}
