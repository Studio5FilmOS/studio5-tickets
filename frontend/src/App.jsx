import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import { getPublicSettings } from './services/settingsService';
import { 
  Play, ScanLine, Flame, ShieldAlert, LogIn, LogOut, Ticket, 
  UserPlus, Phone, Lock, Layers, Package, CheckCircle2, ExternalLink, Palette 
} from 'lucide-react';

// Importar Vistas (Pages)
import Cartelera from './pages/Cartelera';
import DetalleObra from './pages/DetalleObra';
import BoletoView from './pages/BoletoView';
import OrdenView from './pages/OrdenView';
import Login from './pages/Login';
import Register from './pages/Register';
import MyTickets from './pages/buyer/MyTickets';
import ScannerDashboard from './pages/staff/ScannerDashboard';
import MomentoWow from './pages/staff/MomentoWow';
import AdminDashboard from './pages/admin/AdminDashboard';
import PublicInteraction from './pages/PublicInteraction';
import PayphoneRedirect from './pages/PayphoneRedirect';
import TermsAndPolicies from './pages/TermsAndPolicies';

// Importar Módulos de Logística y Marca
import LogisticsAdmin from './pages/admin/LogisticsAdmin';
import LogisticsStaff from './pages/staff/LogisticsStaff';
import BelenDashboard from './pages/BelenDashboard';
import PrintStickers from './pages/admin/PrintStickers';
import BrandSettings from './pages/admin/BrandSettings';

const BottomNavigation = () => {
  const { user, isAuthenticated, logout, isAdmin, isOrganizer } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { theme } = useTheme();
  const location = useLocation();

  const tenantSlug = encodeURIComponent((theme.tenantName || 'studio5').toLowerCase().replace(/\s+/g, '-'));

  if (
    location.pathname.startsWith('/boleto/') || 
    location.pathname.startsWith('/orden/') || 
    location.pathname.startsWith('/interaccion/') || 
    location.pathname.startsWith('/payphone-redirect') ||
    location.pathname.match(/\/(belen|metas|animated)/i)
  ) {
    return null;
  }

  // Si estamos en el Espacio de Trabajo: LOGÍSTICA
  if (activeWorkspace === 'logistica') {
    return (
      <nav className="mobile-nav">
        {(isAdmin || isOrganizer) && (
          <Link to={`/${tenantSlug}/logistica/admin`} className={`mobile-nav-item ${location.pathname.includes('/logistica/admin') ? 'active' : ''}`}>
            <Package size={20} />
            <span>Campañas</span>
          </Link>
        )}

        {(user?.role === 'staff' || isAdmin || isOrganizer) && (
          <Link to={`/${tenantSlug}/logistica/staff`} className={`mobile-nav-item ${location.pathname.includes('/logistica/staff') ? 'active' : ''}`}>
            <ScanLine size={20} />
            <span>Escáner</span>
          </Link>
        )}

        <Link to={`/${tenantSlug}/metas`} className={`mobile-nav-item ${location.pathname.match(/\/(belen|metas|animated)/i) ? 'active' : ''}`}>
          <ExternalLink size={20} />
          <span>Metas</span>
        </Link>

        {(isAdmin || isOrganizer) && (
          <Link to="/marca" className={`mobile-nav-item ${location.pathname.includes('/marca') ? 'active' : ''}`}>
            <Palette size={20} />
            <span>Marca</span>
          </Link>
        )}

        {isAuthenticated ? (
          <button onClick={logout} className="mobile-nav-item" style={{ background: 'none', border: 'none' }}>
            <LogOut size={20} />
            <span>Salir</span>
          </button>
        ) : (
          <Link to="/login" className={`mobile-nav-item ${location.pathname === '/login' ? 'active' : ''}`}>
            <LogIn size={20} />
            <span>Entrar</span>
          </Link>
        )}
      </nav>
    );
  }

  // Espacio de Trabajo: CARTELERA Y EVENTOS (Por defecto)
  return (
    <nav className="mobile-nav">
      <Link to="/" className={`mobile-nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <Play size={20} />
        <span>Cartelera</span>
      </Link>

      {isAuthenticated && (
        <Link to="/mis-tickets" className={`mobile-nav-item ${location.pathname === '/mis-tickets' ? 'active' : ''}`}>
          <Ticket size={20} />
          <span>Tickets</span>
        </Link>
      )}

      {isAuthenticated && (user?.role === 'staff' || isAdmin || isOrganizer) && (
        <Link to="/staff/scan" className={`mobile-nav-item ${location.pathname === '/staff/scan' ? 'active' : ''}`}>
          <ScanLine size={20} />
          <span>Escáner</span>
        </Link>
      )}

      {isAuthenticated && (isAdmin || isOrganizer) && (
        <>
          <Link to="/admin" className={`mobile-nav-item ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>
            <ShieldAlert size={20} />
            <span>{isOrganizer ? 'Organizador' : 'Admin'}</span>
          </Link>
          <Link to="/marca" className={`mobile-nav-item ${location.pathname.includes('/marca') ? 'active' : ''}`}>
            <Palette size={20} />
            <span>Marca</span>
          </Link>
        </>
      )}

      {isAuthenticated ? (
        <button onClick={logout} className="mobile-nav-item" style={{ background: 'none', border: 'none' }}>
          <LogOut size={20} />
          <span>Salir</span>
        </button>
      ) : (
        <>
          <Link to="/registro" className={`mobile-nav-item ${location.pathname === '/registro' ? 'active' : ''}`}>
            <UserPlus size={20} />
            <span>Registro</span>
          </Link>
          <Link to="/login" className={`mobile-nav-item ${location.pathname === '/login' ? 'active' : ''}`}>
            <LogIn size={20} />
            <span>Entrar</span>
          </Link>
        </>
      )}
    </nav>
  );
};

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="glass-panel" style={{ margin: '50px auto', maxWidth: '400px', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--accent)', marginBottom: '15px' }}>Inicia Sesión</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Inicia sesión para acceder a tus boletos o funciones.</p>
        <Link to="/login" className="btn-primary">Iniciar Sesión</Link>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="glass-panel" style={{ margin: '50px auto', maxWidth: '400px', textAlign: 'center' }}>
        <h3 style={{ color: '#ff3b30', marginBottom: '15px' }}>Sin Autorización</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>No tienes los permisos requeridos para acceder a esta área.</p>
        <Link to="/" className="btn-primary">Volver a Cartelera</Link>
      </div>
    );
  }

  return children;
};

