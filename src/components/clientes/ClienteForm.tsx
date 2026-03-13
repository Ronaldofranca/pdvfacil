import { useState, useEffect, useCallback, useRef } from "react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, Loader2, Plus, Trash2, Star, Search as SearchIcon, AlertTriangle } from "lucide-react";
import { useUpsertCliente, useClientes, type ClienteInput } from "@/hooks/useClientes";
import { useClienteTelefones, useSaveClienteTelefones, checkDuplicatePhone } from "@/hooks/useClienteTelefones";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { buscarCep, formatCep, formatTelefone, normalizeTelefone } from "@/lib/cepUtils";

interface TelefoneLocal {
  id?: string;
  telefone: string;
  tipo: string;
  principal: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: any;
}

export function ClienteForm({ open, onOpenChange, cliente }: Props) {
  const { profile } = useAuth();
  const upsert = useUpsertCliente();
  const saveTelefones = useSaveClienteTelefones();
  const { data: todosClientes } = useClientes();
  const { data: existingPhones } = useClienteTelefones(cliente?.id ?? null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [searchIndicador, setSearchIndicador] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const isEditing = !!cliente;
  const draftKey = isEditing ? `cliente_edit_${cliente.id}` : "cliente_new";

  const defaultForm = {
    nome: "",
    email: "",
    cpf_cnpj: "",
    cidade: "",
    rua: "",
    bairro: "",
    uf: "",
    cep: "",
    latitude: "",
    longitude: "",
    observacoes: "",
    ativo: true,
    cliente_indicador_id: "",
  };

  const { data: form, setData: setForm, setField: set, clear: clearDraft, hasDraft } = useFormPersistence(
    draftKey,
    defaultForm,
    open && !isEditing // only persist for new clients
  );

  const [telefones, setTelefones] = useState<TelefoneLocal[]>([
    { telefone: "", tipo: "celular", principal: true },
  ]);

  // Navigation guard
  const hasChanges = open && (form.nome !== "" || telefones.some(t => t.telefone !== ""));
  useNavigationGuard(hasChanges && !isEditing);

  // Persist telefones alongside form
  const telefonesKey = `draft:${draftKey}_telefones`;
  const telefonesInitRef = useRef(false);
  useEffect(() => {
    if (open && !isEditing && !telefonesInitRef.current) {
      telefonesInitRef.current = true;
      try {
        const stored = localStorage.getItem(telefonesKey);
        if (stored) setTelefones(JSON.parse(stored));
      } catch {}
    }
    if (!open) telefonesInitRef.current = false;
  }, [open, isEditing, telefonesKey]);

  useEffect(() => {
    if (open && !isEditing && telefones.some(t => t.telefone)) {
      try { localStorage.setItem(telefonesKey, JSON.stringify(telefones)); } catch {}
    }
  }, [telefones, open, isEditing, telefonesKey]);

  useEffect(() => {
    if (!open) return;
    if (cliente) {
      setForm({
        nome: cliente.nome ?? "",
        email: cliente.email ?? "",
        cpf_cnpj: cliente.cpf_cnpj ?? "",
        cidade: cliente.cidade ?? "",
        rua: cliente.rua ?? "",
        bairro: cliente.bairro ?? "",
        uf: (cliente.uf ?? cliente.estado ?? "").toUpperCase(),
        cep: cliente.cep ?? "",
        latitude: cliente.latitude != null ? String(cliente.latitude) : "",
        longitude: cliente.longitude != null ? String(cliente.longitude) : "",
        observacoes: cliente.observacoes ?? "",
        ativo: cliente.ativo ?? true,
        cliente_indicador_id: cliente.cliente_indicador_id ?? "",
      });
      // Load phones from the related table
      if (existingPhones && existingPhones.length > 0) {
        setTelefones(existingPhones.map(p => ({
          id: p.id,
          telefone: formatTelefone(p.telefone),
          tipo: p.tipo,
          principal: p.principal,
        })));
      } else {
        setTelefones([{
          telefone: cliente.telefone ? formatTelefone(cliente.telefone) : "",
          tipo: "celular",
          principal: true,
        }]);
      }
    } else if (!hasDraft) {
      // Only reset if no draft was restored
      setForm(defaultForm);
      setTelefones([{ telefone: "", tipo: "celular", principal: true }]);
    }
    setSearchIndicador("");
    setDuplicateWarning(null);
  }, [cliente, open, existingPhones]);

  // CEP lookup
  const handleCepBlur = useCallback(async () => {
    const digits = form.cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    const result = await buscarCep(digits);
    setCepLoading(false);
    if (result) {
      setForm(f => ({
        ...f,
        rua: result.logradouro || f.rua,
        bairro: result.bairro || f.bairro,
        cidade: result.localidade || f.cidade,
        uf: (result.uf || f.uf || "").toUpperCase(),
      }));
      toast.success("Endereço preenchido pelo CEP!");
    } else {
      toast.error("CEP não encontrado");
    }
  }, [form.cep]);

  const handleCepChange = (value: string) => {
    setForm(f => ({ ...f, cep: formatCep(value) }));
  };

  // Phone management
  const addTelefone = () => {
    setTelefones(prev => [...prev, { telefone: "", tipo: "celular", principal: false }]);
  };

  const removeTelefone = (index: number) => {
    setTelefones(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some(t => t.principal)) {
        updated[0].principal = true;
      }
      return updated;
    });
  };

  const updateTelefone = (index: number, field: keyof TelefoneLocal, value: string | boolean) => {
    setTelefones(prev => prev.map((t, i) => {
      if (i !== index) {
        if (field === "principal" && value === true) return { ...t, principal: false };
        return t;
      }
      if (field === "telefone") return { ...t, telefone: formatTelefone(value as string) };
      return { ...t, [field]: value };
    }));
  };

  // Duplicate check on phone blur
  const handlePhoneBlur = async (index: number) => {
    if (!profile) return;
    const tel = telefones[index]?.telefone;
    const normalized = normalizeTelefone(tel || "");
    if (normalized.length < 10) { setDuplicateWarning(null); return; }
    const { isDuplicate, clienteNome } = await checkDuplicatePhone(
      profile.empresa_id, normalized, cliente?.id
    );
    if (isDuplicate) {
      setDuplicateWarning(`Telefone já cadastrado para: ${clienteNome}`);
    } else {
      setDuplicateWarning(null);
    }
  };

  const captureGPS = () => {
    if (!navigator.geolocation) { toast.error("Geolocalização não suportada"); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) }));
        setGpsLoading(false);
        toast.success("Localização capturada!");
      },
      (err) => { setGpsLoading(false); toast.error(`Erro GPS: ${err.message}`); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Check duplicates before saving
    for (const tel of telefones) {
      const normalized = normalizeTelefone(tel.telefone);
      if (normalized.length >= 10) {
        const { isDuplicate, clienteNome } = await checkDuplicatePhone(
          profile.empresa_id, normalized, cliente?.id
        );
        if (isDuplicate) {
          toast.error(`Telefone ${tel.telefone} já pertence a: ${clienteNome}`);
          return;
        }
      }
    }

    const principalPhone = telefones.find(t => t.principal) || telefones[0];
    const payload: ClienteInput = {
      id: cliente?.id,
      empresa_id: profile.empresa_id,
      nome: form.nome,
      telefone: normalizeTelefone(principalPhone?.telefone || ""),
      email: form.email,
      cpf_cnpj: form.cpf_cnpj,
      cidade: form.cidade,
      rua: form.rua,
      bairro: form.bairro,
      estado: form.uf,
      uf: form.uf,
      cep: form.cep.replace(/\D/g, ""),
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      observacoes: form.observacoes,
      ativo: form.ativo,
      cliente_indicador_id: form.cliente_indicador_id || null,
    };

    upsert.mutate(payload, {
      onSuccess: (data: any) => {
        const clienteId = data?.id || cliente?.id;
        if (clienteId) {
          saveTelefones.mutate({
            clienteId,
            empresaId: profile.empresa_id,
            telefones: telefones.filter(t => normalizeTelefone(t.telefone).length > 0),
          });
        }
        onOpenChange(false);
      },
    });
  };

  const set = (field: string, value: string | boolean) => setForm(f => ({ ...f, [field]: value }));

  const tipoOptions = [
    { value: "celular", label: "Celular" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "residencial", label: "Residencial" },
    { value: "comercial", label: "Comercial" },
    { value: "outro", label: "Outro" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Nome */}
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input required value={form.nome} onChange={(e) => set("nome", e.target.value)} />
            </div>

            {/* Telefones */}
            <div className="col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Telefones</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTelefone} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              </div>
              {telefones.map((tel, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      value={tel.telefone}
                      onChange={(e) => updateTelefone(i, "telefone", e.target.value)}
                      onBlur={() => handlePhoneBlur(i)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <Select value={tel.tipo} onValueChange={(v) => updateTelefone(i, "tipo", v)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tipoOptions.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant={tel.principal ? "default" : "ghost"}
                    size="icon"
                    className="shrink-0"
                    title={tel.principal ? "Principal" : "Definir como principal"}
                    onClick={() => updateTelefone(i, "principal", true)}
                  >
                    <Star className={`w-4 h-4 ${tel.principal ? "fill-current" : ""}`} />
                  </Button>
                  {telefones.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => removeTelefone(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {duplicateWarning && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded-md">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {duplicateWarning}
                </div>
              )}
            </div>

            {/* Email */}
            <div className="col-span-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <Label>CPF/CNPJ</Label>
              <Input value={form.cpf_cnpj} onChange={(e) => set("cpf_cnpj", e.target.value)} />
            </div>

            {/* CEP with auto-fill */}
            <div>
              <Label>CEP</Label>
              <div className="flex gap-1.5">
                <Input
                  value={form.cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  maxLength={9}
                />
                <Button type="button" variant="outline" size="icon" onClick={handleCepBlur} disabled={cepLoading} title="Buscar CEP">
                  {cepLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="col-span-2">
              <Label>Rua / Endereço</Label>
              <Input value={form.rua} onChange={(e) => set("rua", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Bairro</Label>
              <Input value={form.bairro} onChange={(e) => set("bairro", e.target.value)} />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
            </div>
            <div>
              <Label>UF</Label>
              <Input value={form.uf} onChange={(e) => set("uf", e.target.value.toUpperCase())} placeholder="UF" maxLength={2} />
            </div>

            {/* GPS */}
            <div className="col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Localização GPS</Label>
                <Button type="button" variant="outline" size="sm" onClick={captureGPS} disabled={gpsLoading} className="gap-1.5">
                  {gpsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                  {gpsLoading ? "Capturando..." : "Capturar GPS"}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Latitude</Label>
                  <Input value={form.latitude} onChange={(e) => set("latitude", e.target.value)} placeholder="-23.5505" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Longitude</Label>
                  <Input value={form.longitude} onChange={(e) => set("longitude", e.target.value)} placeholder="-46.6333" />
                </div>
              </div>
            </div>

            {/* Indicador */}
            <div className="col-span-2 space-y-2">
              <Label className="text-base font-semibold">Quem indicou este cliente?</Label>
              <Input
                placeholder="Buscar cliente indicador..."
                value={searchIndicador}
                onChange={(e) => setSearchIndicador(e.target.value)}
              />
              {searchIndicador && (
                <div className="max-h-32 overflow-y-auto border rounded-md">
                  {(todosClientes ?? [])
                    .filter((c) => c.id !== cliente?.id && (c.nome.toLowerCase().includes(searchIndicador.toLowerCase()) || c.telefone?.includes(searchIndicador)))
                    .slice(0, 5)
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors border-b border-border last:border-0"
                        onClick={() => { set("cliente_indicador_id", c.id); setSearchIndicador(c.nome); }}
                      >
                        <span className="font-medium text-foreground">{c.nome}</span>
                        {c.telefone && <span className="text-muted-foreground ml-2 text-xs">{c.telefone}</span>}
                      </button>
                    ))}
                </div>
              )}
              {form.cliente_indicador_id && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Indicador: {todosClientes?.find((c) => c.id === form.cliente_indicador_id)?.nome ?? "Selecionado"}
                  </span>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { set("cliente_indicador_id", ""); setSearchIndicador(""); }}>
                    Remover
                  </Button>
                </div>
              )}
            </div>

            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => set("ativo", v)} />
              <Label>Ativo</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={upsert.isPending || saveTelefones.isPending}>
              {upsert.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
