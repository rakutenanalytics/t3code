// @effect-diagnostics nodeBuiltinImport:off - This audit runs before dependency installation.
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import { finishScan, repositoryFiles, root, sourceText } from "./repository.ts";

const violations: string[] = [];
const workflows = repositoryFiles().filter((file) => /^\.github\/workflows\/.*\.ya?ml$/.test(file));
for (const file of workflows) {
  const lines = sourceText(file).split("\n");
  let runIndent: number | undefined;
  for (const [index, line] of lines.entries()) {
    const location = `${file}:${index + 1}`;
    const uses = /^\s*(?:-\s*)?uses:\s*["']?([^\s"'#]+)/.exec(line)?.[1];
    if (uses && !uses.startsWith("./") && !/@[a-f0-9]{40}$/.test(uses))
      violations.push(`${location}: action must use a verified full commit SHA`);
    if (/\b(?:pull_request_target|workflow_run)\b/.test(line))
      violations.push(
        `${location}: privileged workflow trigger requires a separate security design`,
      );
    const indent = line.search(/\S/);
    if (runIndent !== undefined && indent >= 0 && indent <= runIndent) runIndent = undefined;
    if (/^\s*(?:-\s*)?run:/.test(line)) runIndent = line.indexOf("run:");
    if (runIndent !== undefined && /\$\{\{\s*github\.event\./.test(line))
      violations.push(`${location}: pass event data through env, never interpolate it into run`);
  }
}

const base = process.argv[2];
if (base) {
  const changed = git("diff", "--name-only", base, "--", "security/").trim().split("\n");
  const securityChanges = changed.filter((file) => file && file !== "security/CHANGELOG.md");
  const changelogDiff = git("diff", "--unified=0", base, "--", "security/CHANGELOG.md");
  const addedEntries = changelogDiff
    .split("\n")
    .filter((line) => line.startsWith("+- baseline-update: "));
  for (const file of securityChanges) {
    const prefix = `+- baseline-update: ${file} — `;
    if (
      !addedEntries.some(
        (entry) => entry.startsWith(prefix) && entry.slice(prefix.length).trim().length >= 12,
      )
    )
      violations.push(
        `${file}: add a baseline-update entry naming this path and its review justification to security/CHANGELOG.md`,
      );
  }
  if (securityChanges.length > 0) {
    const sourceDiff = git(
      "diff",
      "--no-ext-diff",
      "--unified=3",
      base,
      "--",
      "apps/",
      "packages/",
      "scripts/",
      ".github/",
      "install.sh",
    );
    const summary = `\n## Security baseline source changes\n\nReview security/CHANGELOG.md against these source changes.\n\n\`\`\`diff\n${sourceDiff}\n\`\`\`\n`;
    if (process.env.GITHUB_STEP_SUMMARY)
      NodeFS.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    else
      process.stdout.write(
        `Security changes: ${securityChanges.join(", ")}; review git diff ${base} and security/CHANGELOG.md\n`,
      );
  }
}
finishScan(
  "workflows and baseline review",
  violations,
  `${workflows.length} workflows pinned; security changes justified`,
);

function git(...args: string[]) {
  return NodeChildProcess.execFileSync("git", args, { cwd: root, encoding: "utf8" });
}
