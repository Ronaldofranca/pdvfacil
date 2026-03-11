import { ModulePage } from "@/components/layout/ModulePage";
import { UserCog } from "lucide-react";

export default function UsuariosPage() {
  return <ModulePage title="Usuários" description="Gerenciar usuários" icon={UserCog} addLabel="Novo Usuário" onAdd={() => {}} />;
}
