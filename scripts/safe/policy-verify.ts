import * as Schema from "effect/Schema";
import { ManagedCapability } from "@t3tools/contracts";
import { managedPolicy } from "@t3tools/shared/managedPolicy";
import { loadBakedManagedPolicy } from "../lib/managed-policy.ts";
import { finishScan, jsonFile } from "./repository.ts";

const policy = loadBakedManagedPolicy();
if (policy === null) throw new Error("Safe artifacts require security/managed-policy.json");
const inventory = jsonFile<{ deniedCapabilities: string[] }>("security/allowlist.json");
const violations: string[] = [];
const decodeCapability = Schema.decodeUnknownSync(ManagedCapability);
for (const capability of inventory.deniedCapabilities) {
  const knownCapability = decodeCapability(capability);
  if (managedPolicy.allows(knownCapability))
    violations.push(`${capability} is allowed but inventory says denied`);
}
if (JSON.stringify(managedPolicy.policy) !== JSON.stringify(policy))
  violations.push("source policy differs from build policy");
finishScan(
  "policy",
  violations,
  `source and build policy agree; allowed: ${policy.allow.join(", ") || "none"}`,
);
