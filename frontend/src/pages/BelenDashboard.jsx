import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import { 
  Sparkles, Maximize, Minimize, ChevronLeft, 
  Play, Copy, ExternalLink, Layers, CheckCircle2,
  Flower2, Moon, BarChart3, PartyPopper
} from 'lucide-react';

// ─── AMBIENTE DE PARTÍCULAS / POLVO ESTELAR / LUCIÉRNAGAS FLOTANTES ─────────
const AmbientParticles = ({ theme }) => {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${(i * 4.3 + (i % 4) * 2.8) % 96}%`,
    duration: `${6 + (i % 5) * 2.2}s`,
    delay: `${(i * 0.6) % 6}s`,
    size: `${3 + (i % 3) * 2}px`,
    opacity: 0.25 + (i % 4) * 0.15
  }));

  const particleColor = 
    theme === 'belen' 
      ? 'rgba(255, 215, 0, 0.75)' 
      : theme === 'garden' 
      ? 'rgba(251, 113, 133, 0.75)' 
      : 'rgba(52, 211, 153, 0.75)';

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            bottom: '-20px',
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: particleColor,
            boxShadow: `0 0 10px ${particleColor}, 0 0 16px ${particleColor}`,
            opacity: p.opacity,
            animation: `particleDrift ${p.duration} linear infinite`,
            animationDelay: p.delay
          }}
        />
      ))}
    </div>
  );
};

// ─── COMPONENTE ESTRELLA DE 5 PUNTAS CON CENTELLEO Y DESTELLO VIVO (SVG) ────
const ClassicStar = ({ isLit, index, total }) => {
  const pulseDelay = ((index * 0.37) % 3.2).toFixed(2);
  const sparkleDelay = ((index * 0.63) % 4.8).toFixed(2);
  const floatDelay = ((index * 0.45) % 4.0).toFixed(2);

  return (
    <div
      className={`star-container ${isLit ? 'star-lit' : 'star-unlit'}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        position: 'relative',
        animation: isLit 
          ? `starFloat 4s ease-in-out infinite` 
          : `unlitBreath 3.5s ease-in-out infinite`,
        animationDelay: `${floatDelay}s`
      }}
    >
      <div 
        style={{ 
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Halo resplandeciente pulsante detrás de estrellas encendidas */}
        {isLit && (
          <div
            className="star-halo"
            style={{
              position: 'absolute',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 215, 0, 0.45) 0%, rgba(255, 180, 0, 0) 70%)',
              animation: `starPulseHalo 3s ease-in-out infinite`,
              animationDelay: `${pulseDelay}s`,
              pointerEvents: 'none'
            }}
          />
        )}

        {/* Estrella SVG con gradiente y centelleo */}
        <svg
          viewBox="0 0 24 24"
          className={isLit ? 'star-svg-lit' : 'star-svg-unlit'}
          style={{
            width: 'clamp(28px, 6vw, 40px)',
            height: 'clamp(28px, 6vw, 40px)',
            animation: isLit ? `starTwinkle 3.2s ease-in-out infinite` : 'none',
            animationDelay: `${pulseDelay}s`
          }}
        >
          <defs>
            <linearGradient id={`starGrad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF7C2" />
              <stop offset="50%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#FF9800" />
            </linearGradient>
          </defs>
          <polygon 
            points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" 
            fill={isLit ? `url(#starGrad-${index})` : 'rgba(255, 255, 255, 0.08)'}
            stroke={isLit ? '#FFF8DC' : 'rgba(255, 255, 255, 0.2)'}
            strokeWidth="1.2"
          />
        </svg>

        {/* Destello de diamante brillante (✦) que aparece con rotación y fulgor */}
        {isLit && (
          <div
            className="star-glint"
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              fontSize: '12px',
              color: '#FFF9C4',
              textShadow: '0 0 8px #FFF, 0 0 15px #FFD700',
              pointerEvents: 'none',
              animation: `starGlint 4.2s ease-in-out infinite`,
              animationDelay: `${sparkleDelay}s`
            }}
          >
            ✦
          </div>
        )}
      </div>

      <span
        style={{
          fontSize: 'clamp(0.58rem, 1.8vw, 0.65rem)',
          fontWeight: 700,
          marginTop: '3px',
          color: isLit ? '#FFE082' : 'rgba(255,255,255,0.22)',
          fontVariantNumeric: 'tabular-nums',
          textShadow: isLit ? '0 0 8px rgba(255,215,0,0.5)' : 'none'
        }}
      >
        #{String(index + 1).padStart(2, '0')}
      </span>
    </div>
  );
};

