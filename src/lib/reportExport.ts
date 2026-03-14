import { format } from "date-fns";
import QRCode from "qrcode";

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
  // New fields for enhanced receipt
  empresaInfo?: {
    telefone?: string;
    endereco?: string;
    cidade?: string;
    uf?: string;
  };
  pix?: {
    chave: string;
    tipo: string;
    valor?: number; // value for QR code
    nome_recebedor?: string;
    cidade_recebedor?: string;
  };
}

// ─── PIX QR Code generation ───
function buildPixPayload(chave: string, tipo: string, valor?: number, nome?: string, cidade?: string): string {
  // Simplified EMV/BR Code PIX payload
  const formatField = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, "0");
    return `${id}${len}${value}`;
  };

  // Payload Format Indicator
  let payload = formatField("00", "01");

  // Merchant Account Info (PIX)
  const gui = formatField("00", "br.gov.bcb.pix");
  const chaveField = formatField("01", chave);
  payload += formatField("26", gui + chaveField);

  // Merchant Category Code
  payload += formatField("52", "0000");

  // Transaction Currency (BRL = 986)
  payload += formatField("53", "986");

  // Transaction Amount
  if (valor && valor > 0) {
    payload += formatField("54", valor.toFixed(2));
  }

  // Country Code
  payload += formatField("58", "BR");

  // Merchant Name
  const merchantName = (nome || "Pagamento").substring(0, 25);
  payload += formatField("59", merchantName);

  // Merchant City
  const merchantCity = (cidade || "SAO PAULO").substring(0, 15).toUpperCase();
  payload += formatField("60", merchantCity);

  // CRC16 placeholder
  payload += "6304";

  // Calculate CRC16 (CCITT-FALSE)
  const crc = crc16ccitt(payload);
  return payload.slice(0, -4) + formatField("63", crc);
}

