import { ModulePage } from "@/components/layout/ModulePage";
import { Building2 } from "lucide-react";

export default function EmpresasPage() {
  return <ModulePage title="Empresas" description="Gestão multiempresa" icon={Building2} addLabel="Nova Empresa" onAdd={() => {}} />;
}
