import { ReactNode, RefObject } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReceiptDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  children: ReactNode;
  actions: ReactNode;
  exportRef?: RefObject<HTMLDivElement | null>;
}

export function ReceiptDialogShell({ open, onOpenChange, title, children, actions, exportRef }: ReceiptDialogShellProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:rounded-lg [&>button]:right-3 [&>button]:top-3">
          <div ref={exportRef} className="min-h-0 flex flex-1 flex-col overflow-hidden">
            {title ? (
              <DialogHeader className="shrink-0 border-b px-4 pb-3 pt-4 text-left">
                <DialogTitle className="pr-8 text-base">{title}</DialogTitle>
              </DialogHeader>
            ) : null}

            <ScrollArea className="min-h-0 flex-1">
              <div className="px-4 py-4">{children}</div>
            </ScrollArea>
          </div>

          <div className="shrink-0 border-t bg-background px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
            <div className="flex flex-col gap-2">{actions}</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-h-[52rem] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <div ref={exportRef} className="min-h-0 flex flex-1 flex-col overflow-hidden">
          {title ? (
            <DialogHeader className="shrink-0 border-b px-6 pb-3 pt-4 text-left">
              <DialogTitle className="pr-8 text-lg">{title}</DialogTitle>
            </DialogHeader>
          ) : null}

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-6 py-5">{children}</div>
          </ScrollArea>
        </div>

        <div className="shrink-0 border-t bg-background px-6 py-3">
          <div className="grid grid-cols-3 gap-2">{actions}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
