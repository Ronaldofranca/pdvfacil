import { ModulePage } from "@/components/layout/ModulePage";
import { DollarSign } from "lucide-react";

export default function FinanceiroPage() {
  return <ModulePage title="Financeiro" description="Contas e movimentações" icon={DollarSign} />;
}
