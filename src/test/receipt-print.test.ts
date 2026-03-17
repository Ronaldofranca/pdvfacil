import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RECEIPT_CONFIG } from "@/lib/receiptConfig";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("printReceipt", () => {
  it("renderiza o recibo em iframe e dispara a impressão", async () => {
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);

    const printMock = vi.fn();
    const focusMock = vi.fn();
    const rafMock = vi.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    Object.defineProperty(iframe, "contentWindow", {
      value: {
        print: printMock,
        focus: focusMock,
        requestAnimationFrame: rafMock,
        addEventListener: vi.fn(),
      },
      configurable: true,
    });

    Object.defineProperty(iframe, "contentDocument", {
      value: document.implementation.createHTMLDocument("print"),
      configurable: true,
    });

    const appendSpy = vi.spyOn(document.body, "appendChild").mockReturnValue(iframe);

    const { printReceipt } = await import("@/lib/reportExport");

    await printReceipt({
      type: "venda",
      id: "abc123",
      empresa: "Empresa Teste",
      logoUrl: "data:image/png;base64,AAA",
      data: "01/01/2026 10:00",
      cliente: { nome: "Maria", id: "cli-1" },
      itens: [
        { nome: "Produto A", quantidade: 1, precoUnitario: 10, desconto: 0, subtotal: 10 },
      ],
      resumo: { subtotal: 10, descontos: 0, total: 10 },
      pagamentos: [{ forma: "PIX", valor: 10 }],
      receiptConfig: DEFAULT_RECEIPT_CONFIG,
    });

    expect(appendSpy).toHaveBeenCalled();
    expect(printMock).toHaveBeenCalledTimes(1);
    expect(focusMock).toHaveBeenCalledTimes(1);
  });
});
