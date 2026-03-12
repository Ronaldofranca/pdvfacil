import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Loader2 } from "lucide-react";
import { useUpsertCliente, useClientes, type ClienteInput } from "@/hooks/useClientes";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: any;
}

export function ClienteForm({ open, onOpenChange, cliente }: Props) {
  const { profile } = useAuth();
  const upsert = useUpsertCliente();
  const { data: todosClientes } = useClientes();
  const [gpsLoading, setGpsLoading] = useState(false);
  const [searchIndicador, setSearchIndicador] = useState("");

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    cpf_cnpj: "",
    cidade: "",
    rua: "",
    estado: "",
    cep: "",
    latitude: "",
    longitude: "",
    observacoes: "",
    ativo: true,
  });

  useEffect(() => {
    if (cliente) {
      setForm({
        nome: cliente.nome ?? "",
        telefone: cliente.telefone ?? "",
        email: cliente.email ?? "",
        cpf_cnpj: cliente.cpf_cnpj ?? "",
        cidade: cliente.cidade ?? "",
        rua: cliente.rua ?? "",
        estado: cliente.estado ?? "",
        cep: cliente.cep ?? "",
        latitude: cliente.latitude != null ? String(cliente.latitude) : "",
        longitude: cliente.longitude != null ? String(cliente.longitude) : "",
        observacoes: cliente.observacoes ?? "",
        ativo: cliente.ativo ?? true,
      });
    } else {
      setForm({ nome: "", telefone: "", email: "", cpf_cnpj: "", cidade: "", rua: "", estado: "", cep: "", latitude: "", longitude: "", observacoes: "", ativo: true });
    }
  }, [cliente, open]);

  const captureGPS = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada neste navegador");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: String(pos.coords.latitude),
          longitude: String(pos.coords.longitude),
        }));
        setGpsLoading(false);
        toast.success("Localização capturada!");
      },
      (err) => {
        setGpsLoading(false);
        toast.error(`Erro ao capturar GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const payload: ClienteInput = {
      id: cliente?.id,
      empresa_id: profile.empresa_id,
      nome: form.nome,
      telefone: form.telefone,
      email: form.email,
      cpf_cnpj: form.cpf_cnpj,
      cidade: form.cidade,
      rua: form.rua,
      estado: form.estado,
      cep: form.cep,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      observacoes: form.observacoes,
      ativo: form.ativo,
    };
    upsert.mutate(payload, { onSuccess: () => onOpenChange(false) });
  };

  const set = (field: string, value: string | boolean) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input required value={form.nome} onChange={(e) => set("nome", e.target.value)} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <Label>CPF/CNPJ</Label>
              <Input value={form.cpf_cnpj} onChange={(e) => set("cpf_cnpj", e.target.value)} />
            </div>
            <div>
              <Label>CEP</Label>
              <Input value={form.cep} onChange={(e) => set("cep", e.target.value)} placeholder="00000-000" />
            </div>
            <div className="col-span-2">
              <Label>Rua / Endereço</Label>
              <Input value={form.rua} onChange={(e) => set("rua", e.target.value)} />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={form.estado} onChange={(e) => set("estado", e.target.value)} placeholder="UF" maxLength={2} />
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
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
