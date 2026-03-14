import { describe, it, expect, vi } from "vitest";
import { DEFAULT_RECEIPT_CONFIG, getReceiptConfig, imageToBase64, preloadReceiptImages } from "@/lib/receiptConfig";

describe("receiptConfig", () => {
  describe("getReceiptConfig", () => {
    it("returns defaults when config is null", () => {
      const result = getReceiptConfig(null);
      expect(result).toEqual(DEFAULT_RECEIPT_CONFIG);
    });

    it("returns defaults when config is undefined", () => {
      const result = getReceiptConfig(undefined);
      expect(result).toEqual(DEFAULT_RECEIPT_CONFIG);
    });

    it("merges partial config with defaults", () => {
      const result = getReceiptConfig({
        recibo_cor_cabecalho: "#ff0000",
        recibo_mensagem_final: "Volte sempre!",
      });
      expect(result.recibo_cor_cabecalho).toBe("#ff0000");
      expect(result.recibo_mensagem_final).toBe("Volte sempre!");
      // Other fields should be defaults
      expect(result.recibo_cor_principal).toBe(DEFAULT_RECEIPT_CONFIG.recibo_cor_principal);
      expect(result.recibo_exibir_logo).toBe(true);
    });

    it("saves all toggle states correctly", () => {
      const result = getReceiptConfig({
        recibo_exibir_telefone: false,
        recibo_exibir_endereco: false,
        recibo_exibir_cliente: false,
        recibo_exibir_imagem_produto: false,
      });
      expect(result.recibo_exibir_telefone).toBe(false);
      expect(result.recibo_exibir_endereco).toBe(false);
      expect(result.recibo_exibir_cliente).toBe(false);
      expect(result.recibo_exibir_imagem_produto).toBe(false);
    });

    it("restore default produces exact DEFAULT_RECEIPT_CONFIG", () => {
      const result = getReceiptConfig(DEFAULT_RECEIPT_CONFIG);
      expect(result).toEqual(DEFAULT_RECEIPT_CONFIG);
    });
  });

  describe("imageToBase64", () => {
    it("returns null for empty URL", async () => {
      const result = await imageToBase64("");
      expect(result).toBeNull();
    });

    it("returns data URL as-is", async () => {
      const dataUrl = "data:image/png;base64,iVBOR";
      const result = await imageToBase64(dataUrl);
      expect(result).toBe(dataUrl);
    });

    it("returns null for invalid URL (graceful failure)", async () => {
      const result = await imageToBase64("https://invalid.test/no-image.png", 500);
      expect(result).toBeNull();
    });
  });

  describe("preloadReceiptImages", () => {
    it("handles options with no images gracefully", async () => {
      const options = {
        itens: [{ nome: "Test", imagemUrl: undefined }],
      };
      await preloadReceiptImages(options as any);
      expect(options.itens[0].imagemUrl).toBeUndefined();
    });

    it("clears broken image URLs", async () => {
      const options = {
        itens: [{ imagemUrl: "https://broken.test/img.png" }],
      };
      // Will fail fetch and canvas, so should clear to undefined
      await preloadReceiptImages(options as any);
      expect(options.itens[0].imagemUrl).toBeUndefined();
    });

    it("preserves data URLs without re-fetching", async () => {
      const dataUrl = "data:image/png;base64,iVBOR";
      const options = {
        logoUrl: dataUrl,
        itens: [],
      };
      await preloadReceiptImages(options);
      expect(options.logoUrl).toBe(dataUrl);
    });
  });
});

