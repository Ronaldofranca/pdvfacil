import { NavLink } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Users, Package, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const bottomItems = [
  { label: "Início", icon: LayoutDashboard, path: "/" },
  { label: "Vendas", icon: ShoppingCart, path: "/vendas" },
  { label: "Clientes", icon: Users, path: "/clientes" },
  { label: "Produtos", icon: Package, path: "/produtos" },
  { label: "Mais", icon: MoreHorizontal, path: "/mais" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {bottomItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
