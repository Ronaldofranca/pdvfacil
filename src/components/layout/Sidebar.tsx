import { NavLink } from "react-router-dom";
import { moduleGroups } from "@/config/modules";
import { cn } from "@/lib/utils";
import { Zap, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function Sidebar({ open, onClose, onLogout }: SidebarProps) {
  const { profile } = useAuth();

  return (
    <aside
      className={cn(
        "fixed md:static z-50 flex flex-col h-dvh w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-200",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-foreground tracking-tight">VendaForce</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
        {Object.entries(moduleGroups).map(([key, group]) => (
          <div key={key}>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.modules.map((mod) => (
                <NavLink
                  key={mod.key}
                  to={mod.path}
                  end={mod.path === "/"}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                    )
                  }
                >
                  <mod.icon className="w-4 h-4 shrink-0" />
                  {mod.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer with user info and logout */}
      <div className="border-t border-sidebar-border px-4 py-3 space-y-2">
        {profile && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground shrink-0">
              {profile.nome?.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate text-foreground">{profile.nome}</p>
              <p className="text-[10px] text-muted-foreground truncate">{profile.email}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={() => {
            onClose();
            onLogout();
          }}
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
