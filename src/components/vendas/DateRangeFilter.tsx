import * as React from "react";
import { DateInput } from "./DateInput";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface DateRangeFilterProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  className?: string;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
}: DateRangeFilterProps) {
  const isInverted = startDate && endDate && startDate > endDate;

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}>
      <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:gap-4">
        <div className="flex-1 w-full">
          <DateInput
            label="De (Início)"
            selectedDate={startDate}
            onDateChange={onStartDateChange}
            className={cn(isInverted && "border-destructive text-destructive")}
          />
        </div>
        <div className="flex-1 w-full">
          <DateInput
            label="Até (Fim)"
            selectedDate={endDate}
            onDateChange={onEndDateChange}
            className={cn(isInverted && "border-destructive text-destructive")}
          />
        </div>
      </div>
      {isInverted && (
        <p className="text-[10px] text-destructive flex items-center gap-1 sm:absolute sm:-bottom-4 left-0">
          <AlertCircle className="w-3 h-3" /> A data inicial não pode ser posterior à final.
        </p>
      )}
    </div>
  );
}
