import { format } from "date-fns";

// ─── HTML Sanitizer ───
function escapeHtml(unsafe: unknown): string {
  const s = unsafe === null || unsafe === undefined ? "" : String(unsafe);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── CSV Export ───
export function exportCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

// ─── PDF Export (HTML-based, professional) ───
export function exportPDF(options: {
  title: string;
  periodo?: string;
  empresa?: string;
  headers: string[];
  rows: string[][];
  totals?: string[];
}) {
  const { title, periodo, empresa, headers, rows, totals } = options;

  const safeTitle = escapeHtml(title);
  const safePeriodo = periodo ? escapeHtml(periodo) : "";
  const safeEmpresa = empresa ? escapeHtml(empresa) : "";

  const headerCells = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const bodyCells = rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
    .join("");
  const totalCells = totals
    ? `<tr class="totals">${totals.map((t) => `<td>${escapeHtml(t)}</td>`).join("")}</tr>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 24px; color: #1a1a2e; font-size: 11px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10b981; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 18px; color: #10b981; font-weight: 700; }
  .header .meta { text-align: right; font-size: 10px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f1f5f9; padding: 8px 6px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 6px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
  tr:nth-child(even) { background: #fafbfc; }
  .totals td { font-weight: 700; background: #ecfdf5 !important; border-top: 2px solid #10b981; font-size: 12px; }
  .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${safeTitle}</h1>
      ${safePeriodo ? `<p style="color:#666;margin-top:4px;">Período: ${safePeriodo}</p>` : ""}
    </div>
    <div class="meta">
      ${safeEmpresa ? `<p><strong>${safeEmpresa}</strong></p>` : ""}
      <p>Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
    </div>
  </div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>
      ${bodyCells}
      ${totalCells}
    </tbody>
  </table>
  <div class="footer">Relatório gerado automaticamente pelo sistema VendaForce</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) {
    w.onload = () => {
      setTimeout(() => w.print(), 500);
    };
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ─── Receipt PDF Export (professional receipt layout) ───
export interface ReceiptItem {
  nome: string;
  quantidade: number;
  precoUnitario: number;
  desconto: number;
  subtotal: number;
  bonus?: boolean;
  imagemUrl?: string;
}

export interface ReceiptPDFOptions {
  type: "venda" | "pagamento";
  id: string;
  empresa: string;
  logoUrl?: string;
  data: string;
  cliente: { nome: string; id: string };
  itens: ReceiptItem[];
  resumo: { subtotal: number; descontos: number; total: number };
  pagamentos: { forma: string; valor: number; data?: string }[];
  parcelas?: { numero: number; valor: number; vencimento: string; status: string }[];
  parcelaInfo?: {
    numero: number;
    vencimento: string;
    valorTotal: number;
    valorPago: number;
    saldoAnterior: number;
    saldoRestante: number;
    status: string;
    vendaId: string;
  };
  parcelasRestantes?: { numero: number; valor: number; vencimento: string; status: string }[];
}

export function exportReceiptPDF(options: ReceiptPDFOptions) {
  const {
    type, id, empresa, logoUrl, data, cliente,
    itens, resumo, pagamentos, parcelas,
    parcelaInfo, parcelasRestantes,
  } = options;

  const isVenda = type === "venda";
  const title = isVenda ? `Recibo de Venda #${escapeHtml(id)}` : `Recibo de Pagamento #${escapeHtml(id)}`;
  const fileName = isVenda ? `recibo_venda_${id}` : `recibo_pagamento_${id}`;

  // Items table
  const itensHtml = itens.length > 0 ? `
    <div class="section">
      <h3>Itens da Venda</h3>
      <table>
        <thead>
          <tr>
            <th style="width:40%">Produto</th>
            <th style="text-align:center">Qtd</th>
            <th style="text-align:right">Preço Unit.</th>
            <th style="text-align:right">Desc.</th>
            <th style="text-align:right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itens.map((item) => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:6px;">
                  ${item.imagemUrl ? `<img src="${escapeHtml(item.imagemUrl)}" style="width:28px;height:28px;object-fit:cover;border-radius:4px;" />` : `<div style="width:28px;height:28px;background:#f1f5f9;border-radius:4px;"></div>`}
                  <span>${escapeHtml(item.nome)}${item.bonus ? ' <em style="color:#10b981">(Bônus)</em>' : ""}</span>
                </div>
              </td>
              <td style="text-align:center">${item.quantidade}</td>
              <td style="text-align:right">${fmtR(item.precoUnitario)}</td>
              <td style="text-align:right;color:${item.desconto > 0 ? '#ef4444' : '#999'}">${item.desconto > 0 ? `-${fmtR(item.desconto)}` : "—"}</td>
              <td style="text-align:right;font-weight:600">${fmtR(item.subtotal)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  ` : "";

  // Summary
  const summaryHtml = isVenda ? `
    <div class="section summary-box">
      <div class="summary-row"><span>Subtotal</span><span>${fmtR(resumo.subtotal)}</span></div>
      ${resumo.descontos > 0 ? `<div class="summary-row" style="color:#ef4444"><span>Descontos</span><span>-${fmtR(resumo.descontos)}</span></div>` : ""}
      <div class="summary-row total"><span>Total</span><span>${fmtR(resumo.total)}</span></div>
    </div>
  ` : "";

  // Payments
  const pagamentosHtml = pagamentos.length > 0 ? `
    <div class="section">
      <h3>${isVenda ? "Formas de Pagamento" : "Pagamentos Realizados"}</h3>
      ${pagamentos.map((p) => `
        <div class="info-row">
          <span>${escapeHtml(p.forma)}${p.data ? ` — ${escapeHtml(p.data)}` : ""}</span>
          <span class="value">${fmtR(p.valor)}</span>
        </div>
      `).join("")}
    </div>
  ` : "";

  // Parcelas (for crediário vendas)
  const parcelasHtml = parcelas && parcelas.length > 0 ? `
    <div class="section">
      <h3>Parcelas do Crediário</h3>
      <table>
        <thead>
          <tr><th>Parcela</th><th style="text-align:right">Valor</th><th>Vencimento</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${parcelas.map((p) => `
            <tr>
              <td>${p.numero}ª</td>
              <td style="text-align:right">${fmtR(p.valor)}</td>
              <td>${escapeHtml(p.vencimento)}</td>
              <td><span class="badge ${p.status === 'Paga' ? 'badge-ok' : p.status === 'Vencida' ? 'badge-danger' : 'badge-warn'}">${escapeHtml(p.status)}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  ` : "";

  // Parcela info (for payment receipts)
  const parcelaInfoHtml = parcelaInfo ? `
    <div class="section">
      <h3>Detalhes da Parcela</h3>
      <div class="info-row"><span>Parcela</span><span class="value">${parcelaInfo.numero}ª</span></div>
      <div class="info-row"><span>Venda</span><span class="value">#${escapeHtml(parcelaInfo.vendaId)}</span></div>
      <div class="info-row"><span>Vencimento</span><span class="value">${escapeHtml(parcelaInfo.vencimento)}</span></div>
      <div class="info-row"><span>Valor da Parcela</span><span class="value">${fmtR(parcelaInfo.valorTotal)}</span></div>
      <div class="info-row"><span>Status</span><span class="value">${escapeHtml(parcelaInfo.status)}</span></div>
    </div>
    <div class="section summary-box">
      <div class="summary-row"><span>Saldo Anterior</span><span>${fmtR(parcelaInfo.saldoAnterior)}</span></div>
      <div class="summary-row" style="color:#10b981"><span>Pagamento Realizado</span><span>${fmtR(parcelaInfo.valorPago)}</span></div>
      <div class="summary-row total"><span>Saldo Restante</span><span>${fmtR(parcelaInfo.saldoRestante)}</span></div>
    </div>
  ` : "";

  // Remaining parcelas
  const restantesHtml = parcelasRestantes && parcelasRestantes.length > 0 ? `
    <div class="section">
      <h3>Parcelas Restantes</h3>
      <table>
        <thead>
          <tr><th>Parcela</th><th style="text-align:right">Valor</th><th>Vencimento</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${parcelasRestantes.map((p) => `
            <tr>
              <td>${p.numero}ª</td>
              <td style="text-align:right">${fmtR(p.valor)}</td>
              <td>${escapeHtml(p.vencimento)}</td>
              <td><span class="badge ${p.status === 'Paga' ? 'badge-ok' : p.status === 'Vencida' ? 'badge-danger' : 'badge-warn'}">${escapeHtml(p.status)}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  ` : "";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 28px; color: #1a1a2e; font-size: 11px; max-width: 800px; margin: 0 auto; }
  .receipt-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10b981; padding-bottom: 14px; margin-bottom: 20px; }
  .receipt-header h1 { font-size: 20px; color: #10b981; font-weight: 700; }
  .receipt-header .meta { text-align: right; font-size: 10px; color: #666; }
  .receipt-header .meta p { margin-bottom: 2px; }
  .section { margin-bottom: 16px; }
  .section h3 { font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
  .info-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f8fafc; font-size: 11px; }
  .info-row .value { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th { background: #f1f5f9; padding: 7px 6px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 6px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
  tr:nth-child(even) { background: #fafbfc; }
  .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
  .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
  .summary-row.total { font-size: 14px; font-weight: 700; color: #10b981; border-top: 2px solid #10b981; margin-top: 6px; padding-top: 8px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; text-transform: uppercase; }
  .badge-ok { background: #ecfdf5; color: #059669; }
  .badge-warn { background: #fefce8; color: #ca8a04; }
  .badge-danger { background: #fef2f2; color: #dc2626; }
  .footer { margin-top: 24px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  @media print { body { padding: 14px; } }
</style>
</head>
<body>
  <div class="receipt-header">
    <div>
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" style="max-height:40px;margin-bottom:6px;" />` : ""}
      <h1>${title}</h1>
    </div>
    <div class="meta">
      <p><strong>${escapeHtml(empresa)}</strong></p>
      <p>${escapeHtml(data)}</p>
      <p>Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
    </div>
  </div>

  <div class="section">
    <h3>Dados do Cliente</h3>
    <div class="info-row"><span>Nome</span><span class="value">${escapeHtml(cliente.nome)}</span></div>
    <div class="info-row"><span>Código</span><span class="value">${escapeHtml(cliente.id)}</span></div>
  </div>

  ${itensHtml}
  ${summaryHtml}
  ${pagamentosHtml}
  ${parcelasHtml}
  ${parcelaInfoHtml}
  ${restantesHtml}

  <div class="footer">Documento gerado automaticamente pelo sistema. Este recibo não tem valor fiscal.</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) {
    w.onload = () => setTimeout(() => w.print(), 500);
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Helpers ───
export const fmtR = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const fmtN = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
