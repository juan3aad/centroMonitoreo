// src/lib/axios.js
import axios from 'axios';
import { API } from '../config/api';

const useMock = import.meta.env.VITE_USE_MOCK_API === 'true';

/**
 * Instancia de Axios configurada para la API
 */
export const apiClient = axios.create({
  baseURL: API,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/**
 * Interceptor de request: añadir tokens, logging, etc.
 */
apiClient.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: Date.now() };

    if (useMock) {
      // Cambiar a método GET
      config.method = 'get';
      // Construir la nueva URL para apuntar al archivo JSON
      // Ej: /v1/indicadores/6g_proyecto -> /mock/v1/indicadores/6g_proyecto.json
      if (config.url) {
        config.url = `${config.url}.json`;
      }
      // Eliminar el cuerpo de la petición ya que es un GET
      config.data = undefined;
    }
    
    if (config.url && config.url.includes('transmision')) {
      console.log('Axios Request URL:', config.baseURL + config.url);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor de response: manejo de errores global y medición de tiempos
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Manejo centralizado de errores
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          console.error('No autorizado');
          break;
        case 403:
          console.error('Acceso prohibido');
          break;
        case 404:
          console.error(`Recurso no encontrado: ${error.config.url}`);
          break;
        case 500:
          console.error('Error del servidor');
          break;
        default:
          console.error(`Error ${status}: ${data?.message || error.message}`);
      }
    } else if (error.request) {
      console.error('Error de conexión. Verifica tu conexión a internet o la disponibilidad del mock.');
    } else {
      console.error('Error al configurar la petición:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;

