import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProdutos } from "@/hooks/useProdutos";
import {
  useCreatePedidoReposicao,
  useUpdatePedidoReposicao,
  usePedidoReposicaoDetalhes,
  type PedidoReposicaoItem,
} from "@/hooks/usePedidosReposicao";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: string | null;
}

interface ItemLocal {
  produto_id: string;
  nome: string;
  codigo: string;
  unidade: string;
  quantidade_solicitada: number;
  custo_unitario: number;
  subtotal: number;
  observacao: string;
}

export function PedidoReposicaoForm({ open, onOpenChange, editId }: Props) {
  const { profile, user } = useAuth();
  const { data: produtos } = useProdutos();
  const createMut = useCreatePedidoReposicao();
  const updateMut = useUpdatePedidoReposicao();
  const { data: pedidoExistente } = usePedidoReposicaoDetalhes(editId ?? null);

  const [fornecedor, setFornecedor] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ItemLocal[]>([]);
  const [addProdutoId, setAddProdutoId] = useState("");
  const [addQtd, setAddQtd] = useState("");

  useEffect(() => {
    if (editId && pedidoExistente) {
      setFornecedor(pedidoExistente.fornecedor_nome);
      setObservacoes(pedidoExistente.observacoes);
      setItens(
        (pedidoExistente.itens_pedido_reposicao ?? []).map((i: any) => ({
          produto_id: i.produto_id,
          nome: i.produtos?.nome ?? "",
          codigo: i.produtos?.codigo ?? "",
          unidade: i.produtos?.unidade ?? "un",
          quantidade_solicitada: Number(i.quantidade_solicitada),
          custo_unitario: Number(i.custo_unitario),
          subtotal: Number(i.subtotal),
          observacao: i.observacao ?? "",
        }))
      );
    } else if (!editId) {
      setFornecedor("");
      setObservacoes("");
      setItens([]);
    }
  }, [editId, pedidoExistente]);

  const addItem = () => {
    if (!addProdutoId) return;
    const prod = produtos?.find((p) => p.id === addProdutoId);
    if (!prod) return;
    if (itens.some((i) => i.produto_id === addProdutoId)) {
      // Update qty
      setItens((prev) =>
        prev.map((i) =>
          i.produto_id === addProdutoId
            ? {
                ...i,
                quantidade_solicitada: i.quantidade_solicitada + (parseFloat(addQtd) || 1),
                subtotal: (i.quantidade_solicitada + (parseFloat(addQtd) || 1)) * i.custo_unitario,
              }
            : i
        )
      );
    } else {
      const qty = parseFloat(addQtd) || 1;
      const custo = Number((prod as any).custo ?? 0);
      setItens((prev) => [
        ...prev,
        {
          produto_id: prod.id,
          nome: prod.nome,
          codigo: prod.codigo,
          unidade: prod.unidade,
          quantidade_solicitada: qty,
          custo_unitario: custo,
          subtotal: qty * custo,
          observacao: "",
        },
      ]);
    }
    setAddProdutoId("");
    setAddQtd("");
  };

  const removeItem = (produtoId: string) => {
    setItens((prev) => prev.filter((i) => i.produto_id !== produtoId));
  };

  const updateItemQty = (produtoId: string, qty: number) => {
    setItens((prev) =>
      prev.map((i) =>
        i.produto_id === produtoId
          ? { ...i, quantidade_solicitada: qty, subtotal: qty * i.custo_unitario }
          : i
      )
    );
  };

  const handleSubmit = () => {
    if (!profile || !user) return;
    const itemPayload = itens.map((i) => ({
      produto_id: i.produto_id,
      quantidade_solicitada: i.quantidade_solicitada,
      custo_unitario: i.custo_unitario,
      subtotal: i.subtotal,
      observacao: i.observacao,
    }));

    if (editId) {
      updateMut.mutate(
        {
          id: editId,
          empresa_id: profile.empresa_id,
          fornecedor_nome: fornecedor,
          observacoes,
          itens: itemPayload,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMut.mutate(
        {
          empresa_id: profile.empresa_id,
          fornecedor_nome: fornecedor,
          observacoes,
          created_by: user.id,
          itens: itemPayload,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const totalValor = itens.reduce((s, i) => s + i.subtotal, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? "Editar Pedido de Reposição" : "Novo Pedido de Reposição"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Fornecedor</Label>
            <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Nome do fornecedor..." />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações gerais..." />
          </div>

          {/* Add product */}
          <div className="border rounded-lg p-3 space-y-3">
            <Label className="font-semibold">Adicionar Produto</Label>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Select value={addProdutoId} onValueChange={setAddProdutoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione produto..." /></SelectTrigger>
                  <SelectContent>
                    {produtos?.filter((p) => p.ativo).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}{p.codigo ? ` (${p.codigo})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24">
                <Input type="number" min="1" step="1" placeholder="Qtd" value={addQtd} onChange={(e) => setAddQtd(e.target.value)} />
              </div>
              <Button type="button" size="sm" onClick={addItem} disabled={!addProdutoId}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Items table */}
          {itens.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-24 text-right">Qtd</TableHead>
                    <TableHead className="w-24 text-right">Custo</TableHead>
                    <TableHead className="w-24 text-right">Subtotal</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => (
                    <TableRow key={item.produto_id}>
                      <TableCell>
                        <p className="font-medium text-sm">{item.nome}</p>
                        {item.codigo && <p className="text-xs text-muted-foreground">{item.codigo}</p>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          className="w-20 text-right h-8"
                          value={item.quantidade_solicitada}
                          onChange={(e) => updateItemQty(item.produto_id, parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        R$ {item.custo_unitario.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        R$ {item.subtotal.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.produto_id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="px-4 py-2 border-t flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{itens.length} produto(s)</span>
                <span className="font-semibold">Total: R$ {totalValor.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isPending || itens.length === 0} className="gap-1.5">
              <Save className="w-4 h-4" />
              {isPending ? "Salvando..." : editId ? "Salvar Alterações" : "Criar Pedido"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
