import { Menu, Bell, Building2, LogOut, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresas } from "@/hooks/useEmpresas";

interface TopBarProps {
  onMenuToggle: () => void;
  onLogout: () => void;
}

export function TopBar({ onMenuToggle, onLogout }: TopBarProps) {
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  const { data: empresas } = useEmpresas();
  const empresaNome = empresas?.[0]?.nome || "Empresa";

  const initials = profile?.nome
    ? profile.nome
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-2">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onMenuToggle} className="text-muted-foreground">
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="w-4 h-4" />
          <span className="font-medium text-foreground truncate max-w-[160px]">{empresaNome}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="text-muted-foreground relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 pl-1">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                {initials}
              </div>
              {!isMobile && (
                <>
                  <span className="text-sm font-medium max-w-[120px] truncate">{profile?.nome?.split(" ")[0]}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{profile?.nome}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" disabled>
              <User className="w-4 h-4" /> Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={onLogout}>
              <LogOut className="w-4 h-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
