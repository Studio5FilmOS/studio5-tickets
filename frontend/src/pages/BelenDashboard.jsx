import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import { 
  Sparkles, Maximize, Minimize, ChevronLeft, 
  Play, Copy, ExternalLink, Layers, CheckCircle2,
  Flower2, Moon, BarChart3
} from 'lucide-react';

// ─── COMPONENTE ESTRELLA DE 5 PUNTAS (SVG) ──────────────────────────────────
const ClassicStar = ({ isLit, index, total }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px',
        transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: isLit ? 'scale(1.08)' : 'scale(0.92)',
        filter: isLit ? 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.95))' : 'none'
      }}
    >
      <svg
        viewBox="0 0 24 24"
        style={{
          width: '38px',
          height: '38px',
          fill: isLit ? '#FFD700' : 'rgba(255, 255, 255, 0.08)',
          stroke: isLit ? '#FFF8DC' : 'rgba(255, 255, 255, 0.2)',
          strokeWidth: '1.2',
          transition: 'all 0.6s ease'
        }}
      >
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
      <span
        style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          marginTop: '2px',
          color: isLit ? '#FFE082' : 'rgba(255,255,255,0.25)',
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        #{String(index + 1).padStart(2, '0')}
      </span>
    </div>
  );
};

// ─── COMPONENTE ROSA FLORECIDA (SVG) ────────────────────────────────────────
const BloomingRose = ({ isLit, index }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px',
        transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: isLit ? 'scale(1.1)' : 'scale(0.9)',
        filter: isLit ? 'drop-shadow(0 0 12px rgba(244, 63, 94, 0.9))' : 'none'
      }}
    >
      <div style={{ fontSize: '34px', lineHeight: 1, filter: isLit ? 'none' : 'grayscale(1) opacity(0.25)' }}>
        🌹
      </div>
      <span
        style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          marginTop: '2px',
          color: isLit ? '#fda4af' : 'rgba(255,255,255,0.25)',
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        #{String(index + 1).padStart(2, '0')}
      </span>
    </div>
  );
};

const BelenDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // Detección de si debe iniciar directamente en modo Live (Enlace público o param live=true)
  const isDirectLiveUrl = location.pathname.includes('/live') || searchParams.get('live') === 'true';
  const [isLive, setIsLive] = useState(isDirectLiveUrl);

  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(params.cid || searchParams.get('cid') || '');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [activeTheme, setActiveTheme] = useState('belen');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [totalItems, setTotalItems] = useState(0);
  const [receivedItems, setReceivedItems] = useState(0);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [loading, setLoading] = useState(true);

  // 1. Cargar Campañas o Datos Públicos de la Campaña
  useEffect(() => {
    const initData = async () => {
      const targetCid = params.cid || searchParams.get('cid');

      try {
        // Intento 1: Cargar campañas disponibles autenticadas
        const res = await api.get('/logistics/campaigns');
        if (res.data?.status === 'OK' && res.data.data.length > 0) {
          setCampaigns(res.data.data);
          let chosen = null;
          if (targetCid && res.data.data.some(c => c.id === targetCid)) {
            chosen = res.data.data.find(c => c.id === targetCid);
          } else {
            chosen = res.data.data[0];
          }
          if (chosen) {
            setSelectedCampaignId(chosen.id);
            setSelectedCampaign(chosen);
            setCampaignTitle(chosen.name);
            setActiveTheme(chosen.theme_config?.theme || 'belen');
          }
        }
      } catch (authErr) {
        // Si no está autenticado (enlace público abierto en TV o proyector):
        if (targetCid) {
          try {
            const pubRes = await api.get(`/logistics/public/campaign/${targetCid}`);
            if (pubRes.data?.status === 'OK') {
              const pubCamp = pubRes.data.data;
              setSelectedCampaignId(pubCamp.id);
              setSelectedCampaign(pubCamp);
              setCampaignTitle(pubCamp.name);
              setActiveTheme(pubCamp.theme_config?.theme || 'belen');
            }
          } catch (pubErr) {
            console.error('Error cargando campaña pública:', pubErr);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [params.cid, searchParams]);

  // 2. Cargar Métricas en tiempo real con polling cada 3.5 segundos
  useEffect(() => {
    if (!selectedCampaignId) return;

    const fetchMetrics = async () => {
      try {
        const camp = campaigns.find(c => c.id === selectedCampaignId) || selectedCampaign;
        if (camp) {
          setCampaignTitle(camp.name);
          if (camp.theme_config?.theme) {
            setActiveTheme(camp.theme_config.theme);
          }
        }

        const res = await api.get(`/logistics/metrics/${selectedCampaignId}`);
        if (res.data?.status === 'OK') {
          const m = res.data.data;
          setTotalItems(m.TOTAL || m.TOTAL_ITEMS || 0);
          // Tomar unidades entregadas exactas (incluyendo parciales):
          setReceivedItems(m.TOTAL_DELIVERED_UNITS ?? m.RECEIVED ?? 0);
        }
      } catch (err) {
        console.error('Error al obtener métricas en vivo:', err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3500);
    return () => clearInterval(interval);
  }, [selectedCampaignId, campaigns, selectedCampaign]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleCopyPublicLink = () => {
    if (!selectedCampaignId) return;
    const tenantPrefix = params.tenant ? `/${params.tenant}` : '';
    const publicUrl = `${window.location.origin}${tenantPrefix}/metas/live/${selectedCampaignId}`;
    navigator.clipboard.writeText(publicUrl);
    Swal.fire({
      icon: 'success',
      title: '¡Enlace Público Copiado!',
      html: `
        <p style="font-size: 0.9rem; color: #cbd5e1;">Puedes abrir este enlace en cualquier Smart TV o proyector sin necesidad de iniciar sesión:</p>
        <code style="background: rgba(255,255,255,0.08); padding: 6px 10px; borderRadius: 8px; color: var(--accent); font-size: 0.8rem; word-break: break-all;">${publicUrl}</code>
      `,
      background: '#16171f',
      color: '#fff',
      confirmButtonColor: '#DEB841'
    });
  };

  const percentage = totalItems > 0 ? Math.min(100, (receivedItems / totalItems) * 100).toFixed(1) : '0';
  const displayCount = Math.min(Math.max(totalItems, 20), 400);

  // ───────────────────────────────────────────────────────────────────────────
  // MODO 1: PANEL / VENTANA PREVIA DE CONFIGURACIÓN Y SELECCIÓN (Item 6)
  // ───────────────────────────────────────────────────────────────────────────
  if (!isLive) {
    return (
      <div 
        style={{ 
          width: '100%',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '28px 16px',
          minHeight: 'calc(100vh - 160px)'
        }}
      >
        <div 
          className="glass-panel" 
          style={{ 
            maxWidth: '560px', 
            width: '100%', 
            padding: '36px 28px', 
            borderRadius: '24px', 
            textAlign: 'center',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
            border: '1px solid rgba(222,184,65,0.25)',
            background: 'linear-gradient(145deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.99))'
          }}
        >
          <div 
            style={{ 
              width: '64px', height: '64px', borderRadius: '20px', 
              background: 'rgba(222,184,65,0.15)', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(222,184,65,0.3)' 
            }}
          >
            <Sparkles size={32} color="#DEB841" />
          </div>

          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>
            Pantalla de Metas & Proyección
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px', lineHeight: 1.5 }}>
            Selecciona la campaña de entrega para lanzar la pantalla interactiva o copiar el enlace para proyector o Smart TV.
          </p>

          {/* Selector de Campaña */}
          {campaigns.length > 0 && (
            <div style={{ textAlign: 'left', marginBottom: '18px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Layers size={14} /> Seleccionar Campaña
              </label>
              <select
                value={selectedCampaignId}
                onChange={(e) => {
                  setSelectedCampaignId(e.target.value);
                  setSearchParams({ cid: e.target.value });
                  const c = campaigns.find(item => item.id === e.target.value);
                  if (c) {
                    setSelectedCampaign(c);
                    setCampaignTitle(c.name);
                    setActiveTheme(c.theme_config?.theme || 'belen');
                  }
                }}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.92rem', fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {campaigns.map(c => (
                  <option key={c.id} value={c.id} style={{ background: '#161722', color: '#fff' }}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tarjeta de Resumen con datos */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Modo Configurado:</span>
              <span style={{ 
                fontSize: '0.78rem', fontWeight: 800, padding: '4px 10px', borderRadius: '8px',
                background: activeTheme === 'belen' ? 'rgba(222,184,65,0.15)' : activeTheme === 'garden' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)',
                color: activeTheme === 'belen' ? '#DEB841' : activeTheme === 'garden' ? '#fda4af' : '#6ee7b7'
              }}>
                {activeTheme === 'belen' ? '🌟 Estrellas de Belén' : activeTheme === 'garden' ? '🌹 Jardín de Rosas' : '📊 Barra de Progreso'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Canjeados</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                  {receivedItems} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>/ {totalItems}</span>
                </div>
              </div>

              <div style={{ background: 'rgba(222,184,65,0.06)', border: '1px solid rgba(222,184,65,0.2)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 800 }}>Porcentaje</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent)', marginTop: '2px' }}>
                  {percentage}%
                </div>
              </div>
            </div>
          </div>

          {/* Botones Principales */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => {
                const liveUrl = selectedCampaignId 
                  ? (params.tenant ? `/${params.tenant}/metas/live/${selectedCampaignId}` : `/metas/live/${selectedCampaignId}`)
                  : (params.tenant ? `/${params.tenant}/metas/live/all` : `/metas/live/all`);
                window.open(liveUrl, '_blank');
              }}
              className="btn-primary"
              style={{
                padding: '14px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <Play size={18} /> Lanzar Animación en Vivo
            </button>

            <button
              onClick={handleCopyPublicLink}
              className="btn-secondary"
              style={{
                padding: '12px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.06)', color: '#fff'
              }}
            >
              <Copy size={16} /> Copiar Enlace Público (TV / Proyector)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MODO 2: PANTALLA EN VIVO COMPLETA E INDEPENDIENTE (Item 7)
  // Sin barras de Studio 5, con tema fijo configurado y botón para regresar
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: activeTheme === 'belen' 
          ? 'radial-gradient(ellipse at bottom, #0d1527 0%, #050608 100%)'
          : activeTheme === 'garden'
          ? 'radial-gradient(ellipse at bottom, #064e3b 0%, #022c22 100%)'
          : '#0a0b10',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      
      {/* ─── BARRA FLOTANTE MÍNIMA Y NO INVASIVA ──────────────────────────────── */}
      <header
        style={{
          flexShrink: 0,
          background: 'rgba(10, 12, 18, 0.75)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100
        }}
      >
        {/* Botón discreto para regresar al panel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => setIsLive(false)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              transition: 'background 0.2s'
            }}
            title="Volver al panel"
          >
            <ChevronLeft size={16} /> Regresar al Panel
          </button>

          <div>
            <span style={{ fontSize: '0.62rem', color: '#DEB841', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={11} /> Proyección Oficial
            </span>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
              {campaignTitle || 'Campaña en Vivo'}
            </h2>
          </div>
        </div>

        {/* Métricas y Porcentaje */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              Entregas
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#DEB841', lineHeight: 1 }}>
              {receivedItems} <span style={{ fontSize: '0.95rem', color: '#94a3b8' }}>/ {totalItems}</span>
            </div>
          </div>

          <div
            style={{
              background: 'linear-gradient(135deg, rgba(222,184,65,0.2) 0%, rgba(222,184,65,0.05) 100%)',
              border: '1px solid rgba(222,184,65,0.4)',
              borderRadius: '12px',
              padding: '4px 14px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
              {percentage}%
            </div>
            <span style={{ fontSize: '0.58rem', color: '#DEB841', fontWeight: 800, textTransform: 'uppercase' }}>
              Meta
            </span>
          </div>

          {/* Botón Fullscreen */}
          <button
            onClick={toggleFullscreen}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#cbd5e1',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Pantalla Completa"
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </header>

      {/* ─── ÁREA PRINCIPAL DE ANIMACIÓN EN VIVO (SIN MENÚS) ──────────────────── */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: activeTheme === 'bar' ? 'center' : 'flex-start'
        }}
      >
        {activeTheme === 'bar' ? (
          /* VISTA 1: BARRA DE PROGRESO */
          <div style={{ width: '100%', maxWidth: '850px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2.8rem', fontWeight: 900, marginBottom: '24px', color: '#fff', letterSpacing: '-0.5px' }}>
              {campaignTitle}
            </h1>
            
            <div style={{ width: '100%', height: '40px', background: 'rgba(255,255,255,0.08)', borderRadius: '20px', overflow: 'hidden', padding: '4px', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 0 50px rgba(0,0,0,0.6)' }}>
              <div
                style={{
                  width: `${percentage}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #DEB841 0%, #10b981 100%)',
                  borderRadius: '16px',
                  boxShadow: '0 0 24px rgba(16,185,129,0.7)',
                  transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px', color: '#94a3b8', fontSize: '1.2rem', fontWeight: 700 }}>
              <span>0 canastas</span>
              <span style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 900 }}>{receivedItems} Entregadas</span>
              <span>{totalItems} Meta</span>
            </div>
          </div>
        ) : (
          /* VISTA 2 O 3: MATRIZ DE ELEMENTOS (ESTRELLAS O ROSAS) */
          <div style={{ width: '100%', maxWidth: '1400px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))',
                gap: '12px',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {Array.from({ length: displayCount }, (_, i) => {
                const isLit = i < receivedItems;

                if (activeTheme === 'garden') {
                  return <BloomingRose key={i} index={i} isLit={isLit} />;
                }
                return <ClassicStar key={i} index={i} total={displayCount} isLit={isLit} />;
              })}
            </div>
          </div>
        )}
      </main>

    </div>
  );
};

export default BelenDashboard;
