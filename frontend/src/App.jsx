import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Play, ScanBarcode, Flame, ShieldAlert, LogIn, LogOut } from 'lucide-react';

// Importar Vistas (Pages)
import Cartelera from './pages/Cartelera';
import DetalleObra from './pages/DetalleObra';
import BoletoView from './pages/BoletoView';
import Login from './pages/Login';
import ScannerDashboard from './pages/staff/ScannerDashboard';
import MomentoWow from './pages/staff/MomentoWow';
import AdminDashboard from './pages/admin/AdminDashboard';
import PublicInteraction from './pages/PublicInteraction'; // NUEVA PÁGINA

const BottomNavigation = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  // No mostrar barra de navegación en e-tickets ni en interactividad pública
  if (location.pathname.startsWith('/boleto/') || location.pathname.startsWith('/interaccion/')) {
    return null;
  }

  return (
    <nav className="mobile-nav">
      <Link to="/" className={`mobile-nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <Play size={20} />
        <span>Cartelera</span>
      </Link>

      {isAuthenticated && (
        <>
          <Link to="/staff/scan" className={`mobile-nav-item ${location.pathname === '/staff/scan' ? 'active' : ''}`}>
            <ScanBarcode size={20} />
            <span>Escáner</span>
          </Link>
          <Link to="/staff/pistas" className={`mobile-nav-item ${location.pathname === '/staff/pistas' ? 'active' : ''}`}>
            <Flame size={20} />
            <span>Wow</span>
          </Link>
        </>
      )}

      {isAuthenticated && user.role === 'admin' && (
        <Link to="/admin" className={`mobile-nav-item ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>
          <ShieldAlert size={20} />
          <span>Admin</span>
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
          <span>Acceder</span>
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
        <h3 style={{ color: '#ff3b30', marginBottom: '15px' }}>Acceso Restringido</h3>
        <p style={{ color: '#ccc', marginBottom: '20px' }}>Debes iniciar sesión para ingresar a esta pantalla.</p>
        <Link to="/login" className="btn-primary">Iniciar Sesión</Link>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="glass-panel" style={{ margin: '50px auto', maxWidth: '400px', textAlign: 'center' }}>
        <h3 style={{ color: '#ff3b30', marginBottom: '15px' }}>Sin Autorización</h3>
        <p style={{ color: '#ccc', marginBottom: '20px' }}>No tienes el rol necesario para acceder.</p>
        <Link to="/" className="btn-primary">Volver a Cartelera</Link>
      </div>
    );
  }

  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '15px' }}>
          
          <header style={{ display: 'flex', justifyContent: 'center', padding: '15px 0 20px' }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img 
                src="https://i.imgur.com/0z5756T.png" 
                style={{ width: '45px', filter: 'invert(1)' }} 
                alt="Studio 5 Logo" 
              />
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', letterSpacing: '2px' }}>STUDIO 5</span>
            </Link>
          </header>

          <Routes>
            <Route path="/" element={<Cartelera />} />
            <Route path="/evento/:id" element={<DetalleObra />} />
            <Route path="/boleto/:code" element={<BoletoView />} />
            <Route path="/login" element={<Login />} />
            
            {/* NUEVA RUTA PÚBLICA PARA QR DE SALA */}
            <Route path="/interaccion/:scheduleId" element={<PublicInteraction />} />

            {/* Rutas Protegidas del Staff */}
            <Route 
              path="/staff/scan" 
              element={
                <PrivateRoute allowedRoles={['staff', 'admin']}>
                  <ScannerDashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/staff/pistas" 
              element={
                <PrivateRoute allowedRoles={['staff', 'admin']}>
                  <MomentoWow />
                </PrivateRoute>
              } 
            />

            {/* Rutas Protegidas de Administración */}
            <Route 
              path="/admin" 
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </PrivateRoute>
              } 
            />
          </Routes>

          <BottomNavigation />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
