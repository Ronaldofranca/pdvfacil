import { useState, useMemo } from "react";
import { Search, Filter, Phone, PhoneOff, MapPin, Calendar, ShoppingBag, Save, ArrowUpDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useRelClientesCompletos, useBatchUpdateTelefones } from "@/hooks/useRelatorios";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export function RelatorioClientesMaster() {
  const { data: clientes, isLoading } = useRelClientesCompletos();
  const batchUpdate = useBatchUpdateTelefones();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"todos" | "com_fone" | "sem_fone">("todos");
  const [minCompras, setMinCompras] = useState<string>("0");
  const [sortBy, setSortBy] = useState<"nome" | "data" | "compras">("nome");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // State for batch editing
  const [editingPhones, setEditingPhones] = useState<Record<string, string>>({});

  const filteredClientes = useMemo(() => {
    if (!clientes) return [];

    let result = clientes.filter(c => {
      const matchSearch = 
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telefone?.includes(searchTerm) ||
        c.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.bairro?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchFone = 
        filterMode === "todos" ? true :
        filterMode === "com_fone" ? (c.telefone && c.telefone.length > 5) :
        !(c.telefone && c.telefone.length > 5);
      
      const matchMinCompras = c.qtd_compras >= Number(minCompras);

      return matchSearch && matchFone && matchMinCompras;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === "nome") {
        return sortOrder === "asc" ? a.nome.localeCompare(b.nome) : b.nome.localeCompare(a.nome);
      } else if (sortBy === "data") {
        return sortOrder === "asc" 
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime() 
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === "compras") {
        return sortOrder === "asc" ? a.qtd_compras - b.qtd_compras : b.qtd_compras - a.qtd_compras;
      }
      return 0;
    });

    return result;
  }, [clientes, searchTerm, filterMode, minCompras, sortBy, sortOrder]);

  const handlePhoneChange = (id: string, value: string) => {
    setEditingPhones(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveBatch = async () => {
    const changes = Object.entries(editingPhones)
      .filter(([_, val]) => val.trim().length > 0)
      .map(([id, val]) => ({ id, telefone: val }));
    
    if (changes.length === 0) return;

    try {
      await batchUpdate.mutateAsync(changes);
      toast.success(`${changes.length} telefones atualizados!`);
      setEditingPhones({});
    } catch (error) {
      toast.error("Erro ao salvar alterações");
    }
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando dados dos clientes...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome, telefone, bairro ou cidade..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={filterMode} onValueChange={(v: any) => setFilterMode(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Status Telefone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os clientes</SelectItem>
              <SelectItem value="com_fone">Com telefone</SelectItem>
              <SelectItem value="sem_fone">Sem telefone</SelectItem>
            </SelectContent>
          </Select>

          <Select value={minCompras} onValueChange={setMinCompras}>
            <SelectTrigger>
              <SelectValue placeholder="Mínimo de fotos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Qualquer nº de compras</SelectItem>
              <SelectItem value="1">Pelo menos 1 compra</SelectItem>
              <SelectItem value="5">Pelo menos 5 compras</SelectItem>
              <SelectItem value="10">Pelo menos 10 compras</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Batch Action Bar */}
      {Object.keys(editingPhones).length > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <p className="text-sm font-medium text-primary flex items-center gap-2">
            <Phone className="w-4 h-4" />
            {Object.keys(editingPhones).length} alterações pendentes
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditingPhones({})}>Cancelar</Button>
            <Button size="sm" onClick={handleSaveBatch} disabled={batchUpdate.isPending}>
              <Save className="w-4 h-4 mr-2" /> Salvar Tudo
            </Button>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden border-none shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12 cursor-pointer" onClick={() => toggleSort("nome")}>
                   <div className="flex items-center gap-1">Nome <ArrowUpDown className="w-3 h-3"/></div>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Localização</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort("data")}>
                   <div className="flex items-center gap-1">Cadastro <ArrowUpDown className="w-3 h-3"/></div>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort("compras")}>
                   <div className="flex items-center gap-1">Compras <ArrowUpDown className="w-3 h-3"/></div>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Telefone</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredClientes.map((c) => (
                <tr key={c.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{c.nome}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{c.tipo}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{c.bairro || "N/A"}, {c.cidade || "N/A"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 font-medium">
                        <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                        {c.qtd_compras}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c.total_gasto)} total
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {filterMode === "sem_fone" ? (
                      <Input 
                        placeholder="(00) 00000-0000"
                        className="h-8 max-w-[150px] text-xs"
                        value={editingPhones[c.id] ?? ""}
                        onChange={(e) => handlePhoneChange(c.id, e.target.value)}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        {c.telefone ? (
                          <>
                            <Phone className="w-3.5 h-3.5 text-green-500" />
                            <span>{c.telefone}</span>
                          </>
                        ) : (
                          <>
                            <PhoneOff className="w-3.5 h-3.5 text-destructive" />
                            <span className="text-destructive font-medium">Faltando</span>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredClientes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum cliente encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Summary Footer */}
      <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
        <p>Total de {filteredClientes.length} clientes na visualização atual</p>
        <p>Base completa: {clientes?.length} clientes</p>
      </div>
    </div>
  );
}
