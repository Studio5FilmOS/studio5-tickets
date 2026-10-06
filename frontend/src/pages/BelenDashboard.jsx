import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Sparkles, Moon, Sun, Flower2, BarChart3, RefreshCw, Layers } from 'lucide-react';

// ─── TEMA 1: NOCHE DE ESTRELLAS (BELÉN) ─────────────────────────────────────
const ThemeBelen = ({ total, received, title }) => {
  // Generar posiciones deterministas de estrellas para no recalcular en cada render
  const starPositions = useMemo(() => {
    const count = Math.min(Math.max(total, 50), 300); // Entre 50 y 300 estrellas visibles
    return Array.from({ length: count }, (_, i) => ({
      top: `${(Math.sin(i * 99) * 0.5 + 0.5) * 75}%`,
      left: `${(Math.cos(i * 33) * 0.5 + 0.5) * 98}%`,
      size: `${(i % 3) + 2}px`,
      delay: `${(i % 5) * 0.6}s`
    }));
  }, [total]);

  // Proporción de estrellas activas según porcentaje
  const activeStarCount = total > 0 ? Math.round((received / total) * starPositions.length) : 0;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      background: 'radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)',
      overflow: 'hidden'
    }}>
      {/* Luna / Luz Celestial */}
      <div style={{
        position: 'absolute', top: '8%', right: '12%', width: '90px', height: '90px',
        borderRadius: '50%', background: '#fffef0',
        boxShadow: '0 0 50px 15px rgba(255, 250, 200, 0.45)', opacity: 0.95
      }} />

      {/* Estrellas en el cielo */}
      {starPositions.map((pos, index) => {
        const isLit = index < activeStarCount;
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: pos.top,
              left: pos.left,
              width: pos.size,
              height: pos.size,
              backgroundColor: isLit ? '#ffffff' : 'rgba(255,255,255,0.12)',
              borderRadius: '50%',
              boxShadow: isLit ? '0 0 10px 3px rgba(255, 255, 255, 0.9)' : 'none',
              transform: isLit ? 'scale(1.4)' : 'scale(1)',
              transition: 'all 1.2s ease-in-out',
              animation: isLit ? `twinkle 3s infinite ${pos.delay}` : 'none'
            }}
          />
        );
      })}

      {/* Horizonte con silueta y título */}
      <div style={{
        position: 'absolute', bottom: 0, width: '100%', height: '35%',
        background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 60%, transparent 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
        paddingBottom: '5vh'
      }}>
        <h1 style={{
          fontSize: '2.8rem',
          textShadow: '0 0 25px rgba(222,184,65,0.7)',
          fontFamily: 'serif',
          letterSpacing: '4px',
          color: '#DEB841',
          margin: '0 0 8px 0',
          textAlign: 'center',
          padding: '0 20px'
        }}>
          {title || 'Campaña de Entregas'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '2px', fontSize: '1rem', textTransform: 'uppercase' }}>
          Cada estrella representa una canasta entregada
        </p>
      </div>
    </div>
  );
};

