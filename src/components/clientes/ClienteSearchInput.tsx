import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Search, X, User, MapPin, Phone, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, normalizeSearch } from "@/lib/utils";

// ─── Types ───

export interface ClienteSearchable {
  id: string;
  nome: string;
  telefone?: string | null;
  cidade?: string | null;
  pontos_indicacao?: number | null;
}

interface ClienteSearchInputProps {
  /** ID or nome of the selected client (null = no selection) */
  value: string | null;
  /** Callback when a client is selected or cleared */
  onSelect: (cliente: { id: string; nome: string } | null) => void;
  /** List of searchable clients */
  clientes: ClienteSearchable[];
  placeholder?: string;
  /** Show "Todos clientes" / clear option */
  allowClear?: boolean;
  className?: string;
}

// ─── Helpers ───

interface RankedCliente extends ClienteSearchable {
  _score: number;
  _matchField: "nome_start" | "nome_contains" | "cidade" | "telefone" | "none";
}

function rankClientes(clientes: ClienteSearchable[], term: string): RankedCliente[] {
  if (!term.trim()) {
    // No search term — return first 20, no ranking
    return clientes.slice(0, 20).map((c) => ({ ...c, _score: 0, _matchField: "none" as const }));
  }

  const norm = normalizeSearch(term.trim());
  const results: RankedCliente[] = [];

  for (const c of clientes) {
    const nomeNorm = normalizeSearch(c.nome ?? "");
    const cidadeNorm = normalizeSearch(c.cidade ?? "");
    const telNorm = (c.telefone ?? "").replace(/\D/g, "");
    const termDigits = term.replace(/\D/g, "");

    let score = 0;
    let matchField: RankedCliente["_matchField"] = "none";

    if (nomeNorm.startsWith(norm)) {
      score = 100;
      matchField = "nome_start";
    } else if (nomeNorm.includes(norm)) {
      score = 50;
      matchField = "nome_contains";
    } else if (cidadeNorm.includes(norm)) {
      score = 30;
      matchField = "cidade";
    } else if (termDigits && telNorm.includes(termDigits)) {
      score = 10;
      matchField = "telefone";
    }

    if (score > 0) {
      results.push({ ...c, _score: score, _matchField: matchField });
    }
  }

  results.sort((a, b) => b._score - a._score || a.nome.localeCompare(b.nome));
  return results.slice(0, 50);
}

/** Highlights matching substring in text */
function HighlightText({ text, term }: { text: string; term: string }) {
  if (!term.trim() || !text) return <>{text}</>;

  const norm = normalizeSearch(term.trim());
  const textNorm = normalizeSearch(text);
  const idx = textNorm.indexOf(norm);

  if (idx === -1) return <>{text}</>;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + term.trim().length);
  const after = text.slice(idx + term.trim().length);

  return (
    <>
      {before}
      <mark className="bg-primary/20 text-foreground rounded-sm px-0.5">{match}</mark>
      {after}
    </>
  );
}

// ─── Component ───

export function ClienteSearchInput({
  value,
  onSelect,
  clientes,
  placeholder = "Buscar cliente...",
  allowClear = false,
  className,
}: ClienteSearchInputProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resolve display name from value
  const displayName = useMemo(() => {
    if (!value) return "";
    // Try matching by nome first (Relatórios uses nome as filter key)
    const byNome = clientes.find((c) => c.nome === value);
    if (byNome) return byNome.nome;
    // Try matching by id
    const byId = clientes.find((c) => c.id === value);
    if (byId) return byId.nome;
    return value;
  }, [value, clientes]);

  // Debounce query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Ranked results
  const results = useMemo(
    () => rankClientes(clientes, debouncedQuery),
    [clientes, debouncedQuery]
  );

  // Reset active index when results change
  useEffect(() => {
    setActiveIdx(-1);
  }, [results]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-client-item]");
      items[activeIdx]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  const handleSelect = useCallback(
    (cliente: ClienteSearchable | null) => {
      if (cliente) {
        onSelect({ id: cliente.id, nome: cliente.nome });
        setQuery("");
      } else {
        onSelect(null);
        setQuery("");
      }
      setIsOpen(false);
      setActiveIdx(-1);
      inputRef.current?.blur();
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const totalItems = (allowClear ? 1 : 0) + results.length;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIdx((prev) => (prev + 1) % totalItems);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIdx((prev) => (prev - 1 + totalItems) % totalItems);
          break;
        case "Enter":
          e.preventDefault();
          if (activeIdx >= 0) {
            if (allowClear && activeIdx === 0) {
              handleSelect(null);
            } else {
              const resultIdx = allowClear ? activeIdx - 1 : activeIdx;
              if (results[resultIdx]) handleSelect(results[resultIdx]);
            }
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setQuery("");
          inputRef.current?.blur();
          break;
      }
    },
    [activeIdx, results, allowClear, handleSelect]
  );

  const handleFocus = () => {
    setIsOpen(true);
    // Show results immediately on focus (debounce already empty → shows top 20)
    setDebouncedQuery(query);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          className={cn(
            "pl-8 pr-8 h-8 text-xs",
            !isOpen && value && "text-foreground font-medium"
          )}
          placeholder={value ? displayName : placeholder}
          value={isOpen ? query : (value ? "" : query)}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {value && !isOpen && (
          <button
            type="button"
            onClick={handleClearClick}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors"
            aria-label="Limpar seleção"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg max-h-[280px] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* Clear option */}
          {allowClear && (
            <button
              type="button"
              data-client-item
              onClick={() => handleSelect(null)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors border-b border-border/50",
                activeIdx === 0
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
            >
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground font-medium">Todos clientes</span>
            </button>
          )}

          {/* Results */}
          {results.length === 0 && debouncedQuery.trim() ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              Nenhum cliente encontrado
            </div>
          ) : (
            results.map((c, i) => {
              const itemIdx = allowClear ? i + 1 : i;
              return (
                <button
                  key={c.id}
                  type="button"
                  data-client-item
                  onClick={() => handleSelect(c)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                    activeIdx === itemIdx
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50",
                    value === c.nome && "bg-primary/5"
                  )}
                >
                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {c.nome?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-foreground truncate">
                        <HighlightText
                          text={c.nome}
                          term={c._matchField === "nome_start" || c._matchField === "nome_contains" ? debouncedQuery : ""}
                        />
                      </p>
                      {(c.pontos_indicacao ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-yellow-600 bg-yellow-500/10 px-1 rounded border border-yellow-500/20 shrink-0">
                          <Star className="w-2 h-2 fill-yellow-500 text-yellow-500" /> {c.pontos_indicacao}
                        </span>
                      )}
                    </div>
                    {(c.cidade || c.telefone) && (
                      <p className="text-[11px] text-muted-foreground truncate flex items-center gap-2 mt-0.5">
                        {c.cidade && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <HighlightText
                              text={c.cidade}
                              term={c._matchField === "cidade" ? debouncedQuery : ""}
                            />
                          </span>
                        )}
                        {c.telefone && (
                          <span className="flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5 shrink-0" />
                            <HighlightText
                              text={c.telefone}
                              term={c._matchField === "telefone" ? debouncedQuery : ""}
                            />
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Match indicator */}
                  {debouncedQuery.trim() && c._matchField !== "none" && (
                    <span className="text-[9px] text-muted-foreground/60 shrink-0 uppercase tracking-wider">
                      {c._matchField === "nome_start" || c._matchField === "nome_contains"
                        ? ""
                        : c._matchField === "cidade"
                        ? "cidade"
                        : "tel"}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
