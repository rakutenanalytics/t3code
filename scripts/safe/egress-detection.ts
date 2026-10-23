export function isAuditedSource(file: string) {
  const isRootFile = !file.includes("/");
  const isSourceDirectory = /^(apps|packages|scripts|native|\.github)\//.test(file);
  if (!isRootFile && !isSourceDirectory) return false;
  return (
    /\.(?:[cm]?[jt]sx?|sh|ps1|swift|kt|rs|json|ya?ml|html?|css|plist|toml|xml|gradle|py|graphql)$/.test(
      file,
    ) || /(?:^|\/)(?:\.npmrc|\.yarnrc|t3safe)$/.test(file)
  );
}

export function literalHosts(line: string) {
  const hosts = new Set<string>();
  for (const match of line.matchAll(/(?:https?|wss?):\/\/([a-zA-Z0-9.-]+)(?=[:/\s'"`?#)]|$)/g)) {
    const host = match[1]!.toLowerCase();
    if (host.includes(".")) hosts.add(host);
  }
  for (const candidate of line.split("\n")) {
    if (!/host|origin|endpoint|domain/i.test(candidate)) continue;
    for (const match of candidate.matchAll(
      /["'`]([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-z]{2,63})["'`]/g,
    ))
      hosts.add(match[1]!.toLowerCase());
  }
  return hosts;
}

export function isNetworkRelated(text: string) {
  return /https?:\/\/|wss?:\/\/|\bfetch\b|WebSocket|HttpClient|child_process|(?:Node)?ChildProcess|\bcurl\b|\bwget\b|download|postinstall|preinstall|crashReporter|sentry|posthog|analytics|telemetry|expo-updates|autoUpdater|LaunchDarkly|\b(?:git|npx|npm|pnpm|yarn|bun|pip|pipx|uvx?|brew|cargo|go)\b|XMLHttpRequest|EventSource|axios|(?:node:)?(?:net|tls|dgram|dns|http2|https?)\b|createConnection|undici|sendBeacon|new\s+Image\s*\(|openExternal|webRequest|session\s*\.\s*fetch|otlp|exporter|statsig|datadog|mixpanel|amplitude|segment|bugsnag|rollbar|axiom|growthbook|<img|<video|<iframe|\bsrc\s*=|@import|\burl\s*\(|\bimport\s*\(|pingdotgg|t3\.codes|ingest\.|clerk|cloudflared|trycloudflare/i.test(
    text,
  );
}

export function literalNetworkUrls(text: string) {
  const urls = new Set<string>();
  for (const match of text.matchAll(/(?:https?|wss?):\/\/[^\s"'`<>$\\]+/g)) {
    urls.add(match[0].replace(/[),;\]}]+$/, ""));
  }
  return [...urls].sort();
}