// ─── TEMA 2: JARDÍN DE DONACIONES ───────────────────────────────────────────
const ThemeGarden = ({ total, received, title }) => {
  const flowerCount = Math.min(Math.max(total, 30), 120);
  const activeCount = total > 0 ? Math.round((received / total) * flowerCount) : 0;

  const flowerPositions = useMemo(() => {
    return Array.from({ length: flowerCount }, (_, i) => ({
      bottom: `${(Math.sin(i * 77) * 0.5 + 0.5) * 35 + 5}%`,
      left: `${(i / flowerCount) * 94 + 3}%`,
      delay: `${(i % 6) * 0.2}s`
    }));
  }, [flowerCount]);

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      background: 'linear-gradient(to bottom, #38bdf8 0%, #bae6fd 55%, #15803d 55%, #166534 100%)',
      overflow: 'hidden'
    }}>
      {/* Sol */}
      <div style={{
        position: 'absolute', top: '10%', left: '10%', width: '100px', height: '100px',
        borderRadius: '50%', background: '#fef08a',
        boxShadow: '0 0 60px 25px rgba(254, 240, 138, 0.6)'
      }} />

      {/* Título */}
      <div style={{ position: 'absolute', top: '10%', width: '100%', textAlign: 'center' }}>
        <h1 style={{
          fontSize: '3rem', color: '#0f172a', fontWeight: 900,
          textShadow: '0 2px 10px rgba(255,255,255,0.8)', margin: '0 0 8px 0'
        }}>
          {title || 'Jardín de Entregas'}
        </h1>
        <p style={{ color: '#1e293b', fontWeight: 600, fontSize: '1.1rem' }}>
          Floreciendo con cada entrega completada
        </p>
      </div>

      {/* Flores brotando en el pasto */}
      {flowerPositions.map((pos, index) => {
        const isBloomed = index < activeCount;
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              bottom: pos.bottom,
              left: pos.left,
              fontSize: '2.5rem',
              opacity: isBloomed ? 1 : 0.2,
              transform: isBloomed ? 'scale(1) translateY(0)' : 'scale(0.3) translateY(20px)',
              transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
              filter: isBloomed ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'grayscale(1)'
            }}
          >
            🌹
          </div>
        );
      })}
    </div>
  );
};

// ─── TEMA 3: BARRA DE PROGRESO MODERNA ──────────────────────────────────────
const ThemeBar = ({ total, received, title }) => {
  const percentage = total > 0 ? Math.min(100, (received / total) * 100) : 0;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      background: 'linear-gradient(135deg, #090d16 0%, #111827 50%, #030712 100%)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      padding: '20px'
    }}>
      <h1 style={{ color: '#fff', fontSize: '3rem', fontWeight: 900, marginBottom: '10px', textAlign: 'center' }}>
        {title || 'Progreso de la Campaña'}
      </h1>
      <p style={{ color: 'var(--accent)', fontSize: '1.2rem', marginBottom: '40px', letterSpacing: '1px' }}>
        SEGUIMIENTO DE ENTREGAS EN VIVO
      </p>

      {/* Barra Principal */}
      <div style={{
        width: '85%', maxWidth: '900px', height: '52px',
        background: 'rgba(255,255,255,0.06)', borderRadius: '26px',
        overflow: 'hidden', border: '2px solid rgba(255,255,255,0.15)',
        boxShadow: '0 0 30px rgba(0,0,0,0.6)', padding: '5px'
      }}>
        <div style={{
          width: `${percentage}%`, height: '100%',
          background: 'linear-gradient(90deg, #DEB841 0%, #10b981 100%)',
          borderRadius: '20px',
          transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 0 20px rgba(222,184,65,0.5)'
        }} />
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', width: '85%', maxWidth: '900px',
        marginTop: '20px', color: '#94a3b8', fontSize: '1.3rem', fontWeight: 700
      }}>
        <span>{percentage.toFixed(1)}% Completado</span>
        <span style={{ color: '#fff' }}>{received} de {total} Entregadas</span>
      </div>
    </div>
  );
};

