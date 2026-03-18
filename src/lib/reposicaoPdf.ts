import jsPDF from "jspdf";
import type { PedidoReposicao } from "@/hooks/usePedidosReposicao";

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function gerarPdfReposicao(pedido: PedidoReposicao, empresaNome: string) {
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

  // Preload all product images
  const itens = pedido.itens_pedido_reposicao ?? [];
  const imageCache = new Map<string, string | null>();
  await Promise.all(
    itens.map(async (item) => {
      const url = (item as any).produtos?.imagem_url;
      if (url && !imageCache.has(url)) {
        imageCache.set(url, await loadImageAsBase64(url));
      }
    })
  );

  // Table header
  const imgColW = 14;
  const cols = [m, m + imgColW + 2, 110, 145, 180];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("", cols[0], y); // image column header
  doc.text("Produto", cols[1], y);
  doc.text("Qtd", cols[2], y, { align: "right" });
  doc.text("Custo Un.", cols[3], y, { align: "right" });
  doc.text("Subtotal", cols[4], y, { align: "right" });
  y += 2;
  doc.line(m, y, 195, y);
  y += 5;

  // Items
  doc.setFont("helvetica", "normal");
  const rowH = 16;

  for (const item of itens) {
    if (y + rowH > 270) {
      doc.addPage();
      y = m;
    }

    const imgUrl = (item as any).produtos?.imagem_url;
    const imgData = imgUrl ? imageCache.get(imgUrl) : null;

    if (imgData) {
      try {
        doc.addImage(imgData, "JPEG", cols[0], y - 4, 12, 12);
      } catch {
        // skip if image fails
      }
    } else {
      // placeholder square
      doc.setDrawColor(200);
      doc.rect(cols[0], y - 4, 12, 12);
      doc.setDrawColor(0);
    }

    const nome = (item as any).produtos?.nome ?? item.produto_id;
    const textY = y + 3;
    doc.text(String(nome).substring(0, 45), cols[1], textY);
    doc.text(String(Number(item.quantidade_solicitada)), cols[2], textY, { align: "right" });
    doc.text(`R$ ${Number(item.custo_unitario).toFixed(2)}`, cols[3], textY, { align: "right" });
    doc.text(`R$ ${Number(item.subtotal).toFixed(2)}`, cols[4], textY, { align: "right" });
    y += rowH;
  }

  // Totals
  y += 3;
  doc.line(m, y, 195, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text(`Total de Itens: ${pedido.total_itens}`, m, y);
  doc.text(`Total: R$ ${Number(pedido.total_valor).toFixed(2)}`, cols[4], y, { align: "right" });

  doc.save(`pedido_reposicao_${pedido.numero}.pdf`);
}
