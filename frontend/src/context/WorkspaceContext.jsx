import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const { user, isAuthenticated, isAdmin, refreshUser } = useAuth();

  // Guardar y recuperar el espacio de trabajo activo ('cartelera' | 'logistica')
  const [activeWorkspace, setActiveWorkspaceState] = useState(() => {
    return localStorage.getItem('studio5_workspace') || 'cartelera';
  });

  // Guardar y recuperar el equipo/organizador activo ('personal' | organizer_id)
  const [activeTeamId, setActiveTeamIdState] = useState(() => {
    return localStorage.getItem('studio5_active_team') || 'personal';
  });

  const setActiveWorkspace = (workspace) => {
    setActiveWorkspaceState(workspace);
    localStorage.setItem('studio5_workspace', workspace);
  };

  const switchTeam = async (teamId) => {
    const nextTeam = teamId || 'personal';
    setActiveTeamIdState(nextTeam);
    localStorage.setItem('studio5_active_team', nextTeam);
    const updated = await refreshUser();
    if (updated) {
      if (nextTeam === 'personal' && updated.base_role === 'buyer') {
        setActiveWorkspace('cartelera');
      } else if (!updated.module_cartelera && updated.module_logistics) {
        setActiveWorkspace('logistica');
      } else if (updated.module_cartelera && !updated.module_logistics) {
        setActiveWorkspace('cartelera');
      }
    }
    return updated;
  };

  // Sincronizar activeTeamId si el usuario ya no pertenece al equipo guardado
  useEffect(() => {
    if (!user) return;
    const teams = user.staff_teams || [];
    if (activeTeamId !== 'personal' && !teams.some(t => t.organizer_id === activeTeamId)) {
      setActiveTeamIdState('personal');
      localStorage.setItem('studio5_active_team', 'personal');
    }
  }, [user, activeTeamId]);

  // Auto-ajustar espacio según permisos del organizador o staff
  useEffect(() => {
    if (user?.role === 'organizer' || user?.role === 'staff') {
      if (!user.module_cartelera && user.module_logistics && activeWorkspace === 'cartelera') {
        setActiveWorkspace('logistica');
      } else if (user.module_cartelera && !user.module_logistics && activeWorkspace === 'logistica') {
        setActiveWorkspace('cartelera');
      }
    }
  }, [user]);

  const staffTeams = user?.staff_teams || [];
  const activeTeam = staffTeams.find(t => t.organizer_id === activeTeamId) || null;

  // Determinar permisos sobre cada espacio de trabajo
  const hasCarteleraAccess = !isAuthenticated || isAdmin || (user?.role === 'organizer' || user?.role === 'staff' ? Boolean(user?.module_cartelera) : true);
  const hasLogisticsAccess = isAdmin || (user?.role === 'organizer' && Boolean(user?.module_logistics)) || (user?.role === 'staff' && Boolean(user?.module_logistics));

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        setActiveWorkspace,
        activeTeamId,
        activeTeam,
        staffTeams,
        switchTeam,
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
