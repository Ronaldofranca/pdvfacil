import { ModulePage } from "@/components/layout/ModulePage";
import { Users } from "lucide-react";

export default function ClientesPage() {
  return <ModulePage title="Clientes" description="Cadastro de clientes" icon={Users} addLabel="Novo Cliente" onAdd={() => {}} />;
}
