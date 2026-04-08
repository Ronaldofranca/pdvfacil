import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  loading?: boolean;
  title?: string;
}

export function KPICard({ icon: Icon, label, value, sub, color, loading, title }: KPICardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md" title={title}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <Icon className={cn("w-4 h-4", color ?? "text-muted-foreground")} />
        </div>
        <p className={cn("text-xl font-bold tracking-tight", color ?? "text-foreground")}>
          {loading ? "..." : value}
        </p>
        {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium uppercase">{label}</p>
      </CardContent>
    </Card>
  );
}
