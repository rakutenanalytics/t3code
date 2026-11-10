import { afterEach, expect, it, vi } from "vite-plus/test";

vi.mock("expo-constants", () => ({
  default: { expoConfig: { extra: { relay: { url: "https://relay.example" } } } },
}));
vi.mock("expo-observe", () => ({
  Observe: { configure: vi.fn(), dispatchEvents: vi.fn() },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("should keep crash dispatch disabled with a configured relay when baked telemetryExport is denied", async () => {
  vi.stubGlobal("__DEV__", true);
  const { Observe } = await import("expo-observe");
  const { setCrashReportsEnabled, crashReportingAvailable } = await import("./observe");

  await setCrashReportsEnabled(true);

  expect(crashReportingAvailable).toBe(false);
  expect(Observe.dispatchEvents).not.toHaveBeenCalled();
  expect(Observe.configure).toHaveBeenLastCalledWith({ dispatchingEnabled: false });
});
