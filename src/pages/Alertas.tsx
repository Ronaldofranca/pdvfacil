import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, PackageX, UserX, Target } from "lucide-react";
import { useAlertasInteligentes } from "@/hooks/useAlertasInteligentes";

const iconMap = {
  vencida: AlertTriangle,
  estoque: PackageX,
  vip_inativo: UserX,
  meta_proxima: Target,
};

export default function AlertasPage() {
  const { data: alertas, isLoading } = useAlertasInteligentes();

  const altas = (alertas || []).filter((a) => a.prioridade === "alta");
  const medias = (alertas || []).filter((a) => a.prioridade === "media");
  const baixas = (alertas || []).filter((a) => a.prioridade === "baixa");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" /> Alertas Inteligentes
        </h1>
        <p className="text-sm text-muted-foreground">
          {(alertas || []).length} alertas ativos
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-destructive/30">
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-destructive">{altas.length}</p>
            <p className="text-[10px] text-muted-foreground">Alta</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-yellow-500">{medias.length}</p>
            <p className="text-[10px] text-muted-foreground">Média</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-muted-foreground">{baixas.length}</p>
            <p className="text-[10px] text-muted-foreground">Baixa</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Analisando dados...</p>
        ) : (alertas || []).length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum alerta ativo 🎉</p>
        ) : (
          (alertas || []).map((a) => {
            const Icon = iconMap[a.tipo] || Bell;
            return (
              <Card key={a.id} className={a.prioridade === "alta" ? "border-destructive/30" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 ${a.cor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-foreground truncate">{a.titulo}</p>
                        <Badge
                          variant={a.prioridade === "alta" ? "destructive" : "secondary"}
                          className="text-[9px] shrink-0"
                        >
                          {a.prioridade}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{a.descricao}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
