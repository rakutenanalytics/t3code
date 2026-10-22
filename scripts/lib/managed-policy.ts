// @effect-diagnostics nodeBuiltinImport:off - Build configuration reads the baked file before an Effect runtime exists.
import * as NodeFS from "node:fs";
import * as Schema from "effect/Schema";

import { ManagedPolicy } from "@t3tools/contracts";

export function loadBakedManagedPolicy(
  policyFile = new URL("../../security/managed-policy.json", import.meta.url),
) {
  if (!NodeFS.existsSync(policyFile)) return null;
  const json = NodeFS.readFileSync(policyFile, "utf8");
  return decodeManagedPolicy(json);
}

const decodeManagedPolicy = Schema.decodeSync(Schema.fromJsonString(ManagedPolicy));

export const managedPolicyDefine = {
  __T3CODE_MANAGED_POLICY__: JSON.stringify(loadBakedManagedPolicy()),
};
