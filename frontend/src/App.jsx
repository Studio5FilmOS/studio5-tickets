import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Play, ScanLine, Flame, ShieldAlert, LogIn, LogOut, Ticket, UserPlus } from 'lucide-react';

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

const BottomNavigation = () => {
  const { user, isAuthenticated, logout, isAdmin, isOrganizer } = useAuth();
  const location = useLocation();

  if (location.pathname.startsWith('/boleto/') || location.pathname.startsWith('/orden/') || location.pathname.startsWith('/interaccion/') || location.pathname.startsWith('/payphone-redirect')) {
    return null;
  }

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
        <Link to="/admin" className={`mobile-nav-item ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>
          <ShieldAlert size={20} />
          <span>{isOrganizer ? 'Organizador' : 'Admin'}</span>
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

const Sidebar = () => {
  const { user, isAuthenticated, logout, isAdmin, isOrganizer } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();

  if (location.pathname.startsWith('/boleto/') || location.pathname.startsWith('/orden/') || location.pathname.startsWith('/interaccion/') || location.pathname.startsWith('/payphone-redirect')) {
    return null;
  }

  return (
    <aside className="desktop-sidebar">
      <div className="sidebar-top">
        <Link to="/" className="sidebar-logo">
          <img src={theme.logoUrl || 'https://i.imgur.com/0z5756T.png'} alt="Logo" style={{ maxHeight: '42px', objectFit: 'contain' }} />
          <span>{theme.tenantName || 'STUDIO 5'}</span>
        </Link>

        <nav className="sidebar-menu">
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
                <span>Escáner QR</span>
              </Link>
              <Link to="/staff/pistas" className={`sidebar-item ${location.pathname === '/staff/pistas' ? 'active' : ''}`}>
                <Flame size={18} />
                <span>Momento Wow</span>
              </Link>
            </>
          )}

          {isAuthenticated && (isAdmin || isOrganizer) && (
            <Link to="/admin" className={`sidebar-item ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>
              <ShieldAlert size={18} />
              <span>{isOrganizer ? 'Panel Organizador' : 'Administración'}</span>
            </Link>
          )}

          {isAuthenticated ? (
            <button onClick={logout} className="sidebar-item" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
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
  return (
    <header className="mobile-header">
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img 
          src={theme.logoUrl || 'https://i.imgur.com/0z5756T.png'} 
          style={{ width: '42px', height: '42px', objectFit: 'contain' }} 
          alt="Logo" 
        />
        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', letterSpacing: '1.5px' }}>{theme.tenantName || 'STUDIO 5'}</span>
      </Link>
    </header>
  );
};

const AppContent = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main-content">
        <HeaderMobile />
        <div className="app-page-wrapper">
          <Routes>
            <Route path="/" element={<Cartelera />} />
            <Route path="/evento/:id" element={<DetalleObra />} />
            <Route path="/boleto/:code" element={<BoletoView />} />
            <Route path="/orden/:code" element={<OrdenView />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/interaccion/:scheduleId" element={<PublicInteraction />} />
            <Route path="/payphone-redirect" element={<PayphoneRedirect />} />
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

            {/* Rutas Staff */}
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

            {/* Rutas Admin / Organizador */}
            <Route 
              path="/admin" 
              element={
                <PrivateRoute allowedRoles={['admin', 'organizer']}>
                  <AdminDashboard />
                </PrivateRoute>
              } 
            />
          </Routes>
        </div>

        {/* Footer Sutil Marca Blanca */}
        <footer className="whitelabel-footer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span>Powered by <strong>Studio 5 Tickets Pro v2.0</strong> &bull; Sistema de Boletaje Inteligente</span>
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
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
