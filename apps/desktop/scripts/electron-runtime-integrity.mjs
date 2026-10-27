import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

export function assertElectronRuntimeArchiveIntegrity(archivePath, checksumsPath) {
  const checksums = JSON.parse(fs.readFileSync(checksumsPath, "utf8"));
  const expected = checksums[path.basename(archivePath)];
  const digest = crypto.createHash("sha256");
  const file = fs.openSync(archivePath, "r");
  try {
    // Runtime archives exceed 100 MB; keep checksum verification memory bounded.
    const chunk = Buffer.allocUnsafe(1024 * 1024);
    let bytes = fs.readSync(file, chunk);
    while (bytes > 0) {
      digest.update(chunk.subarray(0, bytes));
      bytes = fs.readSync(file, chunk);
    }
  } finally {
    fs.closeSync(file);
  }
  if (digest.digest("hex") !== expected) {
    throw new Error(`Electron runtime checksum mismatch: ${path.basename(archivePath)}`);
  }
}
