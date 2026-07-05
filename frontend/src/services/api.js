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
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Si el token expira o es inválido, desloguear
      console.warn('Sesión expirada o no autorizada. Limpiando almacenamiento.');
      localStorage.removeItem('studio5_token');
      localStorage.removeItem('studio5_user');
      // Podríamos redirigir a /login, pero depende de la ruta. El contexto lo manejará mejor.
    }
    return Promise.reject(error);
  }
);

export default api;
