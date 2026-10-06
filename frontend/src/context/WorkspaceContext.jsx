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

  // Determinar permisos sobre cada espacio de trabajo
  const hasCarteleraAccess = !isAuthenticated || isAdmin || user?.role !== 'organizer' || user?.module_cartelera !== false;
  const hasLogisticsAccess = isAdmin || (user?.role === 'organizer' && user?.module_logistics === true) || (user?.role === 'staff');

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
