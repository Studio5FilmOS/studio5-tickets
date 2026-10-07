import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Sparkles, Moon, Flower2, BarChart3, RefreshCw, Maximize, Minimize, Layers } from 'lucide-react';

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

  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [activeTheme, setActiveTheme] = useState('belen');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [totalItems, setTotalItems] = useState(0);
  const [receivedItems, setReceivedItems] = useState(0);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [loading, setLoading] = useState(true);

  // 1. Cargar Campañas disponibles
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await api.get('/logistics/campaigns');
        if (res.data?.status === 'OK' && res.data.data.length > 0) {
          setCampaigns(res.data.data);
          const cidFromUrl = searchParams.get('cid');
          if (cidFromUrl && res.data.data.some(c => c.id === cidFromUrl)) {
            setSelectedCampaignId(cidFromUrl);
          } else {
            setSelectedCampaignId(res.data.data[0].id);
          }
        }
      } catch (err) {
        console.error('Error al cargar campañas en metas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, [searchParams]);

  // 2. Cargar Métricas en tiempo real con polling cada 4 segundos
  useEffect(() => {
    if (!selectedCampaignId) return;

    const fetchMetrics = async () => {
      try {
        const camp = campaigns.find(c => c.id === selectedCampaignId);
        if (camp) {
          setCampaignTitle(camp.name);
          if (camp.theme_config?.theme) {
            setActiveTheme(camp.theme_config.theme);
          }
        }

        const res = await api.get(`/logistics/metrics/${selectedCampaignId}`);
        if (res.data?.status === 'OK') {
          const m = res.data.data;
          setTotalItems(m.TOTAL || 0);
          setReceivedItems(m.RECEIVED || 0);
        }
      } catch (err) {
        console.error('Error al obtener métricas en vivo:', err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 4000);
    return () => clearInterval(interval);
  }, [selectedCampaignId, campaigns]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const percentage = totalItems > 0 ? Math.min(100, (receivedItems / totalItems) * 100).toFixed(1) : '0';

  // Total de elementos para renderizar la cuadrícula (máximo 400 para rendimiento visual)
  const displayCount = Math.min(Math.max(totalItems, 20), 400);

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
      
      {/* ─── BARRA SUPERIOR FIJA NO INTRUSIVA ─────────────────────────────────── */}
      <header
        style={{
          flexShrink: 0,
          background: 'rgba(10, 12, 18, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          zIndex: 100,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}
      >
        {/* Selector de Campaña & Título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '0.65rem', color: '#DEB841', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={12} /> Pantalla Oficial en Vivo
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
              {campaigns.length > 0 ? (
                <select
                  value={selectedCampaignId}
                  onChange={(e) => {
                    setSelectedCampaignId(e.target.value);
                    setSearchParams({ cid: e.target.value });
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id} style={{ background: '#161722', color: '#fff' }}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Cargando campaña...</h2>
              )}
            </div>
          </div>
        </div>

        {/* Contador Central Enorme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              Entregas Realizadas
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#DEB841', lineHeight: 1 }}>
              {receivedItems} <span style={{ fontSize: '1.1rem', color: '#94a3b8' }}>/ {totalItems}</span>
            </div>
          </div>

          {/* Pill Porcentaje */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(222,184,65,0.2) 0%, rgba(222,184,65,0.05) 100%)',
              border: '1px solid rgba(222,184,65,0.4)',
              borderRadius: '14px',
              padding: '6px 16px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
              {percentage}%
            </div>
            <span style={{ fontSize: '0.62rem', color: '#DEB841', fontWeight: 800, textTransform: 'uppercase' }}>
              Completado
            </span>
          </div>
        </div>

        {/* Selector de Tema & Fullscreen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '10px',
              padding: '4px',
              display: 'flex',
              gap: '4px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <button
              onClick={() => setActiveTheme('belen')}
              style={{
                background: activeTheme === 'belen' ? 'rgba(222,184,65,0.25)' : 'transparent',
                border: 'none',
                color: activeTheme === 'belen' ? '#DEB841' : '#cbd5e1',
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: 700
              }}
              title="Estrellas de Belén"
            >
              <Moon size={14} /> Belén
            </button>

            <button
              onClick={() => setActiveTheme('garden')}
              style={{
                background: activeTheme === 'garden' ? 'rgba(244,63,94,0.25)' : 'transparent',
                border: 'none',
                color: activeTheme === 'garden' ? '#fda4af' : '#cbd5e1',
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: 700
              }}
              title="Jardín de Rosas"
            >
              <Flower2 size={14} /> Rosas
            </button>

            <button
              onClick={() => setActiveTheme('bar')}
              style={{
                background: activeTheme === 'bar' ? 'rgba(16,185,129,0.25)' : 'transparent',
                border: 'none',
                color: activeTheme === 'bar' ? '#6ee7b7' : '#cbd5e1',
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: 700
              }}
              title="Barra de Progreso"
            >
              <BarChart3 size={14} /> Barra
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#cbd5e1',
              borderRadius: '8px',
              padding: '8px 10px',
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

      {/* ─── ÁREA PRINCIPAL DE VISUALIZACIÓN (CUADRÍCULA / MATRIZ) ─────────────── */}
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
          /* VISTA BARRA */
          <div style={{ width: '100%', maxWidth: '850px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '20px', color: '#fff' }}>
              {campaignTitle || 'Progreso de Entregas'}
            </h1>
            
            <div style={{ width: '100%', height: '36px', background: 'rgba(255,255,255,0.08)', borderRadius: '18px', overflow: 'hidden', padding: '4px', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}>
              <div
                style={{
                  width: `${percentage}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #DEB841 0%, #10b981 100%)',
                  borderRadius: '14px',
                  boxShadow: '0 0 20px rgba(16,185,129,0.7)',
                  transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', color: '#94a3b8', fontSize: '1.2rem', fontWeight: 700 }}>
              <span>0 canastas</span>
              <span style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 900 }}>{receivedItems} Entregadas</span>
              <span>{totalItems} Meta</span>
            </div>
          </div>
        ) : (
          /* VISTA MATRIZ / CUADRÍCULA (BELÉN O JARDÍN) */
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
