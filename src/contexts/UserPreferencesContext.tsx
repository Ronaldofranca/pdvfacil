import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { hexToHSLValues, DEFAULT_CHART_COLORS } from "@/lib/colorUtils";
import { toast } from "sonner";

export interface DashboardItem {
  id: string;
  label: string;
  visible: boolean;
  order: number;
  type: "kpi" | "chart" | "table" | "action";
  columns?: 1 | 2;
}

export interface VisualConfig {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  foreground?: string;
  card?: string;
  border?: string;
  charts?: string[];
}

interface UserPreferencesContextType {
  layout: DashboardItem[];
  visualConfig: VisualConfig;
  isLoading: boolean;
  updateLayout: (newLayout: DashboardItem[]) => Promise<void>;
  updateVisualConfig: (newConfig: VisualConfig) => Promise<void>;
  resetToDefault: () => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

const DEFAULT_LAYOUT: DashboardItem[] = [
  { id: "resumo-dia", label: "Resumo de Hoje", visible: true, order: 0, type: "kpi", columns: 1 },
  { id: "alertas", label: "Alertas", visible: true, order: 1, type: "action", columns: 1 },
  { id: "pedidos-pendentes", label: "Pedidos Pendentes", visible: true, order: 2, type: "table", columns: 1 },
  { id: "minha-meta", label: "Minha Meta", visible: true, order: 3, type: "kpi", columns: 1 },
  { id: "periodo-kpis", label: "KPIs do Período", visible: true, order: 4, type: "kpi", columns: 1 },
  { id: "vendas-por-dia", label: "Gráfico: Vendas por Dia", visible: true, order: 5, type: "chart", columns: 1 },
  { id: "recebimentos-forma", label: "Gráfico: Recebimentos", visible: true, order: 6, type: "chart", columns: 1 },
  { id: "produtos-vendidos", label: "Produtos Mais Vendidos", visible: true, order: 7, type: "table", columns: 1 },
  { id: "clientes-top", label: "Clientes Top", visible: true, order: 8, type: "table", columns: 1 },
  { id: "vendas-recentes", label: "Vendas Recentes", visible: true, order: 9, type: "table", columns: 1 },
  { id: "estoque-baixo", label: "Estoque Baixo", visible: true, order: 10, type: "table", columns: 1 },
  { id: "parcelas-vencidas", label: "Parcelas Vencidas", visible: true, order: 11, type: "table", columns: 1 },
  { id: "ranking-vendedores", label: "Performance de Vendedores", visible: true, order: 12, type: "table", columns: 1 },
  { id: "top-indicadores", label: "Top Clientes Indicadores", visible: true, order: 13, type: "table", columns: 1 },
  { id: "atalhos", label: "Ações Rápidas", visible: true, order: 14, type: "action", columns: 1 },
];

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [layout, setLayout] = useState<DashboardItem[]>(DEFAULT_LAYOUT);
  const [visualConfig, setVisualConfig] = useState<VisualConfig>({});
  const [isLoading, setIsLoading] = useState(true);

  // Carregar preferências do banco
  useEffect(() => {
    if (!user) {
      setLayout(DEFAULT_LAYOUT);
      setVisualConfig({});
      setIsLoading(false);
      return;
    }

    async function loadPreferences() {
      try {
        const { data, error } = await supabase
          .from("user_preferences")
          .select("dashboard_layout, visual_config")
          .eq("user_id", user!.id)
          .single();

        if (error && error.code !== "PGRST116") { // PGRST116 = No rows found
          console.error("Erro ao carregar preferências:", error);
        }

        if (data) {
          if (data.dashboard_layout && Array.isArray(data.dashboard_layout) && data.dashboard_layout.length > 0) {
            // Merge with DEFAULT_LAYOUT to handle new items added in future updates
            const merged = DEFAULT_LAYOUT.map(defItem => {
              const saved = (data.dashboard_layout as unknown as DashboardItem[]).find(s => s.id === defItem.id);
              return saved ? { ...defItem, ...saved, columns: saved.columns || 1 } : defItem;
            }).sort((a, b) => a.order - b.order);
            setLayout(merged);
          }
          if (data.visual_config) {
            setVisualConfig(data.visual_config as VisualConfig);
          }
        }
      } catch (err) {
        console.error("Falha ao carregar preferências:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadPreferences();
  }, [user]);

  // Aplicar estilos visuais (CSS Variables)
  useEffect(() => {
    const root = document.documentElement;
    
    // Helper to apply HSL if hex is provided
    const setVar = (name: string, hex?: string) => {
      if (hex) {
        const hslValue = hexToHSLValues(hex);
        root.style.setProperty(`--${name}`, hslValue);
        // Also set ring/accent if it's primary or secondary
        if (name === "primary") root.style.setProperty("--ring", hslValue);
        if (name === "primary") root.style.setProperty("--accent", hslValue);
      } else {
        root.style.removeProperty(`--${name}`);
      }
    };

    setVar("primary", visualConfig.primary);
    setVar("secondary", visualConfig.secondary);
    setVar("background", visualConfig.background);
    setVar("foreground", visualConfig.foreground);
    setVar("card", visualConfig.card);
    setVar("border", visualConfig.border);
    
    // Accents are handled automatically if not specified
    if (visualConfig.accent) setVar("accent", visualConfig.accent);

  }, [visualConfig]);

  const updateLayout = async (newLayout: DashboardItem[]) => {
    setLayout(newLayout);
    if (!user || !profile) return;

    const { error } = await supabase
      .from("user_preferences")
      .upsert({ 
        user_id: user.id, 
        empresa_id: profile.empresa_id,
        dashboard_layout: newLayout as any
      } as any, { onConflict: 'user_id' });

    if (error) {
      console.error("Erro ao salvar layout:", error);
      toast.error("Erro ao salvar layout");
    }
  };

  const updateVisualConfig = async (newConfig: VisualConfig) => {
    setVisualConfig(newConfig);
    if (!user || !profile) return;

    const { error } = await supabase
      .from("user_preferences")
      .upsert({ 
        user_id: user.id, 
        empresa_id: profile.empresa_id,
        visual_config: newConfig
      }, { onConflict: 'user_id' });

    if (error) {
      console.error("Erro ao salvar cores:", error);
      toast.error("Erro ao salvar cores");
    }
    else toast.success("Preferências visuais atualizadas!");
  };

  const resetToDefault = async () => {
    setLayout(DEFAULT_LAYOUT);
    setVisualConfig({});
    
    if (user) {
      await supabase
        .from("user_preferences")
        .delete()
        .eq("user_id", user.id);
    }
    
    toast.success("Configurações resetadas!");
  };

  return (
    <UserPreferencesContext.Provider value={{ 
      layout, 
      visualConfig, 
      isLoading, 
      updateLayout, 
      updateVisualConfig,
      resetToDefault
    }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error("useUserPreferences must be used within a UserPreferencesProvider");
  }
  return context;
}
