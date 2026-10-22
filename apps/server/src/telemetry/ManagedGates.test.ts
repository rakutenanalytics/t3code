import { describe, expect, it, vi, afterEach } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as ServerConfig from "../config.ts";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpClient from "effect/http/HttpClient";
import * as OtelEnvironment from "@t3tools/shared/otelEnvironment";
import * as Analytics from "./AnalyticsService.ts";

import { hasCloudPublicConfig } from "../cloud/publicConfig.ts";

afterEach(() => vi.unstubAllEnvs());

describe("managed gates", () => {
  it.effect("should make analytics a no-op when productAnalytics is denied", () => {
    const requests: string[] = [];
    const transport = HttpClient.make((request) => {
      requests.push(request.url);
      return Effect.die("denied analytics reached transport");
    });

    const configLayer = ServerConfig.ServerConfig.layerTest("/tmp", {
      prefix: "t3safe-analytics-",
    }).pipe(Layer.provideMerge(NodeServices.layer));

    const enabledAnalytics = ConfigProvider.layer(
      ConfigProvider.fromEnvRecord({ T3CODE_TELEMETRY_ENABLED: "true" }),
    );

    return Effect.gen(function* () {
      const analytics = yield* Analytics.make;
      yield* analytics.record("fixed.event", { count: 1 });
      yield* analytics.recordOwners([], "server");
      yield* analytics.flush;

      expect(requests).toEqual([]);
    }).pipe(
      Effect.provideService(HttpClient.HttpClient, transport),
      Effect.provide(Layer.merge(configLayer, enabledAnalytics)),
      Effect.scoped,
    );
  });

  it("should ignore Connect endpoint config when t3Connect is denied", async () => {
    vi.stubEnv("T3CODE_RELAY_URL", "https://relay.t3.codes");
    vi.stubEnv("T3CODE_CLERK_PUBLISHABLE_KEY", "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk");
    vi.stubEnv("T3CODE_CLERK_CLI_OAUTH_CLIENT_ID", "fixed-client");
    vi.resetModules();

    const config = await import("../cloud/publicConfig.ts");

    expect(config.hasCloudPublicConfig).toBe(false);
    expect(hasCloudPublicConfig).toBe(false);
  });

  it.effect("should resolve no OTLP endpoints when telemetryExport is denied", () => {
    const environment = ConfigProvider.fromEnvRecord({
      OTEL_EXPORTER_OTLP_ENDPOINT: "https://collector.example.com",
      T3CODE_OTEL_SDK_DISABLED: "false",
    });

    return Effect.gen(function* () {
      const otel = yield* OtelEnvironment.load;
      const traces = OtelEnvironment.resolveSignalEndpoint(otel, "traces", {
        url: "https://collector.example.com/traces",
        export: { protocol: "http/protobuf", headers: undefined, exportIntervalMs: 1000 },
      });
      const metrics = OtelEnvironment.resolveSignalEndpoint(otel, "metrics", {
        url: undefined,
        export: { protocol: "http/protobuf", headers: undefined, exportIntervalMs: 1000 },
      });
      const logs = OtelEnvironment.resolveSignalEndpoint(otel, "logs", {
        url: undefined,
        export: { protocol: "http/protobuf", headers: undefined, exportIntervalMs: 1000 },
      });

      expect([traces, metrics, logs]).toEqual([undefined, undefined, undefined]);
    }).pipe(Effect.provide(ConfigProvider.layer(environment)));
  });
});
