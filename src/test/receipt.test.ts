import { describe, expect, it } from "vitest";
import { DEFAULT_RECEIPT_CONFIG, getReceiptConfig, imageToBase64, preloadReceiptImages } from "@/lib/receiptConfig";

describe("receiptConfig", () => {
  describe("getReceiptConfig", () => {
    it("returns defaults when config is null", () => {
      const result = getReceiptConfig(null);
      expect(result).toEqual(DEFAULT_RECEIPT_CONFIG);
    });

    it("merges partial config with defaults", () => {
      const result = getReceiptConfig({
        recibo_cor_cabecalho: "#ff0000",
        recibo_mensagem_final: "Volte sempre!",
      });
      expect(result.recibo_cor_cabecalho).toBe("#ff0000");
      expect(result.recibo_mensagem_final).toBe("Volte sempre!");
      expect(result.recibo_cor_principal).toBe(DEFAULT_RECEIPT_CONFIG.recibo_cor_principal);
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
  });

  describe("preloadReceiptImages", () => {
    it("handles options with no images gracefully", async () => {
      const options = {
        itens: [{ nome: "Test", imagemUrl: undefined }],
      };
      await preloadReceiptImages(options as any);
      expect(options.itens[0].imagemUrl).toBeUndefined();
    });
  });
});
