import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin, Search, Navigation, Building2, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getDistanceInKm, createColoredIcon } from "@/lib/geocoding";
// Removed react-leaflet to use vanilla Leaflet for maximum stability
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { toast } from "sonner";

// Fix Leaflet's default icon path issues with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Consuming shared createColoredIcon from lib/geocoding.ts

// Removed MapBounds temporarily to debug react-leaflet crash

import { useRef } from "react";

export default function CidadesAtendidasPublica() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [cidades, setCidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [proximaDetectada, setProximaDetectada] = useState<any>(null);
  const [verificandoLocal, setVerificandoLocal] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await supabase
          .from("cidades_atendidas")
          .select(`
            *,
            representantes (
              nome,
              telefone,
              cor
            )
          `)
          .eq("ativa", true);
        if (error) throw error;
        setCidades(data || []);
      } catch (err) {
        console.error("Erro ao carregar cidades:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const cidadesFiltradas = cidades.filter(c => 
    c.cidade.toLowerCase().includes(busca.toLowerCase()) || 
    (c.estado && c.estado.toLowerCase().includes(busca.toLowerCase()))
  );

  const filterMarkers = busca ? cidadesFiltradas.filter(c => c.latitude && c.longitude) : cidades.filter(c => c.latitude && c.longitude);

  const handleVerificarLocalizacao = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não é suportada no seu navegador.");
      return;
    }
    setVerificandoLocal(true);
    setProximaDetectada(null);
    setBusca("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        
        // Find nearest city
        let nearest = null;
        let minDistance = Infinity;

        cidades.forEach(c => {
          if (c.latitude && c.longitude) {
            const dist = getDistanceInKm(userLat, userLon, c.latitude, c.longitude);
            if (dist < minDistance) {
              minDistance = dist;
              nearest = c;
            }
          }
        });

        // Considera "próximo" se estiver num raio de 50km
        if (nearest && minDistance <= 50) {
          setProximaDetectada({ ...nearest, dist: Math.round(minDistance) });
          toast.success(`Você está perto de ${nearest.cidade}!`);
        } else {
          toast.info("Infelizmente ainda não possuímos representantes próximos a você.");
        }
        setVerificandoLocal(false);
      },
      (error) => {
        setVerificandoLocal(false);
        toast.error("Erro ao obter localização. Permita o acesso ao tentar novamente.");
        console.error(error);
      }
    );
  };

  const handleZerarLoc = () => {
    setProximaDetectada(null);
  };

  // Vanilla Leaflet rendering
  useEffect(() => {
    if (loading || !mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([-13.0, -42.0], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;
    
    // Clear old markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const latLngs: L.LatLngTuple[] = [];

    filterMarkers.forEach(c => {
      const lat = Number(c.latitude);
      const lng = Number(c.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;
      latLngs.push([lat, lng]);

      const rep = c.representantes;
      const whatsappBtn = rep?.telefone ? `<a href="https://wa.me/55${String(rep.telefone).replace(/\D/g, '')}" target="_blank" style="display:block; background:#25D366; color:white; padding:4px 8px; font-size:12px; border-radius:4px; text-decoration:none; margin-top:4px;">WhatsApp</a>` : '';
      
      const popupHtml = `
        <div style="text-align:center; min-width:140px;">
          <h4 style="font-weight:bold; border-bottom:1px solid #ccc; padding-bottom:4px; margin-bottom:8px;">${c.cidade} ${c.estado ? `- ${c.estado}` : ''}</h4>
          ${rep ? `
            <div style="margin-bottom:8px;">
              <p style="font-size:12px; font-weight:600; margin:0;">${rep.nome}</p>
              ${whatsappBtn}
            </div>
          ` : `
            <p style="font-size:12px; color:#666; margin:0;">Atendimento direto</p>
          `}
        </div>
      `;

      L.marker([lat, lng], { icon: createColoredIcon(rep?.cor) })
        .bindPopup(popupHtml)
        .addTo(map);
    });

    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

  }, [filterMarkers, loading]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Público Simplificado */}
      <header className="bg-primary text-primary-foreground py-6 px-4 shadow-md sticky top-0 z-10">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            <h1 className="text-xl font-bold tracking-tight">Onde Estamos</h1>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/50" />
            <Input 
              className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 pl-9 w-full focus-visible:ring-primary-foreground/30 h-10" 
              placeholder="Busque por sua cidade..." 
              value={busca}
              onChange={(e) => { setBusca(e.target.value); handleZerarLoc(); }}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado Esquerdo: Ações e Lista */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Localização Aproximada</CardTitle>
              <CardDescription>Buscaremos automaticamente a cidade atendida mais próxima de você.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full gap-2" 
                onClick={handleVerificarLocalizacao}
                disabled={verificandoLocal}
              >
                <Navigation className="h-4 w-4" />
                {verificandoLocal ? "Detectando..." : "Usar minha localização atual"}
              </Button>
            </CardContent>
          </Card>

          {/* Resultado Geolocalização */}
          {proximaDetectada && (
            <Card className="border-primary border-2 bg-primary/5 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-primary flex items-center gap-2 text-md">
                  <MapPin className="h-5 w-5" /> Você está próximo de {proximaDetectada.cidade}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {proximaDetectada.representantes ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Esta região é atendida por:</p>
                    <div className="bg-background rounded-md p-3 border shadow-sm flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{proximaDetectada.representantes.nome}</p>
                        <p className="text-xs text-muted-foreground">{proximaDetectada.representantes.telefone || "Telefone não informado"}</p>
                      </div>
                      {proximaDetectada.representantes.telefone && (
                        <Button size="sm" className="gap-2" onClick={() => window.open(`https://wa.me/55${String(proximaDetectada.representantes.telefone).replace(/\D/g, '')}`, '_blank')}>
                          <Phone className="h-3.5 w-3.5" /> Falar
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    Nenhum representante oficial foi vinculado a esta cidade, mas temos atendimento para a região!
                  </p>
                )}
                <p className="text-xs text-muted-foreground text-center">a cerca de {proximaDetectada.dist}km de distância</p>
              </CardContent>
            </Card>
          )}

          {/* Lista de Cidades Encontradas */}
          <Card className="border shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{busca ? "Resultados da Busca" : "Todas as Cidades"}</span>
                <Badge variant="secondary" className="font-mono text-xs">{cidadesFiltradas.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto divide-y">
                {loading ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">Carregando cidades...</div>
                ) : cidadesFiltradas.length > 0 ? (
                  cidadesFiltradas.map((c) => {
                    const rep = c.representantes;
                    return (
                      <div key={c.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-sm">{c.cidade} {c.estado && `- ${c.estado}`}</h3>
                        </div>
                        {rep ? (
                          <div className="pl-6 mt-2 flex items-center justify-between gap-2">
                             <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: rep.cor || "#10b981" }} />
                               <span>Rep: {rep.nome}</span>
                             </div>
                             {rep.telefone && (
                               <a 
                                href={`https://wa.me/55${String(rep.telefone).replace(/\D/g, '')}`} 
                                target="_blank" 
                                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md transition-colors"
                               >
                                 WhatsApp
                               </a>
                             )}
                          </div>
                        ) : (
                          <p className="pl-6 text-xs text-muted-foreground mt-1">Atendimento direto</p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center">
                     <p className="text-sm text-muted-foreground mb-2">Sua cidade não apareceu?</p>
                     <p className="text-xs">Entre em contato via WhatsApp e consulte a disponibilidade de frete.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lado Direito: Mapa */}
        <div className="lg:col-span-2 h-[70vh] min-h-[500px] bg-white rounded-xl shadow-md border overflow-hidden relative z-0">
           {loading ? (
             <div className="flex items-center justify-center h-full w-full bg-slate-50 text-muted-foreground">
               <p>Carregando mapa...</p>
             </div>
           ) : (
             <div ref={mapContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
           )}
        </div>
      </main>
    </div>
  );
}
