import { describe, it, expect } from 'vitest';
import { getDistanceInKm } from '../lib/geocoding';

describe('Funcionalidades do Módulo de Cidades', () => {
    
  // 1. Parser Simulação (Testando a lógica usada no Configuracoes.tsx)
  const parseBulkCitiesText = (textoMassa: string) => {
    const cidadesRaw = textoMassa.split(/[\n,]/).map(t => t.trim()).filter(Boolean);
    const listaNormalizada: { cidade: string; estado: string }[] = [];
    const cacheLocal = new Set<string>();

    for (const c of cidadesRaw) {
      const parts = c.split(/[-/]/);
      let nomeCidade = parts[0].trim();
      let est = parts.length > 1 ? parts[parts.length - 1].trim().toUpperCase() : "";
      if (est.length > 2) est = "";
      
      const chaveParaCache = `${nomeCidade}-${est}`.toLowerCase();
      
      if (!cacheLocal.has(chaveParaCache)) {
        listaNormalizada.push({ cidade: nomeCidade, estado: est });
        cacheLocal.add(chaveParaCache);
      }
    }
    return listaNormalizada;
  };

  describe('Cadastro em Massa (Parser)', () => {
    it('deve extrair cidades separadas por vírgula', () => {
      const result = parseBulkCitiesText('Salvador, Feira de Santana, Amargosa');
      expect(result).toHaveLength(3);
      expect(result[0].cidade).toBe('Salvador');
      expect(result[1].cidade).toBe('Feira de Santana');
    });

    it('deve extrair cidades por linha', () => {
      const result = parseBulkCitiesText('São Paulo\nRio de Janeiro\nCuritiba');
      expect(result).toHaveLength(3);
      expect(result[2].cidade).toBe('Curitiba');
    });

    it('deve limpar espaços múltiplos e linhas vazias', () => {
      const result = parseBulkCitiesText('  Belo Horizonte  \n\n\n  ,  Manaus  ');
      expect(result).toHaveLength(2);
      expect(result[0].cidade).toBe('Belo Horizonte');
      expect(result[1].cidade).toBe('Manaus');
    });

    it('deve identificar o estado através de separadores como hífen e barra', () => {
      const result = parseBulkCitiesText('Campinas - SP, Niterói/RJ');
      expect(result).toHaveLength(2);
      expect(result[0].estado).toBe('SP');
      expect(result[1].estado).toBe('RJ');
    });

    it('deve ignorar duplicatas', () => {
      const result = parseBulkCitiesText('Salvador - BA, salvador - ba, Feira de Santana, Salvador-ba');
      expect(result).toHaveLength(2); // Pegou Feira e apagou os salvadores extras
    });
  });

  describe('Cálculo de Distância (Haversine)', () => {
    it('deve calcular a distância correta entre duas coordenadas próximas na mesma cidade (~8km)', () => {
      // Coordenadas simuladas em SP
      const lat1 = -23.5505;
      const lon1 = -46.6333; // Sé
      const lat2 = -23.6068;
      const lon2 = -46.6961; // Faria Lima
      
      const dist = getDistanceInKm(lat1, lon1, lat2, lon2);
      expect(dist).toBeGreaterThan(5);
      expect(dist).toBeLessThan(12);
    });

    it('deve retornar 0 para as mesmas coordenadas', () => {
      const lat1 = -15.7801;
      const lon1 = -47.9292;
      const dist = getDistanceInKm(lat1, lon1, lat1, lon1);
      expect(dist).toBe(0);
    });

    it('deve calcular a distância correta entre SP e RJ (~350km)', () => {
      const dist = getDistanceInKm(-23.5505, -46.6333, -22.9068, -43.1729); // SP a RJ
      expect(dist).toBeGreaterThan(300);
      expect(dist).toBeLessThan(400); // Em torno de 350km de linha reta
    });
  });

});
