import { useState, useMemo, useEffect } from "react";
import { normalizeSearch } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, Phone, ShoppingCart, Search, Filter, ExternalLink, ClipboardList, Route } from "lucide-react";
import { useRotasV2, type RotaScoreInfo } from "@/hooks/useRotasV2";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { AlertTriangle, Zap } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Helper component pra recentralizar o mapa
function ChangeMapView({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView(coords, map.getZoom());
    }
  }, [coords, map]);
  return null;
}

// Icones coloridos para o Leaflet usando DIV
const createCustomIcon = (prioridade: "Alta" | "Media" | "Baixa") => {
  const colors = {
    Alta: "bg-red-500",
    Media: "bg-yellow-500",
    Baixa: "bg-green-500",
  };
  const color = colors[prioridade] || "bg-blue-500";
  return L.divIcon({
    className: "custom-leaflet-icon",
    html: `<div class="w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center ${color}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const userIcon = L.divIcon({
  className: "custom-leaflet-icon",
  html: `<div class="w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center bg-blue-600"><div class="w-2 h-2 bg-white rounded-full"></div></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function MapaClientesPage() {
  const { data: config } = useConfiguracoes();
  const { data: scores, isLoading } = useRotasV2();
  const navigate = useNavigate();
  const [filtroPrioridade, setFiltroPrioridade] = useState<"Todas" | "Alta" | "Media" | "Baixa">("Todas");
  const [busca, setBusca] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [maxClientes, setMaxClientes] = useState(15);
  const [rotaCalculada, setRotaCalculada] = useState<RotaScoreInfo[]>([]);

  const getLocation = () => {
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoadingLocation(false);
      },
      () => setLoadingLocation(false),
      { enableHighAccuracy: true }
    );
  };

  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const clientesDisponiveis = useMemo(() => {
    if (!scores) return [];
    return scores.filter((c) => {
      if (c.latitude === null || c.longitude === null) return false;
      if (busca && !normalizeSearch(c.clienteNome).includes(normalizeSearch(busca))) return false;
      if (filtroPrioridade !== "Todas" && c.prioridade !== filtroPrioridade) return false;
      return true;
    });
  }, [scores, busca, filtroPrioridade]);

  const calcularRotaV2 = () => {
    if (!userLocation || clientesDisponiveis.length === 0) return;

    let naoVisitados = [...clientesDisponiveis];
    let route: RotaScoreInfo[] = [];
    let currentPoint = userLocation;

    while (route.length < maxClientes && naoVisitados.length > 0) {
      let maxWeight = -1;
      let nextIndex = -1;

      for (let i = 0; i < naoVisitados.length; i++) {
        const c = naoVisitados[i];
        const dist = haversine(currentPoint.lat, currentPoint.lng, c.latitude!, c.longitude!);
        const distAjustada = Math.max(dist, 1); // Evita peso infinito para < 1km
        const peso = c.score / distAjustada;

        if (peso > maxWeight) {
          maxWeight = peso;
          nextIndex = i;
        }
      }

      if (nextIndex > -1) {
        const chosen = naoVisitados[nextIndex];
        route.push(chosen);
        naoVisitados.splice(nextIndex, 1);
        currentPoint = { lat: chosen.latitude!, lng: chosen.longitude! };
      } else {
        break;
      }
    }

    setRotaCalculada(route);
  };

  const limparRota = () => setRotaCalculada([]);

  const openMapsDir = (destLat: number, destLng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`, "_blank");
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  // Stats da Rota
  const rotaTotalPendente = rotaCalculada.reduce((acc, c) => acc + c.valorEmAberto, 0);
  const rotaDistanciaTotal = useMemo(() => {
    if (rotaCalculada.length === 0 || !userLocation) return 0;
    let dist = 0;
    let curr = userLocation;
    for (const c of rotaCalculada) {
      dist += haversine(curr.lat, curr.lng, c.latitude!, c.longitude!);
      curr = { lat: c.latitude!, lng: c.longitude! };
    }
    return dist;
  }, [rotaCalculada, userLocation]);

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Roteirizador Inteligente (V2)
          </h1>
          <p className="text-sm text-muted-foreground">
            {clientesDisponiveis.length} clientes com GPS na base
          </p>
        </div>
        <Button size="sm" onClick={getLocation} disabled={loadingLocation}>
          <Navigation className="w-4 h-4 mr-1" />
          {userLocation ? "Atualizar Local" : "Minha Localização"}
        </Button>
      </div>

      {/* Painel de Controle e Filtros */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente para o mapa..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroPrioridade} onValueChange={(v: any) => setFiltroPrioridade(v)}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value="Todas">Todas Prioridades</SelectItem>
                <SelectItem value="Alta">🔴 Alta (Top 20%)</SelectItem>
                <SelectItem value="Media">🟡 Média (Prox 30%)</SelectItem>
                <SelectItem value="Baixa">🟢 Baixa (Restante)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 border border-border">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Máx. Clientes:</span>
              <Input
                type="number"
                value={maxClientes}
                onChange={(e) => setMaxClientes(Number(e.target.value) || 1)}
                className="w-16 h-8 border-none bg-transparent"
                min={1}
                max={50}
              />
            </div>
            {userLocation ? (
              <Button onClick={calcularRotaV2} className="shrink-0">
                <Route className="w-4 h-4 mr-2" />
                Gerar Rota Otimizada
              </Button>
            ) : (
              <Button disabled variant="secondary" className="shrink-0" title="Obtenha sua localização primeiro">
                <Route className="w-4 h-4 mr-2" />
                Gerar Rota Otimizada
              </Button>
            )}
            {rotaCalculada.length > 0 && (
              <Button variant="outline" onClick={limparRota}>
                Limpar Rota
              </Button>
            )}
          </div>

          {/* Resumo da Rota Se Ativa */}
          {rotaCalculada.length > 0 && (
            <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 flex flex-wrap gap-4 items-center justify-between">
               <div>
                 <p className="text-sm font-semibold text-primary">Resumo da Rota Planejada</p>
                 <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                    <span>👥 {rotaCalculada.length} Clientes</span>
                    <span>🛣️ {rotaDistanciaTotal.toFixed(1)} km est.</span>
                    <span className="font-medium text-foreground">💰 Oportunidade: {formatCurrency(rotaTotalPendente)}</span>
                 </div>
               </div>
               {/* Export to URL for maps external full route if < 15 endpoints? */}
               {rotaCalculada.length <= 15 && userLocation && (
                 <Button size="sm" variant="secondary" onClick={() => {
                   const waypoints = rotaCalculada.slice(0, rotaCalculada.length - 1).map(c => `${c.latitude},${c.longitude}`).join('|');
                   const last = rotaCalculada[rotaCalculada.length - 1];
                   window.open(`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${last.latitude},${last.longitude}&waypoints=${waypoints}`, "_blank");
                 }}>
                   Abrir no Google Maps Navegador
                 </Button>
               )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mapa Inline Interativo */}
      <div className="h-[700px] w-full rounded-xl overflow-hidden border border-border shadow-sm z-0 relative">
        {!isLoading && (
          <MapContainer 
            center={userLocation ? [userLocation.lat, userLocation.lng] : [-15.793889, -47.882778]} 
            zoom={userLocation ? 13 : 4} 
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {userLocation && <ChangeMapView coords={[userLocation.lat, userLocation.lng]} />}
            
            {/* Usuário */}
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                <Popup>Sua Posição Origem</Popup>
              </Marker>
            )}

            {/* Pins dos Clientes */}
            {(rotaCalculada.length > 0 ? rotaCalculada : clientesDisponiveis).map((c, idx) => (
              <Marker 
                key={c.clienteId} 
                position={[c.latitude!, c.longitude!]} 
                icon={createCustomIcon(c.prioridade)}
              >
                <Popup className="min-w-[200px]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">{c.clienteNome}</div>
                    {c.maxDiasAtraso > (config?.carencia_dias_atraso ?? 15) && (
                      <Badge variant="destructive" className="h-5 px-1.5 animate-pulse">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Cobrança
                      </Badge>
                    )}
                    {c.limiteDisponivel > 2000 && (
                      <Badge variant="secondary" className="h-5 px-1.5 bg-green-500/10 text-green-600 border-green-500/20">
                        <Zap className="w-3 h-3 mr-1" /> Potencial
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2 mt-1">{c.cidade}</div>
                  
                  {rotaCalculada.length > 0 && (
                     <div className="mb-2 text-xs font-semibold px-2 py-0.5 rounded border border-gray-200 inline-block">Parada #{idx + 1}</div>
                  )}

                  <div className="space-y-1 text-sm bg-muted/30 p-2 rounded">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Em Aberto:</span>
                      <span className="font-medium text-destructive">{formatCurrency(c.valorEmAberto)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">S/ Comprar:</span>
                      <span>{c.diasSemCompra === -1 ? "-" : `${c.diasSemCompra} d`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">T. Médio:</span>
                      <span>{formatCurrency(c.ticketMedio)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ped. Pendentes:</span>
                      <span className="font-medium text-primary">{c.pedidosPendentes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Limite Disponível:</span>
                      <span className="font-medium text-green-600">{formatCurrency(c.limiteDisponivel)}</span>
                    </div>
                    {c.maxDiasAtraso > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Máx. Atraso:</span>
                        <span className={`font-medium ${c.maxDiasAtraso > (config?.carencia_dias_atraso ?? 15) ? 'text-destructive' : 'text-yellow-600'}`}>
                          {c.maxDiasAtraso} dias
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between mt-2 pt-2 border-t font-semibold">
                      <span>Score de Rota:</span>
                      <span>{Math.round(c.score)} pts</span>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 h-7 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center justify-center font-medium" onClick={() => openMapsDir(c.latitude!, c.longitude!)}>
                      <Navigation className="w-3 h-3 mr-1" /> Ir
                    </button>
                    <button className="flex-1 h-7 text-xs border border-input rounded hover:bg-accent flex items-center justify-center font-medium" onClick={() => navigate(`/vendas?clienteId=${c.clienteId}`)}>
                      <ShoppingCart className="w-3 h-3 mr-1" /> Vender
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Linha da rota calculada */}
            {rotaCalculada.length > 0 && userLocation && (
              <Polyline 
                positions={[
                  [userLocation.lat, userLocation.lng], 
                  ...rotaCalculada.map((c) => [c.latitude!, c.longitude!] as [number, number])
                ]} 
                color="blue" 
                weight={3} 
                opacity={0.6}
                dashArray="5, 10" 
              />
            )}
          </MapContainer>
        )}
      </div>
      
    </div>
  );
}
