import * as React from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, GripVertical, Settings } from "lucide-react";

export interface CatalogSection {
  id: string;
  label: string;
  active: boolean;
  config?: any;
}

interface CatalogSectionBuilderProps {
  sections: CatalogSection[];
  onSectionsChange: (sections: CatalogSection[]) => void;
}

export function CatalogSectionBuilder({ sections, onSectionsChange }: CatalogSectionBuilderProps) {
  const toggleSection = (id: string) => {
    onSectionsChange(sections.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    onSectionsChange(newSections);
  };

  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <Card key={section.id} className="p-3 flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="text-muted-foreground cursor-grab">
              <GripVertical className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-sm font-medium">{section.label}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{section.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-col sm:flex-row gap-1 mr-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={index === 0}
                onClick={() => moveSection(index, "up")}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={index === sections.length - 1}
                onClick={() => moveSection(index, "down")}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
            
            <Switch
              checked={section.active}
              onCheckedChange={() => toggleSection(section.id)}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
