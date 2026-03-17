import { format } from "date-fns";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import JsPDF from "jspdf";

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
  empresaInfo?: {
    telefone?: string;
    endereco?: string;
    cidade?: string;
    uf?: string;
    cnpj?: string;
  };
  vendedorNome?: string;
  pix?: {
    chave: string;
    tipo: string;
    valor?: number;
    nome_recebedor?: string;
    cidade_recebedor?: string;
  };
  cancelamento?: {
    motivo: string;
    data?: string;
  };
  // Receipt visual config
  receiptConfig?: import("@/lib/receiptConfig").ReceiptConfig;
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

// ─── Shared receipt CSS (now parameterized) ───
function buildReceiptCSS(rc?: import("@/lib/receiptConfig").ReceiptConfig): string {
  const hdr = rc?.recibo_cor_cabecalho ?? '#0f172a';
  const hdrFont = rc?.recibo_cor_fonte_cabecalho ?? '#ffffff';
  const primary = rc?.recibo_cor_principal ?? '#10b981';
  const titles = rc?.recibo_cor_titulos ?? '#64748b';
  const text = rc?.recibo_cor_texto ?? '#1a1a2e';
  const total = rc?.recibo_cor_total ?? '#059669';
  const borders = rc?.recibo_cor_bordas ?? '#e2e8f0';

  return `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; padding: 0; color: ${text}; font-size: 11px; max-width: 800px; margin: 0 auto; background: #fff; }
  
  .receipt-header { 
    background: linear-gradient(135deg, ${hdr} 0%, ${hdr}dd 100%); 
    color: ${hdrFont}; padding: 24px 28px; 
    display: flex; justify-content: space-between; align-items: flex-start; 
  }
  .receipt-header .brand { display: flex; align-items: center; gap: 14px; }
  .receipt-header .brand img { max-height: 48px; border-radius: 8px; background: #fff; padding: 4px; }
  .receipt-header .brand-info h1 { font-size: 16px; font-weight: 700; letter-spacing: 0.3px; margin-bottom: 2px; }
  .receipt-header .brand-info p { font-size: 10px; color: ${hdrFont}aa; margin-bottom: 1px; }
  .receipt-header .doc-info { text-align: right; }
  .receipt-header .doc-info .doc-type { 
    font-size: 10px; text-transform: uppercase; letter-spacing: 1px; 
    color: ${primary}; font-weight: 700; margin-bottom: 4px; 
  }
  .receipt-header .doc-info .doc-id { font-size: 18px; font-weight: 700; color: ${hdrFont}; }
  .receipt-header .doc-info .doc-date { font-size: 10px; color: ${hdrFont}aa; margin-top: 4px; }

  .content { padding: 20px 28px; }
  
  .section { margin-bottom: 18px; }
  .section-title { 
    font-size: 10px; font-weight: 700; color: ${titles}; 
    text-transform: uppercase; letter-spacing: 1px; 
    margin-bottom: 10px; padding-bottom: 6px; 
    border-bottom: 2px solid ${borders}; 
    display: flex; align-items: center; gap: 6px;
  }
  .section-title::before { content: ''; width: 3px; height: 14px; background: ${primary}; border-radius: 2px; }
  
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .info-item { display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; }
  .info-item .label { color: ${titles}; font-size: 10px; }
  .info-item .value { font-weight: 600; font-size: 11px; }
  .info-item.full { grid-column: 1 / -1; }
  
  table { width: 100%; border-collapse: collapse; }
  th { 
    background: #f1f5f9; padding: 8px 10px; text-align: left; 
    font-weight: 700; font-size: 9px; text-transform: uppercase; 
    letter-spacing: 0.5px; color: ${titles}; border-bottom: 2px solid ${borders}; 
  }
  td { padding: 8px 10px; border-bottom: 1px solid ${borders}22; font-size: 11px; vertical-align: middle; }
  tr:nth-child(even) { background: #fafbfc; }
  .product-cell { display: flex; align-items: center; gap: 8px; }
  .product-img { 
    width: 36px; height: 36px; border-radius: 6px; object-fit: cover; 
    border: 1px solid ${borders}; flex-shrink: 0; 
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
  
  .summary-box { 
    background: linear-gradient(135deg, ${primary}08 0%, ${primary}0d 100%); 
    border: 1px solid ${primary}33; border-radius: 10px; padding: 16px; 
  }
  .summary-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 11px; color: #334155; }
  .summary-row.discount { color: #ef4444; }
  .summary-row.total { 
    font-size: 16px; font-weight: 800; color: ${total}; 
    border-top: 2px solid ${primary}; margin-top: 8px; padding-top: 10px; 
  }
  
  .payment-card { 
    display: flex; justify-content: space-between; align-items: center; 
    padding: 10px 14px; background: #f8fafc; border-radius: 8px; 
    border: 1px solid ${borders}; margin-bottom: 6px; 
  }
  .payment-card .forma { font-weight: 500; color: #334155; }
  .payment-card .valor { font-weight: 700; color: ${total}; font-size: 12px; }
  .payment-card .data { font-size: 9px; color: #94a3b8; margin-top: 2px; }
  
  .badge { 
    display: inline-block; padding: 3px 10px; border-radius: 12px; 
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; 
  }
  .badge-ok { background: #dcfce7; color: #16a34a; }
  .badge-warn { background: #fef9c3; color: #a16207; }
  .badge-danger { background: #fee2e2; color: #dc2626; }
  .badge-info { background: #e0e7ff; color: #4338ca; }
  
  .finance-cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .finance-card { text-align: center; padding: 12px; border-radius: 10px; border: 1px solid ${borders}; }
  .finance-card .fc-label { font-size: 9px; color: ${titles}; text-transform: uppercase; margin-bottom: 4px; }
  .finance-card .fc-value { font-size: 14px; font-weight: 800; }
  .finance-card.anterior { background: #f8fafc; }
  .finance-card.anterior .fc-value { color: #334155; }
  .finance-card.pago { background: #f0fdf4; }
  .finance-card.pago .fc-value { color: #16a34a; }
  .finance-card.restante { background: #fef2f2; }
  .finance-card.restante .fc-value { color: #dc2626; }
  
  .pix-section { 
    background: #f0fdf4; border: 2px dashed #86efac; border-radius: 12px; 
    padding: 20px; text-align: center; 
  }
  .pix-section h4 { font-size: 12px; font-weight: 700; color: ${total}; margin-bottom: 12px; }
  .pix-section img { margin: 0 auto 12px; display: block; }
  .pix-key { 
    display: inline-block; background: #fff; border: 1px solid #bbf7d0; 
    padding: 6px 16px; border-radius: 8px; font-family: monospace; 
    font-size: 11px; color: #166534; font-weight: 600; margin-top: 4px; 
  }
  .pix-hint { font-size: 9px; color: ${titles}; margin-top: 8px; }
  
  .receipt-footer { 
    background: #f8fafc; padding: 16px 28px; 
    border-top: 1px solid ${borders}; text-align: center; 
  }
  .receipt-footer .thanks { font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px; }
  .receipt-footer .contact { font-size: 10px; color: ${titles}; margin-bottom: 2px; }
  .receipt-footer .legal { font-size: 8px; color: #94a3b8; margin-top: 8px; }
  
  @media print { 
    body { padding: 0; margin: 0; }
    .receipt-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .summary-box, .pix-section, .finance-card, .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .receipt-footer { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;
}

export async function buildReceiptHTML(options: ReceiptPDFOptions): Promise<string> {
  const {
    type, id, empresa, logoUrl, data, cliente,
    itens, resumo, pagamentos, parcelas,
    parcelaInfo, parcelasRestantes,
    empresaInfo, pix, receiptConfig: rc,
  } = options;
  const showImages = rc?.recibo_exibir_imagem_produto ?? true;

  const isVenda = type === "venda";
  const title = isVenda ? `Recibo de Venda` : `Recibo de Pagamento`;
  const docId = `#${escapeHtml(id)}`;

  // Generate PIX QR code if available
  let pixQrDataUrl: string | null = null;
  if (pix?.chave) {
    const pixValor = pix.valor || (isVenda ? resumo.total : parcelaInfo?.saldoRestante) || 0;
    if (pixValor > 0) {
      pixQrDataUrl = await generatePixQRCodeDataUrl(pix.chave, pix.tipo, pixValor, pix.nome_recebedor || empresa, pix.cidade_recebedor);
    }
  }

  // ─── Header ───
  const showLogo = rc?.recibo_exibir_logo ?? true;
  const subtitle = rc?.recibo_subtitulo || "";
  const showTelefone = rc?.recibo_exibir_telefone ?? true;
  const showEndereco = rc?.recibo_exibir_endereco ?? true;
  const showCpfCnpj = rc?.recibo_exibir_cpf_cnpj ?? false;
  const showCliente = rc?.recibo_exibir_cliente ?? true;
  const showFormaPagamento = rc?.recibo_exibir_forma_pagamento ?? true;
  const showParcelas = rc?.recibo_exibir_parcelas ?? true;
  const showObservacoes = rc?.recibo_exibir_observacoes ?? true;
  const mensagemFinal = rc?.recibo_mensagem_final ?? "Obrigado pela preferência!";
  const rodape = rc?.recibo_rodape ?? "Este recibo não tem valor fiscal.";

  const headerHtml = `
    <div class="receipt-header" data-pdf-section="header">
      <div class="brand">
        ${showLogo && logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" crossorigin="anonymous" />` : ""}
        <div class="brand-info">
          <h1>${escapeHtml(empresa)}</h1>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
          ${showTelefone && empresaInfo?.telefone ? `<p>📞 ${escapeHtml(empresaInfo.telefone)}</p>` : ""}
          ${empresaInfo?.cidade || empresaInfo?.uf ? `<p>📍 ${escapeHtml([empresaInfo.cidade, empresaInfo.uf].filter(Boolean).join(" - "))}</p>` : ""}
          ${showEndereco && empresaInfo?.endereco ? `<p>${escapeHtml(empresaInfo.endereco)}</p>` : ""}
          ${showCpfCnpj && empresaInfo?.cnpj ? `<p>CNPJ: ${escapeHtml(empresaInfo.cnpj)}</p>` : ""}
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
  const clienteHtml = showCliente ? `
    <div class="section" data-pdf-section="cliente">
      <div class="section-title">Dados do Cliente</div>
      <div class="info-grid">
        <div class="info-item full"><span class="label">Nome</span><span class="value">${escapeHtml(cliente.nome)}</span></div>
        <div class="info-item"><span class="label">Código</span><span class="value">${escapeHtml(cliente.id)}</span></div>
        <div class="info-item"><span class="label">Data</span><span class="value">${escapeHtml(data)}</span></div>
        ${options.vendedorNome && (rc?.recibo_exibir_vendedor ?? false) ? `<div class="info-item"><span class="label">Vendedor</span><span class="value">${escapeHtml(options.vendedorNome)}</span></div>` : ""}
      </div>
    </div>
  ` : "";

  // ─── Items table ───
  const itensHtml = itens.length > 0 ? `
    <div class="section">
      <div class="section-title" data-pdf-section="itens-titulo">Itens da Venda</div>
      <table>
        <thead data-pdf-section="itens-cabecalho">
          <tr>
            <th style="width:45%">Produto</th>
            <th style="text-align:center;width:10%">Qtd</th>
            <th style="text-align:right;width:18%">Preço Unit.</th>
            <th style="text-align:right;width:12%">Desc.</th>
            <th style="text-align:right;width:15%">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itens.map((item, index) => `
            <tr data-pdf-section="item-${index + 1}">
              <td>
                <div class="product-cell">
                  ${showImages ? (item.imagemUrl
                    ? `<img src="${escapeHtml(item.imagemUrl)}" class="product-img" crossorigin="anonymous" onerror="this.style.display='none'" />`
                    : `<div class="product-placeholder">IMG</div>`) : ""}
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
      <div class="summary-box" data-pdf-section="resumo">
        <div class="summary-row"><span>Subtotal</span><span>${fmtR(resumo.subtotal)}</span></div>
        ${resumo.descontos > 0 ? `<div class="summary-row discount"><span>Descontos</span><span>-${fmtR(resumo.descontos)}</span></div>` : ""}
        <div class="summary-row total"><span>TOTAL</span><span>${fmtR(resumo.total)}</span></div>
      </div>
    </div>
  ` : "";

  // ─── Payments ───
  const pagamentosHtml = showFormaPagamento && pagamentos.length > 0 ? `
    <div class="section">
      <div class="section-title" data-pdf-section="pagamentos-titulo">${isVenda ? "Formas de Pagamento" : "Pagamentos Realizados"}</div>
      ${pagamentos.map((p, index) => `
        <div class="payment-card" data-pdf-section="pagamento-${index + 1}">
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
  const parcelasHtml = showParcelas && parcelas && parcelas.length > 0 ? `
    <div class="section">
      <div class="section-title" data-pdf-section="parcelas-titulo">Parcelas do Crediário</div>
      <table>
        <thead data-pdf-section="parcelas-cabecalho">
          <tr>
            <th>Parcela</th>
            <th style="text-align:right">Valor</th>
            <th>Vencimento</th>
            <th style="text-align:center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${parcelas.map((p, i) => `
            <tr data-pdf-section="parcela-${i + 1}">
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
    <div class="section" data-pdf-section="parcela-detalhes">
      <div class="section-title">Detalhes da Parcela</div>
      <div class="info-grid">
        <div class="info-item"><span class="label">Parcela</span><span class="value">${parcelaInfo.numero}ª</span></div>
        <div class="info-item"><span class="label">Venda</span><span class="value">#${escapeHtml(parcelaInfo.vendaId)}</span></div>
        <div class="info-item"><span class="label">Vencimento</span><span class="value">${escapeHtml(parcelaInfo.vencimento)}</span></div>
        <div class="info-item"><span class="label">Valor da Parcela</span><span class="value">${fmtR(parcelaInfo.valorTotal)}</span></div>
      </div>
    </div>
    <div class="section">
      <div class="finance-cards" data-pdf-section="parcela-financeiro">
        <div class="finance-card anterior">
          <div class="fc-label">Valor Original</div>
          <div class="fc-value">${fmtR(parcelaInfo.valorTotal)}</div>
        </div>
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
      <div class="section-title" data-pdf-section="restantes-titulo">Parcelas Restantes</div>
      <table>
        <thead data-pdf-section="restantes-cabecalho">
          <tr>
            <th>Parcela</th>
            <th style="text-align:right">Valor</th>
            <th>Vencimento</th>
            <th style="text-align:center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${parcelasRestantes.map((p, index) => `
            <tr data-pdf-section="restante-${index + 1}">
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
      <div class="pix-section" data-pdf-section="pix">
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
    <div class="receipt-footer" data-pdf-section="footer">
      ${mensagemFinal ? `<div class="thanks">${escapeHtml(mensagemFinal)}</div>` : ""}
      <div class="contact">Em caso de dúvidas, entre em contato.</div>
      ${showTelefone && empresaInfo?.telefone ? `<div class="contact">📱 WhatsApp: ${escapeHtml(empresaInfo.telefone)}</div>` : ""}
      <div class="legal">Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}. ${escapeHtml(rodape)}</div>
    </div>
  `;

  // ─── Full HTML ───
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title} ${docId}</title>
<style>${buildReceiptCSS(rc)}</style>
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

const RECEIPT_RENDER_WIDTH_PX = 794;
const RECEIPT_RENDER_MIN_HEIGHT_PX = 1123;
const RECEIPT_PDF_MARGIN_MM = 5;
const RECEIPT_MIN_VALID_PDF_BYTES = 1500;

function buildReceiptFileName(options: ReceiptPDFOptions) {
  return options.type === "venda"
    ? `recibo_venda_${options.id}.pdf`
    : `recibo_pagamento_${options.id}.pdf`;
}

function extractTextFromReceiptHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cloneReceiptSourceForExport(sourceElement: HTMLElement) {
  const clone = sourceElement.cloneNode(true) as HTMLElement;

  clone.removeAttribute("id");
  clone.setAttribute("data-export-clone", "receipt");
  clone.setAttribute("data-export-mode", "pdf");

  clone.querySelectorAll("button, [role='button'], [data-receipt-action], [data-ui-control], [aria-label='Close'], [aria-label='Fechar']").forEach((node) => {
    node.remove();
  });

  clone.querySelectorAll<HTMLElement>("[data-radix-scroll-area-viewport], [data-radix-scroll-area-root], [data-export-expand]").forEach((node) => {
    node.style.height = "auto";
    node.style.maxHeight = "none";
    node.style.overflow = "visible";
  });

  clone.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    img.loading = "eager";
    img.decoding = "sync";
  });

  return clone;
}

async function waitForImagesInNode(root: ParentNode, timeoutMs = 8000) {
  const images = Array.from(root.querySelectorAll("img"));
  if (!images.length) return;

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            if (!img.naturalWidth) {
              img.style.display = "none";
            }
            resolve();
          };

          if (img.complete) {
            finish();
            return;
          }

          img.addEventListener("load", finish, { once: true });
          img.addEventListener("error", finish, { once: true });
          setTimeout(finish, timeoutMs);
        })
    )
  );
}

async function waitForRenderableElement(element: HTMLElement, timeoutMs = 2500) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const rect = element.getBoundingClientRect();
    const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const style = window.getComputedStyle(element);
    const hasSize = rect.width > 120 && rect.height > 120;
    const visible = style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    const hasText = text.length >= 24;

    if (hasSize && visible && hasText) {
      return {
        width: rect.width,
        height: rect.height,
        textLength: text.length,
      };
    }

    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));
  }

  throw new Error("O recibo ainda não terminou de renderizar. Aguarde alguns instantes e tente novamente.");
}

async function waitForRenderCycle(frameWindow: Window, cycles = 2) {
  for (let i = 0; i < cycles; i += 1) {
    await new Promise<void>((resolve) => {
      frameWindow.requestAnimationFrame(() => resolve());
    });
  }
}

async function inlineStyles(sourceElement: HTMLElement, cloneElement: HTMLElement) {
  const sourceNodes = [sourceElement, ...Array.from(sourceElement.querySelectorAll<HTMLElement>("*"))];
  const cloneNodes = [cloneElement, ...Array.from(cloneElement.querySelectorAll<HTMLElement>("*"))];

  sourceNodes.forEach((sourceNode, index) => {
    const cloneNode = cloneNodes[index];
    if (!cloneNode) return;

    const computed = window.getComputedStyle(sourceNode);
    const importantStyles = [
      "display",
      "position",
      "top",
      "right",
      "bottom",
      "left",
      "width",
      "min-width",
      "max-width",
      "height",
      "min-height",
      "max-height",
      "margin",
      "margin-top",
      "margin-right",
      "margin-bottom",
      "margin-left",
      "padding",
      "padding-top",
      "padding-right",
      "padding-bottom",
      "padding-left",
      "border",
      "border-top",
      "border-right",
      "border-bottom",
      "border-left",
      "border-radius",
      "background",
      "background-color",
      "background-image",
      "background-size",
      "background-position",
      "color",
      "font",
      "font-size",
      "font-weight",
      "font-family",
      "line-height",
      "letter-spacing",
      "text-align",
      "text-transform",
      "text-decoration",
      "white-space",
      "word-break",
      "overflow-wrap",
      "gap",
      "column-gap",
      "row-gap",
      "grid-template-columns",
      "grid-template-rows",
      "flex-direction",
      "justify-content",
      "align-items",
      "object-fit",
      "box-shadow",
      "opacity",
      "transform",
      "overflow",
    ];

    importantStyles.forEach((prop) => {
      cloneNode.style.setProperty(prop, computed.getPropertyValue(prop));
    });
  });
}

async function buildReceiptHtmlFromSourceElement(sourceElement: HTMLElement, options: ReceiptPDFOptions) {
  const clone = cloneReceiptSourceForExport(sourceElement);
  await inlineStyles(sourceElement, clone);

  const wrapper = document.createElement("div");
  wrapper.style.width = `${Math.max(RECEIPT_RENDER_WIDTH_PX, Math.ceil(sourceElement.getBoundingClientRect().width || RECEIPT_RENDER_WIDTH_PX))}px`;
  wrapper.style.margin = "0 auto";
  wrapper.style.padding = "0";
  wrapper.style.background = "#ffffff";
  wrapper.appendChild(clone);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Recibo ${escapeHtml(options.id)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; color: #111827; }
  img { max-width: 100%; }
  [data-export-clone='receipt'] { width: 100%; background: #ffffff; }
</style>
</head>
<body>
  ${wrapper.outerHTML}
</body>
</html>`;

  return html;
}

