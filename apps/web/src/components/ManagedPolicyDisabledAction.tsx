import type { ReactNode } from "react";

import { Button } from "./ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";

export function ManagedPolicyDisabledAction({
  children,
  reason,
}: {
  readonly children: ReactNode;
  readonly reason?: string;
}) {
  return (
    <ManagedPolicyTooltip reason={reason}>
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    </ManagedPolicyTooltip>
  );
}

export function ManagedPolicyTooltip({
  children,
  reason = "Disabled by managed policy",
}: {
  readonly children: ReactNode;
  readonly reason?: string | undefined;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span tabIndex={0} />}>{children}</TooltipTrigger>
      <TooltipPopup>{reason}</TooltipPopup>
    </Tooltip>
  );
}
