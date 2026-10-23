import { managedPolicy } from "./managedPolicy.ts";

export function createManagedProviderEnvironment(
  environment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  if (managedPolicy.allows("providerTelemetry")) return environment;

  const next = { ...environment };
  for (const name of Object.keys(next)) {
    if (name.startsWith("OTEL_")) delete next[name];
  }
  // Verified in @anthropic-ai/claude-agent-sdk 0.3.276's sdk.mjs telemetry gates.
  next.DO_NOT_TRACK = "1";
  next.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
  next.DISABLE_TELEMETRY = "1";
  next.DISABLE_ERROR_REPORTING = "1";
  // OpenTelemetry defines this opt-out even when a launcher extends the parent's environment.
  // https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/#general-sdk-configuration
  next.OTEL_SDK_DISABLED = "true";
  return next;
}