function createReceiptFrame(html: string, title = "receipt-export-frame") {
  const frame = document.createElement("iframe");
  frame.setAttribute("title", title);
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.top = "0";
  frame.style.left = "0";
  frame.style.width = `${RECEIPT_RENDER_WIDTH_PX}px`;
  frame.style.minWidth = `${RECEIPT_RENDER_WIDTH_PX}px`;
  frame.style.height = `${RECEIPT_RENDER_MIN_HEIGHT_PX}px`;
  frame.style.border = "0";
  frame.style.opacity = "0.01";
  frame.style.pointerEvents = "none";
  frame.style.background = "#ffffff";
  frame.style.zIndex = "-1";
  frame.style.overflow = "hidden";

  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    document.body.removeChild(frame);
    throw new Error("Falha ao criar o frame de renderização do recibo.");
  }

  doc.open();
  doc.write(html);
  doc.close();

  return {
    frame,
    cleanup: () => {
      if (frame.parentNode) {
        frame.parentNode.removeChild(frame);
      }
    },
  };
}

async function waitForReceiptFrame(frame: HTMLIFrameElement, timeoutMs = 10000) {
  const doc = frame.contentDocument;
  const win = frame.contentWindow;

  if (!doc || !win) {
    throw new Error("Não foi possível inicializar o documento do recibo.");
  }

  const body = doc.body;
  if (!body) {
    throw new Error("O template do recibo não foi montado corretamente.");
  }

  if (doc.fonts?.ready) {
    await Promise.race([
      doc.fonts.ready.catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  }

  await waitForImagesInNode(doc, timeoutMs);
  await waitForRenderCycle(win, 3);
}

async function assertValidPdfBlob(blob: Blob, expectedText: string) {
  let header = "";
  try {
    const slice = blob.slice(0, 4);
    if (typeof slice.text === "function") {
      header = await slice.text();
    } else {
      const buf = await slice.arrayBuffer();
      header = String.fromCharCode(...new Uint8Array(buf));
    }
  } catch {
    // ignore — header stays empty
  }

  if (header !== "%PDF" || blob.size < RECEIPT_MIN_VALID_PDF_BYTES) {
    console.error("[Receipt] Invalid PDF blob", {
      size: blob.size,
      header,
      expectedTextLength: expectedText.length,
    });
    throw new Error("O PDF do recibo foi gerado vazio ou inválido.");
  }
}

async function renderReceiptElementToPdf(sourceElement: HTMLElement, html: string, expectedText: string) {
  const { frame, cleanup } = createReceiptFrame(html);

  try {
    await waitForReceiptFrame(frame);

    const doc = frame.contentDocument;
    const body = doc?.body;
    const exportRoot = body?.querySelector<HTMLElement>("[data-export-clone='receipt']") ?? body;
    if (!doc || !body || !exportRoot) {
      throw new Error("O conteúdo do recibo não foi encontrado no DOM de exportação.");
    }

    const textContent = exportRoot.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (!textContent || textContent.length < 24 || !expectedText.includes(textContent.slice(0, Math.min(textContent.length, 24)))) {
      console.error("[Receipt] Export root missing visible content", {
        sourceLabel: sourceElement.dataset.receiptSource || sourceElement.id || null,
        textLength: textContent.length,
        expectedTextLength: expectedText.length,
      });
      throw new Error("O recibo não terminou de renderizar antes da exportação.");
    }

    const sourceRect = sourceElement.getBoundingClientRect();
    const exportRect = exportRoot.getBoundingClientRect();
    const captureWidth = Math.max(RECEIPT_RENDER_WIDTH_PX, Math.ceil(exportRect.width || sourceRect.width || RECEIPT_RENDER_WIDTH_PX));
    const captureHeight = Math.max(RECEIPT_RENDER_MIN_HEIGHT_PX, Math.ceil(exportRoot.scrollHeight || exportRect.height || sourceRect.height || RECEIPT_RENDER_MIN_HEIGHT_PX));

    console.info("[Receipt] Starting PDF capture", {
      sourceLabel: sourceElement.dataset.receiptSource || sourceElement.id || null,
      sourceReady: true,
      sourceRect: { width: sourceRect.width, height: sourceRect.height },
      exportRect: { width: exportRect.width, height: exportRect.height },
      captureWidth,
      captureHeight,
      images: exportRoot.querySelectorAll("img").length,
      textLength: textContent.length,
    });

    const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 2));
    const canvas = await html2canvas(exportRoot, {
      backgroundColor: "#ffffff",
      scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: captureWidth,
      height: captureHeight,
      windowWidth: captureWidth,
      windowHeight: captureHeight,
      scrollX: 0,
      scrollY: 0,
    });

    if (!canvas.width || !canvas.height) {
      throw new Error("A captura do recibo resultou em imagem vazia.");
    }

    const pdf = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const pageWidthMm = pdf.internal.pageSize.getWidth();
    const pageHeightMm = pdf.internal.pageSize.getHeight();
    const margin = RECEIPT_PDF_MARGIN_MM;
    const contentWidthMm = pageWidthMm - margin * 2;
    const maxContentHeightMm = pageHeightMm - margin * 2;
    const totalHeightMm = (canvas.height * contentWidthMm) / canvas.width;

    if (totalHeightMm <= maxContentHeightMm) {
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", margin, margin, contentWidthMm, totalHeightMm, undefined, "FAST");
    } else {
      const pxPerMm = canvas.width / contentWidthMm;
      const sliceHeightPx = Math.max(1, Math.floor(maxContentHeightMm * pxPerMm));
      let renderedPx = 0;
      let pageIdx = 0;

      while (renderedPx < canvas.height) {
        if (pageIdx > 0) pdf.addPage();

        const currentSlicePx = Math.min(sliceHeightPx, canvas.height - renderedPx);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = currentSlicePx;

        const ctx = pageCanvas.getContext("2d");
        if (!ctx) throw new Error("Falha ao preparar uma página do PDF.");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, renderedPx, canvas.width, currentSlicePx, 0, 0, canvas.width, currentSlicePx);

        const sliceHeightMm = currentSlicePx / pxPerMm;
        pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.98), "JPEG", margin, margin, contentWidthMm, sliceHeightMm, undefined, "FAST");

        renderedPx += currentSlicePx;
        pageIdx += 1;
      }
    }

    const blob = pdf.output("blob");
    console.info("[Receipt] PDF rendered successfully", {
      size: blob.size,
      totalHeightMm: totalHeightMm.toFixed(1),
      strategy: "visible-layout-clone",
    });
    return blob;
  } finally {
    cleanup();
  }
}

