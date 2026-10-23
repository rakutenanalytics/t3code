// @effect-diagnostics nodeBuiltinImport:off - Inspect built files without executing their application code.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import type { AppIdentity } from "@t3tools/shared/appIdentity";
import { upstreamAppIdentity } from "@t3tools/shared/upstreamAppIdentity";
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

export function cliBundlePolicyViolations(bundleRoot: string) {
  const expected = jsonFile<{ allow: string[] }>("security/managed-policy.json");
  const violations: string[] = [];
  const source = NodePath.join(bundleRoot, "bin.mjs");
  if (!NodeFS.existsSync(source)) {
    violations.push("bundle missing: bin.mjs");
  } else if (!containsBakedPolicy(NodeFS.readFileSync(source, "utf8"), expected.allow)) {
    violations.push("CLI source: reviewed policy literal is missing");
  }
  const clientFiles = textFiles(NodePath.join(bundleRoot, "client"));
  if (
    !clientFiles.some((file) =>
      containsBakedPolicy(NodeFS.readFileSync(file, "utf8"), expected.allow),
    )
  ) {
    violations.push("web client: reviewed policy literal is missing");
  }
  for (const file of textFiles(bundleRoot)) {
    if (NodeFS.readFileSync(file, "utf8").includes("__T3CODE_MANAGED_POLICY__")) {
      violations.push(`${NodePath.relative(bundleRoot, file)}: unexpanded policy build constant`);
    }
  }
  return violations;
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

/** Where the reviewed identity must be baked in an unpacked desktop app. */
export function bundleIdentityViolations(bundleRoot: string) {
  const serverRoot = NodePath.join(bundleRoot, "apps/server/dist");
  return identityViolations(bundleRoot, [
    {
      label: "desktop main",
      files: [NodePath.join(bundleRoot, "apps/desktop/dist-electron/main.cjs")],
    },
    {
      label: "server",
      files: textFiles(serverRoot).filter((file) => NodePath.dirname(file) === serverRoot),
    },
    { label: "web client", files: textFiles(NodePath.join(serverRoot, "client")) },
  ]);
}

/** Where the reviewed identity must be baked in the staged standalone CLI. */
export function cliBundleIdentityViolations(bundleRoot: string) {
  return identityViolations(bundleRoot, [
    { label: "CLI source", files: [NodePath.join(bundleRoot, "bin.mjs")] },
    { label: "web client", files: textFiles(NodePath.join(bundleRoot, "client")) },
  ]);
}

function identityViolations(
  bundleRoot: string,
  required: ReadonlyArray<{ label: string; files: string[] }>,
) {
  const expected = jsonFile<AppIdentity>("security/app-identity.json");
  const violations: string[] = [];
  for (const { label, files } of required) {
    const texts = files
      .filter((file) => NodeFS.existsSync(file))
      .map((file) => NodeFS.readFileSync(file, "utf8"));
    if (!texts.some((text) => containsIdentityLiteral(text, expected)))
      violations.push(`${label}: reviewed app identity literal is missing`);
  }
  for (const file of textFiles(bundleRoot)) {
    const text = NodeFS.readFileSync(file, "utf8");
    const relative = NodePath.relative(bundleRoot, file);
    if (text.includes("__T3CODE_APP_IDENTITY__"))
      violations.push(`${relative}: unexpanded app identity build constant`);
    // A reachable upstream literal means some code can still default to the official home and ports.
    if (containsIdentityLiteral(text, upstreamAppIdentity))
      violations.push(
        `${relative}: upstream app identity literal (default home ~/${upstreamAppIdentity.homeDirName})`,
      );
    if (/(?:\$HOME|~)\/\.t3(?![-\w])/.test(text))
      violations.push(`${relative}: hard-coded ~/.t3 path`);
  }
  return violations;
}

function containsIdentityLiteral(text: string, identity: AppIdentity) {
  // Bundlers emit the baked JSON as one flat object literal; match its scalar fields, never evaluate code.
  const scalarFields = Object.entries(identity).filter(([, value]) => !Array.isArray(value));
  return [...text.matchAll(/\{[^{}]*\}/g)].some((objectLiteral) =>
    scalarFields.every(([key, value]) =>
      new RegExp(`["']?${key}["']?\\s*:\\s*${scalarLiteralPattern(value)}`).test(objectLiteral[0]),
    ),
  );
}

function scalarLiteralPattern(value: string | number | boolean) {
  if (typeof value === "number") return String(value);
  // Minifiers write booleans as !0 / !1.
  if (value === true) return "(?:true|!0)";
  if (value === false) return "(?:false|!1)";
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `["'\`]${escaped}["'\`]`;
}

export interface PackagedAppIdentity {
  readonly directoryName: string;
  readonly bundleIdentifier: string;
  readonly urlSchemes: readonly string[];
}

/** The macOS bundle is what LaunchServices, Keychain and /Applications see; it must not collide with official T3. */
export function packagedAppIdentityViolations(app: PackagedAppIdentity) {
  const expected = jsonFile<AppIdentity>("security/app-identity.json");
  const violations: string[] = [];
  if (app.directoryName !== `${expected.baseName}.app`)
    violations.push(`app bundle is ${app.directoryName}, expected ${expected.baseName}.app`);
  if (app.bundleIdentifier !== expected.appId)
    violations.push(`bundle identifier is ${app.bundleIdentifier}, expected ${expected.appId}`);
  if (!app.urlSchemes.includes(expected.urlScheme))
    violations.push(`URL scheme ${expected.urlScheme} is not registered`);
  if (app.urlSchemes.includes(upstreamAppIdentity.urlScheme))
    violations.push(`URL scheme ${upstreamAppIdentity.urlScheme} would collide with official T3`);
  return violations;
}
