import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Cause from "effect/Cause";
import { afterEach, vi } from "vite-plus/test";
import { make } from "./ElectronUpdater.ts";

const updater = vi.hoisted(() => ({
  netSession: { webRequest: { onBeforeSendHeaders: vi.fn() } },
  setFeedURL: vi.fn(),
  checkForUpdates: vi.fn(),
  downloadUpdate: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  logger: {},
  channel: "latest",
}));
vi.mock("electron-updater", () => ({ autoUpdater: updater }));
vi.mock("@t3tools/shared/appIdentity", () => ({ appIdentity: { slug: "t3code-safe" } }));

afterEach(() => vi.clearAllMocks());

describe("safe GitHub updater adapter", () => {
  it.effect(
    "should refresh the fixed feed token and keep one session guard through the later download",
    () =>
      Effect.gen(function* () {
        updater.checkForUpdates.mockResolvedValue(undefined);
        updater.downloadUpdate.mockResolvedValue(undefined);

        yield* make.configureSafeGitHubFeed("FAKE_FIRST_LOGIN");
        yield* make.checkForUpdates;
        yield* make.configureSafeGitHubFeed("FAKE_REFRESHED_LOGIN");
        yield* make.checkForUpdates;
        yield* make.downloadUpdate;

        expect(updater.setFeedURL.mock.calls.map(([feed]) => feed)).toEqual([
          {
            provider: "github",
            owner: "rakutenanalytics",
            repo: "t3code",
            channel: "latest",
            token: "FAKE_FIRST_LOGIN",
          },
          {
            provider: "github",
            owner: "rakutenanalytics",
            repo: "t3code",
            channel: "latest",
            token: "FAKE_REFRESHED_LOGIN",
          },
        ]);
        expect(updater.logger).toBeNull();
        expect(updater.netSession.webRequest.onBeforeSendHeaders).toHaveBeenCalledTimes(1);
        const intercept = updater.netSession.webRequest.onBeforeSendHeaders.mock.calls[0]![0];
        const callback = vi.fn();
        intercept(
          {
            url: "https://release-assets.githubusercontent.com/file.zip",
            requestHeaders: { Authorization: "token FAKE_REFRESHED_LOGIN" },
          },
          callback,
        );
        expect(callback).toHaveBeenCalledWith({ requestHeaders: {} });
        expect(updater.downloadUpdate).toHaveBeenCalledTimes(1);
      }),
  );

  it.effect(
    "should discard credential-bearing response errors before publishing check and download failures",
    () =>
      Effect.gen(function* () {
        updater.checkForUpdates.mockRejectedValue(
          new Error("token FAKE_SECRET https://example.com/?signature=FAKE_SIGNED_URL"),
        );
        updater.downloadUpdate.mockRejectedValue(new Error("FAKE_SECRET"));

        const checked = yield* Effect.exit(make.checkForUpdates);
        const downloaded = yield* Effect.exit(make.downloadUpdate);

        expect(Exit.isFailure(checked)).toBe(true);
        expect(Exit.isFailure(downloaded)).toBe(true);
        for (const result of [checked, downloaded]) {
          if (result._tag === "Failure") {
            const diagnostic = Cause.pretty<unknown>(result.cause);
            expect(diagnostic).not.toContain("FAKE_SECRET");
            expect(diagnostic).not.toContain("FAKE_SIGNED_URL");
          }
        }
      }),
  );

  it.effect("should replace credential-bearing error events with a static diagnostic", () =>
    Effect.gen(function* () {
      const listener = vi.fn();
      yield* make.on("error", listener);
      const publish = updater.on.mock.calls[0]![1];

      publish(new Error("FAKE_SECRET"));

      expect(listener).toHaveBeenCalledTimes(1);
      expect(String(listener.mock.calls[0]![0])).toContain("GitHub release request failed");
      expect(String(listener.mock.calls[0]![0])).not.toContain("FAKE_SECRET");
    }).pipe(Effect.scoped),
  );
});
