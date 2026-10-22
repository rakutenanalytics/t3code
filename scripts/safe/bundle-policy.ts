// @effect-diagnostics nodeBuiltinImport:off - Inspect built files without executing their application code.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import { jsonFile } from "./repository.ts";

export function bundlePolicyViolations(bundleRoot: string) {
  const expected = jsonFile<{ allow: string[] }>("security/managed-policy.json");
  const violations: string[] = [];
  const requiredBundles = [
    "apps/desktop/dist-electron/main.cjs",
    "apps/desktop/dist-electron/preload.cjs",
    "apps/server/dist/bin.mjs",
  ];
  for (const relative of requiredBundles) {
    const file = NodePath.join(bundleRoot, relative);
    if (!NodeFS.existsSync(file)) {
      violations.push(`bundle missing: ${relative}`);
      continue;
    }
    if (
      relative !== "apps/server/dist/bin.mjs" &&
      !containsBakedPolicy(NodeFS.readFileSync(file, "utf8"), expected.allow)
    )
      violations.push(`${relative}: reviewed policy literal is missing`);
  }
  const serverRoot = NodePath.join(bundleRoot, "apps/server/dist");
  // The server has multiple entries; tsdown moves their shared policy into a sibling chunk.
  const serverFiles = textFiles(serverRoot).filter(
    (file) => NodePath.dirname(file) === serverRoot && /\.[cm]?js$/.test(file),
  );
  if (
    !serverFiles.some((file) =>
      containsBakedPolicy(NodeFS.readFileSync(file, "utf8"), expected.allow),
    )
  )
    violations.push("server: reviewed policy literal is missing");
  const clientRoot = NodePath.join(serverRoot, "client");
  const webFiles = textFiles(clientRoot).filter((file) => /\.[cm]?js$/.test(file));
  if (
    !webFiles.some((file) => containsBakedPolicy(NodeFS.readFileSync(file, "utf8"), expected.allow))
  )
    violations.push("web client: reviewed policy literal is missing");
  for (const file of textFiles(bundleRoot)) {
    const text = NodeFS.readFileSync(file, "utf8");
    if (text.includes("__T3CODE_MANAGED_POLICY__"))
      violations.push(`${NodePath.relative(bundleRoot, file)}: unexpanded policy build constant`);
  }
  return violations;
}

export function textFiles(directory: string) {
  if (!NodeFS.existsSync(directory)) return [];
  return NodeFS.readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:[cm]?js|html|css|json|ya?ml)$/.test(entry.name))
    .map((entry) => NodePath.join(entry.parentPath, entry.name))
    .sort();
}

function containsBakedPolicy(text: string, allow: string[]) {
  for (const match of text.matchAll(/\{\s*(?:allow|"allow"|'allow')\s*:\s*(\[[^\]]*\])/g)) {
    try {
      // Vite emits static backtick strings. Normalize only capability literals, never evaluate code.
      const arrayLiteral = match[1]!.replace(/(['`])([\w.]+)\1/g, '"$2"');
      if (JSON.stringify(JSON.parse(arrayLiteral)) === JSON.stringify(allow)) return true;
    } catch {
      continue;
    }
  }
  return false;
}
