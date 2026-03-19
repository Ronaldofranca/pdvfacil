import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("html2canvas", () => ({
  default: vi.fn(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 794;
    canvas.height = 1123;
    return canvas;
  }),
}));

const pdfBlobContent = "%PDF-1.4 mock receipt pdf for print test with enough bytes to pass validation";
vi.mock("jspdf", () => ({
  default: class MockJsPDF {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    addImage = vi.fn();
    addPage = vi.fn();
    output = vi.fn(() => new Blob([pdfBlobContent], { type: "application/pdf" }));
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("receipt print action", () => {
  it("gera PDF do mesmo DOM do recibo e abre a impressão", async () => {
    const openMock = vi.fn().mockReturnValue({
      onload: null,
      focus: vi.fn(),
      print: vi.fn(),
    });
    vi.spyOn(window, "open").mockImplementation(openMock);

    const { exportReceiptFromElement } = await import("@/lib/reportExport");

    const el = document.createElement("div");
    el.style.width = "794px";
    el.style.height = "500px";
    el.textContent = "Recibo de Venda Cliente Maria Produto A Total R$ 10,00";
    document.body.appendChild(el);

    globalThis.URL.createObjectURL = vi.fn(() => "blob:mock");
    globalThis.URL.revokeObjectURL = vi.fn();

    await exportReceiptFromElement(el, "recibo.pdf", "print", undefined, {
      type: "venda",
      id: "abc123",
      cliente: { nome: "Maria", id: "cli-1" },
      resumo: { subtotal: 10, descontos: 0, total: 10 },
    });

    expect(openMock).toHaveBeenCalledTimes(1);
    expect(openMock.mock.calls[0][0]).toMatch(/^blob:/);
    document.body.removeChild(el);
  });
});
