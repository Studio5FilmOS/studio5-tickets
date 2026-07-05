import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificar si hay una sesión activa al cargar la app
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('studio5_token');
      const savedUser = localStorage.getItem('studio5_user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          
          // Opcional: Verificar validez en el servidor
          const res = await api.get('/auth/me');
          if (res.data.status === 'OK') {
            setUser(res.data.user);
            localStorage.setItem('studio5_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.error('Error al restaurar sesión:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Iniciar Sesión (Admin / Staff)
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      
      if (res.data.status === 'OK') {
        const { token, user: loggedUser } = res.data;
        localStorage.setItem('studio5_token', token);
        localStorage.setItem('studio5_user', JSON.stringify(loggedUser));
        setUser(loggedUser);
        return { success: true };
      }
      return { success: false, message: res.data.message || 'Error al iniciar sesión' };
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Error de conexión con el servidor.';
      return { success: false, message: errMsg };
    }
  };

  // Cerrar Sesión
  const logout = () => {
    localStorage.removeItem('studio5_token');
    localStorage.removeItem('studio5_user');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isStaff: user?.role === 'staff' || user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
