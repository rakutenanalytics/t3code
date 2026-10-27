import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { assert, it } from "vite-plus/test";

import { assertElectronRuntimeArchiveIntegrity } from "./electron-runtime-integrity.mjs";

it("accepts abc only when its SHA-256 matches the bundled checksum for that archive name", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "electron-integrity-"));
  try {
    const archive = path.join(directory, "electron.zip");
    const checksums = path.join(directory, "checksums.json");
    fs.writeFileSync(archive, "abc");
    fs.writeFileSync(
      checksums,
      JSON.stringify({
        "electron.zip": "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      }),
    );

    assert.doesNotThrow(() => assertElectronRuntimeArchiveIntegrity(archive, checksums));
    fs.writeFileSync(archive, "tampered");
    assert.throws(
      () => assertElectronRuntimeArchiveIntegrity(archive, checksums),
      /checksum mismatch/,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

it("rejects an archive absent from the bundled checksum manifest", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "electron-integrity-"));
  try {
    const archive = path.join(directory, "unknown.zip");
    const checksums = path.join(directory, "checksums.json");
    fs.writeFileSync(archive, "abc");
    fs.writeFileSync(checksums, "{}");

    assert.throws(
      () => assertElectronRuntimeArchiveIntegrity(archive, checksums),
      /checksum mismatch/,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
