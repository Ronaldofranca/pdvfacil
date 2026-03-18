import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PackageCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useVendedores } from "@/hooks/useEstoque";
import { usePermissions } from "@/hooks/usePermissions";
import {
  usePedidoReposicaoDetalhes,
  useConfirmarRecebimento,
} from "@/hooks/usePedidosReposicao";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string | null;
}

interface RecItem {
  produto_id: string;
  nome: string;
  quantidade_solicitada: number;
  quantidade_ja_recebida: number;
  quantidade_recebida: number;
  unidade: string;
}

export function RecebimentoForm({ open, onOpenChange, pedidoId }: Props) {
  const { user } = useAuth();
  const { isAdmin, isGerente } = usePermissions();
  const { data: vendedores } = useVendedores();
  const { data: pedido } = usePedidoReposicaoDetalhes(pedidoId);
  const confirmarMut = useConfirmarRecebimento();

  const [vendedorId, setVendedorId] = useState(user?.id ?? "");
  const [recItens, setRecItens] = useState<RecItem[]>([]);

  useEffect(() => {
    if (pedido?.itens_pedido_reposicao) {
      setRecItens(
        pedido.itens_pedido_reposicao.map((i: any) => ({
          produto_id: i.produto_id,
          nome: i.produtos?.nome ?? "",
          quantidade_solicitada: Number(i.quantidade_solicitada),
          quantidade_ja_recebida: Number(i.quantidade_recebida ?? 0),
          quantidade_recebida: Number(i.quantidade_solicitada) - Number(i.quantidade_recebida ?? 0),
          unidade: i.produtos?.unidade ?? "un",
        }))
      );
    }
  }, [pedido]);

  const updateQty = (produtoId: string, qty: number) => {
    setRecItens((prev) =>
      prev.map((i) => (i.produto_id === produtoId ? { ...i, quantidade_recebida: qty } : i))
    );
  };

  const handleConfirmar = () => {
    if (!pedidoId) return;
    const itensPayload = recItens
      .filter((i) => i.quantidade_recebida > 0)
      .map((i) => ({
        produto_id: i.produto_id,
        quantidade_recebida: i.quantidade_recebida,
      }));

    if (itensPayload.length === 0) return;

    confirmarMut.mutate(
      { pedido_id: pedidoId, vendedor_id: vendedorId, itens: itensPayload },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const canSelectVendedor = isAdmin || isGerente;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirmar Recebimento — Pedido #{pedido?.numero}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {canSelectVendedor && (
            <div>
              <Label>Vendedor (destino do estoque)</Label>
              <Select value={vendedorId} onValueChange={setVendedorId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {vendedores?.map((v) => (
                    <SelectItem key={v.user_id} value={v.user_id}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Solicitado</TableHead>
                  <TableHead className="text-right">Já Recebido</TableHead>
                  <TableHead className="text-right">Receber Agora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recItens.map((item) => {
                  const pendente = item.quantidade_solicitada - item.quantidade_ja_recebida;
                  return (
                    <TableRow key={item.produto_id}>
                      <TableCell className="font-medium text-sm">{item.nome}</TableCell>
                      <TableCell className="text-right text-sm">
                        {item.quantidade_solicitada} {item.unidade}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {item.quantidade_ja_recebida > 0 ? (
                          <Badge variant="secondary">{item.quantidade_ja_recebida}</Badge>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          max={pendente}
                          step="1"
                          className="w-20 text-right h-8 ml-auto"
                          value={item.quantidade_recebida}
                          onChange={(e) => updateQty(item.produto_id, parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={handleConfirmar}
              disabled={confirmarMut.isPending || !recItens.some((i) => i.quantidade_recebida > 0)}
              className="gap-1.5"
            >
              <PackageCheck className="w-4 h-4" />
              {confirmarMut.isPending ? "Processando..." : "Confirmar Entrada"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
