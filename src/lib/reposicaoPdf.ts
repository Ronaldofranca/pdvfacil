import jsPDF from "jspdf";
import type { PedidoReposicao } from "@/hooks/usePedidosReposicao";

export function gerarPdfReposicao(pedido: PedidoReposicao, empresaNome: string) {
  const doc = new jsPDF();
  const m = 15;
  let y = m;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(empresaNome || "Empresa", m, y);
  y += 8;

  doc.setFontSize(12);
  doc.text(`Pedido de Reposição #${pedido.numero}`, m, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Data: ${new Date(pedido.created_at).toLocaleDateString("pt-BR")}`, m, y);
  y += 5;
  doc.text(`Status: ${pedido.status.toUpperCase()}`, m, y);
  y += 5;
  if (pedido.fornecedor_nome) {
    doc.text(`Fornecedor: ${pedido.fornecedor_nome}`, m, y);
    y += 5;
  }
  if (pedido.observacoes) {
    doc.text(`Observações: ${pedido.observacoes}`, m, y);
    y += 5;
  }

  y += 5;

  // Table header
  const cols = [m, 100, 135, 170];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Produto", cols[0], y);
  doc.text("Qtd", cols[1], y, { align: "right" });
  doc.text("Custo Un.", cols[2], y, { align: "right" });
  doc.text("Subtotal", cols[3], y, { align: "right" });
  y += 2;
  doc.line(m, y, 195, y);
  y += 5;

  // Items
  doc.setFont("helvetica", "normal");
  const itens = pedido.itens_pedido_reposicao ?? [];
  for (const item of itens) {
    if (y > 270) {
      doc.addPage();
      y = m;
    }
    const nome = (item as any).produtos?.nome ?? item.produto_id;
    doc.text(String(nome).substring(0, 50), cols[0], y);
    doc.text(String(Number(item.quantidade_solicitada)), cols[1], y, { align: "right" });
    doc.text(`R$ ${Number(item.custo_unitario).toFixed(2)}`, cols[2], y, { align: "right" });
    doc.text(`R$ ${Number(item.subtotal).toFixed(2)}`, cols[3], y, { align: "right" });
    y += 6;
  }

  // Totals
  y += 3;
  doc.line(m, y, 195, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text(`Total de Itens: ${pedido.total_itens}`, m, y);
  doc.text(`Total: R$ ${Number(pedido.total_valor).toFixed(2)}`, cols[3], y, { align: "right" });

  doc.save(`pedido_reposicao_${pedido.numero}.pdf`);
}