async function prepareReceiptDocument(options: ReceiptPDFOptions) {
  const sourceElement = options.sourceElement ?? null;
  if (!sourceElement) {
    throw new Error("A área visível do recibo não foi encontrada para exportação.");
  }

  if (options.sourceReady === false) {
    throw new Error("O recibo ainda está carregando. Aguarde terminar para exportar.");
  }

  const readiness = await waitForRenderableElement(sourceElement);
  console.info("[Receipt] Source ready for export", {
    sourceLabel: options.sourceLabel ?? sourceElement.dataset.receiptSource ?? sourceElement.id ?? null,
    width: readiness.width,
    height: readiness.height,
    textLength: readiness.textLength,
    mobileViewport: window.innerWidth < 768,
  });

  const { preloadReceiptImages } = await import("@/lib/receiptConfig");
  await preloadReceiptImages(options);

  const html = await buildReceiptHtmlFromSourceElement(sourceElement, options);
  const textContent = extractTextFromReceiptHtml(html);

  if (!textContent || textContent.length < 32) {
    console.error("[Receipt] HTML generated without visible content", { options });
    throw new Error("O HTML do recibo foi gerado sem conteúdo visível.");
  }

  return {
    html,
    textContent,
    fileName: buildReceiptFileName(options),
    sourceElement,
  };
}

