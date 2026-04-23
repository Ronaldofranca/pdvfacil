import { useState } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { Eye, EyeOff, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardData, useDashboardPeriodo, type DashboardPeriodo } from "@/hooks/useDashboard";
import { useVendedorDashboard } from "@/hooks/useMetasComissoes";
import { useAlertasInteligentes } from "@/hooks/useAlertasInteligentes";
import { usePrevisaoEstoque } from "@/hooks/usePrevisaoEstoque";
import { useLembretesContagem } from "@/hooks/useCobrancas";
import { useTopIndicadores } from "@/hooks/useIndicacoes";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { usePedidosDashboard } from "@/hooks/usePedidos";
import { exportPDF, fmtR } from "@/lib/reportExport";
import { DashboardRenderer } from "@/components/dashboard/DashboardRenderer";

const PERIODOS: { value: DashboardPeriodo; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7dias", label: "7 dias" },
  { value: "30dias", label: "30 dias" },
  { value: "mes", label: "Mês" },
];

export default function DashboardPage() {
  const [periodo, setPeriodo] = usePersistentState<DashboardPeriodo>("periodo", "mes", "dashboard");
  const [showValues, setShowValues] = usePersistentState("show_values", true, "dashboard");
  const { isAdmin } = useAuth();
  const { layout, visualConfig } = useUserPreferences();

  const { data, isLoading } = useDashboardData();
  const { data: pd, isLoading: lPd } = useDashboardPeriodo(periodo);
  const { data: vendedorDash } = useVendedorDashboard();
  const { data: alertas } = useAlertasInteligentes();
  const { data: previsoes } = usePrevisaoEstoque();
  const { data: topIndicadores } = useTopIndicadores();
  const { data: empresas } = useEmpresas();
  const { data: lembretes } = useLembretesContagem();
  const { data: pedidosDash } = usePedidosDashboard();

  const empresaNome = empresas?.[0]?.nome ?? "VendaForce";

  const handleExportPDF = () => {
    if (!data || !pd) return;
    const periodoLabel = PERIODOS.find((p) => p.value === periodo)?.label ?? "";
    exportPDF({
      title: "Resumo Executivo - Dashboard",
      periodo: periodoLabel,
      empresa: empresaNome,
      headers: ["Indicador", "Valor"],
      rows: [
        ["Vendas do Dia", `${data.qtdVendasDia} (${fmtR(data.totalVendasDia)})`],
        ["Lucro Estimado Hoje", fmtR(data.lucroDia)],
        ["Recebido Hoje", fmtR(data.recebidoHoje)],
        ["---", "---"],
        [`Vendas no Período (${periodoLabel})`, `${pd.qtdVendas} (${fmtR(pd.totalVendas)})`],
        ["Total Recebido (Período)", fmtR(pd.totalRecebido)],
        ["Lucro do Período", fmtR(pd.lucroPeriodo)],
        ["Vendas Canceladas (Período)", `${pd.qtdCanceladas ?? 0} (${fmtR(pd.totalCancelado ?? 0)})`],
        ["---", "---"],
        ["Contas a Receber", fmtR(data.totalAReceber)],
        ["Parcelas Vencidas", `${data.qtdVencidas} (${fmtR(data.totalVencido)})`],
        ["Produtos com Estoque Baixo", String(data.estoqueBaixo.length)],
        ["Produtos Sem Estoque", String(data.estoqueSemEstoque)],
      ],
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do negócio</p>
        </div>
        <div className="flex gap-1.5 items-center shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8"
            onClick={() => setShowValues((prev) => !prev)}
            title={showValues ? "Ocultar valores" : "Mostrar valores"}
          >
            {showValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span className="hidden sm:inline">{showValues ? "Ocultar" : "Mostrar"}</span>
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1 h-8" onClick={handleExportPDF}>
            <FileDown className="h-3.5 w-3.5" /> <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </div>

      {/* Renderização Centralizada das Seções */}
      <DashboardRenderer 
        layout={layout}
        visualConfig={visualConfig}
        data={data}
        periodoData={pd}
        vendedorData={vendedorDash}
        alertasData={alertas}
        previsoesData={previsoes}
        lembretesData={lembretes}
        pedidosData={pedidosDash}
        topIndicadores={topIndicadores}
        isLoading={isLoading}
        isPeriodoLoading={lPd}
        showValues={showValues}
        periodo={periodo}
        setPeriodo={setPeriodo}
        isAdmin={isAdmin}
      />
    </div>
  );
}
