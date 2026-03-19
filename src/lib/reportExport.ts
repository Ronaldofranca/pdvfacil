import { format } from "date-fns";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import JsPDF from "jspdf";

function escapeHtml(unsafe: unknown): string {
  const s = unsafe === null || unsafe === undefined ? "" : String(unsafe);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
  receiptConfig?: import("@/lib/receiptConfig").ReceiptConfig;
}

function buildPixPayload(chave: string, tipo: string, valor?: number, nome?: string, cidade?: string): string {
  const formatField = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, "0");
    return `${id}${len}${value}`;
  };

  let payload = formatField("00", "01");
  const gui = formatField("00", "br.gov.bcb.pix");
  const chaveField = formatField("01", chave);
  payload += formatField("26", gui + chaveField);
  payload += formatField("52", "0000");
  payload += formatField("53", "986");

  if (valor && valor > 0) {
    payload += formatField("54", valor.toFixed(2));
  }

  payload += formatField("58", "BR");
  payload += formatField("59", (nome || "Pagamento").substring(0, 25));
  payload += formatField("60", (cidade || "SAO PAULO").substring(0, 15).toUpperCase());
  payload += "6304";

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
    return await QRCode.toDataURL(pixPayload, {
      width: 200,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch {
    return null;
  }
}

export { buildPixPayload, generatePixQRCodeDataUrl };

type ReceiptAction = "download" | "print" | "share";

const RECEIPT_MIN_VALID_PDF_BYTES = 1500;
const RECEIPT_MIN_VISIBLE_TEXT = 20;
const RECEIPT_MARGIN_MM = 5;

export interface ReceiptElementReadiness {
  width: number;
  height: number;
  textLength: number;
  totalImages: number;
  loadedImages: number;
  hiddenImages: number;
}

function normalizeNodeText(node: ParentNode) {
  return (node.textContent || "").replace(/\s+/g, " ").trim();
}

function nextPaint() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

async function waitForFonts(timeoutMs = 4000) {
  const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
  if (!fonts?.ready) return;

  await Promise.race([
    fonts.ready.then(() => undefined).catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

async function waitForImagesInNode(root: ParentNode, timeoutMs = 8000) {
  const images = Array.from(root.querySelectorAll("img"));
  if (!images.length) {
    return { totalImages: 0, loadedImages: 0, hiddenImages: 0 };
  }

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            if (!img.naturalWidth) img.style.display = "none";
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

  const loadedImages = images.filter((img) => img.complete && img.naturalWidth > 0).length;
  const hiddenImages = images.filter((img) => img.style.display === "none").length;

  return {
    totalImages: images.length,
    loadedImages,
    hiddenImages,
  };
}

async function preloadClonedReceiptImages(root: HTMLElement, timeoutMs = 10000) {
  const { imageToBase64 } = await import("@/lib/receiptConfig");
  const images = Array.from(root.querySelectorAll("img"));
  let convertedImages = 0;
  let hiddenImages = 0;

  await Promise.allSettled(
    images.map(async (img) => {
      const src = img.getAttribute("src") || "";
      if (!src || src.startsWith("data:")) return;

      const base64 = await imageToBase64(src, timeoutMs);
      if (base64) {
        img.src = base64;
        convertedImages += 1;
      } else {
        img.style.display = "none";
        hiddenImages += 1;
      }
    })
  );

  return {
    totalImages: images.length,
    convertedImages,
    hiddenImages,
  };
}

function buildReceiptFileName(options?: Partial<ReceiptPDFOptions>) {
  if (!options?.id) return "recibo.pdf";
  return options.type === "pagamento"
    ? `recibo_pagamento_${options.id}.pdf`
    : `recibo_venda_${options.id}.pdf`;
}

async function assertValidPdfBlob(blob: Blob) {
  if (blob.size < RECEIPT_MIN_VALID_PDF_BYTES) {
    throw new Error("O PDF do recibo foi gerado vazio ou inválido.");
  }

  const buffer = await blob.arrayBuffer();
  const header = String.fromCharCode(...new Uint8Array(buffer).slice(0, 4));
  if (header !== "%PDF") {
    throw new Error("O PDF do recibo foi gerado vazio ou inválido.");
  }
}

function canvasToPdfBlob(canvas: HTMLCanvasElement): Blob {
  const pdf = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();
  const contentWidthMm = pageWidthMm - RECEIPT_MARGIN_MM * 2;
  const maxContentHeightMm = pageHeightMm - RECEIPT_MARGIN_MM * 2;
  const totalHeightMm = (canvas.height * contentWidthMm) / canvas.width;

  if (totalHeightMm <= maxContentHeightMm) {
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.98),
      "JPEG",
      RECEIPT_MARGIN_MM,
      RECEIPT_MARGIN_MM,
      contentWidthMm,
      totalHeightMm,
      undefined,
      "FAST"
    );

    return pdf.output("blob");
  }

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
    pdf.addImage(
      pageCanvas.toDataURL("image/jpeg", 0.98),
      "JPEG",
      RECEIPT_MARGIN_MM,
      RECEIPT_MARGIN_MM,
      contentWidthMm,
      sliceHeightMm,
      undefined,
      "FAST"
    );

    renderedPx += currentSlicePx;
    pageIdx += 1;
  }

  return pdf.output("blob");
}

export async function ensureReceiptElementReady(element: HTMLElement, timeoutMs = 8000): Promise<ReceiptElementReadiness> {
  if (!element) {
    throw new Error("O recibo ainda não está pronto.");
  }

  await waitForFonts();
  const imageState = await waitForImagesInNode(element, timeoutMs);
  await nextPaint();

  const rect = element.getBoundingClientRect();
  const width = Math.max(Math.ceil(rect.width), element.scrollWidth, 0);
  const height = Math.max(Math.ceil(rect.height), element.scrollHeight, 0);
  const textLength = normalizeNodeText(element).length;

  if (textLength < RECEIPT_MIN_VISIBLE_TEXT || width < 40 || height < 40) {
    throw new Error("O recibo ainda não tem conteúdo visível. Aguarde os dados carregarem.");
  }

  return {
    width,
    height,
    textLength,
    ...imageState,
  };
}

export async function exportReceiptFromElement(
  element: HTMLElement,
  fileName: string,
  action: ReceiptAction = "download",
  phone?: string,
  options?: Partial<ReceiptPDFOptions>,
) {
  const sourceState = await ensureReceiptElementReady(element);

  console.info("[Receipt] montagem do recibo confirmada", {
    action,
    fileName,
    documentId: options?.id,
    sourceState,
  });

  const host = document.createElement("div");
  host.setAttribute("id", "receipt-clone-root");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position: fixed",
    "top: 0",
    "left: -200vw",
    `width: ${sourceState.width}px`,
    `min-width: ${sourceState.width}px`,
    "pointer-events: none",
    "overflow: visible",
    "background: #ffffff",
  ].join("; ");

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = "100%";
  clone.style.maxWidth = "100%";
  clone.style.height = "auto";
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";
  host.appendChild(clone);
  document.body.appendChild(host);

  const cleanup = () => {
    if (host.parentNode) host.parentNode.removeChild(host);
  };

  try {
    const imagePreparation = await preloadClonedReceiptImages(clone);
    console.info("[Receipt] imagens do recibo preparadas", {
      action,
      fileName,
      ...imagePreparation,
    });

    const cloneState = await ensureReceiptElementReady(clone);
    console.info("[Receipt] recibo pronto para exportação", {
      action,
      fileName,
      cloneState,
    });

    const captureWidth = Math.max(cloneState.width, host.scrollWidth);
    const captureHeight = Math.max(cloneState.height, host.scrollHeight);
    const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 2));

    console.info("[Receipt] início da geração do PDF", {
      action,
      fileName,
      captureWidth,
      captureHeight,
      scale,
    });

    const canvas = await html2canvas(host, {
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

    const blob = canvasToPdfBlob(canvas);
    await assertValidPdfBlob(blob);

    console.info("[Receipt] PDF gerado com sucesso", {
      action,
      fileName,
      size: blob.size,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    });

    if (action === "download") {
      downloadBlob(blob, fileName);
      return { blob, fileName, shared: false };
    }

    if (action === "print") {
      console.info("[Receipt] início da impressão", { fileName, size: blob.size });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
          }, 500);
        };
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        URL.revokeObjectURL(url);
        downloadBlob(blob, fileName);
      }
      return { blob, fileName, shared: false };
    }

    console.info("[Receipt] início do compartilhamento", { fileName, size: blob.size });
    const file = new File([blob], fileName, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: options?.type === "pagamento" ? `Recibo de Pagamento #${options?.id}` : `Recibo de Venda #${options?.id}`,
          files: [file],
        });
        return { blob, fileName, shared: true };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return { blob, fileName, shared: false, cancelled: true };
        }
        console.error("[Receipt] falha ao compartilhar via Web Share API", error);
      }
    }

    downloadBlob(blob, fileName);
    const cleanPhone = phone?.replace(/\D/g, "") || "";
    const fallbackText = options?.type === "pagamento"
      ? `📄 *Recibo de Pagamento #${options?.id}*\n👤 Cliente: ${options?.cliente?.nome ?? "Cliente"}`
      : `📄 *Recibo de Venda #${options?.id}*\n👤 Cliente: ${options?.cliente?.nome ?? "Cliente"}\n💰 Total: ${fmtR(options?.resumo?.total ?? 0)}`;
    const encoded = encodeURIComponent(fallbackText);
    const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    return { blob, fileName, shared: false };
  } catch (error) {
    console.error("[Receipt] erro detalhado na exportação do recibo", {
      action,
      fileName,
      documentId: options?.id,
      error,
    });
    throw error instanceof Error ? error : new Error("Falha ao gerar o recibo.");
  } finally {
    cleanup();
  }
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

export const fmtR = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const fmtN = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

export const buildReceiptPdfFileName = buildReceiptFileName;
