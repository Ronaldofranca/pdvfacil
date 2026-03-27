import { User, Phone, MapPin, Mail, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { maskCPF } from "@/lib/cpfUtils";

import { Navigate, useOutletContext } from "react-router-dom";

export default function PortalDadosPage() {
  const { config } = useOutletContext<{ config: any }>();
  const { cliente } = usePortalAuth();

  if (config && (config as any).portal_mostrar_perfil === false) {
    return <Navigate to="/portal" replace />;
  }

  const { data: telefones } = useQuery({
    queryKey: ["portal-telefones", cliente?.id],
    enabled: !!cliente?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("cliente_telefones")
        .select("id, telefone, tipo, principal")
        .eq("cliente_id", cliente!.id)
        .order("principal", { ascending: false });
      return data ?? [];
    },
  });

  const { data: vendedorProfile } = useQuery({
    queryKey: ["portal-vendedor-dados", cliente?.vendedor_id],
    enabled: !!cliente?.vendedor_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nome, email, telefone")
        .eq("user_id", cliente!.vendedor_id!)
        .maybeSingle();
      return data;
    },
  });

  if (!cliente) return null;

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center gap-3">
        <User className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Meus Dados</h2>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="text-sm font-medium">{cliente.nome}</p>
            </div>
          </div>

          {cliente.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm">{cliente.email}</p>
              </div>
            </div>
          )}

          {cliente.cpf_cnpj && (
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                <p className="text-sm">{maskCPF(cliente.cpf_cnpj)}</p>
              </div>
            </div>
          )}

          {cliente.telefone && (
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Telefone Principal</p>
                <p className="text-sm">{cliente.telefone}</p>
              </div>
            </div>
          )}

          {(cliente.rua || cliente.cidade) && (
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Endereço</p>
                <p className="text-sm">
                  {[cliente.rua, cliente.bairro, cliente.cidade, cliente.uf].filter(Boolean).join(", ")}
                  {cliente.cep ? ` - CEP ${cliente.cep}` : ""}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Phones */}
      {telefones && telefones.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Telefones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {telefones.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded border">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{t.telefone}</span>
                </div>
                <span className="text-xs text-muted-foreground capitalize">
                  {t.tipo} {t.principal ? "• Principal" : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Vendedor Contact */}
      {vendedorProfile && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Meu Vendedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">{vendedorProfile.nome}</p>
            </div>
            {vendedorProfile.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm">{vendedorProfile.email}</p>
              </div>
            )}
            <Button variant="outline" className="gap-2 w-full" asChild>
              <a
                href={`https://wa.me/55${(vendedorProfile.telefone || "").replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-4 h-4 text-green-600" />
                Falar com {vendedorProfile.nome?.split(" ")[0]} no WhatsApp
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-center text-muted-foreground">
        Para alterar seus dados, entre em contato com seu vendedor.
      </p>
    </div>
  );
}
