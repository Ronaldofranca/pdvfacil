import { useState } from "react";
import { Users, Search, Pencil, Trash2, MapPin, Phone, History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { useClientes, useDeleteCliente } from "@/hooks/useClientes";
import { usePermissions } from "@/hooks/usePermissions";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { HistoricoCompras } from "@/components/clientes/HistoricoCompras";
import { PDVModal } from "@/components/vendas/PDVModal";
import { useUltimaVendaCliente } from "@/hooks/useProdutosRapidos";
import type { CartItem } from "@/hooks/useVendas";
import { toast } from "sonner";

export default function ClientesPage() {
  const { isAdmin } = usePermissions();
  const { data: clientes, isLoading } = useClientes();
  const deleteCliente = useDeleteCliente();

  const [search, setSearch] = useState("");
  const [formState, setFormState] = useState<{ open: boolean; data?: any }>({ open: false });
  const [historicoState, setHistoricoState] = useState<{ open: boolean; data?: any }>({ open: false });
  const [pdvState, setPdvState] = useState<{ open: boolean; clienteId?: string; cart?: CartItem[] }>({ open: false });

  const filtered = clientes?.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.telefone?.includes(search) ||
    c.cidade?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">CRM — Gestão de clientes</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setFormState({ open: true })}>
          <Plus className="w-4 h-4" /> Novo Cliente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome, telefone ou cidade..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>GPS</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : !filtered?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</TableCell></TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{c.nome}</p>
                      {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.telefone ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        {c.telefone}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{c.cidade || "—"}{c.estado ? ` / ${c.estado}` : ""}</TableCell>
                  <TableCell>
                    {c.latitude != null && c.longitude != null ? (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <MapPin className="w-3 h-3" />
                        {Number(c.latitude).toFixed(4)}, {Number(c.longitude).toFixed(4)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem GPS</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.ativo ? "default" : "secondary"}>{c.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="Histórico" onClick={() => setHistoricoState({ open: true, data: c })}>
                        <History className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setFormState({ open: true, data: c })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => deleteCliente.mutate(c.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <ClienteForm open={formState.open} onOpenChange={(v) => setFormState({ open: v })} cliente={formState.data} />
      <HistoricoCompras open={historicoState.open} onOpenChange={(v) => setHistoricoState({ open: v })} cliente={historicoState.data} />
    </div>
  );
}
