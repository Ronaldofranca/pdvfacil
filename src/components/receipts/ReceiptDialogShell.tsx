import { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReceiptDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  actions: ReactNode;
}

export function ReceiptDialogShell({ open, onOpenChange, title, children, actions }: ReceiptDialogShellProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex max-h-[96dvh] flex-col">
          <DrawerHeader className="shrink-0 border-b px-4 pb-3 pt-2 text-left">
            <DrawerTitle className="text-base">{title}</DrawerTitle>
          </DrawerHeader>

          <ScrollArea className="min-h-0 flex-1 overflow-y-auto">
            <div className="px-4 py-4">{children}</div>
          </ScrollArea>

          <div className="shrink-0 border-t bg-background px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <div className="grid grid-cols-3 gap-2">{actions}</div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-h-[52rem] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 pb-3 pt-4 text-left">
          <DialogTitle className="pr-8 text-lg">{title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-6 py-5">{children}</div>
        </ScrollArea>

        <div className="shrink-0 border-t bg-background px-6 py-3">
          <div className="grid grid-cols-3 gap-2">{actions}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
