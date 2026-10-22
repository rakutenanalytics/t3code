// @effect-diagnostics nodeBuiltinImport:off - Release guard uses only Git and the read-only GitHub API.
import * as NodeChildProcess from "node:child_process";

const tag = process.argv[2];
const target = versionParts(tag ?? "");
if (!target) throw new Error("Expected vX.Y.Z-safe.N");
const head = git("rev-parse", "HEAD");
const main = git("rev-parse", "origin/main");
if (head !== main) throw new Error("Release commit must be the freshly fetched tip of origin/main");
const tags = git("tag", "--list").split("\n");
for (const existing of tags) {
  const parts = versionParts(existing);
  if (parts && compareVersions(target, parts) < 0)
    throw new Error(`Refusing non-monotonic release ${tag}; newer tag exists: ${existing}`);
}
const releases: { tagName: string; isDraft: boolean }[] = JSON.parse(
  NodeChildProcess.execFileSync(
    "gh",
    [
      "release",
      "list",
      "--repo",
      process.env.GITHUB_REPOSITORY ?? "rakutenanalytics/t3code",
      "--limit",
      "1000",
      "--json",
      "tagName,isDraft",
    ],
    { encoding: "utf8" },
  ),
);
for (const release of releases) {
  if (release.isDraft) continue;
  const parts = versionParts(release.tagName);
  if (parts && compareVersions(target, parts) <= 0)
    throw new Error(`Release ${tag} must be newer than published ${release.tagName}`);
}
process.stdout.write(`PASS release: ${tag} at main tip ${head}\n`);

function git(...args: string[]) {
  return NodeChildProcess.execFileSync("git", args, { encoding: "utf8" }).trim();
}
function versionParts(value: string) {
  const match = /^v(\d+)\.(\d+)\.(\d+)-safe\.(\d+)$/.exec(value);
  return match?.slice(1).map((part) => BigInt(part));
}
function compareVersions(left: bigint[], right: bigint[]) {
  for (let index = 0; index < left.length; index++) {
    if (left[index]! < right[index]!) return -1;
    if (left[index]! > right[index]!) return 1;
  }
  return 0;
}
