import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ticket, Package, Lock, Users } from 'lucide-react';

const WorkspaceSwitcher = () => {
  const {
    activeWorkspace,
    setActiveWorkspace,
    activeTeamId,
    staffTeams,
    switchTeam,
    hasCarteleraAccess,
    hasLogisticsAccess
  } = useWorkspace();
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const tenantSlug = encodeURIComponent((theme.tenantName || 'studio5').toLowerCase().replace(/\s+/g, '-'));

  const handleSwitch = (workspace) => {
    if (workspace === 'cartelera' && !hasCarteleraAccess) return;
    if (workspace === 'logistica' && !hasLogisticsAccess) return;

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

  const handleTeamChange = async (e) => {
    const nextTeam = e.target.value;
    const updatedUser = await switchTeam(nextTeam);
    if (updatedUser) {
      if (nextTeam === 'personal' && updatedUser.base_role === 'buyer') {
        navigate('/');
      } else if (updatedUser.role === 'staff') {
        if (updatedUser.module_logistics && !updatedUser.module_cartelera) {
          navigate(`/${tenantSlug}/logistica/staff`);
        } else if (location.pathname.includes('/logistica/admin')) {
          navigate(`/${tenantSlug}/logistica/staff`);
        } else {
          navigate('/');
        }
      } else if (updatedUser.role === 'organizer' || updatedUser.role === 'admin') {
        navigate('/');
      }
    }
  };

  const hasTeams = staffTeams.length > 0;
  const isPrivileged = user?.role === 'admin' || user?.role === 'organizer' || user?.role === 'staff';

  if (!isAuthenticated || (!isPrivileged && !hasTeams)) {
    return null;
  }

  const personalLabel = user?.base_role === 'organizer'
    ? '🏢 Mi Organización'
    : user?.base_role === 'admin'
      ? '🛡️ Admin General'
      : '👤 Mi Cuenta (Cartelera)';

  return (
    <div style={{ margin: '8px 12px 16px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Selector de Equipo / Espacio (Multi-Organizador tipo Studio5 OS) */}
      {hasTeams && (
        <div style={{
          padding: '8px 10px',
          background: 'rgba(222, 184, 65, 0.08)',
          borderRadius: '10px',
          border: '1px solid rgba(222, 184, 65, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            <Users size={12} />
            <span>Espacio de Trabajo</span>
          </div>
          <select
            value={activeTeamId}
            onChange={handleTeamChange}
            style={{
              width: '100%',
              background: '#121216',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '6px 8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {user?.base_role !== 'staff' && (
              <option value="personal">{personalLabel}</option>
            )}
            {staffTeams.map(team => (
              <option key={team.organizer_id} value={team.organizer_id}>
                🎭 Staff: {team.organizer_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Switcher Cartelera / Logística cuando está en modo Staff, Organizer o Admin */}
      {isPrivileged && (
        <div style={{
          padding: '6px',
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
      )}
    </div>
  );
};

export default WorkspaceSwitcher;
