import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { ManagedPolicyDisabledAction } from "./ManagedPolicyDisabledAction";
import { TooltipProvider } from "./ui/tooltip";

describe("managed policy client presentation", () => {
  it('should render the action disabled with the tooltip "Disabled by managed policy" when the capability is denied', async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      root.render(
        <TooltipProvider>
          <ManagedPolicyDisabledAction>Connect</ManagedPolicyDisabledAction>
        </TooltipProvider>,
      );

      const action = page.getByRole("button", { name: "Connect", exact: true });
      await expect.element(action).toBeDisabled();
      const trigger = container.querySelector<HTMLElement>("[tabindex='0']")!;
      trigger.focus();

      await expect
        .element(page.getByRole("tooltip"))
        .toHaveTextContent("Disabled by managed policy");
    } finally {
      root.unmount();
      container.remove();
    }
  });
});
