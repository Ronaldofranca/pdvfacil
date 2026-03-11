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
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const stats = [
  { label: "Vendas Hoje", value: "R$ 12.450", change: "+12%", up: true, icon: ShoppingCart },
  { label: "Clientes Ativos", value: "384", change: "+5", up: true, icon: Users },
  { label: "Produtos", value: "1.240", change: "0", up: true, icon: Package },
  { label: "Ticket Médio", value: "R$ 287", change: "-3%", up: false, icon: TrendingUp },
];

const recentSales = [
  { cliente: "João Silva", valor: "R$ 1.250,00", status: "aprovada" },
  { cliente: "Maria Santos", valor: "R$ 890,00", status: "pendente" },
  { cliente: "Carlos Oliveira", valor: "R$ 2.100,00", status: "aprovada" },
  { cliente: "Ana Costa", valor: "R$ 450,00", status: "faturada" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do negócio</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="w-4 h-4 text-muted-foreground" />
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    stat.up ? "text-primary" : "text-destructive"
                  }`}
                >
                  {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Sales */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Vendas Recentes</h2>
          <div className="space-y-3">
            {recentSales.map((sale, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{sale.cliente}</p>
                  <p className="text-xs text-muted-foreground capitalize">{sale.status}</p>
                </div>
                <p className="text-sm font-mono font-semibold text-foreground">{sale.valor}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
