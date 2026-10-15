import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { 
  Palette, Users, Globe, Copy, Check, Plus, Trash2, 
  ExternalLink, Sparkles, Shield, UserPlus, Edit, Image as ImageIcon,
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
  const [bgColor, setBgColor] = useState(theme?.bgColor || '#050505');
  const [logoUrl, setLogoUrl] = useState(theme?.logoUrl || '');
  const [logoCompressMetrics, setLogoCompressMetrics] = useState('');
  const [isCompressingLogo, setIsCompressingLogo] = useState(false);
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Permisos de módulos que este usuario puede otorgar
  const canGrantCartelera = user?.role === 'admin' || Boolean(user?.module_cartelera);
  const canGrantLogistics = user?.role === 'admin' || Boolean(user?.module_logistics);

  // Estados de gestión de Staff
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [showCreateStaffModal, setShowCreateStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [isUpdatingStaff, setIsUpdatingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    module_cartelera: canGrantCartelera,
    module_logistics: canGrantLogistics
  });
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  // Helper para resolver URL absoluta de logotipo
  const formatLogoUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const backendUrl = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '');
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${backendUrl}${cleanUrl}`;
  };

  // Compresión inteligente del logotipo en cliente (Canvas)
  const compressLogoImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 500; // Logotipo para web/móvil no necesita más de 500px
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Si es JPEG usamos 0.85, si es PNG/SVG/WebP preservamos transparencia
          const format = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
          resolve(canvas.toDataURL(format, 0.85));
        };
        img.onerror = () => reject(new Error('No se pudo procesar la imagen seleccionada.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsDataURL(file);
    });
  };

  // Manejador de subida de logotipo
  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('Formato Inválido', 'Por favor selecciona un archivo de imagen (PNG, JPG, WebP, SVG).', 'error');
      return;
    }

    setIsCompressingLogo(true);
    Swal.fire({
      title: 'Comprimiendo logotipo...',
      text: 'Ajustando dimensiones y peso ideal para tu marca',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const compressedBase64 = await compressLogoImage(file);
      
      const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const base64Length = compressedBase64.length - (compressedBase64.indexOf(',') + 1);
      const compressedSizeKB = (Math.ceil(base64Length * 3 / 4) / 1024).toFixed(0);
      const reduction = Math.max(0, Math.round((1 - (Math.ceil(base64Length * 3 / 4) / file.size)) * 100));
      const metrics = `Optimizado: ${file.size > 1024*1024 ? originalSizeMB + 'MB' : (file.size/1024).toFixed(0) + 'KB'} → ${compressedSizeKB}KB (-${reduction}%)`;
      setLogoCompressMetrics(metrics);

      // Subir archivo optimizado al servidor
      const res = await api.post('/events/upload', { image: compressedBase64, type: 'logo' });
      Swal.close();

      if (res.data?.status === 'OK' && res.data.url) {
        setLogoUrl(res.data.url);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Logo cargado y optimizado con éxito',
          showConfirmButton: false,
          timer: 2000
        });
      } else {
        setLogoUrl(compressedBase64);
      }
    } catch (err) {
      Swal.close();
      console.error(err);
      Swal.fire('Error', err.message || 'No se pudo subir el logotipo.', 'error');
    } finally {
      setIsCompressingLogo(false);
    }
  };

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
            if (tc.bgColor) setBgColor(tc.bgColor);
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
        bgColor,
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
      const payload = {
        ...newStaff,
        module_cartelera: canGrantCartelera ? Boolean(newStaff.module_cartelera) : false,
        module_logistics: canGrantLogistics ? Boolean(newStaff.module_logistics) : false
      };
      const res = await api.post('/users/my-staff', payload);
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
        setNewStaff({
          name: '',
          email: '',
          phone: '',
          password: '',
          module_cartelera: canGrantCartelera,
          module_logistics: canGrantLogistics
        });
        fetchStaff();
      }
    } catch (err) {
      Swal.fire('Error', err?.response?.data?.message || 'Error al crear el staff.', 'error');
    } finally {
      setIsCreatingStaff(false);
    }
  };

  // Actualizar Staff
  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!editingStaff?.name) {
      Swal.fire('Campos requeridos', 'Ingresa el nombre del staff.', 'warning');
      return;
    }

    setIsUpdatingStaff(true);
    try {
      const payload = {
        name: editingStaff.name,
        phone: editingStaff.phone,
        password: editingStaff.password ? editingStaff.password : undefined,
        module_cartelera: canGrantCartelera ? Boolean(editingStaff.module_cartelera) : false,
        module_logistics: canGrantLogistics ? Boolean(editingStaff.module_logistics) : false
      };
      const res = await api.put(`/users/my-staff/${editingStaff.id}`, payload);
      if (res.data?.status === 'OK') {
        Swal.fire({
          icon: 'success',
          title: '¡Staff Actualizado!',
          text: `Los datos y permisos de ${editingStaff.name} han sido actualizados.`,
          background: '#16171f',
          color: '#fff',
          confirmButtonColor: primaryColor
        });
        setEditingStaff(null);
        fetchStaff();
      }
    } catch (err) {
      Swal.fire('Error', err?.response?.data?.message || 'Error al actualizar el staff.', 'error');
    } finally {
      setIsUpdatingStaff(false);
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>

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

            {/* ── SECCIÓN LOGOTIPO CON COMPRESOR ── */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Logotipo Oficial (PNG Transparente / SVG / WebP):</span>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => { setLogoUrl(''); setLogoCompressMetrics(''); }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ✕ Quitar logo
                  </button>
                )}
              </label>

              <div style={{
                border: '2px dashed rgba(222,184,65,0.3)',
                borderRadius: '14px',
                padding: '16px',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.02)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
              }}>
                {logoUrl && (
                  <div style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.4)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img 
                      src={formatLogoUrl(logoUrl)} 
                      alt="Logo Preview" 
                      style={{ maxHeight: '48px', maxWidth: '100%', objectFit: 'contain' }} 
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}

                <input
                  type="file"
                  id="brand-logo-file-input"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoFileChange}
                  style={{ display: 'none' }}
                />

                <label
                  htmlFor="brand-logo-file-input"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: 'rgba(222,184,65,0.15)',
                    border: '1px solid rgba(222,184,65,0.35)',
                    color: 'var(--accent)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: isCompressingLogo ? 'wait' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <ImageIcon size={18} /> {isCompressingLogo ? 'Comprimiendo...' : (logoUrl ? 'Cambiar y Comprimir Imagen' : 'Subir y Comprimir Logotipo')}
                </label>

                {logoCompressMetrics && (
                  <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '6px' }}>
                    ⚡ {logoCompressMetrics}
                  </div>
                )}

                <div style={{ width: '100%', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    O ingresar enlace URL directo si ya está alojado:
                  </span>
                  <input 
                    type="url"
                    className="input-field"
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    placeholder="https://ejemplo.com/logo.png"
                    style={{ fontSize: '0.78rem', padding: '8px 10px' }}
                  />
                </div>
              </div>
            </div>

            {/* ── PALETA DE COLORES VISUAL (Item 2) ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
                {/* Color Principal */}
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                    Color Principal:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Swatch visual con picker interactivo */}
                    <div 
                      title="Haz clic para seleccionar color"
                      style={{ 
                        position: 'relative', width: '42px', height: '42px', borderRadius: '10px', 
                        backgroundColor: primaryColor, border: '2px solid rgba(255,255,255,0.3)', 
                        boxShadow: `0 4px 12px ${primaryColor}55`, cursor: 'pointer', overflow: 'hidden', flexShrink: 0 
                      }}
                    >
                      <input 
                        type="color" 
                        value={primaryColor} 
                        onChange={e => setPrimaryColor(e.target.value)}
                        style={{ position: 'absolute', top: '-10px', left: '-10px', width: '200%', height: '200%', opacity: 0, cursor: 'pointer' }}
                      />
                    </div>
                    <input 
                      type="text" 
                      value={primaryColor} 
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="input-field" 
                      style={{ textTransform: 'uppercase', fontSize: '0.82rem', fontWeight: 700 }}
                    />
                  </div>
                </div>

                {/* Color Secundario */}
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                    Color Secundario:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div 
                      title="Haz clic para seleccionar color"
                      style={{ 
                        position: 'relative', width: '42px', height: '42px', borderRadius: '10px', 
                        backgroundColor: secondaryColor, border: '2px solid rgba(255,255,255,0.3)', 
                        boxShadow: `0 4px 12px ${secondaryColor}55`, cursor: 'pointer', overflow: 'hidden', flexShrink: 0 
                      }}
                    >
                      <input 
                        type="color" 
                        value={secondaryColor} 
                        onChange={e => setSecondaryColor(e.target.value)}
                        style={{ position: 'absolute', top: '-10px', left: '-10px', width: '200%', height: '200%', opacity: 0, cursor: 'pointer' }}
                      />
                    </div>
                    <input 
                      type="text" 
                      value={secondaryColor} 
                      onChange={e => setSecondaryColor(e.target.value)}
                      className="input-field" 
                      style={{ textTransform: 'uppercase', fontSize: '0.82rem', fontWeight: 700 }}
                    />
                  </div>
                </div>
              </div>

              {/* Presets Rápidos de Marca */}
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Paletas populares predefinidas:
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { name: 'Dorado', pri: '#DEB841', sec: '#b08d2b' },
                    { name: 'Azul Real', pri: '#2563EB', sec: '#1D4ED8' },
                    { name: 'Esmeralda', pri: '#10B981', sec: '#059669' },
                    { name: 'Violeta', pri: '#8B5CF6', sec: '#6D28D9' },
                    { name: 'Carmesí', pri: '#EF4444', sec: '#DC2626' },
                    { name: 'Fucsia', pri: '#EC4899', sec: '#BE185D' }
                  ].map(p => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => { setPrimaryColor(p.pri); setSecondaryColor(p.sec); }}
                      style={{
                        padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.pri, display: 'inline-block' }}></span>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── FONDO TOTAL DE LA PÁGINA (Item 2 - Consulta de Fondo) ── */}
              <div style={{ marginTop: '6px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  Fondo Total de la Plataforma:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div 
                    title="Haz clic para seleccionar fondo"
                    style={{ 
                      position: 'relative', width: '42px', height: '42px', borderRadius: '10px', 
                      backgroundColor: bgColor, border: '2px solid rgba(255,255,255,0.3)', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.6)', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 
                    }}
                  >
                    <input 
                      type="color" 
                      value={bgColor} 
                      onChange={e => setBgColor(e.target.value)}
                      style={{ position: 'absolute', top: '-10px', left: '-10px', width: '200%', height: '200%', opacity: 0, cursor: 'pointer' }}
                    />
                  </div>
                  <input 
                    type="text" 
                    value={bgColor} 
                    onChange={e => setBgColor(e.target.value)}
                    className="input-field" 
                    style={{ textTransform: 'uppercase', fontSize: '0.82rem', fontWeight: 700 }}
                  />
                </div>

                {/* Presets de fondo */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Negro Puro', color: '#050505' },
                    { label: 'Grafito Slate', color: '#0f1117' },
                    { label: 'Azul Marino', color: '#0b1120' },
                    { label: 'Púrpura Oscuro', color: '#120c1f' }
                  ].map(b => (
                    <button
                      key={b.color}
                      type="button"
                      onClick={() => setBgColor(b.color)}
                      style={{
                        padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem',
                        background: bgColor === b.color ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${bgColor === b.color ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}`,
                        color: bgColor === b.color ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Vista Previa de Estilo */}
            <div style={{
              marginTop: '8px', padding: '16px', borderRadius: '14px',
              backgroundColor: bgColor,
              background: `linear-gradient(135deg, ${primaryColor}22 0%, ${bgColor} 100%)`,
              border: `1px solid ${primaryColor}44`,
              display: 'flex', alignItems: 'center', gap: '14px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
            }}>
              {logoUrl ? (
                <img 
                  src={formatLogoUrl(logoUrl)} 
                  alt="Logo Preview" 
                  style={{ height: '40px', maxWidth: '90px', objectFit: 'contain' }} 
                  onError={(e) => { e.target.style.display = 'none'; }} 
                />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900 }}>
                  {brandName ? brandName.charAt(0).toUpperCase() : 'M'}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {brandName || 'Tu Marca'}
                </div>
                <div style={{ color: primaryColor, fontSize: '0.75rem', fontWeight: 600 }}>
                  Vista previa con colores y fondo activos
                </div>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {st.module_cartelera ? (
                          <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '4px', background: 'rgba(245,197,24,0.15)', color: '#f5c518', border: '1px solid rgba(245,197,24,0.3)', fontWeight: 600 }}>
                            🎟️ Cartelera
                          </span>
                        ) : null}
                        {st.module_logistics ? (
                          <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '4px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', fontWeight: 600 }}>
                            📦 Logística
                          </span>
                        ) : null}
                        {!st.module_cartelera && !st.module_logistics && (
                          <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '4px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 600 }}>
                            ⚠️ Sin módulos asignados
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => setEditingStaff({
                          id: st.id,
                          name: st.name,
                          email: st.email,
                          phone: st.phone || '',
                          password: '',
                          module_cartelera: Boolean(st.module_cartelera),
                          module_logistics: Boolean(st.module_logistics)
                        })}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                        title="Editar permisos y clave"
                      >
                        <Edit size={14} /> Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteStaff(st)}
                        style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '7px 9px', borderRadius: '8px', cursor: 'pointer' }}
                        title="Eliminar usuario de staff"
                      >
                        <Trash2 size={15} />
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

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Módulos Autorizados para este Staff:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: canGrantCartelera ? 'pointer' : 'not-allowed', opacity: canGrantCartelera ? 1 : 0.45 }}>
                    <input 
                      type="checkbox"
                      disabled={!canGrantCartelera}
                      checked={Boolean(newStaff.module_cartelera && canGrantCartelera)}
                      onChange={e => setNewStaff({ ...newStaff, module_cartelera: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: primaryColor }}
                    />
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>🎟️ Cartelera de Eventos</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                        {canGrantCartelera ? 'Escaneo de entradas QR y pistas' : 'No disponible (Tu organización no tiene contratado este módulo)'}
                      </span>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: canGrantLogistics ? 'pointer' : 'not-allowed', opacity: canGrantLogistics ? 1 : 0.45 }}>
                    <input 
                      type="checkbox"
                      disabled={!canGrantLogistics}
                      checked={Boolean(newStaff.module_logistics && canGrantLogistics)}
                      onChange={e => setNewStaff({ ...newStaff, module_logistics: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: primaryColor }}
                    />
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>📦 Logística & Entregas</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                        {canGrantLogistics ? 'Validación y canje de kits/lotes en campañas' : 'No disponible (Tu organización no tiene contratado este módulo)'}
                      </span>
                    </div>
                  </label>
                </div>
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
      {/* Modal Editar Staff */}
      {editingStaff && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit size={20} color={primaryColor} /> Editar Personal de Staff
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '18px' }}>
              Modifica los permisos de acceso a módulos o actualiza su contraseña de acceso.
            </p>

            <form onSubmit={handleUpdateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Nombre y Apellido:
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editingStaff.name} 
                  onChange={e => setEditingStaff({ ...editingStaff, name: e.target.value })} 
                  required 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Correo Electrónico (No modificable):
                </label>
                <input 
                  type="email" 
                  className="input-field" 
                  value={editingStaff.email} 
                  disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Teléfono / WhatsApp:
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editingStaff.phone} 
                  onChange={e => setEditingStaff({ ...editingStaff, phone: e.target.value })} 
                  placeholder="0991234567" 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Nueva Contraseña (dejar en blanco para no cambiar):
                </label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={editingStaff.password} 
                  onChange={e => setEditingStaff({ ...editingStaff, password: e.target.value })} 
                  placeholder="Nueva contraseña opcional" 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Módulos Autorizados:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: canGrantCartelera ? 'pointer' : 'not-allowed', opacity: canGrantCartelera ? 1 : 0.45 }}>
                    <input 
                      type="checkbox"
                      disabled={!canGrantCartelera}
                      checked={Boolean(editingStaff.module_cartelera && canGrantCartelera)}
                      onChange={e => setEditingStaff({ ...editingStaff, module_cartelera: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: primaryColor }}
                    />
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>🎟️ Cartelera de Eventos</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                        {canGrantCartelera ? 'Escaneo de entradas QR y pistas' : 'No disponible (Tu organización no tiene contratado este módulo)'}
                      </span>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: canGrantLogistics ? 'pointer' : 'not-allowed', opacity: canGrantLogistics ? 1 : 0.45 }}>
                    <input 
                      type="checkbox"
                      disabled={!canGrantLogistics}
                      checked={Boolean(editingStaff.module_logistics && canGrantLogistics)}
                      onChange={e => setEditingStaff({ ...editingStaff, module_logistics: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: primaryColor }}
                    />
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>📦 Logística & Entregas</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                        {canGrantLogistics ? 'Validación y canje de kits/lotes en campañas' : 'No disponible (Tu organización no tiene contratado este módulo)'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setEditingStaff(null)}
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '12px', borderRadius: '10px' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={isUpdatingStaff}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', fontWeight: 700 }}
                >
                  {isUpdatingStaff ? 'Guardando...' : 'Guardar Cambios'}
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
