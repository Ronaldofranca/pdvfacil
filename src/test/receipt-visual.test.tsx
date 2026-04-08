import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
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

  it("badge de status usa a cor e alinhamento centralizado", () => {
    render(<ReceiptVendaContent venda={baseVenda} itens={[]} parcelas={[]} />);
    const badge = screen.getByText("Finalizada");
    
    expect(badge.classList.contains("inline-flex")).toBeTruthy();
    expect(badge.classList.contains("items-center")).toBeTruthy();
    expect(badge.classList.contains("justify-center")).toBeTruthy();
    expect(badge.classList.contains("h-5")).toBeTruthy();
  });

  it("renderiza parcelas quando fornecidas no crediário", () => {
    const parcelas = [
      { numero: 1, valor_total: 60.5, vencimento: "2026-04-20" },
      { numero: 2, valor_total: 40.2, vencimento: "2026-05-20" },
    ];
    
    render(<ReceiptVendaContent venda={baseVenda} itens={[]} parcelas={parcelas} />);
    
    expect(screen.getByText("Parcelas do Crediário")).toBeTruthy();
    expect(screen.getByText("#1")).toBeTruthy();
    expect(screen.getByText("20/04/2026")).toBeTruthy();
    expect(screen.getByText("R$ 60,50")).toBeTruthy();
    expect(screen.getByText("#2")).toBeTruthy();
    expect(screen.getByText("20/05/2026")).toBeTruthy();
    expect(screen.getByText("R$ 40,20")).toBeTruthy();
  });

  it("aplica dimensões customizadas na imagem do produto", () => {
    const itens = [{ id: "1", nome_produto: "P1", quantidade: 1, preco_vendido: 10, subtotal: 10, produtos: { imagem_url: "test.jpg" } }];
    const config = { ...DEFAULT_RECEIPT_CONFIG, recibo_imagem_produto_largura: 88, recibo_imagem_produto_altura: 99 };
    
    const { container } = render(<ReceiptVendaContent venda={baseVenda} itens={itens} parcelas={[]} config={config} />);
    
    const imgContainer = container.querySelector('img')?.parentElement;
    expect(imgContainer).toBeTruthy();
    expect(imgContainer?.style.width).toBe("88px");
    expect(imgContainer?.style.height).toBe("99px");
  });
});