describe("buildReceiptHTML", () => {
  it("generates HTML with custom colors from config", async () => {
    const { buildReceiptHTML } = await import("@/lib/reportExport");
    const html = await buildReceiptHTML({
      type: "venda",
      id: "test123",
      empresa: "Test Corp",
      data: "01/01/2026 10:00",
      cliente: { nome: "João", id: "abc" },
      itens: [
        { nome: "Produto A", quantidade: 2, precoUnitario: 10, desconto: 0, subtotal: 20 },
      ],
      resumo: { subtotal: 20, descontos: 0, total: 20 },
      pagamentos: [{ forma: "PIX", valor: 20 }],
      receiptConfig: {
        ...DEFAULT_RECEIPT_CONFIG,
        recibo_cor_cabecalho: "#ff0000",
        recibo_mensagem_final: "Custom Message",
      },
    });

    expect(html).toContain("#ff0000");
    expect(html).toContain("Custom Message");
    expect(html).toContain("Produto A");
    expect(html).toContain("Test Corp");
  });

  it("hides client section when configured", async () => {
    const { buildReceiptHTML } = await import("@/lib/reportExport");
    const html = await buildReceiptHTML({
      type: "venda",
      id: "test123",
      empresa: "Test Corp",
      data: "01/01/2026 10:00",
      cliente: { nome: "João", id: "abc" },
      itens: [],
      resumo: { subtotal: 0, descontos: 0, total: 0 },
      pagamentos: [],
      receiptConfig: { ...DEFAULT_RECEIPT_CONFIG, recibo_exibir_cliente: false },
    });

    expect(html).not.toContain("Dados do Cliente");
  });

  it("hides product images when configured", async () => {
    const { buildReceiptHTML } = await import("@/lib/reportExport");
    const html = await buildReceiptHTML({
      type: "venda",
      id: "test123",
      empresa: "Test Corp",
      data: "01/01/2026 10:00",
      cliente: { nome: "João", id: "abc" },
      itens: [
        { nome: "Produto A", quantidade: 1, precoUnitario: 10, desconto: 0, subtotal: 10, imagemUrl: "https://example.com/img.jpg" },
      ],
      resumo: { subtotal: 10, descontos: 0, total: 10 },
      pagamentos: [],
      receiptConfig: { ...DEFAULT_RECEIPT_CONFIG, recibo_exibir_imagem_produto: false },
    });

    expect(html).not.toContain("product-img");
    expect(html).not.toContain("product-placeholder");
    expect(html).toContain("Produto A");
  });

  it("shows product images by default", async () => {
    const { buildReceiptHTML } = await import("@/lib/reportExport");
    const html = await buildReceiptHTML({
      type: "venda",
      id: "test123",
      empresa: "Test Corp",
      data: "01/01/2026 10:00",
      cliente: { nome: "João", id: "abc" },
      itens: [
        { nome: "Com Imagem", quantidade: 1, precoUnitario: 10, desconto: 0, subtotal: 10, imagemUrl: "https://example.com/img.jpg" },
        { nome: "Sem Imagem", quantidade: 1, precoUnitario: 5, desconto: 0, subtotal: 5 },
      ],
      resumo: { subtotal: 15, descontos: 0, total: 15 },
      pagamentos: [],
    });

    expect(html).toContain("product-img");
    expect(html).toContain("product-placeholder");
    expect(html).toContain("Com Imagem");
    expect(html).toContain("Sem Imagem");
  });

  it("uses custom footer messages", async () => {
    const { buildReceiptHTML } = await import("@/lib/reportExport");
    const html = await buildReceiptHTML({
      type: "venda",
      id: "x",
      empresa: "E",
      data: "01/01/2026",
      cliente: { nome: "C", id: "1" },
      itens: [],
      resumo: { subtotal: 0, descontos: 0, total: 0 },
      pagamentos: [],
      receiptConfig: {
        ...DEFAULT_RECEIPT_CONFIG,
        recibo_mensagem_final: "Volte sempre!",
        recibo_rodape: "Nota não fiscal.",
      },
    });

    expect(html).toContain("Volte sempre!");
    expect(html).toContain("Nota não fiscal.");
  });

  it("PDF generation does not produce empty content", async () => {
    // This test verifies that buildReceiptHTML produces non-empty HTML
    const { buildReceiptHTML } = await import("@/lib/reportExport");
    const html = await buildReceiptHTML({
      type: "venda",
      id: "test",
      empresa: "Test",
      data: "01/01/2026",
      cliente: { nome: "Cliente", id: "id" },
      itens: [
        { nome: "Item 1", quantidade: 1, precoUnitario: 100, desconto: 0, subtotal: 100 },
      ],
      resumo: { subtotal: 100, descontos: 0, total: 100 },
      pagamentos: [{ forma: "Dinheiro", valor: 100 }],
    });

    expect(html.length).toBeGreaterThan(500);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Item 1");
    expect(html).toContain("R$");
    expect(html).toContain("receipt-header");
  });
});
