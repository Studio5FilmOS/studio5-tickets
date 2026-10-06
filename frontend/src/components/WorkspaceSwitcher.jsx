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
    setActiveWorkspace(workspace);
    if (workspace === 'cartelera') {
      if (location.pathname.includes('/logistica')) {
        navigate('/');
      }
    } else if (workspace === 'logistica') {
      if (!location.pathname.includes('/logistica')) {
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
        onClick={() => handleSwitch('cartelera')}
        style={{
          flex: 1,
          padding: '8px 6px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          background: activeWorkspace === 'cartelera' ? 'var(--accent)' : 'transparent',
          color: activeWorkspace === 'cartelera' ? '#000' : 'var(--text-muted)',
          fontWeight: 700,
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          transition: 'all 0.2s ease',
          boxShadow: activeWorkspace === 'cartelera' ? '0 2px 8px rgba(222,184,65,0.3)' : 'none'
        }}
      >
        <Ticket size={14} />
        <span>Cartelera</span>
        {!hasCarteleraAccess && <Lock size={12} color="#ff4444" />}
      </button>

      <button
        type="button"
        onClick={() => handleSwitch('logistica')}
        style={{
          flex: 1,
          padding: '8px 6px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          background: activeWorkspace === 'logistica' ? 'var(--accent)' : 'transparent',
          color: activeWorkspace === 'logistica' ? '#000' : 'var(--text-muted)',
          fontWeight: 700,
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          transition: 'all 0.2s ease',
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
