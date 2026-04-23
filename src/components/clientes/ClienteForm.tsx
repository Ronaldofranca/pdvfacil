import { useState, useEffect, useCallback, useRef } from "react";
import { normalizeSearch } from "@/lib/utils";
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
import { MapPin, Loader2, Plus, Trash2, Star, Search as SearchIcon, AlertTriangle, Crosshair, Shield, KeyRound, Eye, EyeOff } from "lucide-react";
import { useUpsertCliente, useClientes, type ClienteInput, useContaAcesso, useSaveContaAcesso } from "@/hooks/useClientes";
import { useClienteTelefones, useSaveClienteTelefones, checkDuplicatePhone } from "@/hooks/useClienteTelefones";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { buscarCep, formatCep, formatTelefone, normalizeTelefone } from "@/lib/cepUtils";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { getCoordinatesForCity, getCityFromCoordinates } from "@/lib/geocoding";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const clientPinIcon = L.divIcon({
  className: "custom-leaflet-icon",
  html: `<div class="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center bg-primary animate-pulse-subtle"><div class="w-2 h-2 bg-white rounded-full"></div></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

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
  onSuccess?: (cliente: any) => void;
}

export function ClienteForm({ open, onOpenChange, cliente, onSuccess }: Props) {
  const { profile } = useAuth();
  const upsert = useUpsertCliente();
  const saveTelefones = useSaveClienteTelefones();
  const { data: todosClientes } = useClientes();
  const { data: existingPhones } = useClienteTelefones(cliente?.id ?? null);
  const { data: existingContaAcesso } = useContaAcesso(cliente?.id ?? null);
  const saveContaAcesso = useSaveContaAcesso();
  
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
    permitir_fiado: true,
    cliente_indicador_id: "",
    limite_credito_total: 1000,
    permitir_atraso: true,
    modo_limite: "automatico",
  };

  const { data: form, setData: setForm, setField: set, clear: clearDraft, hasDraft } = useFormPersistence(
    draftKey,
    defaultForm,
    open && !isEditing // only persist for new clients
  );

  const [telefones, setTelefones] = useState<TelefoneLocal[]>([
    { telefone: "", tipo: "celular", principal: true },
  ]);

  const [contaAcesso, setContaAcesso] = useState({
    login: "",
    senha: "",
    confirmarSenha: "",
    ativo: true,
    habilitado: false
  });
  const [showPassword, setShowPassword] = useState(false);

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
        permitir_fiado: cliente.permitir_fiado ?? true,
        cliente_indicador_id: cliente.cliente_indicador_id ?? "",
        limite_credito_total: cliente.limite_credito_total ?? 1000,
        permitir_atraso: cliente.permitir_atraso ?? true,
        modo_limite: cliente.modo_limite ?? "automatico",
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

  useEffect(() => {
    if (!open) return;
    if (existingContaAcesso) {
      setContaAcesso({
        login: existingContaAcesso.login,
        senha: "",
        confirmarSenha: "",
        ativo: existingContaAcesso.ativo,
        habilitado: true
      });
    } else if (!cliente) {
      setContaAcesso({
        login: "",
        senha: "",
        confirmarSenha: "",
        ativo: true,
        habilitado: false
      });
    }
  }, [existingContaAcesso, open, cliente]);

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

  const locateAddress = async () => {
    if (!form.cidade) {
      toast.error("Digite ao menos a cidade para localizar");
      return;
    }
    setGpsLoading(true);
    const coords = await getCoordinatesForCity(form.cidade, form.uf);
    setGpsLoading(false);
    if (coords) {
      setForm(f => ({ ...f, latitude: String(coords.latitude), longitude: String(coords.longitude) }));
      toast.success("Endereço localizado no mapa!");
    } else {
      toast.error("Não foi possível localizar este endereço no mapa.");
    }
  };

  const syncAddressFromCoords = async (lat: number, lng: number) => {
    const data = await getCityFromCoordinates(lat, lng);
    if (data && (!form.cidade || !form.uf)) {
      setForm(f => ({ ...f, cidade: data.cidade, uf: data.estado }));
      toast.info(`Cidade detectada: ${data.cidade}`);
    }
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

    if (contaAcesso.habilitado) {
      if (!contaAcesso.login) {
        toast.error("O Login de Acesso é obrigatório");
        return;
      }
      if (!existingContaAcesso && !contaAcesso.senha) {
        toast.error("A senha é obrigatória para criar a conta de acesso");
        return;
      }
      if (contaAcesso.senha && contaAcesso.senha !== contaAcesso.confirmarSenha) {
        toast.error("As senhas não conferem");
        return;
      }
      if (contaAcesso.senha && contaAcesso.senha.length < 6) {
        toast.error("A senha deve ter no mínimo 6 caracteres");
        return;
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
      limite_credito_total: form.limite_credito_total,
      permitir_atraso: form.permitir_atraso,
      modo_limite: form.modo_limite,
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

          if (contaAcesso.habilitado) {
            saveContaAcesso.mutate({
              clienteId,
              login: contaAcesso.login,
              senha: contaAcesso.senha,
              ativo: contaAcesso.ativo,
              isNew: !existingContaAcesso
            });
          }
        }
        clearDraft();
        try { localStorage.removeItem(telefonesKey); } catch {}
        if (onSuccess) onSuccess({ ...payload, id: clienteId });
        onOpenChange(false);
      },
    });
  };




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
          <div className="flex items-center justify-between">
            <DialogTitle>{cliente ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            {cliente?.id && (
              <Badge variant="outline" className="font-mono text-[10px] py-0 h-5">
                ID: {cliente.id.split("-")[0]}...{cliente.id.split("-")[4]}
              </Badge>
            )}
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* ID - Read only */}
            {cliente?.id && (
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">ID Completo</Label>
                <div className="flex gap-2">
                  <Input readOnly value={cliente.id} className="font-mono text-xs bg-muted h-8" />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(cliente.id);
                      toast.success("ID copiado!");
                    }}
                  >
                    Copiar
                  </Button>
                </div>
              </div>
            )}

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
                    <SelectContent className="z-[100]">
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
                <Label className="text-base font-semibold">Localização GPS (Ponto do Cliente)</Label>
                <div className="flex gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={locateAddress} disabled={gpsLoading} className="h-8 gap-1 font-normal text-xs">
                    <SearchIcon className="w-3 h-3" /> Buscar Endereço
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={captureGPS} disabled={gpsLoading} className="h-8 gap-1 font-normal text-xs">
                    <Crosshair className="w-3 h-3" /> Meu GPS
                  </Button>
                </div>
              </div>

              <div className="h-[280px] w-full rounded-md border overflow-hidden mt-1 z-0 relative group">
                <div className="absolute top-2 left-2 z-[400] bg-background/90 backdrop-blur-sm p-2 rounded-md border shadow-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                   Arraste o pino para refinar ou clique no mapa
                </div>
                <MapContainer 
                  center={form.latitude && form.longitude ? [parseFloat(form.latitude), parseFloat(form.longitude)] : [-15.793889, -47.882778]} 
                  zoom={form.latitude ? 16 : 4} 
                  className="w-full h-full"
                  scrollWheelZoom={true}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  
                  {(() => {
                    function MapClickHandler() {
                      useMapEvents({
                        click(e) {
                          setForm(f => ({ ...f, latitude: String(e.latlng.lat), longitude: String(e.latlng.lng) }));
                          syncAddressFromCoords(e.latlng.lat, e.latlng.lng);
                        },
                      });
                      return null;
                    }
                    return <MapClickHandler />;
                  })()}

                  {form.latitude && form.longitude && (
                     <>
                       <Marker 
                        position={[parseFloat(form.latitude), parseFloat(form.longitude)]} 
                        icon={clientPinIcon}
                        draggable={true}
                        eventHandlers={{
                          dragend: (e) => {
                            const marker = e.target;
                            const position = marker.getLatLng();
                            setForm(f => ({ ...f, latitude: String(position.lat), longitude: String(position.lng) }));
                            syncAddressFromCoords(position.lat, position.lng);
                          },
                        }}
                       />
                       {(() => {
                         function ChangeMapView() {
                           const map = useMap();
                           useEffect(() => {
                             map.setView([parseFloat(form.latitude), parseFloat(form.longitude)], map.getZoom());
                           }, [form.latitude, form.longitude, map]);
                           return null;
                         }
                         return <ChangeMapView />;
                       })()}
                     </>
                  )}
                </MapContainer>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold">Latitude</Label>
                  <Input value={form.latitude} onChange={(e) => set("latitude", e.target.value)} className="h-8 text-xs font-mono" />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold">Longitude</Label>
                  <Input value={form.longitude} onChange={(e) => set("longitude", e.target.value)} className="h-8 text-xs font-mono" />
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
                    .filter((c) => c.id !== cliente?.id && (normalizeSearch(c.nome).includes(normalizeSearch(searchIndicador)) || c.telefone?.includes(searchIndicador)))
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

            {/* Acesso ao Sistema */}
            <div className="col-span-2 p-4 rounded-xl border bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm">Acesso ao Sistema (Portal)</h3>
                </div>
                <Switch 
                  checked={contaAcesso.habilitado} 
                  onCheckedChange={(v) => setContaAcesso({ ...contaAcesso, habilitado: v })} 
                />
              </div>

              {contaAcesso.habilitado && (
                <div className="grid grid-cols-2 gap-4 mt-2 border-t pt-4">
                  <div className="col-span-2">
                    <Label className="text-xs font-semibold">Login de Acesso *</Label>
                    <Input 
                      value={contaAcesso.login} 
                      onChange={(e) => setContaAcesso({ ...contaAcesso, login: e.target.value })} 
                      placeholder="Ex: telefone, apelido ou código"
                      className="bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Este será o usuário único de login (não precisa ser email).</p>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">{existingContaAcesso ? 'Nova Senha' : 'Senha *'}</Label>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"}
                        value={contaAcesso.senha} 
                        onChange={(e) => setContaAcesso({ ...contaAcesso, senha: e.target.value })} 
                        placeholder={existingContaAcesso ? "(vazio para não alterar)" : "Mínimo 6 caracteres"}
                        className="bg-background pr-9"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Confirmar Senha {(!existingContaAcesso || contaAcesso.senha) && '*'}</Label>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"}
                        value={contaAcesso.confirmarSenha} 
                        onChange={(e) => setContaAcesso({ ...contaAcesso, confirmarSenha: e.target.value })} 
                        className="bg-background pr-9"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center gap-2 pt-2">
                    <Switch 
                      checked={contaAcesso.ativo} 
                      onCheckedChange={(v) => setContaAcesso({ ...contaAcesso, ativo: v })} 
                    />
                    <Label className="text-xs">Login Ativo (Permitir acesso)</Label>
                  </div>
                </div>
              )}
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => set("ativo", v)} />
              <Label>Cliente Ativo</Label>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={form.permitir_fiado ?? true} onCheckedChange={(v) => set("permitir_fiado", v)} />
              <Label>Permitir compra fiado (crediário)</Label>
              {form.permitir_fiado === false && (
                <Badge variant="destructive" className="text-[10px]">Restrito</Badge>
              )}
            </div>

            {form.permitir_fiado && (
              <div className="col-span-2 p-4 rounded-xl border bg-primary/5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm">Configurações de Crédito</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Limite de Crédito (R$)</Label>
                    <Input 
                      type="number" 
                      value={form.limite_credito_total} 
                      onChange={(e) => set("limite_credito_total", parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Modo de Limite</Label>
                    <Select value={form.modo_limite} onValueChange={(v) => set("modo_limite", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="automatico">Automático (Score)</SelectItem>
                        <SelectItem value="manual">Apenas Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 flex items-center gap-2 pt-2">
                    <Switch checked={form.permitir_atraso} onCheckedChange={(v) => set("permitir_atraso", v)} />
                    <div className="space-y-0.5">
                      <Label className="text-xs">Permitir novas vendas com parcelas em atraso</Label>
                      <p className="text-[10px] text-muted-foreground">O sistema respeitará a carência global (ex: 15 dias).</p>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="col-span-2 flex justify-between items-center text-xs p-2 bg-muted rounded-md">
                      <span className="text-muted-foreground">Limite Utilizado:</span>
                      <span className="font-bold text-primary">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cliente.limite_utilizado || 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
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
