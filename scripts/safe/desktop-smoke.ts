// @effect-diagnostics nodeBuiltinImport:off - Read-only DMG extraction uses a temporary mount and never launches Electron.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { extractAll } from "@electron/asar";
import { assertStagedDependencyVersions } from "../lib/locked-stage-dependencies.ts";
import { finishScan, sourceText } from "./repository.ts";
import { runDesktopSmokeCommand } from "./desktop-smoke-command.ts";

const dmg = process.argv[2];
if (!dmg) throw new Error("Usage: node scripts/safe/desktop-smoke.ts <built.dmg>");
const work = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3safe-dmg-"));
const mount = NodePath.join(work, "mount");
NodeFS.mkdirSync(mount);
let mounted = false;
try {
  runDesktopSmokeCommand("hdiutil", [
    "attach",
    NodePath.resolve(dmg),
    "-readonly",
    "-nobrowse",
    "-mountpoint",
    mount,
    "-quiet",
  ]);
  mounted = true;
  const apps = NodeFS.readdirSync(mount).filter((name) => name.endsWith(".app"));
  if (apps.length !== 1) throw new Error("Expected exactly one app in DMG");
  const resources = NodePath.join(mount, apps[0]!, "Contents/Resources");
  const extracted = NodePath.join(work, "bundle");
  extractAll(NodePath.join(resources, "app.asar"), extracted);
  assertStagedDependencyVersions(extracted, sourceText("pnpm-lock.yaml"));
  runDesktopSmokeCommand(process.execPath, [
    "scripts/safe/policy-verify.ts",
    "--bundle",
    extracted,
  ]);
  runDesktopSmokeCommand(process.execPath, ["scripts/safe/artifact-scan.ts", extracted]);
  const violations: string[] = [];
  const updateFeed = NodePath.join(resources, "app-update.yml");
  if (NodeFS.existsSync(updateFeed)) {
    const feed = NodeFS.readFileSync(updateFeed, "utf8");
    if (
      !/^owner:\s*['"]?rakutenanalytics['"]?\s*$/m.test(feed) ||
      !/^repo:\s*['"]?t3code['"]?\s*$/m.test(feed)
    )
      violations.push("app-update.yml must use the fork-owned release feed");
  }
  finishScan(
    "desktop DMG",
    violations,
    "actual asar policy and dependency versions verified; app never launched",
  );
} finally {
  if (mounted) runDesktopSmokeCommand("hdiutil", ["detach", mount, "-quiet"]);
  NodeFS.rmSync(work, { recursive: true, force: true });
}
