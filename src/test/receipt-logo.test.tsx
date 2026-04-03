import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReceiptVendaContent } from "@/components/receipts/ReceiptVendaContent";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

const baseVenda = {
  id: "12345678",
  cliente_id: "cli-123",
  data_venda: new Date().toISOString(),
  status: "finalizada",
  subtotal: 100,
  desconto_total: 0,
  total: 100,
  pagamentos: [{ forma: "pix", valor: 100 }],
  clientes: { nome: "Cliente Teste" },
};

const baseEmpresaComLogo = {
  nome: "Empresa de Teste",
  logo_url: "https://example.com/logo.png"
};

const baseConfig = {
  recibo_exibir_logo: true,
  recibo_logo_largura: 150,
  recibo_tamanho_fonte_empresa: 18,
  recibo_exibir_cliente: true,
  recibo_exibir_vendedor: true,
  recibo_exibir_forma_pagamento: true,
  recibo_exibir_parcelas: true,
  recibo_exibir_observacoes: true,
  recibo_exibir_imagem_produto: true,
};

describe("Receipt Logo Visual Verification", () => {
  it("deve exibir a logomarca da empresa quando configurado", () => {
    render(
      <ReceiptVendaContent 
        venda={baseVenda} 
        itens={[]} 
        parcelas={[]} 
        empresa={baseEmpresaComLogo}
        config={baseConfig as any} 
      />
    );
    
    // Verifica se a imagem existe e tem o src correto
    const logoImg = screen.getByAltText(baseEmpresaComLogo.nome);
    expect(logoImg).toBeTruthy();
    expect(logoImg.getAttribute("src")).toBe(baseEmpresaComLogo.logo_url);
  });

  it("deve respeitar a largura configurada e manter proporção (object-contain)", () => {
    render(
      <ReceiptVendaContent 
        venda={baseVenda} 
        itens={[]} 
        parcelas={[]} 
        empresa={baseEmpresaComLogo}
        config={baseConfig as any} 
      />
    );
    
    const logoImg = screen.getByAltText(baseEmpresaComLogo.nome);
    
    // Verifica a classe object-contain e mb-2
    expect(logoImg.className).toContain("object-contain");
    
    // Verifica se o style inline aplicou a largura corretamente
    expect(logoImg.style.width).toBe("150px");
    expect(logoImg.style.maxHeight).toBe("120px");
  });

  it("não deve exibir a logomarca se recibo_exibir_logo for false", () => {
    const configSemLogo = { ...baseConfig, recibo_exibir_logo: false };
    
    render(
      <ReceiptVendaContent 
        venda={baseVenda} 
        itens={[]} 
        parcelas={[]} 
        empresa={baseEmpresaComLogo}
        config={configSemLogo as any} 
      />
    );
    
    const logoImg = screen.queryByAltText(baseEmpresaComLogo.nome);
    expect(logoImg).toBeNull();
  });

  it("deve carregar a imagem com crossOrigin=anonymous para exportação de PDF e WhatsApp", () => {
    render(
      <ReceiptVendaContent 
        venda={baseVenda} 
        itens={[]} 
        parcelas={[]} 
        empresa={baseEmpresaComLogo}
        config={baseConfig as any} 
      />
    );
    
    const logoImg = screen.getByAltText(baseEmpresaComLogo.nome);
    expect(logoImg.getAttribute("crossOrigin")).toBe("anonymous");
  });
});
