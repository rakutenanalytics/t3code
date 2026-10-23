import { ORCHESTRATION_PROTOCOL_HEADER } from "@t3tools/contracts";
import { appIdentity } from "@t3tools/shared/appIdentity";

export const browserApiCorsAllowedMethods = ["GET", "POST", "OPTIONS"] as const;
export const browserApiCorsAllowedHeaders = [
  "authorization",
  "b3",
  "traceparent",
  "content-type",
  "dpop",
  ORCHESTRATION_PROTOCOL_HEADER,
] as const;

export const DESKTOP_RENDERER_ORIGINS = [
  `${appIdentity.urlScheme}://app`,
  `${appIdentity.urlScheme}-dev://app`,
] as const;
