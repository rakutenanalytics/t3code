import type { ManagedCapability } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientError from "effect/http/HttpClientError";

import { managedPolicy } from "./managedPolicy.ts";

export const enforceManagedCapability = (capability: ManagedCapability) =>
  HttpClient.mapRequestEffect((request) => {
    if (managedPolicy.allows(capability)) return Effect.succeed(request);
    return Effect.fail(
      new HttpClientError.HttpClientError({
        reason: new HttpClientError.TransportError({
          request,
          cause: "Disabled by managed policy",
        }),
      }),
    );
  });
