import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ThemeBelen = ({ total, received }) => {
  const [starPositions] = useState(() => {
    return Array.from({ length: total }, () => ({
      top: `${Math.random() * 60}%`,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 3 + 1}px`,
      delay: `${Math.random() * 2}s`,
    }));
  });

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, #0f172a 0%, #1e1b4b 60%, #000000 100%)' }}>
      {starPositions.map((pos, index) => {
        const isVisible = index < received;
        return (
          <div 
            key={index}
            style={{
              position: 'absolute', top: pos.top, left: pos.left, width: pos.size, height: pos.size,
              backgroundColor: '#fff', borderRadius: '50%',
              opacity: isVisible ? 1 : 0,
              boxShadow: isVisible ? '0 0 8px 2px rgba(255,255,255,0.8)' : 'none',
              transition: 'opacity 2s ease-in-out',
              animation: isVisible ? `twinkle 3s infinite ${pos.delay}` : 'none'
            }}
          />
        );
      })}
      <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '35%', background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, transparent 100%)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '5vh' }}>
        <h1 style={{ fontSize: '3rem', textShadow: '0 0 20px rgba(255,255,255,0.5)', fontFamily: 'serif', letterSpacing: '5px', opacity: 0.8, color: '#fff' }}>Noche de Esperanza</h1>
      </div>
    </div>
  );
};

const ThemeGarden = ({ total, received }) => {
  const [flowerPositions] = useState(() => {
    return Array.from({ length: total }, () => ({
      bottom: `${Math.random() * 40}%`,
      left: `${Math.random() * 100}%`,
      scale: Math.random() * 0.5 + 0.5,
    }));
  });

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, #87CEEB 0%, #E0F6FF 60%, #228B22 100%)' }}>
      {flowerPositions.map((pos, index) => {
        const isVisible = index < received;
        return (
          <div 
            key={index}
            style={{
              position: 'absolute', bottom: pos.bottom, left: pos.left,
              fontSize: `${2 * pos.scale}rem`,
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0)',
              transition: 'all 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
          >
            🌹
          </div>
        );
      })}
      <h1 style={{ position: 'absolute', top: '10%', width: '100%', textAlign: 'center', fontSize: '3rem', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.3)', fontFamily: 'sans-serif' }}>Jardín de Donaciones</h1>
    </div>
  );
};

const ThemeBar = ({ total, received }) => {
  const percentage = total === 0 ? 0 : (received / total) * 100;
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#111827', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <h1 style={{ color: '#fff', fontSize: '2.5rem', marginBottom: '30px' }}>Progreso de la Campaña</h1>
      <div style={{ width: '80%', maxWidth: '800px', height: '40px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)' }}>
        <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #10b981)', transition: 'width 1s ease-in-out' }} />
      </div>
      <p style={{ color: '#9ca3af', marginTop: '15px', fontSize: '1.2rem' }}>{percentage.toFixed(1)}% Completado</p>
    </div>
  );
};

const DynamicGoalDashboard = () => {
  const [totalItems, setTotalItems] = useState(0);
  const [receivedItems, setReceivedItems] = useState(0);
  const [theme, setTheme] = useState('belen'); 
  const campaignId = '1'; // Esto se tomaría por URL o Context en producción

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // En una app real primero traerías los detalles de la campaña (total_items, theme)
        // Y luego las métricas. Aquí hacemos un mock parcial del total y leemos las métricas reales.
        const res = await fetch(`${API_URL}/api/logistics/metrics/${campaignId}`);
        const data = await res.json();
        
        if (data.status === 'OK') {
          // Asumimos un total_items fijo si la base de datos devuelve 0 por estar vacía
          setTotalItems(data.data.TOTAL > 0 ? data.data.TOTAL : 2000); 
          setReceivedItems(data.data.RECEIVED || 0);
        }
      } catch (err) {
        console.error('Error fetching metrics:', err);
      }
    };

    fetchMetrics(); // Carga inicial
    const interval = setInterval(fetchMetrics, 5000); // Polling cada 5 segundos

    return () => clearInterval(interval);
  }, []);

  if (totalItems === 0) return null; // Loading

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, overflow: 'hidden', zIndex: 9999 }}>
      
      {theme === 'belen' && <ThemeBelen total={totalItems} received={receivedItems} />}
      {theme === 'garden' && <ThemeGarden total={totalItems} received={receivedItems} />}
      {theme === 'bar' && <ThemeBar total={totalItems} received={receivedItems} />}

      <div style={{
        position: 'absolute', top: '30px', right: '30px',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
        padding: '15px 25px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center', color: '#fff'
      }}>
        <div style={{ fontSize: '0.9rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '2px' }}>Artículos Recibidos</div>
        <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{receivedItems} <span style={{ fontSize: '1rem' }}>/ {totalItems}</span></div>
      </div>

      <style>
        {`@keyframes twinkle { 0% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0.6; transform: scale(1); } }`}
      </style>
    </div>
  );
};

export default DynamicGoalDashboard;