// ─── COMPONENTE PRINCIPAL: TABLERO DINÁMICO ─────────────────────────────────
const BelenDashboard = () => {
  const { campaignId: routeCid } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [receivedItems, setReceivedItems] = useState(0);
  const [activeTheme, setActiveTheme] = useState('belen');
  const [loading, setLoading] = useState(true);

  // Obtener ID de campaña prioritario
  const queryCid = searchParams.get('cid');
  const activeCid = routeCid || queryCid;

  // 1. Cargar detalles de la campaña
  useEffect(() => {
    const init = async () => {
      try {
        let cidToUse = activeCid;

        // Si no hay ID en la URL, consultar la lista de campañas y tomar la primera
        if (!cidToUse) {
          const listRes = await api.get('/logistics/staff/campaigns');
          if (listRes.data?.status === 'OK' && listRes.data.data.length > 0) {
            cidToUse = listRes.data.data[0].id;
          }
        }

        if (cidToUse) {
          const campRes = await api.get(`/logistics/campaigns/${cidToUse}`);
          if (campRes.data?.status === 'OK') {
            const campData = campRes.data.data;
            setCampaign(campData);
            setTotalItems(parseInt(campData.total_items, 10) || 100);
            if (campData.theme_config?.theme) {
              setActiveTheme(campData.theme_config.theme);
            }
          }

          // Cargar métricas iniciales
          const metricsRes = await api.get(`/logistics/metrics/${cidToUse}`);
          if (metricsRes.data?.status === 'OK') {
            setReceivedItems(metricsRes.data.data.RECEIVED || 0);
            if (metricsRes.data.data.TOTAL > 0) {
              setTotalItems(metricsRes.data.data.TOTAL);
            }
          }
        }
      } catch (err) {
        console.error('Error inicializando metas de campaña:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [activeCid]);

  // 2. Polling cada 4 segundos para actualizar en vivo cuando el staff escanee
  useEffect(() => {
    if (!campaign?.id) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/logistics/metrics/${campaign.id}`);
        if (res.data?.status === 'OK') {
          setReceivedItems(res.data.data.RECEIVED || 0);
          if (res.data.data.TOTAL > 0) {
            setTotalItems(res.data.data.TOTAL);
          }
        }
      } catch (err) {
        // Ignorar fallo puntual de polling
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [campaign?.id]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, overflow: 'hidden', zIndex: 9999 }}>
      {/* Selector / Renderizador de Tema Activo */}
      {activeTheme === 'belen' && (
        <ThemeBelen 
          total={totalItems} 
          received={receivedItems} 
          title={campaign?.name} 
        />
      )}

      {activeTheme === 'garden' && (
        <ThemeGarden 
          total={totalItems} 
          received={receivedItems} 
          title={campaign?.name} 
        />
      )}

      {activeTheme === 'bar' && (
        <ThemeBar 
          total={totalItems} 
          received={receivedItems} 
          title={campaign?.name} 
        />
      )}

      {/* Pill Flotante con Contador Oficial en Vivo */}
      <div style={{
        position: 'absolute', top: '24px', right: '24px',
        background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(12px)',
        padding: '16px 28px', borderRadius: '18px',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        textAlign: 'center', color: '#fff',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        zIndex: 1000
      }}>
        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}>
          Canastas Entregadas
        </div>
        <div style={{ fontSize: '2.6rem', fontWeight: 900, margin: '2px 0 0 0', color: '#DEB841' }}>
          {receivedItems} <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>/ {totalItems}</span>
        </div>
      </div>

      {/* Selector Flotante de Temas (Abajo a la izquierda) */}
      <div style={{
        position: 'absolute', bottom: '20px', left: '20px',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        padding: '6px 10px', borderRadius: '12px',
        display: 'flex', gap: '6px', zIndex: 1000,
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <button
          onClick={() => setActiveTheme('belen')}
          style={{
            background: activeTheme === 'belen' ? 'rgba(222,184,65,0.3)' : 'transparent',
            border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '8px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700
          }}
          title="Noche de Estrellas"
        >
          <Moon size={14} color="#DEB841" /> Belén
        </button>
        <button
          onClick={() => setActiveTheme('garden')}
          style={{
            background: activeTheme === 'garden' ? 'rgba(56,189,248,0.3)' : 'transparent',
            border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '8px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700
          }}
          title="Jardín de Rosas"
        >
          <Flower2 size={14} color="#38bdf8" /> Jardín
        </button>
        <button
          onClick={() => setActiveTheme('bar')}
          style={{
            background: activeTheme === 'bar' ? 'rgba(16,185,129,0.3)' : 'transparent',
            border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '8px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700
          }}
          title="Barra de Progreso"
        >
          <BarChart3 size={14} color="#10b981" /> Barra
        </button>
      </div>

      <style>
        {`
          @keyframes twinkle { 
            0% { opacity: 0.3; transform: scale(0.9); } 
            50% { opacity: 1; transform: scale(1.3); } 
            100% { opacity: 0.3; transform: scale(0.9); } 
          }
        `}
      </style>
    </div>
  );
};

export default BelenDashboard;
