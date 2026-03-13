import { useState } from "react";
import { Users, Search, Pencil, Trash2, MapPin, Phone, History, RotateCcw, MessageCircle, Smartphone, Award, Star, ShieldCheck } from "lucide-react";
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
import { ImportarContatos } from "@/components/clientes/ImportarContatos";
import { IndicacoesCliente } from "@/components/clientes/IndicacoesCliente";
import { PDVModal } from "@/components/vendas/PDVModal";
import { useUltimaVendaCliente } from "@/hooks/useProdutosRapidos";
import { useNiveisRecompensa, getNivelAtual } from "@/hooks/useNiveisRecompensa";
import { useClienteScores } from "@/hooks/useClienteScore";
import type { CartItem } from "@/hooks/useVendas";
import { toast } from "sonner";

function ClienteLevelBadge({ pontos, niveis }: { pontos: number; niveis: any[] | undefined }) {
  if (!niveis?.length) return null;
  const nivel = getNivelAtual(pontos, niveis);
  if (!nivel) return null;
  return (
    <Badge variant="outline" className="gap-1 text-[10px]" style={{ borderColor: nivel.cor, color: nivel.cor }}>
      <Award className="w-3 h-3" /> {nivel.nome}
    </Badge>
  );
}

export default function ClientesPage() {
  const { isAdmin } = usePermissions();
  const { data: clientes, isLoading } = useClientes();
  const deleteCliente = useDeleteCliente();
  const { data: niveis } = useNiveisRecompensa();
  const { data: scores } = useClienteScores();

  const [search, setSearch] = useState("");
  const [formState, setFormState] = useState<{ open: boolean; data?: any }>({ open: false });
  const [historicoState, setHistoricoState] = useState<{ open: boolean; data?: any }>({ open: false });
  const [importOpen, setImportOpen] = useState(false);
  const [pdvState, setPdvState] = useState<{ open: boolean; clienteId?: string; cart?: CartItem[] }>({ open: false });
  const [indicacoesState, setIndicacoesState] = useState<{ open: boolean; data?: any }>({ open: false });

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
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setImportOpen(true)}>
            <Smartphone className="w-4 h-4" /> Importar Contatos
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setFormState({ open: true })}>
            <Plus className="w-4 h-4" /> Novo Cliente
          </Button>
        </div>
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
              <TableHead>Score</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Pontos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-36" />
              <TableHead className="w-36" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : !filtered?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</TableCell></TableRow>
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
                    <ClienteLevelBadge pontos={Number(c.pontos_indicacao)} niveis={niveis} />
                  </TableCell>
                  <TableCell>
                    {Number(c.pontos_indicacao) > 0 ? (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Star className="w-3 h-3 text-yellow-500" /> {Number(c.pontos_indicacao)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.ativo ? "default" : "secondary"}>{c.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {c.telefone && (
                        <Button variant="ghost" size="icon" title="WhatsApp" asChild>
                          <a href={`https://wa.me/55${c.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="w-4 h-4 text-green-600" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Repetir última venda" onClick={() => setPdvState({ open: true, clienteId: c.id })}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Indicações" onClick={() => setIndicacoesState({ open: true, data: c })}>
                        <Award className="w-4 h-4 text-yellow-500" />
                      </Button>
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
      <ImportarContatos open={importOpen} onOpenChange={setImportOpen} />
      <IndicacoesCliente open={indicacoesState.open} onOpenChange={(v) => setIndicacoesState({ open: v })} cliente={indicacoesState.data} />
      <PDVModal
        open={pdvState.open}
        onOpenChange={(v) => setPdvState({ open: v })}
        initialClienteId={pdvState.clienteId}
      />
    </div>
  );
}