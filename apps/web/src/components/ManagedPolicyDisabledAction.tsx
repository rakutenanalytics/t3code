import type { ReactNode } from "react";

import { Button } from "./ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";

export function ManagedPolicyDisabledAction({ children }: { readonly children: ReactNode }) {
  return (
    <ManagedPolicyTooltip>
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    </ManagedPolicyTooltip>
  );
}

export function ManagedPolicyTooltip({ children }: { readonly children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span tabIndex={0} />}>{children}</TooltipTrigger>
      <TooltipPopup>Disabled by managed policy</TooltipPopup>
    </Tooltip>
  );
}
