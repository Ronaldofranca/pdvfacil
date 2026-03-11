import { ModulePage } from "@/components/layout/ModulePage";
import { Package } from "lucide-react";

export default function ProdutosPage() {
  return <ModulePage title="Produtos" description="Catálogo de produtos" icon={Package} addLabel="Novo Produto" onAdd={() => {}} />;
}
