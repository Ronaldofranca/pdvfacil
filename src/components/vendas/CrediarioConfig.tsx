import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Receipt } from "lucide-react";
import type { CrediarioConfig } from "@/hooks/useVendas";

interface Props {
  config: CrediarioConfig;
  onChange: (config: CrediarioConfig) => void;
  total: number;
  compact?: boolean;
}

export function CrediarioConfigPanel({ config, onChange, total, compact }: Props) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const valorRestante = Math.max(0, total - (config.entrada || 0));
  const valorParcela = config.num_parcelas > 0 ? valorRestante / config.num_parcelas : 0;

  const set = (field: keyof CrediarioConfig, value: string | number) =>
    onChange({ ...config, [field]: value });

  return (
    <Card className={`border-primary/30 bg-primary/5 ${compact ? "p-3" : "p-4"} space-y-3`}>
      <div className="flex items-center gap-2">
        <Receipt className="w-4 h-4 text-primary" />
        <span className={`font-semibold text-foreground ${compact ? "text-xs" : "text-sm"}`}>
          Configuração do Crediário
        </span>
      </div>

      <div className={`grid ${compact ? "grid-cols-2 gap-2" : "grid-cols-3 gap-3"}`}>
        <div>
          <Label className="text-xs">Entrada (R$)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            max={total}
            className={compact ? "h-10 text-sm" : "h-9 text-xs"}
            value={config.entrada || ""}
            onChange={(e) => set("entrada", parseFloat(e.target.value) || 0)}
            placeholder="0,00"
          />
        </div>
        <div>
          <Label className="text-xs">Nº Parcelas</Label>
          <Input
            type="number"
            min="1"
            max="48"
            className={compact ? "h-10 text-sm" : "h-9 text-xs"}
            value={config.num_parcelas}
            onChange={(e) => set("num_parcelas", parseInt(e.target.value) || 1)}
          />
        </div>
        <div className={compact ? "col-span-2" : ""}>
          <Label className="text-xs flex items-center gap-1">
            <CalendarDays className="w-3 h-3" /> 1º Vencimento
          </Label>
          <Input
            type="date"
            className={compact ? "h-10 text-sm" : "h-9 text-xs"}
            value={config.primeiro_vencimento}
            onChange={(e) => set("primeiro_vencimento", e.target.value)}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {config.entrada > 0 && (
          <Badge variant="outline" className="text-xs">
            Entrada: {fmt(config.entrada)}
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          Restante: {fmt(valorRestante)}
        </Badge>
        {config.num_parcelas > 0 && valorRestante > 0 && (
          <Badge variant="secondary" className="text-xs font-semibold">
            {config.num_parcelas}x de {fmt(valorParcela)}
          </Badge>
        )}
      </div>
    </Card>
  );
}
