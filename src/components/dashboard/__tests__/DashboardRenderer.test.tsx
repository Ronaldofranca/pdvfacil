import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardRenderer } from "../DashboardRenderer";
import { DashboardItem, VisualConfig } from "@/contexts/UserPreferencesContext";

describe("DashboardRenderer", () => {
  const mockLayout: DashboardItem[] = [
    { id: "resumo-dia", label: "Resumo", visible: true, order: 0, type: "kpi" },
    { id: "alertas", label: "Alertas", visible: false, order: 1, type: "action" },
    { id: "vendas-por-dia", label: "Vendas", visible: true, order: 2, type: "chart" },
  ];

  const mockVisual: VisualConfig = {
    primary: "#ff0000",
    charts: ["#ff0000", "#00ff00", "#0000ff"]
  };

  it("deve renderizar apenas itens visíveis", () => {
    render(
      <DashboardRenderer 
        layout={mockLayout} 
        visualConfig={mockVisual} 
        data={{}} 
        periodoData={{}} 
        isPreview={true}
      />
    );

    expect(screen.getByText("Resumo de Hoje")).toBeDefined();
    expect(screen.queryByText("Alertas")).toBeNull(); // Alertas está visible: false
  });

  it("deve respeitar a ordem do layout", () => {
    const layoutInversa: DashboardItem[] = [
      { id: "vendas-por-dia", label: "Vendas", visible: true, order: 0, type: "chart" },
      { id: "resumo-dia", label: "Resumo", visible: true, order: 1, type: "kpi" },
    ];

    const { container } = render(
      <DashboardRenderer 
        layout={layoutInversa} 
        visualConfig={mockVisual} 
        data={{}} 
        periodoData={{}} 
        isPreview={true}
      />
    );

    const headers = container.querySelectorAll("h2, h3");
    expect(headers[0].textContent).toContain("Vendas por Dia"); // Vendas (id: vendas-por-dia) vem primeiro
    expect(headers[1].textContent).toContain("Resumo de Hoje"); // Resumo (id: resumo-dia) vem depois
  });
});