const ModuleGuard = ({ children, requiredModule }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    contact_whatsapp: '593963162788',
    cartelera_contact_message: 'Hola, deseo contratar el módulo de Cartelera de Eventos en mi cuenta.',
    logistics_contact_message: 'Hola, deseo contratar el módulo de Logística en mi cuenta.'
  });

  useEffect(() => {
    getPublicSettings().then(s => {
      if (s) setSettings(s);
    });
  }, []);

  if (user?.role === 'admin') return children;
  
  const cleanPhone = (settings.contact_whatsapp || '593963162788').replace(/\D/g, '');

  if (user?.role === 'organizer') {
    if (requiredModule === 'cartelera' && !user.module_cartelera) {
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(settings.cartelera_contact_message)}`;
      return (
        <div className="glass-panel" style={{ margin: '50px auto', maxWidth: '450px', textAlign: 'center', padding: '36px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Lock size={48} color="var(--accent)" opacity={0.8} />
          </div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '1.3rem' }}>Módulo de Cartelera No Contratado</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6, fontSize: '0.9rem' }}>
            Tu cuenta de organizador actualmente no tiene habilitado el módulo de <strong>Cartelera de Eventos (Boletaje)</strong>. Contáctanos por WhatsApp para activar esta función de inmediato.
          </p>
          <a href={waUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', width: '100%', padding: '14px', fontWeight: 700 }}>
            <Phone size={18} /> Contratar Módulo por WhatsApp
          </a>
        </div>
      );
    }

    if (requiredModule === 'logistics' && !user.module_logistics) {
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(settings.logistics_contact_message)}`;
      return (
        <div className="glass-panel" style={{ margin: '50px auto', maxWidth: '450px', textAlign: 'center', padding: '36px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Lock size={48} color="var(--accent)" opacity={0.8} />
          </div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '1.3rem' }}>Módulo de Logística No Contratado</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6, fontSize: '0.9rem' }}>
            Tu cuenta actualmente no tiene habilitado el módulo de <strong>Logística de Campañas y Canastas</strong>. Contáctanos por WhatsApp para activarlo en tu plan.
          </p>
          <a href={waUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', width: '100%', padding: '14px', fontWeight: 700 }}>
            <Phone size={18} /> Contratar Módulo por WhatsApp
          </a>
        </div>
      );
    }
  }
  
  return children;
};

