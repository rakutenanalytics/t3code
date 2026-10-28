import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { assert, it } from "vite-plus/test";

import { assertElectronRuntimeArchiveIntegrity } from "./electron-runtime-integrity.mjs";

it("accepts abc only when its SHA-256 matches the bundled checksum for that archive name", () => {
  const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "electron-integrity-"));
  try {
    const archive = NodePath.join(directory, "electron.zip");
    const checksums = NodePath.join(directory, "checksums.json");
    NodeFS.writeFileSync(archive, "abc");
    NodeFS.writeFileSync(
      checksums,
      JSON.stringify({
        "electron.zip": "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      }),
    );

    assert.doesNotThrow(() => assertElectronRuntimeArchiveIntegrity(archive, checksums));
    NodeFS.writeFileSync(archive, "tampered");
    assert.throws(
      () => assertElectronRuntimeArchiveIntegrity(archive, checksums),
      /checksum mismatch/,
    );
  } finally {
    NodeFS.rmSync(directory, { recursive: true, force: true });
  }
});

it("rejects an archive absent from the bundled checksum manifest", () => {
  const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "electron-integrity-"));
  try {
    const archive = NodePath.join(directory, "unknown.zip");
    const checksums = NodePath.join(directory, "checksums.json");
    NodeFS.writeFileSync(archive, "abc");
    NodeFS.writeFileSync(checksums, "{}");

    assert.throws(
      () => assertElectronRuntimeArchiveIntegrity(archive, checksums),
      /checksum mismatch/,
    );
  } finally {
    NodeFS.rmSync(directory, { recursive: true, force: true });
  }
});
