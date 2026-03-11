import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Warehouse,
  BookOpen,
  Truck,
  DollarSign,
  BarChart3,
  UserCog,
  Building2,
  Bell,
  RefreshCw,
  HardDrive,
  Shield,
  type LucideIcon,
} from "lucide-react";
import type { ModuleKey } from "@/types/modules";

export interface ModuleConfig {
  key: ModuleKey;
  label: string;
  icon: LucideIcon;
  path: string;
  group: "operacional" | "gestao" | "sistema";
  description: string;
}

export const modules: ModuleConfig[] = [
  // Operacional
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/", group: "operacional", description: "Visão geral do negócio" },
  { key: "vendas", label: "Vendas", icon: ShoppingCart, path: "/vendas", group: "operacional", description: "Gerenciar pedidos e vendas" },
  { key: "clientes", label: "Clientes", icon: Users, path: "/clientes", group: "operacional", description: "Cadastro de clientes" },
  { key: "produtos", label: "Produtos", icon: Package, path: "/produtos", group: "operacional", description: "Catálogo de produtos" },
  { key: "estoque", label: "Estoque", icon: Warehouse, path: "/estoque", group: "operacional", description: "Controle de estoque" },
  { key: "catalogo", label: "Catálogo", icon: BookOpen, path: "/catalogo", group: "operacional", description: "Catálogo para vendedores" },
  { key: "romaneio", label: "Romaneio", icon: Truck, path: "/romaneio", group: "operacional", description: "Controle de carregamento" },
  // Gestão
  { key: "financeiro", label: "Financeiro", icon: DollarSign, path: "/financeiro", group: "gestao", description: "Contas e movimentações" },
  { key: "relatorios", label: "Relatórios", icon: BarChart3, path: "/relatorios", group: "gestao", description: "Relatórios gerenciais" },
  { key: "usuarios", label: "Usuários", icon: UserCog, path: "/usuarios", group: "gestao", description: "Gerenciar usuários" },
  { key: "empresas", label: "Empresas", icon: Building2, path: "/empresas", group: "gestao", description: "Gestão multiempresa" },
  // Sistema
  { key: "notificacoes", label: "Notificações", icon: Bell, path: "/notificacoes", group: "sistema", description: "Centro de notificações" },
  { key: "sync", label: "Sincronização", icon: RefreshCw, path: "/sync", group: "sistema", description: "Sincronização offline/online" },
  { key: "backup", label: "Backup", icon: HardDrive, path: "/backup", group: "sistema", description: "Backup de dados" },
  { key: "audit", label: "Auditoria", icon: Shield, path: "/audit", group: "sistema", description: "Logs de auditoria" },
];

export const moduleGroups = {
  operacional: { label: "Operacional", modules: modules.filter((m) => m.group === "operacional") },
  gestao: { label: "Gestão", modules: modules.filter((m) => m.group === "gestao") },
  sistema: { label: "Sistema", modules: modules.filter((m) => m.group === "sistema") },
};
