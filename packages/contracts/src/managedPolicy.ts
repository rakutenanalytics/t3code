import * as Schema from "effect/Schema";

export const ManagedCapability = Schema.Literals([
  "productAnalytics",
  "t3Connect",
  "desktopAutoUpdate",
  "remoteAccess.network",
  "telemetryExport",
  "providerFeedback",
  "upstreamUpdate",
  "remoteContent",
  "providerMetadata",
  "providerTelemetry",
]);
export type ManagedCapability = typeof ManagedCapability.Type;

export const ManagedPolicy = Schema.Struct({ allow: Schema.Array(ManagedCapability) });
export type ManagedPolicy = typeof ManagedPolicy.Type;

export function allowsManagedCapability(
  policy: ManagedPolicy | null | undefined,
  capability: ManagedCapability,
): boolean {
  return policy == null || policy.allow.includes(capability);
}
