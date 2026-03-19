import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReceiptDialogShell } from "@/components/receipts/ReceiptDialogShell";
import { ReceiptVendaContent } from "@/components/receipts/ReceiptVendaContent";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("html2canvas", () => ({
  default: vi.fn(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 794;
    canvas.height = 1123;
    return canvas;
  }),
}));
vi.mock("jspdf", () => ({
  default: class MockJsPDF {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    addImage = vi.fn();
    addPage = vi.fn();
    output = vi.fn(() => {
      const content = "%PDF-1.4 mock" + "x".repeat(2000);
      const bytes = new Uint8Array(content.length);
      for (let i = 0; i < content.length; i++) bytes[i] = content.charCodeAt(i);
      return new Blob([bytes], { type: "application/pdf" });
    });
  },
}));

const venda = {
  id: "abc12345-def6-7890-abcd-ef1234567890",
  cliente_id: "cli-12345678",
  data_venda: "2026-01-01T10:00:00.000Z",
  status: "finalizada",
  subtotal: 10,
  desconto_total: 0,
  total: 10,
  pagamentos: [{ forma: "pix", valor: 10 }],
  clientes: { nome: "Maria" },
};

const itens = [
  { id: "1", nome_produto: "Produto A", quantidade: 1, preco_vendido: 10, desconto: 0, subtotal: 10, produtos: { imagem_url: "data:image/png;base64,AAA" } },
];

const parcelas = [
  { id: "p1", numero: 1, valor_total: 10, vencimento: "2026-02-01", status: "pendente" },
];

describe("receipt unified pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("usa o mesmo bloco visível como fonte oficial do recibo", async () => {
    const exportRef = createRef<HTMLDivElement>();
    render(
      <ReceiptDialogShell
        open
        onOpenChange={() => {}}
        title={undefined}
        exportRef={exportRef}
        actions={<button type="button">Exportar PDF</button>}
      >
        <ReceiptVendaContent venda={venda} itens={itens} parcelas={parcelas} />
      </ReceiptDialogShell>
    );

    expect(screen.getByText("Recibo de Venda")).toBeInTheDocument();
    expect(screen.getByText("Maria")).toBeInTheDocument();
    expect(screen.getByText("Itens da Venda")).toBeInTheDocument();
    expect(screen.getByText("Formas de Pagamento")).toBeInTheDocument();
    expect(screen.getByText("Parcelas do Crediário")).toBeInTheDocument();
    expect(exportRef.current?.textContent).toContain("Recibo de Venda");
    expect(exportRef.current?.textContent).toContain("Produto A");
    expect(exportRef.current?.textContent).not.toContain("Exportar PDF");
  });

  it("gera PDF do DOM visível, limpa o clone e não sai em branco", async () => {
    const { exportReceiptFromElement } = await import("@/lib/reportExport");

    const el = document.createElement("div");
    el.style.width = "794px";
    el.style.height = "600px";
    el.innerHTML = `
      <div>Recibo de Venda</div>
      <div>Cliente: Maria</div>
      <div>Itens da Venda</div>
      <img src="data:image/png;base64,AAA" alt="Produto A" />
      <div>Produto A - 1x R$ 10,00</div>
      <div>Formas de Pagamento</div>
      <div>PIX - R$ 10,00</div>
      <div>Parcelas do Crediário</div>
    `;
    document.body.appendChild(el);

    globalThis.URL.createObjectURL = vi.fn(() => "blob:mock");
    globalThis.URL.revokeObjectURL = vi.fn();

    const result = await exportReceiptFromElement(el, "test.pdf", "download", undefined, {
      type: "venda",
      id: "abc123",
      cliente: { nome: "Maria", id: "cli-1" },
      resumo: { subtotal: 10, descontos: 0, total: 10 },
    });

    expect(result.blob.size).toBeGreaterThan(100);
    expect(result.fileName).toBe("test.pdf");
    expect(document.getElementById("receipt-clone-root")).toBeNull();
    document.body.removeChild(el);
  }, 15000);

  it("as 3 saídas usam o mesmo fluxo de captura do DOM", async () => {
    const html2canvas = (await import("html2canvas")).default as any;
    const { exportReceiptFromElement } = await import("@/lib/reportExport");

    const el = document.createElement("div");
    el.style.width = "794px";
    el.style.height = "400px";
    el.textContent = "Recibo de Venda Cliente Maria Produto A Total R$ 10,00";
    document.body.appendChild(el);

    globalThis.URL.createObjectURL = vi.fn(() => "blob:mock");
    globalThis.URL.revokeObjectURL = vi.fn();

    await exportReceiptFromElement(el, "test.pdf", "download");
    const afterDownload = html2canvas.mock.calls.length;

    vi.stubGlobal("open", vi.fn(() => ({ onload: null, focus: vi.fn(), print: vi.fn() })));
    await exportReceiptFromElement(el, "test.pdf", "print");
    const afterPrint = html2canvas.mock.calls.length;

    Object.defineProperty(navigator, "canShare", { value: vi.fn(() => true), configurable: true });
    Object.defineProperty(navigator, "share", { value: vi.fn().mockResolvedValue(undefined), configurable: true });
    await exportReceiptFromElement(el, "test.pdf", "share", "11999999999", { type: "venda", id: "abc123", cliente: { nome: "Maria", id: "cli-1" }, resumo: { subtotal: 10, descontos: 0, total: 10 } });
    const afterShare = html2canvas.mock.calls.length;

    expect(afterDownload).toBeGreaterThan(0);
    expect(afterPrint).toBeGreaterThan(afterDownload);
    expect(afterShare).toBeGreaterThan(afterPrint);

    document.body.removeChild(el);
  }, 15000);
});
