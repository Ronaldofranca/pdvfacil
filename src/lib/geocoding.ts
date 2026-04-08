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

export async function getCityFromCoordinates(lat: number, lng: number): Promise<{ cidade: string; estado: string } | null> {
  try {
    // Respeita o rate limit do Nominatim
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
    
    if (!response.ok) {
      console.error(`Falha no reverse geocoding para ${lat}/${lng}:`, response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data && data.address) {
      const addr = data.address;
      // Nominatim retorna cidade em vários campos dependendo da região (city, town, village, hamlet)
      const cidade = addr.city || addr.town || addr.village || addr.hamlet || addr.municipality || "";
      const estado = addr.state_code || addr.state || "";
      
      // Mapeia nomes de estados para siglas se necessário (Nominatim às vezes traz o nome cheio)
      const estadosBase: Record<string, string> = {
        'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM', 'Bahia': 'BA', 'Ceará': 'CE',
        'Distrito Federal': 'DF', 'Espírito Santo': 'ES', 'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT',
        'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
        'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
        'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
        'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO'
      };

      let uf = estado;
      if (estado.length > 2 && estadosBase[estado]) {
        uf = estadosBase[estado];
      }

      return {
        cidade,
        estado: uf.toUpperCase().slice(0, 2)
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Erro no reverse geocoding:`, error);
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
