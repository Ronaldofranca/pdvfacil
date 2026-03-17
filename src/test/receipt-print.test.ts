import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RECEIPT_CONFIG } from "@/lib/receiptConfig";

const openMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  openMock.mockReset();
  vi.stubGlobal("open", openMock);
});

describe("printReceipt", () => {
  it("abre uma janela de impressão e injeta o HTML do recibo", async () => {
    const printWindow = {
      document: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      },
      location: {
        replace: vi.fn(),
      },
      close: vi.fn(),
    } as any;

    openMock.mockReturnValue(printWindow);

    const createObjectURLMock = vi.fn(() => "blob:print-receipt");
    const revokeObjectURLMock = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });

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

    expect(openMock).toHaveBeenCalled();
    expect(printWindow.document.open).toHaveBeenCalled();
    expect(printWindow.document.write).toHaveBeenCalled();
    expect(printWindow.location.replace).toHaveBeenCalledWith("blob:print-receipt");
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
  });

  it("lança erro quando a janela de impressão é bloqueada", async () => {
    openMock.mockReturnValue(null);
    const { printReceipt } = await import("@/lib/reportExport");

    await expect(
      printReceipt({
        type: "venda",
        id: "abc123",
        empresa: "Empresa Teste",
        data: "01/01/2026 10:00",
        cliente: { nome: "Maria", id: "cli-1" },
        itens: [],
        resumo: { subtotal: 0, descontos: 0, total: 0 },
        pagamentos: [],
        receiptConfig: DEFAULT_RECEIPT_CONFIG,
      })
    ).rejects.toThrow("Não foi possível abrir a janela de impressão do recibo.");
  });
});
