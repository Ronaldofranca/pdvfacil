import { ReactNode } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Card } from "@/components/ui/card";

interface MobileRowActionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  summary?: ReactNode;
  children: ReactNode;
}

/**
 * Reusable bottom-sheet for mobile row actions.
 * Usage: render a Drawer that opens when a table row is tapped on mobile.
 * Pass summary card + action buttons as children.
 */
export function MobileRowActions({ open, onOpenChange, title, summary, children }: MobileRowActionsProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 overflow-y-auto px-4 pb-5">
          {summary && <Card className="p-4">{summary}</Card>}
          <div className="space-y-2">{children}</div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Helper props to spread on TableRow for mobile tap behavior.
 */
export function mobileRowProps(isMobile: boolean, onClick: () => void, ariaLabel: string) {
  if (!isMobile) return {};
  return {
    className: "cursor-pointer active:bg-muted/80",
    onClick,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
    role: "button" as const,
    tabIndex: 0,
    "aria-label": ariaLabel,
  };
}
