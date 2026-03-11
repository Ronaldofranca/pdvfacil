import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, Phone, ShoppingCart, AlertTriangle, Search, Filter, ExternalLink } from "lucide-react";
import { useClientes } from "@/hooks/useClientes";
import { useClienteScores, type ClienteScore } from "@/hooks/useClienteScore";
import { useNavigate } from "react-router-dom";

type Filtro = "todos" | "proximos" | "vencidas" | "inativos" | "vip";

export default function MapaClientesPage() {
  const { data: clientes, isLoading } = useClientes();
  const { data: scores } = useClienteScores();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

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
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const scoreMap = new Map<string, ClienteScore>();
  (scores || []).forEach((s) => scoreMap.set(s.clienteId, s));

  const clientesComGeo = (clientes || []).filter((c: any) => c.latitude && c.longitude);
  const clientesFiltrados = clientesComGeo
    .map((c: any) => {
      const score = scoreMap.get(c.id);
      const distancia = userLocation
        ? haversine(userLocation.lat, userLocation.lng, c.latitude!, c.longitude!)
        : null;
      return { ...c, score, distancia };
    })
    .filter((c: any) => {
      if (busca && !c.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      if (filtro === "vip") return c.score?.classificacao === "VIP";
      if (filtro === "proximos") return c.distancia !== null && c.distancia <= 10;
      if (filtro === "inativos") return c.score?.classificacao === "Risco" || c.score?.classificacao === "Comum";
      if (filtro === "vencidas") return (c.score?.parcelasVencidas ?? 0) > 0;
      return true;
    })
    .sort((a: any, b: any) => {
      if (a.distancia !== null && b.distancia !== null) return a.distancia - b.distancia;
      return 0;
    });

  const openMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  };

  const gerarRota = () => {
    if (clientesFiltrados.length === 0) return;
    const waypoints = clientesFiltrados
      .slice(0, 10)
      .map((c: any) => `${c.latitude},${c.longitude}`)
      .join("|");
    const dest = clientesFiltrados[clientesFiltrados.length > 1 ? 1 : 0];
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${userLocation?.lat ?? ""},${userLocation?.lng ?? ""}&destination=${dest.latitude},${dest.longitude}&waypoints=${waypoints}`,
      "_blank"
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Mapa de Clientes
          </h1>
          <p className="text-sm text-muted-foreground">{clientesComGeo.length} clientes com localização</p>
        </div>
        <Button size="sm" onClick={getLocation} disabled={loadingLocation}>
          <Navigation className="w-4 h-4 mr-1" />
          {loadingLocation ? "Localizando..." : userLocation ? "Atualizar" : "Minha Localização"}
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="proximos">Próximos (10km)</SelectItem>
            <SelectItem value="vencidas">Com Parcelas Vencidas</SelectItem>
            <SelectItem value="inativos">Inativos</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Gerar rota */}
      {userLocation && clientesFiltrados.length > 0 && (
        <Button onClick={gerarRota} className="w-full h-12 text-base rounded-xl">
          <Navigation className="w-5 h-5 mr-2" />
          Gerar Rota de Visitas ({Math.min(clientesFiltrados.length, 10)} clientes)
        </Button>
      )}

      {/* Lista de clientes */}
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : clientesFiltrados.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</p>
        ) : (
          clientesFiltrados.map((c: any) => (
            <Card key={c.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground truncate">{c.nome}</p>
                      {c.score && (
                        <Badge
                          variant={c.score.classificacao === "VIP" ? "default" : c.score.classificacao === "Risco" ? "destructive" : "secondary"}
                          className="text-[10px] shrink-0"
                        >
                          {c.score.classificacao} ({c.score.score})
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.cidade}{c.estado ? `, ${c.estado}` : ""}
                    </p>
                    {c.distancia !== null && (
                      <p className="text-xs text-primary font-medium mt-0.5">
                        📍 {c.distancia.toFixed(1)} km de distância
                      </p>
                    )}
                    {(c.score?.parcelasVencidas ?? 0) > 0 && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        {c.score.parcelasVencidas} parcela(s) vencida(s)
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => openMaps(c.latitude, c.longitude)}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    {c.telefone && (
                      <Button size="icon" variant="outline" className="h-8 w-8" asChild>
                        <a href={`tel:${c.telefone}`}><Phone className="w-3.5 h-3.5" /></a>
                      </Button>
                    )}
                    <Button size="icon" variant="default" className="h-8 w-8" onClick={() => navigate(`/vendas?clienteId=${c.id}`)}>
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
