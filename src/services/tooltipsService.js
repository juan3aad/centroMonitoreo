// src/services/tooltipsService.js
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/axios';

/**
 * Función de fetch para tooltips
 */
export const fetchTooltips = async () => {
  if (import.meta.env.VITE_USE_MOCK_API === 'true') {
    const response = await fetch('/mock/v1/tooltips/tooltips.json');
    const data = await response.json();
    return data;
  }
  const { data } = await apiClient.post('/v1/tooltips/tooltips');
  return data;
};

/**
 * Función de normalización de la respuesta de la API
 */
function normalizeTooltips(resTooltips) {
  const normalizedTooltips = {};
  if (Array.isArray(resTooltips)) {
    resTooltips.forEach(seccion => {
      if (seccion.elementos && Array.isArray(seccion.elementos)) {
        seccion.elementos.forEach(elemento => {
          normalizedTooltips[elemento.identificador] = elemento.Texto;
        });
      }
    });
  }
  return normalizedTooltips;
}

/**
 * Hook para obtener tooltips con React Query
 */
export const useTooltips = (options = {}) => {
  return useQuery({
    queryKey: ['tooltips'],
    queryFn: async () => {
      const data = await fetchTooltips();
      return normalizeTooltips(data);
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
  });
};

