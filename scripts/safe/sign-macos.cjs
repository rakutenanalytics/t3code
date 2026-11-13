const { execFileSync } = require("node:child_process");
const { sign } = require("@electron/osx-sign");

module.exports = async function signSafeApp(options) {
  const keychain = process.env.SAFE_SIGNING_KEYCHAIN;
  const identity = process.env.SAFE_SIGNING_IDENTITY;
  if (!keychain || !/^[A-Fa-f0-9]{40}$/.test(identity ?? "")) {
    throw new Error("Safe signing requires the temporary keychain and certificate SHA-1");
  }

  // [#17] Squirrel verifies the new bundle against the installed bundle's requirement.
  // https://github.com/Squirrel/Squirrel.Mac/blob/master/Squirrel/SQRLCodeSignature.m
  const requirement = `designated => certificate leaf = H"${identity}"`;
  // osx-sign orders nested binaries and supplies Electron entitlements; signing uses system codesign.
  await sign({
    ...options,
    identity,
    keychain,
    identityValidation: false,
    preAutoEntitlements: false,
    optionsForFile: (file) => ({
      ...options.optionsForFile?.(file),
      requirements: `=${requirement}`,
      timestamp: "none",
    }),
  });
  execFileSync("codesign", ["--verify", "--deep", "--strict", options.app], { stdio: "inherit" });
  // --test-requirement takes a bare expression; the "designated =>" prefix only belongs in signing requirement sets.
  execFileSync("codesign", ["--verify", "--test-requirement", `=certificate leaf = H"${identity}"`, options.app], {
    stdio: "inherit",
  });
};
