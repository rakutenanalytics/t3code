import { EnvironmentId, ServerPrepareTriageError } from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import { expect, it, vi } from "vite-plus/test";

import { toastManager } from "~/components/ui/toast";
import { useAtomCommand } from "~/state/use-atom-command";
import { useStartTriage } from "./useStartTriage";

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ state: { location: { href: "/" } } }),
}));
vi.mock("~/components/ui/toast", () => ({
  toastManager: { add: vi.fn() },
  stackedThreadToast: (toast: unknown) => toast,
}));
vi.mock("~/connection/platform", () => ({ currentClientMetadata: () => ({}) }));
vi.mock("~/state/projects", () => ({ projectEnvironment: { openScratch: {} } }));
vi.mock("~/state/server", () => ({ serverEnvironment: { prepareTriage: {} } }));
vi.mock("~/state/use-atom-command", () => ({ useAtomCommand: vi.fn() }));
vi.mock("./useHandleNewThread", () => ({ useNewThreadHandler: () => vi.fn() }));
vi.mock("./useScratchProject", () => ({
  useScratchProject: () => ({ scratchWorkspaceRootFor: () => "/scratch" }),
}));

it("should show the triage policy denial without a CLI suggestion or Copy command action", async () => {
  const error = new ServerPrepareTriageError({
    cause: "Triage source downloads and remote playbooks are disabled by managed policy.",
  });
  const prepare = vi.fn().mockResolvedValue({ _tag: "Failure", cause: Cause.fail(error) });
  vi.mocked(useAtomCommand).mockReturnValue(prepare);

  const startTriage = useStartTriage();
  await startTriage(EnvironmentId.make("test-environment"));

  expect(toastManager.add).toHaveBeenCalledExactlyOnceWith({
    type: "error",
    title: "Could not start triage",
    description: error.message,
    timeout: 0,
  });
});
