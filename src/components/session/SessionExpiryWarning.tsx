import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";

interface SessionExpiryWarningProps {
  open: boolean;
  countdown: number;
  onExtend: () => void;
  onLogout: () => void;
}

export function SessionExpiryWarning({ open, countdown, onExtend, onLogout }: SessionExpiryWarningProps) {
  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-destructive" />
            Sessão expirando
          </AlertDialogTitle>
          <AlertDialogDescription>
            Sua sessão expirará em{" "}
            <span className="font-bold text-foreground">
              {minutes > 0 ? `${minutes}m ` : ""}{String(seconds).padStart(2, "0")}s
            </span>
            {" "}por inatividade. Deseja continuar conectado?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onLogout}>Sair</AlertDialogCancel>
          <AlertDialogAction onClick={onExtend}>Continuar conectado</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
