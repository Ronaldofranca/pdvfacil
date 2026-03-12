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
