import { NavLink } from "react-router-dom";
import { modules, moduleGroups } from "@/config/modules";
import { cn } from "@/lib/utils";

export default function MaisPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">Mais</h1>
      {Object.entries(moduleGroups).map(([key, group]) => (
        <div key={key}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            {group.label}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {group.modules.map((mod) => (
              <NavLink
                key={mod.key}
                to={mod.path}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:bg-secondary"
                  )
                }
              >
                <mod.icon className="w-5 h-5" />
                <span className="text-[11px] font-medium">{mod.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
