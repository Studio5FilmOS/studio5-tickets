import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  
  // Guardar y recuperar el espacio de trabajo activo ('cartelera' | 'logistica')
  const [activeWorkspace, setActiveWorkspaceState] = useState(() => {
    return localStorage.getItem('studio5_workspace') || 'cartelera';
  });

  const setActiveWorkspace = (workspace) => {
    setActiveWorkspaceState(workspace);
    localStorage.setItem('studio5_workspace', workspace);
  };

  // Auto-ajustar espacio según permisos del organizador
  useEffect(() => {
    if (user?.role === 'organizer') {
      if (!user.module_cartelera && user.module_logistics && activeWorkspace === 'cartelera') {
        setActiveWorkspace('logistica');
      } else if (user.module_cartelera && !user.module_logistics && activeWorkspace === 'logistica') {
        setActiveWorkspace('cartelera');
      }
    }
  }, [user]);

  // Determinar permisos sobre cada espacio de trabajo
  const hasCarteleraAccess = !isAuthenticated || isAdmin || user?.role !== 'organizer' || Boolean(user?.module_cartelera);
  const hasLogisticsAccess = isAdmin || (user?.role === 'organizer' && Boolean(user?.module_logistics)) || (user?.role === 'staff');

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        setActiveWorkspace,
        hasCarteleraAccess,
        hasLogisticsAccess,
        isCarteleraActive: activeWorkspace === 'cartelera',
        isLogisticsActive: activeWorkspace === 'logistica'
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace debe ser usado dentro de un WorkspaceProvider');
  }
  return context;
};