export async function generateReceiptPdfBlob(options: ReceiptPDFOptions) {
  const prepared = await prepareReceiptDocument(options);
  const blob = await renderReceiptElementToPdf(prepared.sourceElement, prepared.html, prepared.textContent);

  await assertValidPdfBlob(blob, prepared.textContent);

  console.info("[Receipt] PDF generated successfully", {
    fileName: prepared.fileName,
    size: blob.size,
    strategy: "visible-layout-clone",
  });

  return {
    blob,
    fileName: prepared.fileName,
    html: prepared.html,
  };
}


export async function printReceipt(options: ReceiptPDFOptions) {
  const { html } = await prepareReceiptDocument(options);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "receipt-print-frame");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = `${RECEIPT_RENDER_WIDTH_PX}px`;
  iframe.style.minWidth = `${RECEIPT_RENDER_WIDTH_PX}px`;
  iframe.style.height = `${RECEIPT_RENDER_MIN_HEIGHT_PX}px`;
  iframe.style.border = "0";
  iframe.style.opacity = "0.01";
  iframe.style.pointerEvents = "none";
  iframe.style.background = "#ffffff";
  iframe.style.zIndex = "-1";

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 300);
  };

  document.body.appendChild(iframe);

  const printDoc = iframe.contentDocument;
  const printWin = iframe.contentWindow;

  if (!printDoc || !printWin) {
    cleanup();
    throw new Error("Não foi possível preparar a área de impressão do recibo.");
  }

  printDoc.open();
  printDoc.write(html);
  printDoc.close();

  await waitForReceiptFrame(iframe, 12000);

  await new Promise<void>((resolve) => {
    printWin.requestAnimationFrame(() => {
      printWin.requestAnimationFrame(() => resolve());
    });
  });

  try {
    printWin.focus();
    printWin.print();
  } finally {
    if ("onafterprint" in printWin) {
      printWin.addEventListener("afterprint", cleanup, { once: true });
      setTimeout(cleanup, 60000);
    } else {
      cleanup();
    }
  }
}

