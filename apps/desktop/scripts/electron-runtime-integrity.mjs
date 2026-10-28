import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

export function assertElectronRuntimeArchiveIntegrity(archivePath, checksumsPath) {
  const checksums = JSON.parse(NodeFS.readFileSync(checksumsPath, "utf8"));
  const expected = checksums[NodePath.basename(archivePath)];
  const digest = NodeCrypto.createHash("sha256");
  const file = NodeFS.openSync(archivePath, "r");
  try {
    // Runtime archives exceed 100 MB; keep checksum verification memory bounded.
    const chunk = Buffer.allocUnsafe(1024 * 1024);
    let bytes = NodeFS.readSync(file, chunk);
    while (bytes > 0) {
      digest.update(chunk.subarray(0, bytes));
      bytes = NodeFS.readSync(file, chunk);
    }
  } finally {
    NodeFS.closeSync(file);
  }
  if (digest.digest("hex") !== expected) {
    throw new Error(`Electron runtime checksum mismatch: ${NodePath.basename(archivePath)}`);
  }
}
