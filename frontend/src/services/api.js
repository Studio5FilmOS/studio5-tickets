import axios from 'axios';

// Obtener la URL base desde las variables de entorno o usar local por defecto
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para inyectar automáticamente el token JWT en las cabeceras
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('studio5_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores comunes de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Si el token expiró o es inválido (401), desloguear
      console.warn('Sesión expirada (401). Limpiando token.');
      localStorage.removeItem('studio5_token');
      localStorage.removeItem('studio5_user');
    }
    return Promise.reject(error);
  }
);

export default api;
