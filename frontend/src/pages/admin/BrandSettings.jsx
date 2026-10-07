import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { 
  Palette, Users, Globe, Copy, Check, Plus, Trash2, 
  ExternalLink, Sparkles, Shield, UserPlus, Image as ImageIcon,
  Key, Mail, Phone, User
} from 'lucide-react';

const BrandSettings = () => {
  const { user } = useAuth();
  const { theme, updateTheme } = useTheme();

  // Estados de configuración de marca
  const [brandName, setBrandName] = useState(user?.name || '');
  const [tenantSlug, setTenantSlug] = useState(user?.tenant_slug || '');
  const [primaryColor, setPrimaryColor] = useState(theme?.primaryColor || '#DEB841');
  const [secondaryColor, setSecondaryColor] = useState(theme?.secondaryColor || '#b08d2b');
  const [logoUrl, setLogoUrl] = useState(theme?.logoUrl || '');
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Estados de gestión de Staff
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [showCreateStaffModal, setShowCreateStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  // 1. Cargar configuración de marca existente
  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const res = await api.get('/users/my-brand');
        if (res.data?.status === 'OK' && res.data.brand) {
          const b = res.data.brand;
          if (b.name) setBrandName(b.name);
          if (b.tenant_slug) setTenantSlug(b.tenant_slug);
          if (b.theme_config) {
            const tc = typeof b.theme_config === 'string' ? JSON.parse(b.theme_config) : b.theme_config;
            if (tc.primaryColor) setPrimaryColor(tc.primaryColor);
            if (tc.secondaryColor) setSecondaryColor(tc.secondaryColor);
            if (tc.logoUrl) setLogoUrl(tc.logoUrl);
          }
        }
      } catch (err) {
        console.warn('Error al cargar datos de marca:', err.message);
      }
    };

    fetchBrand();
  }, []);

  // 2. Cargar lista de Staff propio
  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const res = await api.get('/users/my-staff');
      if (res.data?.status === 'OK') {
        setStaffList(res.data.staff || []);
      }
    } catch (err) {
      console.error('Error al cargar staff:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Guardar configuración de marca
  const handleSaveBrand = async (e) => {
    e.preventDefault();
    setIsSavingBrand(true);
    try {
      const cleanSlug = tenantSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const themeConfig = {
        primaryColor,
        secondaryColor,
        logoUrl: logoUrl.trim(),
        tenantName: brandName.trim()
      };

      const res = await api.put('/users/my-brand', {
        name: brandName.trim(),
        tenant_slug: cleanSlug,
        theme_config: themeConfig
      });

      if (res.data?.status === 'OK') {
        updateTheme(themeConfig);
        Swal.fire({
          icon: 'success',
          title: '¡Marca Actualizada!',
          text: 'Los colores, logotipo y enlace de tu organización han sido guardados.',
          background: '#16171f',
          color: '#fff',
          confirmButtonColor: primaryColor
        });
      }
    } catch (err) {
      Swal.fire('Error', err?.response?.data?.message || 'No se pudo guardar la marca.', 'error');
    } finally {
      setIsSavingBrand(false);
    }
  };

  // Copiar enlace directo
  const directUrl = `${window.location.origin}/${tenantSlug || 'mi-marca'}`;
  const handleCopyLink = () => {
    navigator.clipboard.writeText(directUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Crear Staff
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.email || !newStaff.password) {
      Swal.fire('Campos requeridos', 'Ingresa nombre, correo y contraseña.', 'warning');
      return;
    }

    setIsCreatingStaff(true);
    try {
      const res = await api.post('/users/my-staff', newStaff);
      if (res.data?.status === 'OK') {
        Swal.fire({
          icon: 'success',
          title: '¡Staff Creado!',
          text: `El usuario ${newStaff.name} ya puede iniciar sesión con rol Staff.`,
          background: '#16171f',
          color: '#fff',
          confirmButtonColor: primaryColor
        });
        setShowCreateStaffModal(false);
        setNewStaff({ name: '', email: '', phone: '', password: '' });
        fetchStaff();
      }
    } catch (err) {
      Swal.fire('Error', err?.response?.data?.message || 'Error al crear el staff.', 'error');
    } finally {
      setIsCreatingStaff(false);
    }
  };

  // Eliminar Staff
  const handleDeleteStaff = (st) => {
    Swal.fire({
      title: `¿Eliminar a ${st.name}?`,
      text: 'Este usuario perderá acceso inmediato a las operaciones de escaneo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#16171f',
      color: '#fff'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/users/my-staff/${st.id}`);
          Swal.fire('Eliminado', 'El usuario ha sido removido de tu equipo.', 'success');
          fetchStaff();
        } catch (err) {
          Swal.fire('Error', err?.response?.data?.message || 'Error al eliminar usuario.', 'error');
        }
      }
    });
  };

  return (
    <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '0.75rem', color: primaryColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>
          Identidad & Equipo
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', margin: 0 }}>
          Mi Marca & Configuración
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
          Personaliza tu logotipo, colores de marca blanca, enlace directo de venta y tu equipo de personal de Staff.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>

        {/* ─── TARJETA 1: ENLACE DIRECTO & MARCA BLANCA ────────────────────────── */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: `${primaryColor}22`, padding: '10px', borderRadius: '12px' }}>
              <Globe size={22} color={primaryColor} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Enlace Directo de tu Marca
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Tu dirección web pública sin marcas de terceros
              </p>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Identificador (Slug en la URL):
            </label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>ticket.studio5film.com/</span>
              <input 
                type="text"
                value={tenantSlug}
                onChange={e => setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="mi-marca"
                style={{ 
                  background: 'transparent', border: 'none', color: '#fff', 
                  fontWeight: 700, fontSize: '0.9rem', outline: 'none', width: '100%', padding: '8px 4px' 
                }}
              />
            </div>
          </div>

          {/* Botón 1-Click Copiar Link */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
              Tu enlace directo listo para compartir:
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                type="text" 
                readOnly 
                value={directUrl} 
                style={{ 
                  flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', 
                  color: '#e2e8f0', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem' 
                }} 
              />
              <button 
                onClick={handleCopyLink}
                className="btn-primary"
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', 
                  borderRadius: '8px', fontSize: '0.82rem', whiteSpace: 'nowrap' 
                }}
              >
                {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                {copiedLink ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveBrand} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Nombre de la Organización / Empresa:
              </label>
              <input 
                type="text"
                className="input-field"
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                placeholder="Ej. Fundación Belén"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                URL del Logotipo (PNG transparente recomendado):
              </label>
              <input 
                type="url"
                className="input-field"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Color Principal:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="color" 
                    value={primaryColor} 
                    onChange={e => setPrimaryColor(e.target.value)}
                    style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                  />
                  <input 
                    type="text" 
                    value={primaryColor} 
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="input-field" 
                    style={{ textTransform: 'uppercase', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Color Secundario:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="color" 
                    value={secondaryColor} 
                    onChange={e => setSecondaryColor(e.target.value)}
                    style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                  />
                  <input 
                    type="text" 
                    value={secondaryColor} 
                    onChange={e => setSecondaryColor(e.target.value)}
                    className="input-field" 
                    style={{ textTransform: 'uppercase', fontSize: '0.82rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Vista Previa de Estilo */}
            <div style={{
              marginTop: '4px', padding: '16px', borderRadius: '12px',
              background: `linear-gradient(135deg, ${primaryColor}22 0%, rgba(20,20,25,0.8) 100%)`,
              border: `1px solid ${primaryColor}44`,
              display: 'flex', alignItems: 'center', gap: '14px'
            }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo Preview" style={{ height: '36px', maxWidth: '80px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900 }}>
                  {brandName ? brandName.charAt(0).toUpperCase() : 'M'}
                </div>
              )}
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem' }}>{brandName || 'Tu Marca'}</div>
                <div style={{ color: primaryColor, fontSize: '0.75rem', fontWeight: 600 }}>Vista previa de personalización</div>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isSavingBrand}
              style={{ padding: '14px', borderRadius: '10px', fontWeight: 700, marginTop: '8px' }}
            >
              {isSavingBrand ? 'Guardando...' : 'Guardar Configuración de Marca'}
            </button>
          </form>
        </div>

        {/* ─── TARJETA 2: GESTIÓN DE PERSONAL STAFF ───────────────────────────── */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(59,130,246,0.15)', padding: '10px', borderRadius: '12px' }}>
                <Users size={22} color="#3b82f6" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Mi Personal de Staff
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                  Operadores autorizados para escanear y validar
                </p>
              </div>
            </div>

            <button 
              onClick={() => setShowCreateStaffModal(true)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem' }}
            >
              <Plus size={16} /> Crear Staff
            </button>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
            {loadingStaff ? (
              <div className="spinner" style={{ margin: '30px auto' }}></div>
            ) : staffList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                <Users size={40} opacity={0.3} style={{ margin: '0 auto 12px' }} />
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Aún no tienes miembros de staff creados.</p>
                <p style={{ margin: '6px 0 16px', fontSize: '0.8rem' }}>Crea usuarios con acceso exclusivo para escanear entregas en tus campañas.</p>
                <button 
                  onClick={() => setShowCreateStaffModal(true)}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', fontSize: '0.82rem' }}
                >
                  <Plus size={14} /> Registrar Primer Staff
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {staffList.map(st => (
                  <div 
                    key={st.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      padding: '12px 16px', borderRadius: '12px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                        {st.name}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
                        {st.email} {st.phone && `· ${st.phone}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>
                        Staff
                      </span>
                      <button 
                        onClick={() => handleDeleteStaff(st)}
                        style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                        title="Eliminar usuario de staff"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal Crear Staff */}
      {showCreateStaffModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={20} color={primaryColor} /> Nuevo Personal de Staff
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '18px' }}>
              Este usuario podrá iniciar sesión con rol Staff y validar códigos en las campañas asignadas.
            </p>

            <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Nombre y Apellido:
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newStaff.name} 
                  onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} 
                  placeholder="Ej. Juan Pérez (Operador 1)" 
                  required 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Correo Electrónico (para inicio de sesión):
                </label>
                <input 
                  type="email" 
                  className="input-field" 
                  value={newStaff.email} 
                  onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} 
                  placeholder="staff@tudominio.com" 
                  required 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Teléfono / WhatsApp (opcional):
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newStaff.phone} 
                  onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} 
                  placeholder="0991234567" 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Contraseña de Acceso:
                </label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={newStaff.password} 
                  onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} 
                  placeholder="Mínimo 6 caracteres" 
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowCreateStaffModal(false)}
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '12px', borderRadius: '10px' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={isCreatingStaff}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', fontWeight: 700 }}
                >
                  {isCreatingStaff ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default BrandSettings;
