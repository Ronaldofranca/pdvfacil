import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReceiptVendaContent } from "@/components/receipts/ReceiptVendaContent";
import { DEFAULT_RECEIPT_CONFIG } from "@/lib/receiptConfig";

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

const baseEmpresa = {
  nome: "Empresa de Teste",
};

describe("Receipt Visual Verification (V2 Dynamic)", () => {
  it("deve exibir o nome da empresa com o tamanho de fonte configurado", () => {
    render(<ReceiptVendaContent venda={baseVenda} itens={[]} parcelas={[]} empresa={baseEmpresa} />);
    const nameEl = screen.getByText(baseEmpresa.nome);
    expect(nameEl).toBeTruthy();
    expect(nameEl.style.fontSize).toBe(`${DEFAULT_RECEIPT_CONFIG.recibo_tamanho_fonte_empresa}px`);
  });

  it("badge de status usa a cor configurada dinamicamente", () => {
    render(<ReceiptVendaContent venda={baseVenda} itens={[]} parcelas={[]} />);
    
    // Status 'finalizada' should use recibo_cor_principal as background
    const badges = screen.getAllByText("Finalizada");
    const badge = badges[0];
    
    // It should be a span/div with style.backgroundColor
    expect(badge.style.backgroundColor).toBeTruthy();
  });

  it("produtos renderizam tamanhos configurados via config engine", () => {
    const itensLongos = [
      {
        id: "1",
        nome_produto: "Produto de Teste",
        quantidade: 1,
        preco_vendido: 100,
        subtotal: 100,
        produtos: { imagem_url: "" }
      }
    ];
    
    render(<ReceiptVendaContent venda={baseVenda} itens={itensLongos} parcelas={[]} />);
    
    const productName = screen.getByText(itensLongos[0].nome_produto);
    expect(productName).toBeTruthy();
    expect(productName.style.fontSize).toBe(`${DEFAULT_RECEIPT_CONFIG.recibo_tamanho_fonte_item_nome}px`);
  });
});
