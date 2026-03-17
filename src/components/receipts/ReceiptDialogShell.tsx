import { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReceiptDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  actions: ReactNode;
}

export function ReceiptDialogShell({ open, onOpenChange, title, children, actions }: ReceiptDialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(100dvh-0.75rem,52rem)] w-[calc(100vw-0.75rem)] max-w-[calc(100vw-0.75rem)] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:h-[90vh] sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-4 pb-3 pt-4 text-left sm:px-6">
          <DialogTitle className="pr-8 text-base sm:text-lg">{title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        </ScrollArea>

        <div className="shrink-0 border-t bg-background/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{actions}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