// ─── COMPONENTE ROSA FLORECIDA CON BALANCEO Y GOTAS DE BRILLO (VIVO) ────────
const BloomingRose = ({ isLit, index }) => {
  const swayDelay = ((index * 0.42) % 3.6).toFixed(2);
  const glowDelay = ((index * 0.55) % 4.2).toFixed(2);
  const sparkleDelay = ((index * 0.68) % 5.0).toFixed(2);

  return (
    <div
      className={`rose-container ${isLit ? 'rose-lit' : 'rose-unlit'}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        position: 'relative'
      }}
    >
      <div 
        style={{ 
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Halo carmesí / rubí pulsante detrás de rosas florecidas */}
        {isLit && (
          <div
            className="rose-halo"
            style={{
              position: 'absolute',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(244, 63, 94, 0.4) 0%, rgba(244, 63, 94, 0) 70%)',
              animation: `roseHaloPulse 3.5s ease-in-out infinite`,
              animationDelay: `${glowDelay}s`,
              pointerEvents: 'none'
            }}
          />
        )}

        {/* Emoji de Rosa con balanceo orgánico de brisa */}
        <div
          className={isLit ? 'rose-emoji-lit' : 'rose-emoji-unlit'}
          style={{
            fontSize: 'clamp(28px, 6vw, 36px)',
            lineHeight: 1,
            filter: isLit ? 'none' : 'grayscale(1) opacity(0.25)',
            animation: isLit 
              ? `roseSway 3.8s ease-in-out infinite` 
              : `unlitBreath 4s ease-in-out infinite`,
            animationDelay: `${swayDelay}s`
          }}
        >
          🌹
        </div>

        {/* Destello de rocío brillante que centellea */}
        {isLit && (
          <div
            className="rose-dewdrop"
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              fontSize: '11px',
              color: '#fda4af',
              textShadow: '0 0 10px #f43f5e, 0 0 18px #fff',
              pointerEvents: 'none',
              animation: `dewdropGlint 4.5s ease-in-out infinite`,
              animationDelay: `${sparkleDelay}s`
            }}
          >
            ✨
          </div>
        )}
      </div>

      <span
        style={{
          fontSize: 'clamp(0.58rem, 1.8vw, 0.65rem)',
          fontWeight: 700,
          marginTop: '3px',
          color: isLit ? '#fda4af' : 'rgba(255,255,255,0.22)',
          fontVariantNumeric: 'tabular-nums',
          textShadow: isLit ? '0 0 8px rgba(244,63,94,0.5)' : 'none'
        }}
      >
        #{String(index + 1).padStart(2, '0')}
      </span>
    </div>
  );
};

// Helper para procesar theme_config de forma segura (objeto o JSON string)
const parseThemeConfig = (config) => {
  if (!config) return {};
  if (typeof config === 'string') {
    try {
      return JSON.parse(config);
    } catch {
      return {};
    }
  }
  return config;
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
  const [newDeliveryAlert, setNewDeliveryAlert] = useState(false);
  const prevReceivedRef = useRef(null);

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
            const tc = parseThemeConfig(chosen.theme_config);
            setActiveTheme(tc?.theme || 'belen');
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
              const tc = parseThemeConfig(pubCamp.theme_config);
              setActiveTheme(tc?.theme || 'belen');
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
          const tc = parseThemeConfig(camp.theme_config);
          if (tc?.theme) {
            setActiveTheme(tc.theme);
          }
        }

        const res = await api.get(`/logistics/metrics/${selectedCampaignId}`);
        if (res.data?.status === 'OK') {
          const m = res.data.data;
          setTotalItems(m.TOTAL || m.TOTAL_ITEMS || 0);
          // Tomar unidades entregadas exactas (incluyendo parciales):
          const currentReceived = m.TOTAL_DELIVERED_UNITS ?? m.RECEIVED ?? 0;
          if (prevReceivedRef.current !== null && currentReceived > prevReceivedRef.current) {
            setNewDeliveryAlert(true);
            setTimeout(() => setNewDeliveryAlert(false), 4500);
          }
          prevReceivedRef.current = currentReceived;
          setReceivedItems(currentReceived);
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

          {loading ? (
            <div className="spinner" style={{ margin: '40px auto' }}></div>
          ) : campaigns.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📦</div>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '8px' }}>
                No tienes campañas asignadas
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '20px' }}>
                Aún no tienes campañas de entrega asociadas a tu cuenta. Solicita a tu organizador que te asigne a una campaña activa y te configure un lote.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary"
                style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '0.85rem' }}
              >
                🔄 Recargar
              </button>
            </div>
          ) : (
            <>
          {/* Selector de Campaña */}
          {campaigns.length > 0 && (
            <div style={{ textAlign: 'left', marginBottom: '18px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Layers size={14} /> Seleccionar Campaña
              </label>
              <select
                value={selectedCampaignId}
                onChange={(e) => {
                  const newCid = e.target.value;
                  setSelectedCampaignId(newCid);
                  setSearchParams({ cid: newCid });
                  const c = campaigns.find(item => item.id === newCid);
                  if (c) {
                    setSelectedCampaign(c);
                    setCampaignTitle(c.name);
                    const tc = parseThemeConfig(c.theme_config);
                    setActiveTheme(tc?.theme || 'belen');
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
              onClick={() => setIsLive(true)}
              className="btn-primary"
              style={{
                padding: '14px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <Play size={18} /> Iniciar Animación en Esta Pantalla
            </button>

            <button
              onClick={() => {
                const liveUrl = selectedCampaignId 
                  ? (params.tenant ? `/${params.tenant}/metas/live/${selectedCampaignId}` : `/metas/live/${selectedCampaignId}`)
                  : (params.tenant ? `/${params.tenant}/metas/live/all` : `/metas/live/all`);
                window.open(liveUrl, '_blank');
              }}
              className="btn-secondary"
              style={{
                padding: '12px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.06)', color: '#fff'
              }}
            >
              <ExternalLink size={16} /> Abrir Ventana para TV / Proyector
            </button>

            <button
              onClick={handleCopyPublicLink}
              className="btn-secondary"
              style={{
                padding: '12px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.03)', color: '#94a3b8'
              }}
            >
              <Copy size={16} /> Copiar Enlace Público (TV / Proyector)
            </button>
          </div>
            </>
          )}
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
      className="live-projection-root"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        background: activeTheme === 'belen' 
          ? 'radial-gradient(ellipse at bottom, #0d1527 0%, #050608 100%)'
          : activeTheme === 'garden'
          ? 'radial-gradient(ellipse at bottom, #064e3b 0%, #022c22 100%)'
          : '#0a0b10',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Polvo estelar / luciérnagas flotantes de ambiente */}
      <AmbientParticles theme={activeTheme} />
      
      {/* ─── BARRA SUPERIOR TOTALMENTE ADAPTATIVA A MÓVIL Y TV ───────────────── */}
      <header
        className="live-header"
        style={{
          flexShrink: 0,
          background: 'rgba(10, 12, 18, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: 'max(8px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 8px max(12px, env(safe-area-inset-left))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          width: '100%',
          boxSizing: 'border-box',
          zIndex: 100,
          position: 'relative'
        }}
      >
        {/* Izquierda: Botón regresar y Título con truncado seguro */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 1 }}>
          <button
            onClick={() => setIsLive(false)}
            aria-label="Regresar al Panel"
            title="Regresar al Panel"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              flexShrink: 0,
              transition: 'all 0.2s ease'
            }}
          >
            <ChevronLeft size={16} />
            <span className="live-btn-text">Panel</span>
          </button>

          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <span style={{ 
              fontSize: 'clamp(0.55rem, 1.6vw, 0.65rem)', 
              color: '#DEB841', 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              letterSpacing: '1px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              whiteSpace: 'nowrap'
            }}>
              <Sparkles size={10} /> Proyección
            </span>
            <h2 
              title={campaignTitle || 'Campaña en Vivo'}
              style={{ 
                fontSize: 'clamp(0.82rem, 2.4vw, 1.05rem)', 
                fontWeight: 800, 
                margin: 0, 
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 'clamp(110px, 30vw, 360px)'
              }}
            >
              {campaignTitle || 'Campaña en Vivo'}
            </h2>
          </div>
        </div>

        {/* Derecha: Métricas, Alerta de Entrega y Porcentaje */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(6px, 1.8vw, 14px)', flexShrink: 0 }}>
          {/* Banner emergente cuando se registra una nueva entrega en vivo */}
          {newDeliveryAlert && (
            <div
              className="celebration-badge"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '8px',
                fontSize: '0.68rem',
                fontWeight: 800,
                boxShadow: '0 0 16px rgba(16,185,129,0.7)',
                whiteSpace: 'nowrap',
                animation: 'celebrationPop 0.5s ease-out'
              }}
            >
              <PartyPopper size={13} />
              <span className="live-badge-text">¡+1 Entregado!</span>
            </div>
          )}

          {/* Contador Entregas */}
          <div style={{ textAlign: 'right', minWidth: 'fit-content' }}>
            <span style={{ 
              fontSize: 'clamp(0.52rem, 1.4vw, 0.65rem)', 
              color: 'rgba(255,255,255,0.5)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.8px', 
              fontWeight: 700,
              display: 'block'
            }}>
              Entregas
            </span>
            <div style={{ 
              fontSize: 'clamp(1rem, 3.2vw, 1.45rem)', 
              fontWeight: 900, 
              color: '#DEB841', 
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}>
              {receivedItems}
              <span style={{ fontSize: 'clamp(0.72rem, 2.2vw, 0.95rem)', color: '#94a3b8', fontWeight: 600 }}>
                /{totalItems}
              </span>
            </div>
          </div>

          {/* Badge de Porcentaje */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(222,184,65,0.25) 0%, rgba(222,184,65,0.08) 100%)',
              border: '1px solid rgba(222,184,65,0.4)',
              borderRadius: '10px',
              padding: 'clamp(3px, 0.8vw, 5px) clamp(7px, 1.6vw, 12px)',
              textAlign: 'center',
              minWidth: 'clamp(46px, 11vw, 64px)'
            }}
          >
            <div style={{ 
              fontSize: 'clamp(0.95rem, 3vw, 1.35rem)', 
              fontWeight: 900, 
              color: '#fff', 
              lineHeight: 1 
            }}>
              {percentage}%
            </div>
            <span style={{ 
              fontSize: 'clamp(0.48rem, 1.3vw, 0.58rem)', 
              color: '#DEB841', 
              fontWeight: 800, 
              textTransform: 'uppercase',
              display: 'block'
            }}>
              Meta
            </span>
          </div>

          {/* Botón Pantalla Completa */}
          <button
            onClick={toggleFullscreen}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#cbd5e1',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            title="Pantalla Completa"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </header>

      {/* ─── ÁREA PRINCIPAL DE ANIMACIÓN EN VIVO (SIN MENÚS) ──────────────────── */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'clamp(14px, 3vw, 28px) clamp(10px, 3vw, 32px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: activeTheme === 'bar' ? 'center' : 'flex-start',
          position: 'relative',
          zIndex: 2
        }}
      >
        {activeTheme === 'bar' ? (
          /* VISTA 1: BARRA DE PROGRESO VIVA CON EFECTO DE ONDA Y ORBE */
          <div style={{ width: '100%', maxWidth: '850px', textAlign: 'center', padding: '0 10px' }}>
            <h1 style={{ fontSize: 'clamp(1.6rem, 4.5vw, 2.8rem)', fontWeight: 900, marginBottom: '24px', color: '#fff', letterSpacing: '-0.5px' }}>
              {campaignTitle}
            </h1>
            
            <div style={{ 
              width: '100%', 
              height: 'clamp(32px, 5vw, 46px)', 
              background: 'rgba(255,255,255,0.08)', 
              borderRadius: '24px', 
              overflow: 'hidden', 
              padding: '4px', 
              border: '1px solid rgba(255,255,255,0.18)', 
              boxShadow: '0 0 50px rgba(0,0,0,0.6)',
              position: 'relative'
            }}>
              <div
                className="animated-progress-fill"
                style={{
                  width: `${percentage}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #DEB841 0%, #10b981 50%, #34d399 75%, #DEB841 100%)',
                  backgroundSize: '200% 100%',
                  borderRadius: '20px',
                  boxShadow: '0 0 28px rgba(16,185,129,0.7)',
                  transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  animation: 'barShimmerFlow 3.5s linear infinite',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end'
                }}
              >
                {/* Orbe de Luz brillante en la punta del avance */}
                {parseFloat(percentage) > 0 && (
                  <div
                    className="progress-head-orb"
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: '#fff',
                      marginRight: '2px',
                      animation: 'headOrbPulse 2s ease-in-out infinite',
                      flexShrink: 0
                    }}
                  />
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px', color: '#94a3b8', fontSize: 'clamp(0.85rem, 2.2vw, 1.2rem)', fontWeight: 700 }}>
              <span>0 canastas</span>
              <span style={{ color: '#fff', fontSize: 'clamp(1.15rem, 3.2vw, 1.8rem)', fontWeight: 900 }}>
                {receivedItems} Entregadas
              </span>
              <span>{totalItems} Meta</span>
            </div>
          </div>
        ) : (
          /* VISTA 2 O 3: MATRIZ DE ELEMENTOS (ESTRELLAS O ROSAS VIVAS) */
          <div style={{ width: '100%', maxWidth: '1400px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(52px, 12vw, 76px), 1fr))',
                gap: 'clamp(6px, 1.5vw, 12px)',
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

      {/* ─── HOJA DE ESTILOS CSS CON MICRO-ANIMACIONES DE BRILLO, BALANCEO Y ONDAS ── */}
      <style>{`
        @keyframes starFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        @keyframes starTwinkle {
          0%, 100% { 
            transform: scale(1); 
            filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.6)); 
          }
          50% { 
            transform: scale(1.08); 
            filter: drop-shadow(0 0 16px rgba(255, 235, 59, 1)) drop-shadow(0 0 24px rgba(255, 215, 0, 0.8)); 
          }
        }

        @keyframes starPulseHalo {
          0%, 100% { transform: scale(0.9); opacity: 0.35; }
          50% { transform: scale(1.3); opacity: 0.75; }
        }

        @keyframes starGlint {
          0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
          40% { transform: scale(1.2) rotate(90deg); opacity: 1; }
          60% { transform: scale(1.4) rotate(180deg); opacity: 1; }
          80% { transform: scale(0.2) rotate(270deg); opacity: 0.2; }
        }

        @keyframes unlitBreath {
          0%, 100% { opacity: 0.22; }
          50% { opacity: 0.42; }
        }

        @keyframes roseSway {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(-3.5deg) translateY(-2px); }
          75% { transform: rotate(3.5deg) translateY(-1px); }
        }

        @keyframes roseHaloPulse {
          0%, 100% { transform: scale(0.9); opacity: 0.3; }
          50% { transform: scale(1.25); opacity: 0.75; }
        }

        @keyframes dewdropGlint {
          0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
          35% { transform: scale(1.3) rotate(45deg); opacity: 1; }
          70% { transform: scale(0) rotate(90deg); opacity: 0; }
        }

        @keyframes barShimmerFlow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }

        @keyframes headOrbPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 10px #fff, 0 0 20px #10b981, 0 0 30px #DEB841; }
          50% { transform: scale(1.35); box-shadow: 0 0 16px #fff, 0 0 30px #34d399, 0 0 45px #DEB841; }
        }

        @keyframes particleDrift {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          15% {
            opacity: 0.7;
          }
          85% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(-105vh) translateX(25px);
            opacity: 0;
          }
        }

        @keyframes celebrationPop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        @media (max-width: 520px) {
          .live-btn-text {
            display: none !important;
          }
          .live-badge-text {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
};

export default BelenDashboard;
