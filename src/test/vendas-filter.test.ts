import { describe, it, expect } from "vitest";
import { startOfDay, endOfDay, parse } from "date-fns";

const mockVendas = [
  { id: "v1", data_venda: "2026-03-25T10:00:00", total: 100, clientes: { nome: "João Silva" } },
  { id: "v2", data_venda: "2026-03-25T15:30:00", total: 200, clientes: { nome: "Maria Oliveira" } },
  { id: "v3", data_venda: "2026-03-24T09:00:00", total: 150, clientes: { nome: "Pedro Santos" } },
  { id: "v4", data_venda: "2026-03-23T23:59:59", total: 50, clientes: { nome: "João Silva" } },
];

describe("Vendas Date Range Filter Logic", () => {
  it("should filter by only Start Date", () => {
    const startDate = parse("24/03/2026", "dd/MM/yyyy", new Date());
    const endDate = undefined;
    
    const filtered = mockVendas.filter((v) => {
      const itemDate = new Date(v.data_venda);
      const matchesStart = !startDate || itemDate >= startOfDay(startDate);
      const matchesEnd = !endDate || itemDate <= endOfDay(endDate);
      return matchesStart && matchesEnd;
    });
    
    expect(filtered).toHaveLength(3); // v1, v2, v3
    expect(filtered.map(f => f.id)).toContain("v3");
  });

  it("should filter by only End Date", () => {
    const startDate = undefined;
    const endDate = parse("24/03/2026", "dd/MM/yyyy", new Date());
    
    const filtered = mockVendas.filter((v) => {
      const itemDate = new Date(v.data_venda);
      const matchesStart = !startDate || itemDate >= startOfDay(startDate);
      const matchesEnd = !endDate || itemDate <= endOfDay(endDate);
      return matchesStart && matchesEnd;
    });
    
    expect(filtered).toHaveLength(2); // v3, v4
  });

  it("should filter by full range [Start, End]", () => {
    const startDate = parse("24/03/2026", "dd/MM/yyyy", new Date());
    const endDate = parse("25/03/2026", "dd/MM/yyyy", new Date());
    
    const filtered = mockVendas.filter((v) => {
      const itemDate = new Date(v.data_venda);
      const matchesStart = !startDate || itemDate >= startOfDay(startDate);
      const matchesEnd = !endDate || itemDate <= endOfDay(endDate);
      return matchesStart && matchesEnd;
    });
    
    expect(filtered).toHaveLength(3); // v1, v2, v3
  });

  it("should return nothing if Start Date > End Date (safety check)", () => {
    const startDate = parse("26/03/2026", "dd/MM/yyyy", new Date());
    const endDate = parse("24/03/2026", "dd/MM/yyyy", new Date());
    
    const filtered = mockVendas.filter((v) => {
      const itemDate = new Date(v.data_venda);
      const matchesStart = !startDate || itemDate >= startOfDay(startDate);
      const matchesEnd = !endDate || itemDate <= endOfDay(endDate);
      const isValidInterval = !startDate || !endDate || startDate <= endDate;
      return matchesStart && matchesEnd && isValidInterval;
    });
    
    expect(filtered).toHaveLength(0);
  });

  it("should handle same day range accurately", () => {
    const startDate = parse("25/03/2026", "dd/MM/yyyy", new Date());
    const endDate = parse("25/03/2026", "dd/MM/yyyy", new Date());
    
    const filtered = mockVendas.filter((v) => {
      const itemDate = new Date(v.data_venda);
      const matchesStart = !startDate || itemDate >= startOfDay(startDate);
      const matchesEnd = !endDate || itemDate <= endOfDay(endDate);
      return matchesStart && matchesEnd;
    });
    
    expect(filtered).toHaveLength(2); // v1, v2
  });
});
