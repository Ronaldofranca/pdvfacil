/** Receipt configuration types and defaults */

export interface ReceiptConfig {
  recibo_cor_cabecalho: string;
  recibo_cor_fonte_cabecalho: string;
  recibo_subtitulo: string;
  recibo_exibir_logo: boolean;
  recibo_cor_principal: string;
  recibo_cor_titulos: string;
  recibo_cor_texto: string;
  recibo_cor_total: string;
  recibo_cor_bordas: string;
  recibo_exibir_telefone: boolean;
  recibo_exibir_endereco: boolean;
  recibo_exibir_cpf_cnpj: boolean;
  recibo_exibir_cliente: boolean;
  recibo_exibir_vendedor: boolean;
  recibo_exibir_forma_pagamento: boolean;
  recibo_exibir_parcelas: boolean;
  recibo_exibir_observacoes: boolean;
  recibo_exibir_imagem_produto: boolean;
  recibo_mensagem_final: string;
  recibo_rodape: string;
}

export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  recibo_cor_cabecalho: "#0f172a",
  recibo_cor_fonte_cabecalho: "#ffffff",
  recibo_subtitulo: "",
  recibo_exibir_logo: true,
  recibo_cor_principal: "#10b981",
  recibo_cor_titulos: "#64748b",
  recibo_cor_texto: "#1a1a2e",
  recibo_cor_total: "#059669",
  recibo_cor_bordas: "#e2e8f0",
  recibo_exibir_telefone: true,
  recibo_exibir_endereco: true,
  recibo_exibir_cpf_cnpj: false,
  recibo_exibir_cliente: true,
  recibo_exibir_vendedor: false,
  recibo_exibir_forma_pagamento: true,
  recibo_exibir_parcelas: true,
  recibo_exibir_observacoes: true,
  recibo_exibir_imagem_produto: true,
  recibo_mensagem_final: "Obrigado pela preferência!",
  recibo_rodape: "Este recibo não tem valor fiscal.",
};

export function getReceiptConfig(config: any): ReceiptConfig {
  if (!config) return { ...DEFAULT_RECEIPT_CONFIG };
  const result: any = {};
  for (const [key, defaultVal] of Object.entries(DEFAULT_RECEIPT_CONFIG)) {
    result[key] = config[key] ?? defaultVal;
  }
  return result as ReceiptConfig;
}

/**
 * Preload an image URL and convert to base64 data URL.
 * Returns the data URL on success, null on failure.
 * This is critical for PDF generation — external URLs often fail in html2canvas.
 */
export async function imageToBase64(url: string, timeoutMs = 8000): Promise<string | null> {
  if (!url) return null;
  // Already a data URL
  if (url.startsWith("data:")) return url;
  
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(url, { 
      signal: controller.signal,
      mode: "cors",
      cache: "force-cache",
    });
    clearTimeout(timer);
    
    if (!response.ok) return null;
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    // Try canvas fallback for CORS-restricted images
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      const timeout = setTimeout(() => { img.src = ""; resolve(null); }, timeoutMs);
      img.onload = function() {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } catch {
          resolve(null);
        }
      };
      img.src = url;
    });
  }
}

/**
 * Preload all images in receipt options, converting to base64.
 * Mutates the options object in place for convenience.
 */
export async function preloadReceiptImages(options: {
  logoUrl?: string;
  itens: Array<{ imagemUrl?: string }>;
}): Promise<void> {
  const promises: Promise<void>[] = [];

  if (options.logoUrl) {
    promises.push(
      imageToBase64(options.logoUrl).then((b64) => {
        if (b64) options.logoUrl = b64;
      })
    );
  }

  for (const item of options.itens) {
    if (item.imagemUrl) {
      promises.push(
        imageToBase64(item.imagemUrl).then((b64) => {
          if (b64) item.imagemUrl = b64;
          else item.imagemUrl = undefined; // Clear broken URLs
        })
      );
    }
  }

  await Promise.allSettled(promises);
}
