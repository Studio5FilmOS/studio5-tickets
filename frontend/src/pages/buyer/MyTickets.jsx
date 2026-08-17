import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';
import { Ticket, Calendar, MapPin, Download, Send, ExternalLink, QrCode, Sparkles, Clock, CheckCircle, ChevronRight, User } from 'lucide-react';

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
  return `${backendUrl}${url}`;
};

const MyTickets = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('upcoming'); // 'upcoming', 'past'

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchMyTickets = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/users/my-tickets');
        if (res.data.status === 'OK') {
          setOrders(res.data.orders || []);
        }
      } catch (err) {
        console.error('Error cargando mis tickets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyTickets();
  }, [isAuthenticated, navigate]);

  const descargarTicket = async (orderNum) => {
    const ticketElement = document.getElementById(`export-ticket-${orderNum}`);
    if (!ticketElement) {
      Swal.fire('Error', 'No se encontró el elemento del ticket.', 'error');
      return;
    }

    Swal.fire({
      title: 'Generando imagen...',
      text: 'Preparando tu boleto digital',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const canvas = await html2canvas(ticketElement, { scale: 2, useCORS: true, backgroundColor: '#111' });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `Boleto-Studio5-${orderNum}.jpg`;
      link.click();
      Swal.close();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: '¡Boleto descargado!', timer: 2000, showConfirmButton: false });
    } catch (err) {
      console.error(err);
      Swal.close();
      Swal.fire('Error', 'No se pudo generar la imagen del ticket.', 'error');
    }
  };

  const now = new Date();
  const upcomingOrders = orders.filter(o => new Date(o.schedule_time) >= now);
  const pastOrders = orders.filter(o => new Date(o.schedule_time) < now);
  const displayedOrders = filterTab === 'upcoming' ? upcomingOrders : pastOrders;

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '0 15px' }}>
      {/* Header del Perfil */}
      <div className="glass-panel fade-in" style={{ padding: '24px 28px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900, fontSize: '1.4rem' }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0' }}>{user?.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
              {user?.email} · {user?.role === 'organizer' ? '🏢 Organizador' : (user?.role === 'staff' ? '🎭 Staff' : '🎟️ Espectador')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', textDecoration: 'none' }}>
            Explorar Cartelera
          </Link>
          <button onClick={logout} className="btn-outline" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Tabs de Próximos vs Pasados */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setFilterTab('upcoming')}
          style={{
            flex: 1, padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.9rem', transition: 'var(--transition-smooth)',
            background: filterTab === 'upcoming' ? 'linear-gradient(135deg, var(--accent), var(--accent-secondary))' : 'rgba(255,255,255,0.04)',
            color: filterTab === 'upcoming' ? '#000' : 'var(--text-muted)',
            boxShadow: filterTab === 'upcoming' ? '0 4px 15px var(--accent-glow)' : 'none'
          }}
        >
          🎟️ Próximos Eventos ({upcomingOrders.length})
        </button>
        <button
          onClick={() => setFilterTab('past')}
          style={{
            flex: 1, padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.9rem', transition: 'var(--transition-smooth)',
            background: filterTab === 'past' ? 'linear-gradient(135deg, var(--accent), var(--accent-secondary))' : 'rgba(255,255,255,0.04)',
            color: filterTab === 'past' ? '#000' : 'var(--text-muted)',
            boxShadow: filterTab === 'past' ? '0 4px 15px var(--accent-glow)' : 'none'
          }}
        >
          📜 Historial ({pastOrders.length})
        </button>
      </div>

      {/* Listado de Boletos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-muted)', marginTop: '15px', fontSize: '0.85rem' }}>Cargando tus boletos...</p>
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="glass-panel fade-in" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <Ticket size={48} color="var(--accent)" style={{ opacity: 0.5, marginBottom: '15px' }} />
          <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px' }}>
            {filterTab === 'upcoming' ? 'No tienes eventos próximos agendados' : 'No tienes compras pasadas registradas'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '20px', maxWidth: '380px', margin: '0 auto 20px auto' }}>
            Explora las obras y experiencias disponibles en nuestra cartelera digital.
          </p>
          <Link to="/" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            Ver Cartelera de Shows <ChevronRight size={16} />
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {displayedOrders.map(order => {
            const dateObj = new Date(order.schedule_time);
            const dateFormatted = dateObj.toLocaleString('es-EC', {
              timeZone: 'America/Guayaquil',
              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            });

            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${order.order_num}&color=000000&bgcolor=ffffff`;

            return (
              <div key={order.id} className="glass-card fade-in" style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                  {/* Banner / Poster */}
                  {order.banner_url && (
                    <img 
                      src={getImageUrl(order.banner_url)} 
                      alt="" 
                      style={{ width: '130px', height: '130px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} 
                    />
                  )}

                  {/* Datos del Show */}
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h3 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 900, margin: '0 0 6px 0' }}>{order.event_title}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontSize: '0.82rem', fontWeight: 'bold', marginBottom: '4px' }}>
                          <Calendar size={14} /> {dateFormatted}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          <MapPin size={14} /> {order.event_venue}
                        </div>
                      </div>

                      <span style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase',
                        background: order.payment_status === 'Pagado' ? 'rgba(52,199,89,0.15)' : (order.payment_status === 'Pendiente' ? 'rgba(255,204,0,0.15)' : 'rgba(222,184,65,0.15)'),
                        color: order.payment_status === 'Pagado' ? '#34c759' : (order.payment_status === 'Pendiente' ? '#ffcc00' : 'var(--accent)'),
                        border: `1px solid ${order.payment_status === 'Pagado' ? 'rgba(52,199,89,0.3)' : 'rgba(222,184,65,0.3)'}`
                      }}>
                        {order.payment_status}
                      </span>
                    </div>

                    {/* Desglose de Boletos y Butacas */}
                    <div style={{ marginTop: '14px', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Boletos ({order.tickets?.length || 0}):</span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {order.tickets?.map((t, idx) => (
                          <span key={idx} style={{
                            fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px',
                            background: t.localidad_color ? `${t.localidad_color}22` : 'rgba(255,255,255,0.08)',
                            color: t.localidad_color || '#fff', border: `1px solid ${t.localidad_color || 'rgba(255,255,255,0.15)'}`,
                            fontWeight: 'bold'
                          }}>
                            {t.seat_label ? `Butaca ${t.seat_label}` : t.ticket_type}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                      <Link 
                        to={`/boleto/${order.tickets?.[0]?.ticket_code || order.order_num}`}
                        className="btn-primary" 
                        style={{ padding: '8px 14px', fontSize: '0.78rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <QrCode size={15} /> Ver Ticket Digital
                      </Link>
                      <button 
                        onClick={() => descargarTicket(order.order_num)}
                        className="btn-outline" 
                        style={{ padding: '8px 14px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Download size={15} /> Guardar JPG
                      </button>
                    </div>
                  </div>

                  {/* QR Preview Mini */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: '8px', borderRadius: '12px', width: '100px', height: '110px', flexShrink: 0 }}>
                    <img src={qrUrl} alt="QR" style={{ width: '84px', height: '84px' }} />
                    <span style={{ fontSize: '0.62rem', color: '#000', fontWeight: 'bold', marginTop: '2px' }}>{order.order_num}</span>
                  </div>
                </div>

                {/* Elemento oculto para descarga directa con html2canvas */}
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                  <div 
                    id={`export-ticket-${order.order_num}`}
                    style={{ 
                      position: 'relative', width: '340px', height: '480px', 
                      borderRadius: '16px', overflow: 'hidden', background: '#fff', border: '1px solid #ddd',
                      fontFamily: 'sans-serif', color: 'black', display: 'flex', flexDirection: 'column'
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', height: '180px' }}>
                      <img src={getImageUrl(order.banner_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', padding: '5px 10px', borderRadius: '6px' }}>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>{order.event_title}</h3>
                        <p style={{ margin: '2px 0 0 0', color: '#ccc', fontSize: '10px' }}>📍 {order.event_venue}</p>
                      </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px', justifyContent: 'space-between' }}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Espectador</span>
                        <h2 style={{ margin: '2px 0 0 0', fontSize: '14px', fontWeight: 900, color: '#111' }}>{user?.name}</h2>
                      </div>
                      <img src={qrUrl} alt="QR" style={{ width: '130px', height: '130px' }} />
                      <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#555' }}>Código: {order.order_num}</span>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#d32f2f', background: '#ffebeb', padding: '4px 10px', borderRadius: '4px' }}>
                        {dateFormatted} · {order.tickets?.length} Entradas
                      </div>
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

export default MyTickets;
