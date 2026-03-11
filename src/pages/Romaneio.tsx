import { ModulePage } from "@/components/layout/ModulePage";
import { Truck } from "lucide-react";

export default function RomaneioPage() {
  return <ModulePage title="Romaneio" description="Controle de carregamento" icon={Truck} addLabel="Novo Romaneio" onAdd={() => {}} />;
}
