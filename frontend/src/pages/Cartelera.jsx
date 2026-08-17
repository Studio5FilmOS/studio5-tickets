import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { MapPin, Clock, ChevronRight, Ticket, Flame, Star, Sparkles, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import VersionModal from '../components/VersionModal';

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const backendUrl = apiUrl.replace(/\/api$/, '');
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${backendUrl}${cleanUrl}`;
};

const Cartelera = () => {
  const { user, isAuthenticated } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activePromotion, setActivePromotion] = useState(null);
  const [failedImages, setFailedImages] = useState({});
  const [showVersionModal, setShowVersionModal] = useState(false);
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
    const fetchPromotion = async () => {
      try {
        const res = await api.get('/promotions/active');
        if (res.data.status === 'OK' && res.data.promotion) {
          setActivePromotion(res.data.promotion);
        }
      } catch (err) {
        // Si no hay banner activo, se ignora silenciosamente
      }
    };
    fetchEvents();
    fetchPromotion();
  }, []);

  const getNextSchedule = (schedules) => {
    if (!schedules || schedules.length === 0) return null;
    const upcoming = schedules
      .filter(s => new Date(s.schedule_time) > new Date())
      .sort((a, b) => new Date(a.schedule_time) - new Date(b.schedule_time));
    return upcoming[0] || null;
  };

  const isSchedulePast = (schedule_time) => {
    return new Date(schedule_time) <= new Date();
  };

  const isPromoActive = (evt) => {
    return evt.promo_type !== 'Ninguna' && (!evt.promo_deadline || new Date(evt.promo_deadline) > new Date());
  };

  const EventCard = ({ evt, index, failedImages, setFailedImages, navigate }) => {
    // Definimos el horario seleccionado por defecto (el próximo disponible, o el último si todos pasaron)
    const upcoming = getNextSchedule(evt.schedules);
    const [selectedScheduleId, setSelectedScheduleId] = useState(upcoming ? upcoming.id : (evt.schedules[0]?.id || null));
    
    const selectedSchedule = evt.schedules.find(s => s.id === selectedScheduleId) || evt.schedules[0];
    
    const isPast = selectedSchedule ? isSchedulePast(selectedSchedule.schedule_time) : false;
    const available = selectedSchedule ? selectedSchedule.available_capacity : 0;
    const isSoldOut = isPast || available === 0;
    const hasPromo = isPromoActive(evt);

    return (
      <div
        style={{
          borderRadius: '22px', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.025)',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          animation: `fadeIn 0.4s ease ${index * 0.07}s both`,
          display: 'flex', flexDirection: 'column'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.borderColor = 'rgba(222,184,65,0.25)';
          e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.5), 0 0 20px rgba(222,184,65,0.08)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Imagen / Banner */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: 'rgba(30,30,30,0.9)' }}>
          {evt.banner_url && !failedImages[evt.id] ? (
            <img
              src={getImageUrl(evt.banner_url)}
              alt={evt.title}
              loading="eager"
              onError={() => {
                setFailedImages(prev => ({ ...prev, [evt.id]: true }));
              }}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transition: 'transform 0.5s ease', display: 'block'
              }}
            />
          ) : (
            /* Fallback placeholder cuando la imagen no carga */
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(222,184,65,0.08) 0%, rgba(10,10,10,0.95) 100%)',
              flexDirection: 'column', gap: '8px'
            }}>
              <Ticket size={32} color="rgba(222,184,65,0.3)" />
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', fontWeight: '600' }}>{evt.title}</span>
            </div>
          )}

          {/* Gradiente inferior */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
            background: 'linear-gradient(to top, rgba(5,5,5,0.95) 0%, transparent 100%)'
          }} />

          {/* Badges sobre imagen */}
          <div style={{
            position: 'absolute', top: '12px', left: '12px', right: '12px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
          }}>
            {/* Badge izquierdo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {hasPromo && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: 'rgba(222,184,65,0.9)', color: '#000',
                  padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800',
                  backdropFilter: 'blur(8px)'
                }}>
                  <Flame size={11} /> {evt.promo_type}
                </div>
              )}
            </div>

            {/* Badge derecho: estado */}
            <div style={{
              background: isSoldOut
                ? 'rgba(255,59,48,0.85)'
                : 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(12px)',
              padding: '5px 12px', borderRadius: '10px', fontSize: '0.7rem',
              fontWeight: '700', color: isSoldOut ? '#fff' : '#34c759',
              border: `1px solid ${isSoldOut ? 'rgba(255,59,48,0.4)' : 'rgba(52,199,89,0.3)'}`,
              letterSpacing: '0.5px'
            }}>
              {isPast ? '✗ PASADA' : (isSoldOut ? '✗ AGOTADO' : `● ${available} disp.`)}
            </div>
          </div>

          {/* Si está agotado, overlay */}
          {isSoldOut && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(1px)'
            }} />
          )}
        </div>

        {/* Contenido inferior */}
        <div style={{ padding: '18px 20px 20px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Título */}
          <h2 style={{
            fontSize: '1.2rem', fontWeight: 800, color: isSoldOut ? 'var(--text-muted)' : '#fff',
            marginBottom: '8px', lineHeight: 1.2, letterSpacing: '-0.2px'
          }}>
            {evt.title}
          </h2>

          {/* Venue */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <MapPin size={13} color="var(--accent)" strokeWidth={2} />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '500' }}>
              {evt.venue}
            </span>
          </div>

          {/* Funciones disponibles (Chips seleccionables) */}
          <div style={{ marginBottom: '14px', flexGrow: 1 }}>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', marginBottom: '8px' }}>
              Selecciona tu función
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {evt.schedules.slice(0, 6).map(sch => {
                const d = new Date(sch.schedule_time);
                const past = isSchedulePast(sch.schedule_time);
                const isSelected = sch.id === selectedScheduleId;
                const availableSch = sch.available_capacity > 0 && !past;
                
                return (
                  <button
                    key={sch.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedScheduleId(sch.id);
                    }}
                    style={{
                      padding: '5px 10px', borderRadius: '8px', fontSize: '0.72rem',
                      fontWeight: '600', lineHeight: 1.3, cursor: 'pointer',
                      background: isSelected 
                        ? 'rgba(222,184,65,0.2)' 
                        : (availableSch ? 'rgba(255,255,255,0.05)' : 'rgba(255,59,48,0.05)'),
                      border: `1px solid ${isSelected ? '#DEB841' : (availableSch ? 'rgba(255,255,255,0.1)' : 'rgba(255,59,48,0.15)')}`,
                      color: isSelected ? '#DEB841' : (availableSch ? '#ccc' : 'rgba(255,59,48,0.6)'),
                      opacity: past ? 0.6 : 1
                    }}
                  >
                    <div>{d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}</div>
                    <div style={{ opacity: 0.75 }}>
                      {d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </button>
                );
              })}
              {evt.schedules.length > 6 && (
                <div style={{
                  padding: '5px 10px', borderRadius: '8px', fontSize: '0.72rem',
                  fontWeight: '600', color: 'var(--accent)', lineHeight: 1.3,
                  background: 'rgba(222,184,65,0.06)', border: '1px solid rgba(222,184,65,0.15)'
                }}>
                  +{evt.schedules.length - 6} más
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                Desde
              </span>
              {hasPromo && evt.price_promo > 0 ? (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}>
                  <span style={{
                    fontSize: '0.85rem', fontWeight: '600',
                    color: 'rgba(255,255,255,0.35)',
                    textDecoration: 'line-through',
                    textDecorationColor: 'rgba(255,59,48,0.6)'
                  }}>
                    ${parseFloat(evt.price_adult || 0).toFixed(2)}
                  </span>
                  <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#DEB841' }}>
                    ${parseFloat(evt.price_promo).toFixed(2)}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--accent)' }}>
                  ${parseFloat(evt.price_adult || 0).toFixed(2)}
                </span>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/evento/${evt.id}?schedule=${selectedScheduleId}`);
              }}
              disabled={isSoldOut}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', borderRadius: '12px',
                background: isSoldOut
                  ? 'rgba(255,255,255,0.05)'
                  : 'linear-gradient(135deg, #DEB841, #b08d2b)',
                color: isSoldOut ? 'var(--text-muted)' : '#000',
                fontWeight: '700', fontSize: '0.85rem', cursor: isSoldOut ? 'not-allowed' : 'pointer',
                boxShadow: isSoldOut ? 'none' : '0 4px 14px rgba(222,184,65,0.3)',
                border: 'none'
              }}>
              {isPast ? 'Pasada' : (isSoldOut ? 'Agotado' : 'Reservar')}
              {!isSoldOut && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const filteredEvents = events.filter(evt => {
    // Si activeFilter es algo que no sea 'all', determinamos si califica
    const hasActiveUpcoming = evt.schedules.some(s => s.available_capacity > 0 && !isSchedulePast(s.schedule_time));
    const totalAvail = evt.schedules.reduce((a, s) => a + s.available_capacity, 0);
    
    if (activeFilter === 'available') return hasActiveUpcoming;
    if (activeFilter === 'soldout') return !hasActiveUpcoming;
    if (activeFilter === 'promo') return isPromoActive(evt);
    return true;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'rgba(222,184,65,0.1)', border: '1px solid rgba(222,184,65,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          <Ticket size={26} color="#DEB841" />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando cartelera...</p>
        <style>{`@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.5;} }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', borderColor: 'rgba(255,59,48,0.3)' }}>
        <p style={{ color: 'var(--error)', marginBottom: '16px' }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn-outline" style={{ maxWidth: '180px' }}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Hero Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>
              {activePromotion ? activePromotion.title : 'Cartelera Oficial'}
            </p>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
              {activePromotion?.subtitle || 'Studio 5 Film & Art'}
            </h1>
          </div>
          {events.length > 0 && (
            <span style={{
              fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600',
              background: 'rgba(255,255,255,0.05)', padding: '6px 12px',
              borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)'
            }}>
              {events.length} producciones
            </span>
          )}
        </div>
        {/* Línea decorativa */}
        <div style={{
          height: '2px', width: '100%', borderRadius: '2px', marginTop: '14px',
          background: 'linear-gradient(90deg, #DEB841 0%, rgba(222,184,65,0.3) 40%, transparent 100%)'
        }} />

        {/* Banner de Promoción activa (si tiene imagen) */}
        {activePromotion?.image_url && (
          <a
            href={activePromotion.link_url || '#'}
            target={activePromotion.link_url ? '_blank' : undefined}
            rel="noopener noreferrer"
            style={{ display: 'block', marginTop: '18px', borderRadius: '16px', overflow: 'hidden', cursor: activePromotion.link_url ? 'pointer' : 'default' }}
          >
            <img
              src={getImageUrl(activePromotion.image_url)}
              alt={activePromotion.title}
              style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block', borderRadius: '16px' }}
            />
          </a>
        )}
      </div>

      {/* Modal Popup de Anuncio Nueva Versión 2.0 Titanium */}
      <VersionModal 
        forceOpen={showVersionModal} 
        onCloseCustom={() => setShowVersionModal(false)} 
      />

      {/* Placa Permanente de Bienvenida & Registro Ticket Pro (Visible para visitantes) */}
      {!isAuthenticated && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(26, 28, 38, 0.85), rgba(13, 14, 20, 0.92))',
          border: '1px solid rgba(222, 184, 65, 0.25)',
          borderRadius: '16px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 0 15px rgba(222,184,65,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '250px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'rgba(222,184,65,0.15)', border: '1px solid rgba(222,184,65,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Sparkles size={18} color="var(--accent)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  STUDIO 5 TICKETS PRO · v2.0.0
                </span>
                <span style={{ fontSize: '0.62rem', background: 'rgba(52,199,89,0.15)', color: '#34c759', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
                  NUEVO
                </span>
              </div>
              <p style={{ color: '#d1d5db', fontSize: '0.78rem', margin: 0, lineHeight: 1.3 }}>
                Crea tu cuenta gratuita para guardar tus boletos QR en el celular y comprar en 1 clic.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/registro')}
              className="btn-primary"
              style={{ padding: '8px 14px', fontSize: '0.76rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Ticket size={13} /> Crear Cuenta Gratis
            </button>
            <button
              onClick={() => setShowVersionModal(true)}
              className="btn-outline"
              style={{ padding: '8px 12px', fontSize: '0.76rem', width: 'auto' }}
              title="Ver todas las novedades de la versión 2.0"
            >
              Novedades
            </button>
          </div>
        </div>
      )}

      {/* Filtros y Botón de Novedades */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px', alignItems: 'center' }}>
        {[
          { id: 'all', label: 'Todo' },
          { id: 'available', label: '🎟️ Disponible' },
          { id: 'promo', label: '🔥 Promoción' },
          { id: 'soldout', label: '✗ Agotado' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            style={{
              padding: '7px 16px', borderRadius: '20px', border: '1px solid',
              fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.25s',
              background: activeFilter === f.id ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
              color: activeFilter === f.id ? '#000' : 'var(--text-muted)',
              borderColor: activeFilter === f.id ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
            }}
          >
            {f.label}
          </button>
        ))}

        <button
          onClick={() => setShowVersionModal(true)}
          style={{
            marginLeft: 'auto',
            padding: '7px 14px',
            borderRadius: '20px',
            border: '1px solid rgba(222,184,65,0.35)',
            fontSize: '0.75rem',
            fontWeight: '700',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: 'linear-gradient(135deg, rgba(222,184,65,0.14), rgba(176,141,43,0.06))',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.25s',
            boxShadow: '0 0 10px rgba(222,184,65,0.1)'
          }}
          title="Ver novedades de Studio 5 Tickets Pro v2.0.0"
        >
          <Sparkles size={13} color="var(--accent)" /> Novedades Pro 2.0
        </button>
      </div>

      {/* Listado de eventos */}
      {filteredEvents.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Ticket size={36} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No hay eventos en esta categoría.
          </p>
        </div>
      ) : (
        <div className="cartelera-grid">
          {filteredEvents.map((evt, index) => (
            <EventCard 
              key={evt.id} 
              evt={evt} 
              index={index} 
              failedImages={failedImages} 
              setFailedImages={setFailedImages}
              navigate={navigate}
            />
          ))}
        </div>
      )}

      {/* Footer decorativo */}
      {filteredEvents.length > 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0 8px', opacity: 0.4 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '2px' }}>
            STUDIO 5 · EXPERIENCIAS ÚNICAS
          </div>
        </div>
      )}
    </div>
  );
};

export default Cartelera;