const Sidebar = () => {
  const { user, isAuthenticated, logout, isAdmin, isOrganizer } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { theme } = useTheme();
  const location = useLocation();

  const tenantSlug = encodeURIComponent((theme.tenantName || 'studio5').toLowerCase().replace(/\s+/g, '-'));

  if (
    location.pathname.startsWith('/boleto/') || 
    location.pathname.startsWith('/orden/') || 
    location.pathname.startsWith('/interaccion/') || 
    location.pathname.startsWith('/payphone-redirect') ||
    location.pathname.match(/\/(belen|metas|animated)/i)
  ) {
    return null;
  }

  return (
    <aside className="desktop-sidebar">
      <div className="sidebar-top">
        <Link to="/" className="sidebar-logo">
          <img src={theme.logoUrl || 'https://i.imgur.com/0z5756T.png'} alt="Logo" style={{ maxHeight: '42px', objectFit: 'contain' }} />
          <span>{theme.tenantName || 'STUDIO 5'}</span>
        </Link>

        {/* Selector de Espacio de Trabajo */}
        <WorkspaceSwitcher />

        <nav className="sidebar-menu">
          {/* Vistas según el Espacio Activo */}
          {activeWorkspace === 'logistica' ? (
            <>
              {(isAdmin || isOrganizer) && (
                <Link to={`/${tenantSlug}/logistica/admin`} className={`sidebar-item ${location.pathname.includes('/logistica/admin') ? 'active' : ''}`}>
                  <Package size={18} />
                  <span>Campañas & Lotes</span>
                </Link>
              )}

              {(user?.role === 'staff' || isAdmin || isOrganizer) && (
                <Link to={`/${tenantSlug}/logistica/staff`} className={`sidebar-item ${location.pathname.includes('/logistica/staff') ? 'active' : ''}`}>
                  <ScanLine size={18} />
                  <span>Escáner Logística</span>
                </Link>
              )}

              <Link to={`/${tenantSlug}/metas`} className={`sidebar-item ${location.pathname.match(/\/(belen|metas|animated)/i) ? 'active' : ''}`}>
                <ExternalLink size={18} />
                <span>Pantalla de Metas</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/" className={`sidebar-item ${location.pathname === '/' ? 'active' : ''}`}>
                <Play size={18} />
                <span>Cartelera</span>
              </Link>

              {isAuthenticated && (
                <Link to="/mis-tickets" className={`sidebar-item ${location.pathname === '/mis-tickets' ? 'active' : ''}`}>
                  <Ticket size={18} />
                  <span>Mis Tickets</span>
                </Link>
              )}

              {isAuthenticated && (user?.role === 'staff' || isAdmin || isOrganizer) && (
                <>
                  <Link to="/staff/scan" className={`sidebar-item ${location.pathname === '/staff/scan' ? 'active' : ''}`}>
                    <ScanLine size={18} />
                    <span>Escáner Puerta</span>
                  </Link>
                  <Link to="/staff/pistas" className={`sidebar-item ${location.pathname === '/staff/pistas' ? 'active' : ''}`}>
                    <Flame size={18} />
                    <span>Momento Wow</span>
                  </Link>
                </>
              )}

              {isAuthenticated && (isAdmin || isOrganizer) && (
                <Link to="/admin" className={`sidebar-item ${location.pathname === '/admin' ? 'active' : ''}`}>
                  <ShieldAlert size={18} />
                  <span>{isOrganizer ? 'Panel Organizador' : 'Administración'}</span>
                </Link>
              )}
            </>
          )}

          {/* Configuración Global de Marca Blanca y Staff para Administrador u Organizador */}
          {(isAdmin || isOrganizer) && (
            <Link to="/marca" className={`sidebar-item ${location.pathname.includes('/marca') ? 'active' : ''}`} style={{ marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
              <Palette size={18} />
              <span>Mi Marca & Staff</span>
            </Link>
          )}

          {isAuthenticated ? (
            <button onClick={logout} className="sidebar-item" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', marginTop: '10px' }}>
              <LogOut size={18} />
              <span>Cerrar Sesión</span>
            </button>
          ) : (
            <>
              <Link to="/login" className={`sidebar-item ${location.pathname === '/login' ? 'active' : ''}`}>
                <LogIn size={18} />
                <span>Iniciar Sesión</span>
              </Link>
              <Link to="/registro" className={`sidebar-item ${location.pathname === '/registro' ? 'active' : ''}`}>
                <UserPlus size={18} />
                <span>Registrarme</span>
              </Link>
            </>
          )}
        </nav>
      </div>

      {isAuthenticated && (
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user.name}</span>
            <span className="sidebar-user-role">{user.role === 'organizer' ? 'Organizador' : (user.role === 'staff' ? 'Staff' : (user.role === 'admin' ? 'Administrador' : 'Espectador'))}</span>
          </div>
        </div>
      )}
    </aside>
  );
};

const HeaderMobile = () => {
  const { theme } = useTheme();
  const location = useLocation();

  if (
    location.pathname.startsWith('/boleto/') || 
    location.pathname.startsWith('/orden/') || 
    location.pathname.startsWith('/interaccion/') || 
    location.pathname.startsWith('/payphone-redirect') ||
    location.pathname.match(/\/(belen|metas|animated)/i)
  ) {
    return null;
  }

  return (
    <header className="mobile-header">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img 
            src={theme.logoUrl || 'https://i.imgur.com/0z5756T.png'} 
            style={{ width: '38px', height: '38px', objectFit: 'contain' }} 
            alt="Logo" 
          />
          <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', letterSpacing: '1px' }}>{theme.tenantName || 'STUDIO 5'}</span>
        </Link>
      </div>
      <WorkspaceSwitcher />
    </header>
  );
};

const AppContent = () => {
  const location = useLocation();
  const isStandalone = location.pathname.match(/\/(belen|metas|animated)/i) || 
                       location.pathname.startsWith('/boleto/') || 
                       location.pathname.startsWith('/orden/') || 
                       location.pathname.startsWith('/interaccion/') || 
                       location.pathname.startsWith('/payphone-redirect');

  if (isStandalone) {
    return (
      <Routes>
        <Route path="/boleto/:code" element={<BoletoView />} />
        <Route path="/orden/:code" element={<OrdenView />} />
        <Route path="/interaccion/:scheduleId" element={<PublicInteraction />} />
        <Route path="/payphone-redirect" element={<PayphoneRedirect />} />
        <Route path="/:tenant/metas" element={<BelenDashboard />} />
        <Route path="/:tenant/belen" element={<BelenDashboard />} />
        <Route path="/:tenant/animated" element={<BelenDashboard />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main-content">
        <HeaderMobile />
        <div className="app-page-wrapper">
          <Routes>
            <Route path="/" element={<Cartelera />} />
            <Route path="/evento/:id" element={<DetalleObra />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/terminos" element={<TermsAndPolicies />} />
            <Route path="/politicas" element={<TermsAndPolicies />} />

            {/* Portal del Cliente (Cualquier usuario autenticado) */}
            <Route 
              path="/mis-tickets" 
              element={
                <PrivateRoute>
                  <MyTickets />
                </PrivateRoute>
              } 
            />

            {/* Rutas Staff Cartelera */}
            <Route 
              path="/staff/scan" 
              element={
                <PrivateRoute allowedRoles={['staff', 'admin', 'organizer']}>
                  <ScannerDashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/staff/pistas" 
              element={
                <PrivateRoute allowedRoles={['staff', 'admin', 'organizer']}>
                  <MomentoWow />
                </PrivateRoute>
              } 
            />

            {/* Rutas Staff Logística */}
            <Route 
              path="/:tenant/logistica/staff" 
              element={
                <PrivateRoute allowedRoles={['staff', 'admin', 'organizer']}>
                  <LogisticsStaff />
                </PrivateRoute>
              } 
            />

            {/* Rutas Admin / Organizador Cartelera */}
            <Route 
              path="/admin" 
              element={
                <PrivateRoute allowedRoles={['admin', 'organizer']}>
                  <ModuleGuard requiredModule="cartelera">
                    <AdminDashboard />
                  </ModuleGuard>
                </PrivateRoute>
              } 
            />

            {/* Rutas Admin / Organizador Logística */}
            <Route 
              path="/:tenant/logistica/admin" 
              element={
                <PrivateRoute allowedRoles={['admin', 'organizer']}>
                  <ModuleGuard requiredModule="logistics">
                    <LogisticsAdmin />
                  </ModuleGuard>
                </PrivateRoute>
              } 
            />
            <Route 
              path="/:tenant/logistica/admin/print/:campaignId" 
              element={
                <PrivateRoute allowedRoles={['admin', 'organizer']}>
                  <PrintStickers />
                </PrivateRoute>
              } 
            />

            {/* Rutas Configuración de Marca Blanca y Staff */}
            <Route 
              path="/marca" 
              element={
                <PrivateRoute allowedRoles={['admin', 'organizer']}>
                  <BrandSettings />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/:tenant/marca" 
              element={
                <PrivateRoute allowedRoles={['admin', 'organizer']}>
                  <BrandSettings />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/admin/marca" 
              element={
                <PrivateRoute allowedRoles={['admin', 'organizer']}>
                  <BrandSettings />
                </PrivateRoute>
              } 
            />
          </Routes>
        </div>

        {/* Footer Sutil Marca Blanca */}
        <footer className="whitelabel-footer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span>Powered by <strong>Studio 5 Tickets Pro v2.1.0</strong> &bull; Sistema de Boletaje Inteligente</span>
          <span>&bull;</span>
          <Link to="/terminos" style={{ color: 'var(--text-muted)', textDecoration: 'underline', fontSize: '0.75rem' }}>
            Términos & Políticas de Marca Blanca
          </Link>
        </footer>
      </div>
      <BottomNavigation />
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <WorkspaceProvider>
          <Router>
            <AppContent />
          </Router>
        </WorkspaceProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
