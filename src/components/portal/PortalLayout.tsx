import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Home, ShoppingBag, DollarSign, History, User, LogOut, Plus, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/portal", icon: Home, label: "Início", end: true },
  { to: "/portal/pedidos", icon: ShoppingBag, label: "Meus Pedidos" },
  { to: "/portal/novo-pedido", icon: Plus, label: "Novo Pedido" },
  { to: "/portal/parcelas", icon: DollarSign, label: "Minhas Parcelas" },
  { to: "/portal/compras", icon: History, label: "Últimas Compras" },
  { to: "/portal/dados", icon: User, label: "Meus Dados" },
];

export function PortalLayout() {
  const { cliente, signOut } = usePortalAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/portal/login", { replace: true });
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 h-14 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h1 className="text-lg font-bold text-foreground">Portal do Cliente</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{cliente?.nome}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex max-w-5xl mx-auto">
        {/* Sidebar - Desktop */}
        <nav className="hidden md:flex flex-col gap-1 p-4 w-56 shrink-0 border-r min-h-[calc(100dvh-3.5rem)]">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur md:hidden" onClick={() => setMenuOpen(false)}>
            <nav className="w-64 bg-background border-r h-full p-4 space-y-1" onClick={(e) => e.stopPropagation()}>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom Nav - Mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-background border-t md:hidden">
        <div className="flex justify-around py-1">
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] font-medium",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label.replace("Meus ", "").replace("Minhas ", "").replace("Últimas ", "")}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
