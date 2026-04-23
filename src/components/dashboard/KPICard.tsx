import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, ArrowRight } from "lucide-react";

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  loading?: boolean;
  title?: string;
  onClick?: () => void;
}

export function KPICard({ icon: Icon, label, value, sub, color, loading, title, onClick }: KPICardProps) {
  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all", 
        onClick ? "cursor-pointer hover:shadow-md hover:border-primary/50 group" : "hover:shadow-sm"
      )} 
      title={title}
      onClick={onClick}
    >
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between mb-1">
          <Icon className={cn("w-4 h-4", color ?? "text-muted-foreground")} />
          {onClick && <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
        </div>
        <p className={cn("text-xl font-bold tracking-tight mt-1", color ?? "text-foreground")}>
          {loading ? "..." : value}
        </p>
        {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium uppercase">{label}</p>
      </CardContent>
    </Card>
  );
}
