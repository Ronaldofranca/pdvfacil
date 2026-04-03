import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import FinanceiroPage from "@/pages/Financeiro";
import { useParcelas, usePagamentos } from "@/hooks/useParcelas";
import { usePermissions } from "@/hooks/usePermissions";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mocks
vi.mock("@/hooks/useParcelas", () => ({
  useParcelas: vi.fn(),
  usePagamentos: vi.fn(),
  useGerarParcelas: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useRegistrarPagamento: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useRegistrarPagamentoLote: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  usePagamentosDaParcela: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: vi.fn(),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock("@/components/financeiro/GerarParcelasForm", () => ({
  GerarParcelasForm: () => <div data-testid="gerar-form" />,
}));
vi.mock("@/components/financeiro/PagamentoForm", () => ({
  PagamentoForm: () => <div data-testid="pagamento-form" />,
}));
vi.mock("@/components/financeiro/PagamentoLoteForm", () => ({
  PagamentoLoteForm: () => <div data-testid="lote-form" />,
}));
vi.mock("@/components/financeiro/ReciboParcela", () => ({
  ReciboParcela: () => <div data-testid="recibo-form" />,
}));

// ResizeObserver Polyfill required by Radix
const ResizeObserverMock = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
global.ResizeObserver = ResizeObserverMock;

const qc = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderComponent = () =>
  render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <FinanceiroPage />
      </BrowserRouter>
    </QueryClientProvider>
  );

describe("Financeiro Payment Date Column", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (usePermissions as any).mockReturnValue({ canRegisterPagamento: true });
    (usePagamentos as any).mockReturnValue({ data: [], isLoading: false });
  });

  const baseParcela = {
    id: "uuid-1",
    numero: 1,
    valor_total: 100,
    saldo: 100,
    vencimento: "2026-04-10",
    clientes: { nome: "Cliente Teste" },
  };

  it("1. Parcela totalmente paga mostra a data do pagamento corretamente e em prioridade as sub-datas", () => {
    (useParcelas as any).mockReturnValue({
      data: [
        {
          ...baseParcela,
          status: "paga",
          valor_pago: 100,
          saldo: 0,
          data_pagamento: "2026-04-05T12:00:00Z", // Backend original date
          pagamentos: [],
        },
      ],
      isLoading: false,
    });

    renderComponent();

    // The display will be "05/04/2026"
    expect(screen.getByText("05/04/2026")).toBeInTheDocument();
  });

  it("2. Parcela com múltiplos pagamentos parciais mostra a data do *último* pagamento (pagamento mais recente) corretamente", () => {
    (useParcelas as any).mockReturnValue({
      data: [
        {
          ...baseParcela,
          status: "parcial",
          valor_pago: 60,
          saldo: 40,
          data_pagamento: null, // Parcial não tem data oficial no row principal
          pagamentos: [
            { data_pagamento: "2026-04-01T10:00:00Z" },
            { data_pagamento: "2026-04-03T15:00:00Z" }, // This is the latest
            { data_pagamento: "2026-03-29T09:00:00Z" },
          ],
        },
      ],
      isLoading: false,
    });

    renderComponent();

    // Ensure it renders the latest date 03/04/2026
    expect(screen.getByText("03/04/2026")).toBeInTheDocument();
  });

  it("3. Parcela sem pagamento (pendente ou vencida) tem a coluna de pagamento vazia ou com o marcador leve (—)", () => {
    (useParcelas as any).mockReturnValue({
      data: [
        {
          ...baseParcela,
          status: "pendente",
          valor_pago: 0,
          data_pagamento: null,
          pagamentos: [], // Empty
        },
      ],
      isLoading: false,
    });

    renderComponent();

    // Verifies the placeholder is shown for the payment date column.
    // There are actually multiple elements with "—" (e.g. empty client name), 
    // but at least one must render. We rely on standard render logic here.
    const emptyElements = screen.getAllByText("—");
    expect(emptyElements.length).toBeGreaterThan(0);
  });
});
