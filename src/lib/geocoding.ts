import L from "leaflet";

export function createColoredIcon(color: string) {
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: ${color || '#10b981'}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
}

export async function getCoordinatesForCity(cidade: string, estado: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Adiciona um pequeno delay para respeitar o rate limit do Nominatim (1 req/sec)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const query = encodeURIComponent(`${cidade}, ${estado}, Brazil`);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
    
    if (!response.ok) {
      console.error(`Falha ao buscar coordenadas para ${cidade}/${estado}:`, response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Erro ao buscar coordenadas para ${cidade}/${estado}:`, error);
    return null;
  }
}

// Haversine formula to calculate distance between two coordinates in km
export function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}
