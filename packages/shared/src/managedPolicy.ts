import { allowsManagedCapability, type ManagedCapability, ManagedPolicy } from "@t3tools/contracts";
import * as Schema from "effect/Schema";

declare const __T3CODE_MANAGED_POLICY__: ManagedPolicy | null;
// client-runtime compiles this module without Node types; keep the required API local.
declare const process: {
  getBuiltinModule?: (name: "node:fs") => {
    existsSync(file: URL): boolean;
    readFileSync(file: URL, encoding: "utf8"): string;
  };
};

export interface ManagedPolicySource {
  readonly policy: ManagedPolicy | null;
}

export function createManagedPolicy(source: ManagedPolicySource) {
  return {
    policy: source.policy,
    allows: (capability: ManagedCapability) => allowsManagedCapability(source.policy, capability),
  };
}

function createSourceManagedPolicy(): ManagedPolicySource {
  if (typeof process === "undefined" || typeof process.getBuiltinModule !== "function") {
    return { policy: null };
  }

  // Browser/mobile consumers share this module, so filesystem access must stay behind Node's API.
  const fs = process.getBuiltinModule("node:fs");
  const policyFile = new URL("../../../security/managed-policy.json", import.meta.url);
  if (!fs.existsSync(policyFile)) return { policy: null };

  const json = fs.readFileSync(policyFile, "utf8");
  const decodePolicy = Schema.decodeSync(Schema.fromJsonString(ManagedPolicy));
  const policy = decodePolicy(json);
  return { policy };
}

// A baked null explicitly selects unmanaged behavior, even inside a managed source checkout.
const source: ManagedPolicySource =
  typeof __T3CODE_MANAGED_POLICY__ === "undefined"
    ? createSourceManagedPolicy()
    : { policy: __T3CODE_MANAGED_POLICY__ };
export const managedPolicy = createManagedPolicy(source);
