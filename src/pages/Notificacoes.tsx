import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, CheckCheck, Check, Info, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotificacoes, useMarcarLida, useMarcarTodasLidas } from "@/hooks/useNotificacoes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPO_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  info: { icon: Info, color: "text-blue-500" },
  warning: { icon: AlertTriangle, color: "text-yellow-500" },
  success: { icon: CheckCircle2, color: "text-green-500" },
  error: { icon: XCircle, color: "text-destructive" },
};

export default function NotificacoesPage() {
  const { user } = useAuth();
  const { data: notificacoes, isLoading } = useNotificacoes();
  const marcarLida = useMarcarLida();
  const marcarTodas = useMarcarTodasLidas();

  const unread = notificacoes?.filter((n) => !n.lida).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Notificações</h1>
            <p className="text-sm text-muted-foreground">
              {unread > 0 ? `${unread} não lida${unread > 1 ? "s" : ""}` : "Tudo em dia"}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => user && marcarTodas.mutate(user.id)}>
            <CheckCheck className="w-4 h-4" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : !notificacoes?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma notificação.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notificacoes.map((n) => {
            const tipoConfig = TIPO_ICONS[n.tipo] ?? TIPO_ICONS.info;
            const Icon = tipoConfig.icon;
            return (
              <Card
                key={n.id}
                className={`transition-colors ${!n.lida ? "border-primary/30 bg-primary/5" : ""}`}
              >
                <CardContent className="py-3 px-4 flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${tipoConfig.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-sm text-foreground">{n.titulo}</p>
                      {!n.lida && <Badge variant="default" className="text-[10px] px-1.5 py-0">Nova</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.mensagem}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(n.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {!n.lida && (
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => marcarLida.mutate(n.id)}>
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
