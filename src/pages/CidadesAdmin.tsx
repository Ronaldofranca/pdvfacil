import { useState, useRef, useEffect, useMemo } from "react";
import L from "leaflet";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Compass, MapPin, Plus, Shield, Trash2 } from "lucide-react";
import {
  useCidadesAtendidas, useAddCidade, useAddCidadesMassa, useDeleteCidade, useUpdateCidade,
  useRepresentantes, useAddRepresentante, useUpdateRepresentante, useDeleteRepresentante,
} from "@/hooks/useConfiguracoes";
import { getDistanceInKm, createColoredIcon, getCityFromCoordinates } from "@/lib/geocoding";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";

export default function CidadesAdmin() {
  return (
    <div className="flex-1 p-8 pt-6 space-y-6 bg-slate-50/50 min-h-[calc(100vh-64px)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Compass className="w-8 h-8 text-primary" />
            Cidades e Regiões
          </h2>
          <p className="text-muted-foreground mt-1">
            Gerencie as cidades atendidas e os representantes comerciais.
          </p>
        </div>
      </div>

      <Tabs defaultValue="cidades" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cidades">Cidades Atendidas</TabsTrigger>
          <TabsTrigger value="representantes">Representantes</TabsTrigger>
        </TabsList>

        <TabsContent value="cidades">
          <Card>
            <CardHeader>
              <CardTitle>Cidades Atendidas</CardTitle>
              <CardDescription>Gerencie as cidades onde os representantes atuam</CardDescription>
            </CardHeader>
            <CardContent>
              <CidadesMassaManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="representantes">
          <Card>
            <CardHeader>
              <CardTitle>Representantes Comerciais</CardTitle>
              <CardDescription>Membresia de área de atendimento no mapa</CardDescription>
            </CardHeader>
            <CardContent>
              <RepresentantesManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
function RepresentantesManager() {
  const { data: representantes } = useRepresentantes();
  const addRepresentante = useAddRepresentante();
  const updateRepresentante = useUpdateRepresentante();
  const deleteRepresentante = useDeleteRepresentante();
  
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", email: "", cor: "#3b82f6" });

  const handleAdd = () => {
    if (!form.nome) return;
    addRepresentante.mutate(form, {
      onSuccess: () => {
        setForm({ nome: "", telefone: "", email: "", cor: "#3b82f6" });
        setShowForm(false);
      }
    });
  };

  const formatPhone = (val: string) => {
    const v = val.replace(/\D/g, "");
    if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
    return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "").slice(0, 15);
  };

  const CORES = ["#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6", "#6366f1"];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Cadastre os representantes para mostrá-los no mapa público das cidades atendidas.</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Representante
        </Button>
      </div>

      {showForm && (
        <Card className="border-dashed">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome *</Label>
                <Input placeholder="Ex: João Silva" value={form.nome} onChange={(e) => setForm(p => ({ ...p, nome: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">WhatsApp / Telefone</Label>
                <Input placeholder="Ex: (11) 99999-9999" value={form.telefone} onChange={(e) => setForm(p => ({ ...p, telefone: formatPhone(e.target.value) }))} maxLength={15} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input placeholder="Ex: joao@email.com" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cor no Mapa</Label>
                <div className="flex gap-2">
                  {CORES.map(c => (
                    <button key={c} className={cn("w-8 h-8 rounded-full border-2 transition-all", form.cor === c ? "border-foreground scale-110" : "border-transparent")} style={{ backgroundColor: c }} onClick={() => setForm(p => ({ ...p, cor: c }))} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleAdd} disabled={addRepresentante.isPending}>{addRepresentante.isPending ? "Salvando..." : "Salvar Representante"}</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {representantes && representantes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {representantes.map(rep => (
            <Card key={rep.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: rep.cor }} />
                  <div>
                    <h4 className={cn("text-sm font-semibold", !rep.ativo && "line-through text-muted-foreground")}>{rep.nome}</h4>
                    <p className="text-xs text-muted-foreground">{rep.telefone || "Sem telefone"}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateRepresentante.mutate({ id: rep.id, ativo: !rep.ativo })} title={rep.ativo ? "Desativar" : "Ativar"}>
                    <Shield className={cn("h-3 w-3", !rep.ativo && "text-muted-foreground")} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteRepresentante.mutate(rep.id)} title="Excluir">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">Nenhum representante cadastrado.</p>
        </div>
      )}
    </div>
  );
}

// Sub-component for Cidades com cadastro em massa e geocoding
import { getCoordinatesForCity } from "@/lib/geocoding";

function CidadesMassaManager() {
  const { profile } = useAuth();
  const { data: cidades } = useCidadesAtendidas();
  const { data: representantes } = useRepresentantes();
  const addCidades = useAddCidadesMassa();
  const updateCidade = useUpdateCidade();
  const deleteCidade = useDeleteCidade();
  const addCidadesMassa = useAddCidadesMassa();

  const [textoMassa, setTextoMassa] = useState("");
  const [representanteSelecionado, setRepresentanteSelecionado] = useState("nenhum");
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });
  const [filtroRep, setFiltroRep] = useState<string>("todos");
  
  // Estados para adição manual
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualLocation, setManualLocation] = useState<{ lat: number; lng: number } | null>(null);

  const addCidade = useAddCidade();
  
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  
  // Refs para controle de zoom inteligente
  const hasZoomedRef = useRef(false);
  const lastFiltroRef = useRef(filtroRep);

  const filteredCidades = useMemo(() => {
    return cidades?.filter(c => {
      if (filtroRep === "todos") return true;
      if (filtroRep === "nenhum") return !c.representante_id;
      return c.representante_id === filtroRep;
    });
  }, [cidades, filtroRep]);

  // Mapa de visão geral na administração
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([-15.78, -47.92], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapRef.current);
      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    const map = mapRef.current;
    const layerGroup = markersLayerRef.current;

    if (!layerGroup) return;
    layerGroup.clearLayers();

    const latLngs: L.LatLngTuple[] = [];

    filteredCidades?.forEach(c => {
      const lat = Number(c.latitude);
      const lng = Number(c.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;
      latLngs.push([lat, lng]);

      const rep = c.representantes as any;
      
      const marker = L.marker([lat, lng], { 
        icon: createColoredIcon(rep?.cor) 
      }).bindPopup(`<strong>${c.cidade}</strong><br/>Rep: ${rep?.nome || 'Nenhum'}<br/><span style="font-size:10px; color:#666;">Clique Direito para Atribuir</span>`);
      
      // Menu de contexto no marcador (clique direito)
      marker.on('contextmenu', (e) => {
        const popupContent = document.createElement('div');
        popupContent.className = 'flex flex-col gap-1 min-w-[150px] p-1';
        
        const title = document.createElement('p');
        title.innerText = `Atribuir ${c.cidade} a:`;
        title.className = 'text-[11px] font-bold border-b pb-1 mb-1';
        popupContent.appendChild(title);

        // Opção Desvincular
        const btnNone = document.createElement('button');
        btnNone.innerText = "Nenhum (Desvincular)";
        btnNone.className = 'text-[10px] text-left hover:bg-slate-100 px-2 py-1 rounded';
        btnNone.onclick = () => { updateCidade.mutate({ id: c.id, representante_id: null }); map.closePopup(); };
        popupContent.appendChild(btnNone);

        // Lista de reps
        representantes?.forEach((r: any) => {
          const btn = document.createElement('button');
          btn.innerHTML = `<div style="display:flex; align-items:center; gap:6px;"><div style="width:8px; height:8px; border-radius:50%; background-color:${r.cor};"></div> ${r.nome}</div>`;
          btn.className = 'text-[10px] text-left hover:bg-slate-100 px-2 py-1 rounded transition-colors';
          btn.onclick = () => { updateCidade.mutate({ id: c.id, representante_id: r.id }); map.closePopup(); };
          popupContent.appendChild(btn);
        });

        const popup = L.popup()
          .setLatLng(e.latlng)
          .setContent(popupContent)
          .openOn(map);
      });

      layerGroup.addLayer(marker);
    });

    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      if (bounds.isValid()) {
        // Só faz o fitBounds automático na primeira carga ou se o filtro de representante mudar
        const deveFocar = !hasZoomedRef.current || lastFiltroRef.current !== filtroRep;
        
        if (deveFocar) {
          map.fitBounds(bounds, { padding: [30, 30] });
          hasZoomedRef.current = true;
          lastFiltroRef.current = filtroRep;
        }
      }
    }

    // Clique direito no MAPA (não apenas no marcador) para achar a cidade mais próxima
    map.on('contextmenu', (e) => {
      if (!filteredCidades || filteredCidades.length === 0) return;

      let nearestCity = null;
      let minDistance = 30; // Raio máximo de 30km para o "clique" funcionar

      filteredCidades.forEach(c => {
        if (!c.latitude || !c.longitude) return;
        const d = getDistanceInKm(e.latlng.lat, e.latlng.lng, Number(c.latitude), Number(c.longitude));
        if (d < minDistance) {
          minDistance = d;
          nearestCity = c;
        }
      });

      if (nearestCity) {
        const c = nearestCity as any;
        const popupContent = document.createElement('div');
        popupContent.className = 'flex flex-col gap-1 min-w-[150px] p-1';
        
        const title = document.createElement('p');
        title.innerHTML = `Vincular <strong>${c.cidade}</strong> a:`; // Mostra qual cidade ele achou perto
        title.className = 'text-[11px] border-b pb-1 mb-1';
        popupContent.appendChild(title);

        const btnNone = document.createElement('button');
        btnNone.innerText = "Nenhum (Desvincular)";
        btnNone.className = 'text-[10px] text-left hover:bg-slate-100 px-2 py-1 rounded';
        btnNone.onclick = () => { updateCidade.mutate({ id: c.id, representante_id: null }); map.closePopup(); };
        popupContent.appendChild(btnNone);

        representantes?.forEach((r: any) => {
          const btn = document.createElement('button');
          btn.innerHTML = `<div style="display:flex; align-items:center; gap:6px;"><div style="width:8px; height:8px; border-radius:50%; background-color:${r.cor};"></div> ${r.nome}</div>`;
          btn.className = 'text-[10px] text-left hover:bg-slate-100 px-2 py-1 rounded transition-colors';
          btn.onclick = () => { updateCidade.mutate({ id: c.id, representante_id: r.id }); map.closePopup(); };
          popupContent.appendChild(btn);
        });

        L.popup()
          .setLatLng(e.latlng)
          .setContent(popupContent)
          .openOn(map);
      }
    });

    // Clique no mapa para adição manual
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      // Usamos uma ref ou checamos o estado atual através de um hack de evento se necessário, 
      // mas como o useEffect roda quando estados mudam, o listener será Re-adicionado.
      // No entanto, para evitar problemas de closure, vamos usar a verificação do estado.
    };

    map.on('click', (e) => {
      // Verificamos se o modo manual está ativo via classe no container ou similar se preferir,
      // mas aqui vamos re-acessar o estado via closure (o useEffect rodará novamente quando isAddingManual mudar)
      if (mapContainerRef.current?.classList.contains('cursor-crosshair')) {
        setManualLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
        setIsAddingManual(false);
      }
    });

    // Atualiza o cursor do mapa
    if (isAddingManual) {
      mapContainerRef.current?.classList.add('cursor-crosshair');
    } else {
      mapContainerRef.current?.classList.remove('cursor-crosshair');
    }

  }, [filteredCidades, isAddingManual, representantes]);

  const handleProcessMassa = async () => {
    if (!textoMassa.trim()) return;

    // Parser: divide por vírgula ou quebra de linha
    const cidadesRaw = textoMassa.split(/[\n,]/).map(t => t.trim()).filter(Boolean);
    const listaNormalizada: { cidade: string; estado: string }[] = [];

    // Remove duplicates based on array
    const cacheLocal = new Set<string>();

    for (const c of cidadesRaw) {
      // Tenta achar estado no formato "Cidade - UF" ou "Cidade/UF"
      const parts = c.split(/[-/]/);
      let nomeCidade = parts[0].trim();
      let est = parts.length > 1 ? parts[parts.length - 1].trim().toUpperCase() : "";
      
      if (est.length > 2) est = ""; // Ignora se não parecer sigla
      
      const chaveParaCache = `${nomeCidade}-${est}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      
      // Checa duplicidade com existentes ignorando acentos
      const jaExisteNoBanco = cidades?.some(existente => {
        const existenteNormalizada = `${existente.cidade}-${existente.estado || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return existenteNormalizada === chaveParaCache;
      });

      if (!cacheLocal.has(chaveParaCache) && !jaExisteNoBanco) {
        listaNormalizada.push({ cidade: nomeCidade, estado: est });
        cacheLocal.add(chaveParaCache);
      }
    }

    if (listaNormalizada.length === 0) {
      toast.error("Nenhuma cidade nova válida identificada ou todas já cadastradas.");
      return;
    }

    setProcessando(true);
    setProgresso({ atual: 0, total: listaNormalizada.length });
    
    const finalData = [];
    const rep_id = representanteSelecionado !== "nenhum" ? representanteSelecionado : null;

    for (let i = 0; i < listaNormalizada.length; i++) {
        setProgresso(p => ({ ...p, atual: i }));
        const coords = await getCoordinatesForCity(listaNormalizada[i].cidade, listaNormalizada[i].estado);
        finalData.push({
            cidade: listaNormalizada[i].cidade,
            estado: listaNormalizada[i].estado || "",
            representante_id: rep_id,
            latitude: coords ? coords.latitude : null,
            longitude: coords ? coords.longitude : null,
            ativa: true
        });
    }

    setProgresso(p => ({ ...p, atual: listaNormalizada.length }));
    addCidadesMassa.mutate(finalData, {
      onSuccess: () => {
        setTextoMassa("");
        setProcessando(false);
      },
      onError: () => setProcessando(false)
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Adicionar Cidades (Em massa)</Label>
            <p className="text-xs text-muted-foreground">Cole de uma planilha, digite uma cidade por linha ou separadas por vírgula. Ex: São Paulo - SP, Rio de Janeiro - RJ.</p>
            <textarea
              className="w-full flex min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="São Paulo&#10;Salvador&#10;Feira de Santana&#10;Amargosa"
              value={textoMassa}
              onChange={(e) => setTextoMassa(e.target.value)}
              disabled={processando}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1 w-full">
              <Label className="text-sm">Vincular Representante (Opcional)</Label>
              <Select value={representanteSelecionado} onValueChange={setRepresentanteSelecionado} disabled={processando}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um representante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum (Deixar sem representante)</SelectItem>
                  {representantes?.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex items-center gap-2">
                         <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.cor }} />
                         {r.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleProcessMassa} disabled={processando || !textoMassa.trim()}>
              {processando ? `Aguarde... ${progresso.atual}/${progresso.total}` : "Salvar Cidades"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="pt-4 border-t space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Cidades Cadastradas ({cidades?.length || 0})</h3>
            <p className="text-xs text-muted-foreground font-medium">Use o mapa para conferir se todas as cidades estão na região correta.</p>
          </div>
          
          <div className="w-full sm:w-64 space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Filtrar Mapa e Lista</Label>
            <Select value={filtroRep} onValueChange={setFiltroRep}>
              <SelectTrigger className="h-8 text-xs bg-muted/30">
                <SelectValue placeholder="Todos os representantes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os representantes</SelectItem>
                <SelectItem value="nenhum">Sem representante</SelectItem>
                {representantes?.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-3">
             <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto p-1 pr-2">
                {filteredCidades?.map((c) => {
                  const rep = c.representantes as any;
                  const faltaCoordenada = !c.latitude || !c.longitude;
                  
                  return (
                    <ContextMenu key={c.id}>
                      <ContextMenuTrigger>
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className={cn("inline-flex items-center rounded-md border text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 gap-1.5 py-1.5 px-2.5 shadow-sm", faltaCoordenada && "border-amber-300 bg-amber-50 text-amber-900 shadow-amber-100")}>
                              {rep && <div className="w-2 h-2 rounded-full ring-1 ring-black/10" style={{ backgroundColor: rep.cor || "#10b981" }} />}
                              {!rep && <div className="w-2 h-2 rounded-full bg-muted-foreground ring-1 ring-black/10" />}
                              <span>
                                {c.cidade}{c.estado ? ` - ${c.estado}` : ""}
                              </span>
                              {faltaCoordenada && <span className="text-[10px] ml-1 text-amber-700" title="Sem GPS">⚠️</span>}
                            </button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar {c.cidade} {c.estado}</DialogTitle>
                              <DialogDescription>
                                Vincule a um representante ou informe a coordenada geográfica caso a busca automática não tenha achado.
                              </DialogDescription>
                            </DialogHeader>
                            <EditarCidadeModal cidade={c} representantes={representantes} />
                          </DialogContent>
                        </Dialog>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-56">
                        <ContextMenuLabel>Vincular a:</ContextMenuLabel>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => updateCidade.mutate({ id: c.id, representante_id: null })}>
                          Desvincular (Nenhum)
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        {representantes?.map((r) => (
                          <ContextMenuItem key={r.id} onClick={() => updateCidade.mutate({ id: c.id, representante_id: r.id })}>
                            <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.cor }} />
                               {r.nome}
                            </div>
                          </ContextMenuItem>
                        ))}
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
                {(!filteredCidades || filteredCidades.length === 0) && (
                  <p className="text-sm text-muted-foreground">Nenhuma cidade encontrada para este filtro.</p>
                )}
             </div>
          </div>

          <div className="lg:col-span-3 h-[400px] rounded-xl border border-border shadow-sm overflow-hidden bg-slate-50 relative z-0">
             <div ref={mapContainerRef} className="h-full w-full" />
             
             {/* Botão de Modo Manual */}
             <div className="absolute top-2 left-12 z-[400]">
                <Button 
                  size="sm" 
                  variant={isAddingManual ? "destructive" : "secondary"}
                  className="shadow-md gap-2 h-9"
                  onClick={() => setIsAddingManual(!isAddingManual)}
                >
                  {isAddingManual ? (
                    <> <span className="animate-pulse">●</span> Cancelar Seleção </>
                  ) : (
                    <> 📍 Marcar Ponto Manual </>
                  )}
                </Button>
                {isAddingManual && (
                  <div className="mt-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded-md animate-bounce shadow-lg">
                    Clique em qualquer lugar do mapa
                  </div>
                )}
             </div>

             <div className="absolute top-2 right-2 z-[400] bg-white/90 backdrop-blur-sm p-2 rounded shadow-sm text-[10px] border">
               <p className="font-bold mb-1">Legenda</p>
               <div className="space-y-1">
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /> Sem GPS</div>
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-400" /> Sem Rep</div>
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Ativa</div>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Modal de Criação Manual */}
      {manualLocation && (
        <NovaCidadeManualModal 
          location={manualLocation} 
          representantes={representantes} 
          onClose={() => setManualLocation(null)}
          onSave={(data) => {
            addCidade.mutate(data);
            setManualLocation(null);
          }}
        />
      )}
    </div>
  );
}

// Sub-componente para o Modal de Nova Cidade
function NovaCidadeManualModal({ 
  location, 
  representantes, 
  onClose, 
  onSave 
}: { 
  location: { lat: number; lng: number }; 
  representantes: any[]; 
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [nome, setNome] = useState("");
  const [estado, setEstado] = useState("");
  const [repId, setRepId] = useState("nenhum");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function detect() {
      setLoading(true);
      const cityData = await getCityFromCoordinates(location.lat, location.lng);
      if (cityData) {
        setNome(cityData.cidade);
        setEstado(cityData.estado);
      }
      setLoading(false);
    }
    detect();
  }, [location]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>Nova Cidade no Mapa</DialogTitle>
            <DialogDescription>
              {loading ? "Identificando localidade..." : "Confirme o nome e o representante para o ponto selecionado."}
            </DialogDescription>
          </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Nome da Cidade</Label>
            <Input 
              placeholder="Ex: Ponto de Apoio BR-116" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)} 
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Estado (UF)</Label>
              <Input 
                placeholder="BA" 
                maxLength={2} 
                value={estado} 
                onChange={(e) => setEstado(e.target.value.toUpperCase())} 
              />
            </div>
            <div className="grid gap-2">
              <Label>Representante</Label>
              <Select value={repId} onValueChange={setRepId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Sem representante</SelectItem>
                  {representantes?.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="bg-muted/50 p-2 rounded text-[10px] space-y-1">
             <p><strong>Latitude:</strong> {location.lat.toFixed(6)}</p>
             <p><strong>Longitude:</strong> {location.lng.toFixed(6)}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave({ cidade: nome, estado, representante_id: repId, latitude: location.lat, longitude: location.lng })} disabled={!nome.trim()}>
            Salvar Cidade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditarCidadeModal({ cidade, representantes }: { cidade: any; representantes: any[] }) {
  const updateCidade = useUpdateCidade();
  const deleteCidade = useDeleteCidade();
  
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [nome, setNome] = useState(cidade.cidade || "");
  const [estado, setEstado] = useState(cidade.estado || "");
  const [repId, setRepId] = useState(cidade.representante_id || "nenhum");
  const [lat, setLat] = useState(cidade.latitude?.toString() || "");
  const [lng, setLng] = useState(cidade.longitude?.toString() || "");
  const [buscando, setBuscando] = useState(false);

  const handleUpdateLocation = async (newLat: number, newLng: number) => {
    setLat(newLat.toFixed(6));
    setLng(newLng.toFixed(6));
    
    setBuscando(true);
    const cityData = await getCityFromCoordinates(newLat, newLng);
    if (cityData) {
      if (!nome) setNome(cityData.cidade);
      if (!estado) setEstado(cityData.estado);
      
      // Se já houver nome mas for diferente do detectado, talvez perguntar ou apenas logar
      // Para ser amigável, vamos sugerir no placeholder ou apenas avisar
      toast.info(`Localização detectada: ${cityData.cidade} - ${cityData.estado}`, { duration: 3000 });
    }
    setBuscando(false);
  };

  // Inicializa mapa para ajuste manual
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialLat = parseFloat(lat) || -13.0; // Bahia default if null
    const initialLng = parseFloat(lng) || -42.0;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([initialLat, initialLng], 7);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Se já tinha marcador, remove pra atualizar
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    // Cria marcador arrastável
    const marker = L.marker([initialLat, initialLng], { 
      draggable: true,
      icon: createColoredIcon(representantes.find(r => r.id === repId)?.cor)
    }).addTo(map);

    markerRef.current = marker;

    // Atualiza estados ao arrastar
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      handleUpdateLocation(pos.lat, pos.lng);
    });

    // Permitir clique no mapa para mover
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      handleUpdateLocation(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      // Cleanup não necessário aqui pois o Dialog desmonta o conteúdo
    };
  }, [repId]); // Regera marcador se mudar rep (pra mudar cor)

  const handleSave = () => {
    updateCidade.mutate({
      id: cidade.id,
      cidade: nome,
      estado: estado,
      representante_id: repId === "nenhum" ? null : repId,
      latitude: lat ? parseFloat(lat) : null,
      longitude: lng ? parseFloat(lng) : null
    });
  };

  return (
    <div className="space-y-4 pt-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Cidade</Label>
            <div className="relative">
              <Input placeholder="Ex: Salvador" value={nome} onChange={(e) => setNome(e.target.value)} className={cn(buscando && "opacity-50")} />
              {buscando && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
             <div className="space-y-2 col-span-1">
                <Label>UF</Label>
                <Input placeholder="BA" maxLength={2} value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase())} />
             </div>
             <div className="space-y-2 col-span-2">
                <Label>Representante</Label>
                <Select value={repId} onValueChange={setRepId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    {representantes?.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Latitude</Label>
              <Input placeholder="Ex: -13.8643" value={lat} onChange={(e) => setLat(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Longitude</Label>
              <Input placeholder="Ex: -40.0827" value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
          </div>

          <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
             <p className="text-[11px] text-amber-800 leading-tight">
               <strong>Dica:</strong> Você pode arrastar o pino ou clicar no mapa para reposicionar. O sistema tentará identificar o nome da cidade automaticamente.
             </p>
          </div>
        </div>

        <div className="h-[250px] rounded-lg border overflow-hidden bg-slate-100 relative shadow-inner">
           <div ref={mapContainerRef} className="h-full w-full z-0" />
        </div>
      </div>

      <div className="flex justify-between pt-4 mt-2 border-t">
         <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => deleteCidade.mutate(cidade.id)}>
           <Trash2 className="h-4 w-4 mr-2" />Excluir
         </Button>
         <Button size="sm" onClick={handleSave} disabled={updateCidade.isPending || buscando}>
           {updateCidade.isPending ? "Salvando..." : "Confirmar Alterações"}
         </Button>
      </div>
    </div>
  );
}
