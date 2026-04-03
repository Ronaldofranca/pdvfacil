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
      const content = "%PDF-1.4 mock receipt" + "x".repeat(2000);
      return new Blob([content], { type: "application/pdf" });
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

  it("ref aponta diretamente para o conteúdo do recibo, não para o ScrollArea", () => {
    const contentRef = createRef<HTMLDivElement>();
    render(
      <ReceiptDialogShell
        open
        onOpenChange={() => {}}
        title={undefined}
        actions={<button type="button">Exportar PDF</button>}
      >
        <ReceiptVendaContent ref={contentRef} venda={venda} itens={itens} parcelas={parcelas} />
      </ReceiptDialogShell>
    );

    // The ref points directly to the receipt content element
    expect(contentRef.current).toBeTruthy();
    expect(contentRef.current?.getAttribute("data-receipt-document")).toBe("venda");
    // Content is inside the ref
    expect(contentRef.current?.textContent).toContain("Recibo de Venda");
    expect(contentRef.current?.textContent).toContain("Maria");
    expect(contentRef.current?.textContent).toContain("Produto A");
    // Buttons are NOT inside the ref
    expect(contentRef.current?.textContent).not.toContain("Exportar PDF");
  });

  it("exibe todos os blocos do recibo corretamente", () => {
    render(
      <ReceiptDialogShell open onOpenChange={() => {}} title={undefined} actions={<button type="button">PDF</button>}>
        <ReceiptVendaContent venda={venda} itens={itens} parcelas={parcelas} />
      </ReceiptDialogShell>
    );

    expect(screen.getByText("Recibo de Venda")).toBeInTheDocument();
    expect(screen.getByText("Maria")).toBeInTheDocument();
    expect(screen.getByText("Itens da Venda")).toBeInTheDocument();
    expect(screen.getByText("Formas de Pagamento")).toBeInTheDocument();
  });

  it("badges de status usam tamanho reduzido", () => {
    const contentRef = createRef<HTMLDivElement>();
    render(
      <ReceiptDialogShell open onOpenChange={() => {}} title={undefined} actions={<div />}>
        <ReceiptVendaContent ref={contentRef} venda={venda} itens={itens} parcelas={parcelas} />
      </ReceiptDialogShell>
    );

    const badges = contentRef.current?.querySelectorAll("[data-receipt-document] .text-\\[10px\\]");
    expect(badges?.length).toBeGreaterThan(0);
  });

  it("imagens dos produtos têm container fixo com object-cover", () => {
    const contentRef = createRef<HTMLDivElement>();
    render(
      <ReceiptDialogShell open onOpenChange={() => {}} title={undefined} actions={<div />}>
        <ReceiptVendaContent ref={contentRef} venda={venda} itens={itens} parcelas={parcelas} />
      </ReceiptDialogShell>
    );

    const imgs = contentRef.current?.querySelectorAll("img");
    expect(imgs?.length).toBeGreaterThan(0);
    const img = imgs![0];
    expect(img.classList.contains("object-cover")).toBe(true);
    expect(img.getAttribute("width")).toBe("32");
    expect(img.getAttribute("height")).toBe("32");
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

    // Mock dimensions for jsdom
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, width: 794, height: 600, top: 0, right: 794, bottom: 600, left: 0, toJSON: () => ({}) });
    Object.defineProperty(el, "scrollWidth", { value: 794, configurable: true });
    Object.defineProperty(el, "scrollHeight", { value: 600, configurable: true });

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

    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, width: 794, height: 400, top: 0, right: 794, bottom: 400, left: 0, toJSON: () => ({}) });
    Object.defineProperty(el, "scrollWidth", { value: 794, configurable: true });
    Object.defineProperty(el, "scrollHeight", { value: 400, configurable: true });

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

  it("exportação captura conteúdo completo independente de scroll", async () => {
    const html2canvas = (await import("html2canvas")).default as any;
    const { exportReceiptFromElement } = await import("@/lib/reportExport");

    // Simulate a tall receipt inside a short scroll container
    const el = document.createElement("div");
    el.style.width = "794px";
    el.style.height = "2000px"; // tall content
    let content = "Recibo de Venda Cliente Maria ";
    for (let i = 0; i < 30; i++) content += `Item ${i + 1} Produto ${i + 1} `;
    content += "Total R$ 300,00 Parcelas do Crediário";
    el.textContent = content;
    document.body.appendChild(el);

    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, width: 794, height: 2000, top: 0, right: 794, bottom: 2000, left: 0, toJSON: () => ({}) });
    Object.defineProperty(el, "scrollWidth", { value: 794, configurable: true });
    Object.defineProperty(el, "scrollHeight", { value: 2000, configurable: true });

    globalThis.URL.createObjectURL = vi.fn(() => "blob:mock");
    globalThis.URL.revokeObjectURL = vi.fn();

    await exportReceiptFromElement(el, "test.pdf", "download");

    // html2canvas should be called with the clone's full dimensions
    const lastCall = html2canvas.mock.calls[html2canvas.mock.calls.length - 1];
    const options = lastCall[1];
    expect(options.height).toBeGreaterThanOrEqual(40);
    expect(options.scrollY).toBe(0);

    document.body.removeChild(el);
  }, 15000);
});