export async function exportReceiptPDF(options: ReceiptPDFOptions) {
  const { blob, fileName } = await generateReceiptPdfBlob(options);
  downloadBlob(blob, fileName);
  return { blob, fileName };
}

export async function shareReceiptWhatsApp(options: ReceiptPDFOptions, phone?: string) {
  const { blob, fileName } = await generateReceiptPdfBlob(options);
  const file = new File([blob], fileName, { type: "application/pdf" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: options.type === "venda" ? `Recibo de Venda #${options.id}` : `Recibo de Pagamento #${options.id}`,
        files: [file],
      });
      console.info("[Receipt] Shared via Web Share API", { fileName, size: blob.size });
      return { fileName, blob, shared: true };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { fileName, blob, shared: false, cancelled: true };
      }
      console.warn("[Receipt] Web Share failed, falling back to download + WhatsApp", error);
    }
  }

  downloadBlob(blob, fileName);

  const isVenda = options.type === "venda";
  const text = isVenda
    ? `📄 *Recibo de Venda #${options.id}*\n👤 Cliente: ${options.cliente.nome}\n💰 Total: ${fmtR(options.resumo.total)}\n📅 Data: ${options.data}`
    : `📄 *Recibo de Pagamento #${options.id}*\n👤 Cliente: ${options.cliente.nome}\n💰 Valor Pago: ${fmtR(options.pagamentos.reduce((s, p) => s + p.valor, 0))}\n📅 Data: ${options.data}`;

  const encoded = encodeURIComponent(text);
  const cleanPhone = phone?.replace(/\D/g, "") || "";
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  console.info("[Receipt] Download fallback before WhatsApp redirect", {
    fileName,
    size: blob.size,
    whatsappUrl,
  });

  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  return { fileName, blob, shared: false };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Helpers ───
export const fmtR = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const fmtN = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
