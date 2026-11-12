import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { afterEach, vi } from "vite-plus/test";
import { managedPolicy } from "@t3tools/shared/managedPolicy";
import * as Exit from "effect/Exit";
import * as DesktopUpdates from "./DesktopUpdates.ts";
import { makeHarness } from "./updatesTestHarness.ts";

vi.mock("@t3tools/shared/appIdentity", async (importOriginal) => {
  const original = await importOriginal<typeof import("@t3tools/shared/appIdentity")>();
  return { ...original, appIdentity: { ...original.appIdentity, slug: "t3code-safe" } };
});

afterEach(() => vi.restoreAllMocks());

describe("managed gates", () => {
  it.effect("should not set up the desktop updater when desktopAutoUpdate is denied", () => {
    vi.spyOn(managedPolicy, "allows").mockReturnValue(false);
    const harness = makeHarness();

    return Effect.gen(function* () {
      const updates = yield* DesktopUpdates.DesktopUpdates;
      yield* updates.configure;
      const state = yield* updates.getState;

      expect(state.enabled).toBe(false);
      expect(state.message).toBe("Disabled by managed policy");
      expect(harness.listenerCount()).toBe(0);
      expect(harness.checkCount()).toBe(0);
      expect(harness.downloadCount()).toBe(0);
    }).pipe(Effect.scoped, Effect.provide(harness.layer));
  });
});

describe("[#17] safe release updates", () => {
  it.effect(
    "should use rakutenanalytics/t3code latest despite a saved nightly channel, mock flag and machine feed override",
    () => {
      const harness = makeHarness({
        appVersion: "0.1.7-safe.1",
        savedChannel: "nightly",
        policy: {
          mode: "auto",
          feedUrl: "https://mirror.example.com/updates",
          allowNightly: true,
          message: "Managed",
        },
      });

      return Effect.gen(function* () {
        const updates = yield* DesktopUpdates.DesktopUpdates;
        yield* updates.configure;
        const state = yield* updates.getState;

        expect(state.enabled).toBe(true);
        expect(state.channel).toBe("latest");
        expect(harness.feedUrls()).toEqual([
          {
            provider: "github",
            owner: "rakutenanalytics",
            repo: "t3code",
            channel: "latest",
            private: false,
          },
        ]);
        expect(harness.updaterChannel()).toBe("latest");
        expect(harness.allowPrerelease()).toBe(false);
        expect(harness.allowDowngrade()).toBe(false);

        const channelChange = yield* Effect.exit(updates.setChannel("nightly"));
        expect(Exit.isFailure(channelChange)).toBe(true);
        expect((yield* updates.getState).channel).toBe("latest");
      }).pipe(Effect.scoped, Effect.provide(harness.layer));
    },
  );

  it.effect("should keep machine policy mode off authoritative for safe builds", () => {
    const harness = makeHarness({
      policy: {
        mode: "off",
        feedUrl: undefined,
        allowNightly: true,
        message: "Updates prohibited",
      },
    });

    return Effect.gen(function* () {
      const updates = yield* DesktopUpdates.DesktopUpdates;
      yield* updates.configure;
      const state = yield* updates.getState;

      expect(state.enabled).toBe(false);
      expect(state.message).toBe("Updates prohibited");
      expect(harness.checkCount()).toBe(0);
      expect(harness.listenerCount()).toBe(0);
    }).pipe(Effect.scoped, Effect.provide(harness.layer));
  });
});
