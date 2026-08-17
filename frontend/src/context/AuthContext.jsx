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

  // Iniciar Sesión
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
      if (err.response?.data?.status === 'UNVERIFIED') {
        return { 
          success: false, 
          unverified: true, 
          email: err.response.data.email, 
          message: err.response.data.message 
        };
      }
      const errMsg = err.response?.data?.message || 'Error de conexión con el servidor.';
      return { success: false, message: errMsg };
    }
  };

  // Registro de usuario (Envía OTP)
  const register = async (userData) => {
    try {
      const res = await api.post('/auth/register', userData);
      if (res.data.status === 'PENDING_VERIFICATION') {
        return { success: true, pendingVerification: true, email: res.data.email, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Error al procesar el registro.';
      return { success: false, message: errMsg };
    }
  };

  // Verificar Código OTP de 6 dígitos
  const verifyOtp = async (email, code) => {
    try {
      const res = await api.post('/auth/verify-otp', { email, code });
      if (res.data.status === 'OK') {
        const { token, user: verifiedUser } = res.data;
        localStorage.setItem('studio5_token', token);
        localStorage.setItem('studio5_user', JSON.stringify(verifiedUser));
        setUser(verifiedUser);
        return { success: true, user: verifiedUser, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Código de verificación inválido o expirado.';
      return { success: false, message: errMsg };
    }
  };

  // Reenviar Código OTP
  const resendOtp = async (email) => {
    try {
      const res = await api.post('/auth/resend-otp', { email });
      return { success: res.data.status === 'OK', message: res.data.message };
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Error al reenviar el código.';
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
    register,
    verifyOtp,
    resendOtp,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isOrganizer: user?.role === 'organizer',
    isStaff: user?.role === 'staff' || user?.role === 'admin',
    isBuyer: user?.role === 'buyer'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
