import { ModulePage } from "@/components/layout/ModulePage";
import { ShoppingCart } from "lucide-react";

export default function VendasPage() {
  return <ModulePage title="Vendas" description="Gerenciar pedidos e vendas" icon={ShoppingCart} addLabel="Nova Venda" onAdd={() => {}} />;
}
