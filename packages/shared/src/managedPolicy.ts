import {
  allowsManagedCapability,
  type ManagedCapability,
  type ManagedPolicy,
} from "@t3tools/contracts";

declare const __T3CODE_MANAGED_POLICY__: ManagedPolicy | null;

export interface ManagedPolicySource {
  readonly policy: ManagedPolicy | null;
}

export function createManagedPolicy(source: ManagedPolicySource) {
  return {
    policy: source.policy,
    allows: (capability: ManagedCapability) => allowsManagedCapability(source.policy, capability),
  };
}

// Only build configuration supplies this value; runtime env and saved settings cannot replace it.
const bakedSource: ManagedPolicySource = {
  policy: typeof __T3CODE_MANAGED_POLICY__ === "undefined" ? null : __T3CODE_MANAGED_POLICY__,
};
export const managedPolicy = createManagedPolicy(bakedSource);
