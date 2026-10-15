import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ticket, Package, Lock } from 'lucide-react';

const WorkspaceSwitcher = () => {
  const { activeWorkspace, setActiveWorkspace, hasCarteleraAccess, hasLogisticsAccess } = useWorkspace();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const tenantSlug = encodeURIComponent((theme.tenantName || 'studio5').toLowerCase().replace(/\s+/g, '-'));

  const handleSwitch = (workspace) => {
    if (workspace === 'cartelera' && !hasCarteleraAccess) {
      return;
    }
    if (workspace === 'logistica' && !hasLogisticsAccess) {
      return;
    }
    setActiveWorkspace(workspace);
    if (workspace === 'cartelera') {
      if (location.pathname.includes('/logistica') || location.pathname.includes('/metas')) {
        navigate('/');
      }
    } else if (workspace === 'logistica') {
      if (!location.pathname.includes('/logistica') && !location.pathname.includes('/metas')) {
        if (user?.role === 'staff') {
          navigate(`/${tenantSlug}/logistica/staff`);
        } else {
          navigate(`/${tenantSlug}/logistica/admin`);
        }
      }
    }
  };

  // Solo mostrar switcher si el usuario está autenticado y tiene rol staff, admin u organizer
  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'organizer' && user?.role !== 'staff')) {
    return null;
  }

  return (
    <div style={{
      padding: '6px',
      margin: '8px 12px 16px 12px',
      background: 'rgba(255, 255, 255, 0.04)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      gap: '4px'
    }}>
      <button
        type="button"
        disabled={!hasCarteleraAccess}
        onClick={() => handleSwitch('cartelera')}
        title={!hasCarteleraAccess ? 'Tu cuenta no tiene habilitado el módulo de Cartelera' : 'Espacio Cartelera'}
        style={{
          flex: 1,
          padding: '8px 6px',
          borderRadius: '8px',
          border: 'none',
          cursor: !hasCarteleraAccess ? 'not-allowed' : 'pointer',
          background: activeWorkspace === 'cartelera' ? 'var(--accent)' : 'transparent',
          color: activeWorkspace === 'cartelera' ? '#000' : 'var(--text-muted)',
          fontWeight: 700,
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          transition: 'all 0.2s ease',
          opacity: !hasCarteleraAccess ? 0.4 : 1,
          boxShadow: activeWorkspace === 'cartelera' ? '0 2px 8px rgba(222,184,65,0.3)' : 'none'
        }}
      >
        <Ticket size={14} />
        <span>Cartelera</span>
        {!hasCarteleraAccess && <Lock size={12} color="#ff4444" />}
      </button>

      <button
        type="button"
        disabled={!hasLogisticsAccess}
        onClick={() => handleSwitch('logistica')}
        title={!hasLogisticsAccess ? 'Tu cuenta no tiene habilitado el módulo de Logística' : 'Espacio Logística'}
        style={{
          flex: 1,
          padding: '8px 6px',
          borderRadius: '8px',
          border: 'none',
          cursor: !hasLogisticsAccess ? 'not-allowed' : 'pointer',
          background: activeWorkspace === 'logistica' ? 'var(--accent)' : 'transparent',
          color: activeWorkspace === 'logistica' ? '#000' : 'var(--text-muted)',
          fontWeight: 700,
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          transition: 'all 0.2s ease',
          opacity: !hasLogisticsAccess ? 0.4 : 1,
          boxShadow: activeWorkspace === 'logistica' ? '0 2px 8px rgba(222,184,65,0.3)' : 'none'
        }}
      >
        <Package size={14} />
        <span>Logística</span>
        {!hasLogisticsAccess && <Lock size={12} color="#ff4444" />}
      </button>
    </div>
  );
};

export default WorkspaceSwitcher;
