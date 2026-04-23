import { useState, useMemo } from "react";
import { Search, MapPin, Building, Save, ArrowUpDown, ChevronDown, Check } from "lucide-react";
import { normalizeSearch } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { 
  useRelClientesCompletos, 
  useCidadesAtendidas, 
  useBatchUpdateCidades, 
  useCriarOuObterCidade 
} from "@/hooks/useRelatorios";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function RelatorioClientesCidades() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  
  const { data: todosClientes, isLoading: isClientesLoading } = useRelClientesCompletos();
  const { data: cidadesCadastradas, isLoading: isCidadesLoading } = useCidadesAtendidas();
  const batchUpdate = useBatchUpdateCidades();
  const criarOuObterCidade = useCriarOuObterCidade();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"nome" | "cidade">("nome");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Estado para autocomplete
  const [cidadeSearch, setCidadeSearch] = useState("");
  const [batchCidadeSelecionada, setBatchCidadeSelecionada] = useState<{id: string, nome: string} | null>(null);

  // Filtramos os clientes para mostrar apenas os do vendedor logado (se não for admin)
  const clientesVisiveis = useMemo(() => {
    if (!todosClientes) return [];
    
    let result = todosClientes;
    
    // Regra: se não for admin, vê só os próprios clientes
    if (!isAdmin && user) {
      result = result.filter(c => c.vendedor_id === user.id);
    }

    result = result.filter(c => {
      const matchSearch = 
        normalizeSearch(c.nome).includes(normalizeSearch(searchTerm)) ||
        normalizeSearch(c.cidade ?? "").includes(normalizeSearch(searchTerm)) ||
        normalizeSearch(c.bairro ?? "").includes(normalizeSearch(searchTerm));
      
      return matchSearch;
    });

    // Ordenação
    result.sort((a, b) => {
      if (sortBy === "nome") {
        return sortOrder === "asc" ? a.nome.localeCompare(b.nome) : b.nome.localeCompare(a.nome);
      } else if (sortBy === "cidade") {
        const cA = a.cidade || "";
        const cB = b.cidade || "";
        return sortOrder === "asc" ? cA.localeCompare(cB) : cB.localeCompare(cA);
      }
      return 0;
    });

    return result;
  }, [todosClientes, searchTerm, sortBy, sortOrder, isAdmin, user]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const isAllSelected = clientesVisiveis.length > 0 && clientesVisiveis.every(c => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const newIds = new Set(selectedIds);
      clientesVisiveis.forEach(c => newIds.add(c.id));
      setSelectedIds(newIds);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCidadeSelect = async (cidadeName: string, clienteIds: string[]) => {
    // 1. Validar se a cidade já existe na lista
    const normSearch = normalizeSearch(cidadeName);
    let cidId = cidadesCadastradas?.find(c => normalizeSearch(c.cidade) === normSearch)?.id;
    let finalCidadeName = cidadesCadastradas?.find(c => c.id === cidId)?.cidade || cidadeName;

    try {
      // 2. Se não encontrou, então tenta criar in-line pelo RPC seguro
      if (!cidId) {
        cidId = await criarOuObterCidade.mutateAsync({ cidade: cidadeName });
      }

      // 3. Modifica no batch para todos os selecionados
      if (cidId) {
        const payload = clienteIds.map(id => ({
          id,
          cidade_id: cidId as string,
          cidade_nome: finalCidadeName
        }));

        await batchUpdate.mutateAsync(payload);
        toast.success(`${payload.length} cliente(s) atualizado(s) com sucesso!`);
        setSelectedIds(new Set()); // limpa seleção em lote
        setBatchCidadeSelecionada(null); // limpa estado do autocomplete de lote
      }
    } catch (e: any) {
      toast.error("Erro ao atribuir cidade: " + e.message);
    }
  };

  if (isClientesLoading || isCidadesLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando dados...</div>;
  }

  // Define o que será mostrado no Autocomplete
  const AutocompleteCidade = ({ 
    onSelect, 
    triggerText,
    isBatch = false,
    currentValue = ""
  }: { 
    onSelect: (val: string) => void, 
    triggerText: string,
    isBatch?: boolean,
    currentValue?: string
  }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const normSearch = normalizeSearch(search);
    const exactMatch = cidadesCadastradas?.some(c => normalizeSearch(c.cidade) === normSearch);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={isBatch ? "default" : "outline"}
            role="combobox"
            aria-expanded={open}
            size={isBatch ? "sm" : "default"}
            className={cn("justify-between w-full lg:max-w-[250px]", currentValue && !isBatch ? "border-primary text-primary font-medium" : "text-muted-foreground")}
          >
            <span className="truncate">{triggerText}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Buscar ou criar cidade..." 
              value={search} 
              onValueChange={setSearch} 
            />
            <CommandList>
              <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
              <CommandGroup heading="Selecionar">
                {cidadesCadastradas?.map((cidade) => (
                  <CommandItem
                    key={cidade.id}
                    value={cidade.cidade}
                    onSelect={(val) => {
                      onSelect(cidade.cidade);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentValue.toLowerCase() === cidade.cidade.toLowerCase() ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {cidade.cidade}
                  </CommandItem>
                ))}
              </CommandGroup>
              
              {search.trim().length > 2 && !exactMatch && (
                <CommandGroup heading="Criar">
                  <CommandItem
                    value={`create_${search}`}
                    onSelect={() => {
                      onSelect(search.trim());
                      setOpen(false);
                      setSearch("");
                    }}
                    className="font-medium text-primary"
                  >
                    <Building className="mr-2 h-4 w-4" />
                    Criar cidade: "{search.trim()}"
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome, bairro ou cidade..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            {isAdmin ? (
              <Badge variant="outline" className="ml-auto">Visão: Admin (Todos os clientes)</Badge>
            ) : (
              <Badge variant="outline" className="ml-auto">Visão: Pessoal (Apenas meus clientes)</Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <p className="text-sm font-medium text-primary flex items-center gap-2">
            <Check className="w-4 h-4" />
            {selectedIds.size} cliente(s) selecionado(s)
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Cancelar</Button>
            <AutocompleteCidade 
              isBatch
              triggerText="Atribuir a todos..."
              onSelect={(val) => handleCidadeSelect(val, Array.from(selectedIds))}
            />
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden border-none shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <Checkbox 
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12 cursor-pointer" onClick={() => toggleSort("nome")}>
                   <div className="flex items-center gap-1">Cliente <ArrowUpDown className="w-3 h-3"/></div>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort("cidade")}>
                   <div className="flex items-center gap-1">Cidade Atual <ArrowUpDown className="w-3 h-3"/></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y relative">
              {batchUpdate.isPending && (
                <tr className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center">
                   <td colSpan={3}>Atualizando...</td>
                </tr>
              )}
              {clientesVisiveis.map((c) => (
                <tr key={c.id} className={cn("transition-colors", selectedIds.has(c.id) ? "bg-primary/5" : "hover:bg-accent/50")}>
                  <td className="px-4 py-3">
                    <Checkbox 
                      checked={selectedIds.has(c.id)}
                      onCheckedChange={() => toggleSelect(c.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{c.nome}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{c.bairro || "S/ Bairro"} - {c.telefone || "S/ Telefone"}</p>
                  </td>
                  <td className="px-4 py-3 w-[200px] lg:w-[300px]">
                    <AutocompleteCidade 
                      triggerText={c.cidade || "Sem Cidade"}
                      currentValue={c.cidade}
                      onSelect={(val) => handleCidadeSelect(val, [c.id])}
                    />
                  </td>
                </tr>
              ))}
              {clientesVisiveis.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
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
        <p>Total de {clientesVisiveis.length} clientes listados</p>
      </div>
    </div>
  );
}
