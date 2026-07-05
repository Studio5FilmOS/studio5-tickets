import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { MapPin, Calendar, Users } from 'lucide-react';

const Cartelera = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get('/events');
        if (res.data.status === 'OK') {
          setEvents(res.data.events);
        }
      } catch (err) {
        console.error('Error al cargar eventos:', err);
        setError('No se pudo cargar la cartelera. Revisa tu conexión.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px 0' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', borderColor: 'var(--error)' }}>
        <p style={{ color: 'var(--error)' }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn-outline" style={{ marginTop: '15px' }}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '20px', letterSpacing: '1px', borderLeft: '4px solid var(--accent)', paddingLeft: '10px' }}>
        CARTELERA DIGITAL
      </h2>

      {events.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No hay eventos disponibles en este momento.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {events.map((evt) => {
            // Calcular disponibilidad agregada
            const totalAvailable = evt.schedules.reduce((acc, sch) => acc + sch.available_capacity, 0);
            const isSoldOut = totalAvailable === 0;

            return (
              <div 
                key={evt.id} 
                className="glass-panel glass-card" 
                style={{ padding: '0', overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => navigate(`/evento/${evt.id}`)}
              >
                {/* Imagen del evento */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
                  <img 
                    src={evt.banner_url} 
                    alt={evt.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  {evt.promo_type !== 'Ninguna' && (
                    <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
                      <span className="badge badge-promo">{evt.promo_type}</span>
                    </div>
                  )}
                  {isSoldOut && (
                    <div style={{ 
                      position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', 
                      background: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', 
                      alignItems: 'center', fontSize: '1.25rem', fontWeight: 900, color: 'var(--error)' 
                    }}>
                      AGOTADO
                    </div>
                  )}
                </div>

                {/* Detalles del evento */}
                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {evt.title}
                  </h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px' }}>
                    <MapPin size={14} color="var(--accent)" />
                    <span>{evt.venue}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
                    <Calendar size={14} color="var(--accent)" />
                    <span>{evt.schedules.length} {evt.schedules.length === 1 ? 'función' : 'funciones'} programadas</span>
                  </div>

                  {/* Aforo de funciones */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                    <h4 style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                      Horarios y Cupos:
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {evt.schedules.map((sch) => {
                        const dateFormatted = new Date(sch.schedule_time).toLocaleDateString('es-EC', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        });
                        return (
                          <div 
                            key={sch.id} 
                            style={{ 
                              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', 
                              padding: '6px 10px', borderRadius: '8px', fontSize: '0.75rem', 
                              display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '110px'
                            }}
                          >
                            <span style={{ fontWeight: '600' }}>{dateFormatted}</span>
                            <span style={{ color: sch.available_capacity > 0 ? 'var(--success)' : 'var(--error)', fontSize: '0.7rem' }}>
                              {sch.available_capacity > 0 ? `${sch.available_capacity} disp.` : 'Agotado'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Cartelera;