function crc16ccitt(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

async function generatePixQRCodeDataUrl(chave: string, tipo: string, valor?: number, nome?: string, cidade?: string): Promise<string | null> {
  try {
    const pixPayload = buildPixPayload(chave, tipo, valor, nome, cidade);
    const dataUrl = await QRCode.toDataURL(pixPayload, {
      width: 200,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
    return dataUrl;
  } catch {
    return null;
  }
}

// Export for reuse in components
export { buildPixPayload, generatePixQRCodeDataUrl };

// ─── Shared receipt CSS ───
const RECEIPT_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; padding: 0; color: #1a1a2e; font-size: 11px; max-width: 800px; margin: 0 auto; background: #fff; }
  
  /* Header */
  .receipt-header { 
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); 
    color: #fff; padding: 24px 28px; 
    display: flex; justify-content: space-between; align-items: flex-start; 
  }
  .receipt-header .brand { display: flex; align-items: center; gap: 14px; }
  .receipt-header .brand img { max-height: 48px; border-radius: 8px; background: #fff; padding: 4px; }
  .receipt-header .brand-info h1 { font-size: 16px; font-weight: 700; letter-spacing: 0.3px; margin-bottom: 2px; }
  .receipt-header .brand-info p { font-size: 10px; color: #94a3b8; margin-bottom: 1px; }
  .receipt-header .doc-info { text-align: right; }
  .receipt-header .doc-info .doc-type { 
    font-size: 10px; text-transform: uppercase; letter-spacing: 1px; 
    color: #10b981; font-weight: 700; margin-bottom: 4px; 
  }
  .receipt-header .doc-info .doc-id { font-size: 18px; font-weight: 700; color: #fff; }
  .receipt-header .doc-info .doc-date { font-size: 10px; color: #94a3b8; margin-top: 4px; }

  /* Content */
  .content { padding: 20px 28px; }
  
  /* Section */
  .section { margin-bottom: 18px; }
  .section-title { 
    font-size: 10px; font-weight: 700; color: #64748b; 
    text-transform: uppercase; letter-spacing: 1px; 
    margin-bottom: 10px; padding-bottom: 6px; 
    border-bottom: 2px solid #e2e8f0; 
    display: flex; align-items: center; gap: 6px;
  }
  .section-title::before { content: ''; width: 3px; height: 14px; background: #10b981; border-radius: 2px; }
  
  /* Info rows */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .info-item { display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; }
  .info-item .label { color: #64748b; font-size: 10px; }
  .info-item .value { font-weight: 600; font-size: 11px; }
  .info-item.full { grid-column: 1 / -1; }
  
  /* Table */
  table { width: 100%; border-collapse: collapse; }
  th { 
    background: #f1f5f9; padding: 8px 10px; text-align: left; 
    font-weight: 700; font-size: 9px; text-transform: uppercase; 
    letter-spacing: 0.5px; color: #64748b; border-bottom: 2px solid #e2e8f0; 
  }
  td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; vertical-align: middle; }
  tr:nth-child(even) { background: #fafbfc; }
  .product-cell { display: flex; align-items: center; gap: 8px; }
  .product-img { 
    width: 36px; height: 36px; border-radius: 6px; object-fit: cover; 
    border: 1px solid #e2e8f0; flex-shrink: 0; 
  }
  .product-placeholder { 
    width: 36px; height: 36px; border-radius: 6px; background: #f1f5f9; 
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    color: #94a3b8; font-size: 8px; text-transform: uppercase; font-weight: 700;
  }
  .product-name { font-weight: 500; }
  .bonus-tag { 
    display: inline-block; background: #ecfdf5; color: #059669; 
    font-size: 8px; padding: 1px 6px; border-radius: 8px; font-weight: 600; margin-left: 4px; 
  }
  
  /* Summary box */
  .summary-box { 
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); 
    border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; 
  }
  .summary-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 11px; color: #334155; }
  .summary-row.discount { color: #ef4444; }
  .summary-row.total { 
    font-size: 16px; font-weight: 800; color: #059669; 
    border-top: 2px solid #10b981; margin-top: 8px; padding-top: 10px; 
  }
  
  /* Payment cards */
  .payment-card { 
    display: flex; justify-content: space-between; align-items: center; 
    padding: 10px 14px; background: #f8fafc; border-radius: 8px; 
    border: 1px solid #e2e8f0; margin-bottom: 6px; 
  }
  .payment-card .forma { font-weight: 500; color: #334155; }
  .payment-card .valor { font-weight: 700; color: #059669; font-size: 12px; }
  .payment-card .data { font-size: 9px; color: #94a3b8; margin-top: 2px; }
  
  /* Parcela badges */
  .badge { 
    display: inline-block; padding: 3px 10px; border-radius: 12px; 
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; 
  }
  .badge-ok { background: #dcfce7; color: #16a34a; }
  .badge-warn { background: #fef9c3; color: #a16207; }
  .badge-danger { background: #fee2e2; color: #dc2626; }
  .badge-info { background: #e0e7ff; color: #4338ca; }
  
  /* Financial summary cards */
  .finance-cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .finance-card { 
    text-align: center; padding: 12px; border-radius: 10px; 
    border: 1px solid #e2e8f0; 
  }
  .finance-card .fc-label { font-size: 9px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
  .finance-card .fc-value { font-size: 14px; font-weight: 800; }
  .finance-card.anterior { background: #f8fafc; }
  .finance-card.anterior .fc-value { color: #334155; }
  .finance-card.pago { background: #f0fdf4; }
  .finance-card.pago .fc-value { color: #16a34a; }
  .finance-card.restante { background: #fef2f2; }
  .finance-card.restante .fc-value { color: #dc2626; }
  
  /* PIX section */
  .pix-section { 
    background: #f0fdf4; border: 2px dashed #86efac; border-radius: 12px; 
    padding: 20px; text-align: center; 
  }
  .pix-section h4 { font-size: 12px; font-weight: 700; color: #059669; margin-bottom: 12px; }
  .pix-section img { margin: 0 auto 12px; display: block; }
  .pix-key { 
    display: inline-block; background: #fff; border: 1px solid #bbf7d0; 
    padding: 6px 16px; border-radius: 8px; font-family: monospace; 
    font-size: 11px; color: #166534; font-weight: 600; margin-top: 4px; 
  }
  .pix-hint { font-size: 9px; color: #64748b; margin-top: 8px; }
  
  /* Footer */
  .receipt-footer { 
    background: #f8fafc; padding: 16px 28px; 
    border-top: 1px solid #e2e8f0; text-align: center; 
  }
  .receipt-footer .thanks { font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px; }
  .receipt-footer .contact { font-size: 10px; color: #64748b; margin-bottom: 2px; }
  .receipt-footer .legal { font-size: 8px; color: #94a3b8; margin-top: 8px; }
  
  @media print { 
    body { padding: 0; margin: 0; }
    .receipt-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .summary-box, .pix-section, .finance-card, .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .receipt-footer { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

export async function buildReceiptHTML(options: ReceiptPDFOptions): Promise<string> {
  const {
    type, id, empresa, logoUrl, data, cliente,
    itens, resumo, pagamentos, parcelas,
    parcelaInfo, parcelasRestantes,
    empresaInfo, pix,
  } = options;

  const isVenda = type === "venda";
  const title = isVenda ? `Recibo de Venda` : `Recibo de Pagamento`;
  const docId = `#${escapeHtml(id)}`;

  // Generate PIX QR code if available
  let pixQrDataUrl: string | null = null;
  if (pix?.chave) {
    const pixValor = pix.valor || (isVenda ? resumo.total : parcelaInfo?.saldoRestante) || 0;
    if (pixValor > 0) {
      pixQrDataUrl = await generatePixQRCodeDataUrl(pix.chave, pix.tipo, pixValor, empresa);
    }
  }

  // ─── Header ───
  const headerHtml = `
    <div class="receipt-header">
      <div class="brand">
        ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" />` : ""}
        <div class="brand-info">
          <h1>${escapeHtml(empresa)}</h1>
          ${empresaInfo?.telefone ? `<p>📞 ${escapeHtml(empresaInfo.telefone)}</p>` : ""}
          ${empresaInfo?.cidade || empresaInfo?.uf ? `<p>📍 ${escapeHtml([empresaInfo.cidade, empresaInfo.uf].filter(Boolean).join(" - "))}</p>` : ""}
          ${empresaInfo?.endereco ? `<p>${escapeHtml(empresaInfo.endereco)}</p>` : ""}
        </div>
      </div>
      <div class="doc-info">
        <div class="doc-type">${escapeHtml(title)}</div>
        <div class="doc-id">${docId}</div>
        <div class="doc-date">${escapeHtml(data)}</div>
      </div>
    </div>
  `;

  // ─── Client Info ───
  const clienteHtml = `
    <div class="section">
      <div class="section-title">Dados do Cliente</div>
      <div class="info-grid">
        <div class="info-item full"><span class="label">Nome</span><span class="value">${escapeHtml(cliente.nome)}</span></div>
        <div class="info-item"><span class="label">Código</span><span class="value">${escapeHtml(cliente.id)}</span></div>
        <div class="info-item"><span class="label">Data</span><span class="value">${escapeHtml(data)}</span></div>
      </div>
    </div>
  `;

  // ─── Items table ───
  const itensHtml = itens.length > 0 ? `
    <div class="section">
      <div class="section-title">Itens da Venda</div>
      <table>
        <thead>
          <tr>
            <th style="width:45%">Produto</th>
            <th style="text-align:center;width:10%">Qtd</th>
            <th style="text-align:right;width:18%">Preço Unit.</th>
            <th style="text-align:right;width:12%">Desc.</th>
            <th style="text-align:right;width:15%">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itens.map((item) => `
            <tr>
              <td>
                <div class="product-cell">
                  ${item.imagemUrl
                    ? `<img src="${escapeHtml(item.imagemUrl)}" class="product-img" onerror="this.style.display='none'" />`
                    : `<div class="product-placeholder">IMG</div>`}
                  <span class="product-name">${escapeHtml(item.nome)}${item.bonus ? '<span class="bonus-tag">BÔNUS</span>' : ""}</span>
                </div>
              </td>
              <td style="text-align:center;font-weight:600">${item.quantidade}</td>
              <td style="text-align:right">${fmtR(item.precoUnitario)}</td>
              <td style="text-align:right;color:${item.desconto > 0 ? '#ef4444' : '#94a3b8'}">${item.desconto > 0 ? `-${fmtR(item.desconto)}` : "—"}</td>
              <td style="text-align:right;font-weight:700">${fmtR(item.subtotal)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  ` : "";

  // ─── Summary ───
  const summaryHtml = isVenda ? `
    <div class="section">
      <div class="summary-box">
        <div class="summary-row"><span>Subtotal</span><span>${fmtR(resumo.subtotal)}</span></div>
        ${resumo.descontos > 0 ? `<div class="summary-row discount"><span>Descontos</span><span>-${fmtR(resumo.descontos)}</span></div>` : ""}
        <div class="summary-row total"><span>TOTAL</span><span>${fmtR(resumo.total)}</span></div>
      </div>
    </div>
  ` : "";

  // ─── Payments ───
  const pagamentosHtml = pagamentos.length > 0 ? `
    <div class="section">
      <div class="section-title">${isVenda ? "Formas de Pagamento" : "Pagamentos Realizados"}</div>
      ${pagamentos.map((p) => `
        <div class="payment-card">
          <div>
            <div class="forma">${escapeHtml(p.forma)}</div>
            ${p.data ? `<div class="data">${escapeHtml(p.data)}</div>` : ""}
          </div>
          <div class="valor">${fmtR(p.valor)}</div>
        </div>
      `).join("")}
    </div>
  ` : "";

  // ─── Parcelas (crediário) ───
  const parcelasHtml = parcelas && parcelas.length > 0 ? `
    <div class="section">
      <div class="section-title">Parcelas do Crediário</div>
      <table>
        <thead>
          <tr>
            <th>Parcela</th>
            <th style="text-align:right">Valor</th>
            <th>Vencimento</th>
            <th style="text-align:center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${parcelas.map((p, i) => `
            <tr>
              <td style="font-weight:600">${p.numero}/${parcelas.length}</td>
              <td style="text-align:right;font-weight:600">${fmtR(p.valor)}</td>
              <td>${escapeHtml(p.vencimento)}</td>
              <td style="text-align:center">
                <span class="badge ${p.status === 'Paga' ? 'badge-ok' : p.status === 'Vencida' ? 'badge-danger' : 'badge-warn'}">${escapeHtml(p.status)}</span>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  ` : "";

  // ─── Parcela Info (payment receipt) ───
  const parcelaInfoHtml = parcelaInfo ? `
    <div class="section">
      <div class="section-title">Detalhes da Parcela</div>
      <div class="info-grid">
        <div class="info-item"><span class="label">Parcela</span><span class="value">${parcelaInfo.numero}ª</span></div>
        <div class="info-item"><span class="label">Venda</span><span class="value">#${escapeHtml(parcelaInfo.vendaId)}</span></div>
        <div class="info-item"><span class="label">Vencimento</span><span class="value">${escapeHtml(parcelaInfo.vencimento)}</span></div>
        <div class="info-item"><span class="label">Valor da Parcela</span><span class="value">${fmtR(parcelaInfo.valorTotal)}</span></div>
      </div>
    </div>
    <div class="section">
      <div class="finance-cards">
        <div class="finance-card anterior">
          <div class="fc-label">Saldo Anterior</div>
          <div class="fc-value">${fmtR(parcelaInfo.saldoAnterior)}</div>
        </div>
        <div class="finance-card pago">
          <div class="fc-label">Pagamento</div>
          <div class="fc-value">${fmtR(parcelaInfo.valorPago)}</div>
        </div>
        <div class="finance-card restante">
          <div class="fc-label">Saldo Restante</div>
          <div class="fc-value">${fmtR(parcelaInfo.saldoRestante)}</div>
        </div>
      </div>
    </div>
  ` : "";

  // ─── Remaining parcelas ───
  const restantesHtml = parcelasRestantes && parcelasRestantes.length > 0 ? `
    <div class="section">
      <div class="section-title">Parcelas Restantes</div>
      <table>
        <thead>
          <tr>
            <th>Parcela</th>
            <th style="text-align:right">Valor</th>
            <th>Vencimento</th>
            <th style="text-align:center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${parcelasRestantes.map((p) => `
            <tr>
              <td style="font-weight:600">${p.numero}ª</td>
              <td style="text-align:right;font-weight:600">${fmtR(p.valor)}</td>
              <td>${escapeHtml(p.vencimento)}</td>
              <td style="text-align:center">
                <span class="badge ${p.status === 'Paga' ? 'badge-ok' : p.status === 'Vencida' ? 'badge-danger' : 'badge-warn'}">${escapeHtml(p.status)}</span>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  ` : "";

  // ─── PIX Section ───
  const pixHtml = pixQrDataUrl && pix ? `
    <div class="section">
      <div class="pix-section">
        <h4>💳 Pagamento via PIX</h4>
        <img src="${pixQrDataUrl}" width="180" height="180" alt="QR Code PIX" />
        <div>
          <span style="font-size:10px;color:#64748b;">Chave PIX (${escapeHtml(pix.tipo)}):</span><br/>
          <span class="pix-key">${escapeHtml(pix.chave)}</span>
        </div>
        ${pix.valor ? `<div style="margin-top:8px;font-size:11px;font-weight:700;color:#059669;">Valor: ${fmtR(pix.valor)}</div>` : ""}
        <div class="pix-hint">Escaneie o QR Code com o app do seu banco para pagar via PIX.</div>
      </div>
    </div>
  ` : "";

  // ─── Footer ───
  const footerHtml = `
    <div class="receipt-footer">
      <div class="thanks">Obrigado pela preferência!</div>
      <div class="contact">Em caso de dúvidas, entre em contato.</div>
      ${empresaInfo?.telefone ? `<div class="contact">📱 WhatsApp: ${escapeHtml(empresaInfo.telefone)}</div>` : ""}
      <div class="legal">Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}. Este recibo não tem valor fiscal.</div>
    </div>
  `;

  // ─── Full HTML ───
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title} ${docId}</title>
<style>${RECEIPT_CSS}</style>
</head>
<body>
  ${headerHtml}
  <div class="content">
    ${clienteHtml}
    ${itensHtml}
    ${summaryHtml}
    ${pagamentosHtml}
    ${parcelasHtml}
    ${parcelaInfoHtml}
    ${restantesHtml}
    ${pixHtml}
  </div>
  ${footerHtml}
</body>
</html>`;

  return html;
}

export async function exportReceiptPDF(options: ReceiptPDFOptions) {
  const html = await buildReceiptHTML(options);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) {
    w.onload = () => setTimeout(() => w.print(), 600);
  }
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

export async function shareReceiptWhatsApp(options: ReceiptPDFOptions, phone?: string) {
  const html = await buildReceiptHTML(options);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const fileName = options.type === "venda"
    ? `recibo_venda_${options.id}.html`
    : `recibo_pagamento_${options.id}.html`;
  const file = new File([blob], fileName, { type: "text/html" });

  // Try Web Share API with file (works on mobile)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: options.type === "venda" ? `Recibo de Venda #${options.id}` : `Recibo de Pagamento #${options.id}`,
        files: [file],
      });
      return;
    } catch {
      // user cancelled or failed, fall through
    }
  }

  // Fallback: open WhatsApp Web with text summary
  const isVenda = options.type === "venda";
  const text = isVenda
    ? `📄 *Recibo de Venda #${options.id}*\n👤 Cliente: ${options.cliente.nome}\n💰 Total: ${fmtR(options.resumo.total)}\n📅 Data: ${options.data}`
    : `📄 *Recibo de Pagamento #${options.id}*\n👤 Cliente: ${options.cliente.nome}\n💰 Valor Pago: ${fmtR(options.pagamentos.reduce((s, p) => s + p.valor, 0))}\n📅 Data: ${options.data}`;

  const encoded = encodeURIComponent(text);
  const cleanPhone = phone?.replace(/\D/g, "") || "";
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(whatsappUrl, "_blank");
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
