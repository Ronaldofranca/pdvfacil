import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ModulePageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children?: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}

export function ModulePage({ title, description, icon: Icon, children, onAdd, addLabel }: ModulePageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {onAdd && (
          <Button size="sm" onClick={onAdd} className="gap-1.5">
            <Plus className="w-4 h-4" />
            {addLabel || "Novo"}
          </Button>
        )}
      </div>
      {children || (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Icon className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            Módulo em desenvolvimento. Conecte o backend para habilitar.
          </p>
        </div>
      )}
    </div>
  );
}
