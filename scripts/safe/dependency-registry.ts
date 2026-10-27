// @effect-diagnostics globalFetch:off - Registry audit runs before dependencies are installed.
interface RegistryVersion {
  scripts?: Record<string, string>;
  maintainers?: { name: string }[];
  repository?: string | { url?: string };
  dist?: { tarball?: string; integrity?: string };
}

interface RegistryMetadata {
  time?: Record<string, string>;
  versions?: Record<string, RegistryVersion>;
}

export async function queryDependencyRegistry(name: string): Promise<RegistryMetadata> {
  const url = `https://registry.npmjs.org/${encodeURIComponent(name)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000), redirect: "error" });
  if (!response.ok) throw new Error(`registry HTTP ${response.status}`);
  return (await response.json()) as RegistryMetadata;
}

export function registryReview(
  metadata: RegistryMetadata,
  version: string,
  previousVersions: string[],
  minimumAgeMinutes: number,
  now: number,
) {
  const manifest = metadata.versions?.[version];
  const publishedAt = metadata.time?.[version] ?? null;
  let ageMinutes: number | null = null;
  if (publishedAt && Number.isFinite(Date.parse(publishedAt))) {
    ageMinutes = Math.floor((now - Date.parse(publishedAt)) / 60_000);
  }
  const reasons: string[] = [];
  if (ageMinutes === null) reasons.push("unknown publish time");
  else if (ageMinutes < minimumAgeMinutes)
    reasons.push(`young release: ${ageMinutes} minutes < ${minimumAgeMinutes}`);
  if (!manifest) reasons.push("version manifest unavailable");

  const lifecycleScripts = installScripts(manifest);
  const maintainers = maintainerNames(manifest);
  const repository = repositoryUrl(manifest);
  const tarball = manifest?.dist?.tarball ?? null;
  const registryIntegrity = manifest?.dist?.integrity ?? null;
  for (const previousVersion of previousVersions) {
    const previous = metadata.versions?.[previousVersion];
    if (!previous) {
      reasons.push(`previous manifest unavailable: ${previousVersion}`);
      continue;
    }
    const previousScripts = installScripts(previous);
    for (const [stage, command] of Object.entries(lifecycleScripts)) {
      if (command !== previousScripts[stage])
        reasons.push(`new/changed ${stage} since ${previousVersion}: ${command}`);
    }
    const previousMaintainers = maintainerNames(previous);
    if (previousMaintainers && maintainers && previousMaintainers !== maintainers)
      reasons.push(
        `maintainers changed since ${previousVersion}: ${previousMaintainers} -> ${maintainers}`,
      );
    if (!previousMaintainers || !maintainers)
      reasons.push(`maintainer history unknown for comparison with ${previousVersion}`);
    const previousRepository = repositoryUrl(previous);
    if (previousRepository !== repository)
      reasons.push(
        `repository changed since ${previousVersion}: ${previousRepository} -> ${repository}`,
      );
  }
  if (previousVersions.length === 0) {
    for (const [stage, command] of Object.entries(lifecycleScripts))
      reasons.push(`new ${stage}: ${command}`);
  }
  for (const [stage, command] of Object.entries(lifecycleScripts)) {
    if (/https?:|\bcurl\b|\bwget\b|download|prebuild|node-gyp|\bnpm\b|\bpnpm\b/i.test(command))
      reasons.push(`possible install-time network in ${stage}: ${command}`);
  }
  const requiresAgeReview = ageMinutes === null || ageMinutes < minimumAgeMinutes;
  return {
    requiresAgeReview,
    ageMinutes,
    publishedAt,
    lifecycleScripts,
    repository,
    maintainers,
    tarball,
    registryIntegrity,
    reasons,
  };
}

function installScripts(manifest: RegistryVersion | undefined) {
  const scripts: Record<string, string> = {};
  for (const stage of ["preinstall", "install", "postinstall", "prepare"]) {
    const command = manifest?.scripts?.[stage];
    if (command) scripts[stage] = command;
  }
  return scripts;
}

function maintainerNames(manifest: RegistryVersion | undefined) {
  if (!manifest?.maintainers) return null;
  const names = manifest.maintainers.map((maintainer) => maintainer.name);
  names.sort();
  return names.join(", ");
}

function repositoryUrl(manifest: RegistryVersion | undefined) {
  if (typeof manifest?.repository === "string") return manifest.repository;
  return manifest?.repository?.url ?? null;
}
