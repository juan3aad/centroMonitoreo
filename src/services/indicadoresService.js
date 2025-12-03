// src/services/indicadoresService.js
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/axios';

/**
 * Funciones de fetch para Indicadores 6GW
 */
export const fetchIndicadores6GW = async () => {
  if (import.meta.env.VITE_USE_MOCK_API === 'true') {
    const response = await fetch('/mock/v1/indicadores/6g_proyecto.json');
    const data = await response.json();
    return data;
  }
  const { data } = await apiClient.post('/v1/indicadores/6g_proyecto');
  return data;
};

export const fetchTransmisionData = async () => {
  const { data } = await apiClient.post(
    '/v1/indicadores/transmision/indicadores_proyectos_transmision'
  );
  return data;
};

export const fetchIndicadoresEnergia = async (params = {}) => {
  const { data } = await apiClient.post('/v1/indicadores/energia_electrica', params);
  return data;
};

export const fetchIndicadoresRegionalesHidrologia = async () => {
  const { data } = await apiClient.post('/v1/indicadores/hidrologia/indicadores_regionales');
  return data;
};

export const fetchHidrologiaConsolidado = async () => {
  const { data } = await apiClient.post('/v1/indicadores/hidrologia/indicadores_expander_embalses_consolidado');
  return data;
};

export const fetchHidrologiaEmbalses = async () => {
  if (import.meta.env.VITE_USE_MOCK_API === 'true') {
    const response = await fetch('/mock/v1/hidrologia/indicadores_expander_embalses.json');
    const data = await response.json();
    return data;
  }
  const { data } = await apiClient.post('/v1/indicadores/hidrologia/indicadores_expander_embalses');
  return data;
};

export const fetchHidrologiaAportes = async () => {
  if (import.meta.env.VITE_USE_MOCK_API === 'true') {
    const response = await fetch('/mock/v1/hidrologia/indicadores_expander_embalses_aportes.json');
    const data = await response.json();
    return data;
  }
  const { data } = await apiClient.post('/v1/indicadores/hidrologia/indicadores_expander_embalses_aportes');
  return data;
};

export const fetchHidrologiaHidraulicos = async () => {
  const apiHidro = import.meta.env.VITE_API_HIDRO;
  
  // Si hay variable de entorno, usar URL absoluta con fetch directo
  if (apiHidro && apiHidro.startsWith('http')) {
    const response = await fetch(apiHidro, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
  
  // Si no hay variable de entorno, usar apiClient con path relativo
  const { data } = await apiClient.post('/v1/indicadores/hidrologia/indicadores_hidraulicos');
  return data;
};

export const fetchHidrologiaGeneracion = async () => {
  const apiGeneracion = import.meta.env.VITE_API_HIDRO_GENERACION;
  
  // Si hay variable de entorno, usar URL absoluta con fetch directo
  if (apiGeneracion && apiGeneracion.startsWith('http')) {
    const response = await fetch(apiGeneracion, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
  
  // Si no hay variable de entorno, usar apiClient con path relativo
  const { data } = await apiClient.post('/v1/indicadores/hidrologia/indicadores_generacion_sin');
  return data;
};

export const fetchHidrologiaPrecios = async () => {
  const apiPrecios = import.meta.env.VITE_API_HIDRO_PRECIOS;
  
  // Si hay variable de entorno, usar URL absoluta con fetch directo
  if (apiPrecios && apiPrecios.startsWith('http')) {
    const response = await fetch(apiPrecios, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
  
  // Si no hay variable de entorno, usar apiClient con path relativo
  const { data } = await apiClient.post('/v1/indicadores/hidrologia/indicadores_precios_energia');
  return data;
};

/**
 * Hooks de React Query para Indicadores
 */
export const useIndicadores6GW = (options = {}) => {
  return useQuery({
    queryKey: ['indicadores', '6gw'],
    queryFn: fetchIndicadores6GW,
    staleTime: 15 * 60 * 1000,
    ...options,
  });
};

export const useTransmisionData = (options = {}) => {
  return useQuery({
    queryKey: ['transmision', 'indicadores'],
    queryFn: fetchTransmisionData,
    staleTime: 15 * 60 * 1000,
    ...options,
  });
};

export const useIndicadoresEnergia = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['indicadores', 'energia', params],
    queryFn: () => fetchIndicadoresEnergia(params),
    staleTime: 15 * 60 * 1000,
    enabled: !!(params.fecha_inicio && params.fecha_fin),
    ...options,
  });
};

export const useIndicadoresRegionalesHidrologia = (options = {}) => {
  return useQuery({
    queryKey: ['indicadores', 'hidrologia', 'regionales'],
    queryFn: fetchIndicadoresRegionalesHidrologia,
    staleTime: 15 * 60 * 1000,
    ...options,
  });
};

export const useHidrologiaConsolidado = (options = {}) => {
  return useQuery({
    queryKey: ['indicadores', 'hidrologia', 'consolidado'],
    queryFn: fetchHidrologiaConsolidado,
    staleTime: 15 * 60 * 1000,
    ...options,
  });
};

export const useHidrologiaEmbalses = (options = {}) => {
  return useQuery({
    queryKey: ['indicadores', 'hidrologia', 'embalses'],
    queryFn: fetchHidrologiaEmbalses,
    staleTime: 15 * 60 * 1000,
    ...options,
  });
};

export const useHidrologiaAportes = (options = {}) => {
  return useQuery({
    queryKey: ['indicadores', 'hidrologia', 'aportes'],
    queryFn: fetchHidrologiaAportes,
    staleTime: 15 * 60 * 1000,
    ...options,
  });
};

export const useHidrologiaHidraulicos = (options = {}) => {
  return useQuery({
    queryKey: ['indicadores', 'hidrologia', 'hidraulicos'],
    queryFn: fetchHidrologiaHidraulicos,
    staleTime: 15 * 60 * 1000,
    ...options,
  });
};

export const useHidrologiaGeneracion = (options = {}) => {
  return useQuery({
    queryKey: ['indicadores', 'hidrologia', 'generacion'],
    queryFn: fetchHidrologiaGeneracion,
    staleTime: 15 * 60 * 1000,
    ...options,
  });
};

export const useHidrologiaPrecios = (options = {}) => {
  return useQuery({
    queryKey: ['indicadores', 'hidrologia', 'precios'],
    queryFn: fetchHidrologiaPrecios,
    staleTime: 15 * 60 * 1000,
    ...options,
  });
};

export const fetchIndicadoresProyectos075 = async () => {
  const { data } = await apiClient.post('/v1/indicadores/proyectos_075/indicadores_proyectos_075');
  return data;
};

export const useIndicadoresProyectos075 = (options = {}) => {
  return useQuery({
    queryKey: ['indicadores', 'proyectos-075'],
    queryFn: fetchIndicadoresProyectos075,
    staleTime: 15 * 60 * 1000,
    ...options,
  });
};

