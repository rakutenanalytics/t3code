import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as DesktopUpdates from "./DesktopUpdates.ts";
import { makeHarness } from "./updatesTestHarness.ts";

describe("managed gates", () => {
  it.effect("should not set up the desktop updater when desktopAutoUpdate is denied", () => {
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
