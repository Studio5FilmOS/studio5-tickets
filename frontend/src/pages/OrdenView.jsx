import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';
import { MapPin, Calendar, CheckCircle, ShieldAlert, Download, Users, Ticket } from 'lucide-react';

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

const OrdenView = () => {
  const { code: orderNum } = useParams();
  const [order, setOrder] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await api.get(`/orders/numero/${orderNum}`);
        if (res.data.status === 'OK') {
          setOrder(res.data.order);
          setTickets(res.data.tickets || []);
        } else {
          setError('Orden no encontrada en el sistema.');
        }
      } catch (err) {
        console.error(err);
        setError('Error al conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderNum]);

  const descargarOrdenJpg = () => {
    if (!order) return;
    const element = document.getElementById(`export-order-${order.order_num}`);
    if (!element) return;

    Swal.fire({
      title: 'Generando imagen...',
      text: 'Tu acceso premium se está compilando en la galería.',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    setTimeout(() => {
      html2canvas(element, { scale: 2, useCORS: true, logging: false }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Orden_${order.order_num}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 1.0);
        link.click();
        Swal.close();
      }).catch(err => {
        console.error(err);
        Swal.fire('Error', 'No se pudo generar la imagen del acceso.', 'error');
      });
    }, 500);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px 0' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', borderColor: 'var(--error)' }}>
        <ShieldAlert size={48} color="var(--error)" style={{ margin: '0 auto 15px' }} />
        <h3 style={{ color: 'var(--error)', marginBottom: '10px' }}>Error de Acceso</h3>
        <p style={{ color: '#ccc' }}>{error || 'El acceso solicitado no es válido.'}</p>
        <Link to="/" className="btn-outline" style={{ marginTop: '20px', textDecoration: 'none' }}>Ir a Cartelera</Link>
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(order.order_num)}&color=000000&bgcolor=ffffff`;
  
  const dateFormatted = new Date(order.schedule_time).toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const totalQty = parseInt(order.ticket_count_adult || 0) + parseInt(order.ticket_count_child || 0);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      
      {/* 1. MOLDE GRÁFICO PARA DESCARGAR (OCULTO EN COORDENADAS NEGATIVAS) */}
      <div style={{ position: 'fixed', top: '-10000px', left: '-10000px' }}>
        <div 
          id={`export-order-${order.order_num}`}
          style={{ 
            position: 'relative', width: '320px', height: '460px', 
            borderRadius: '0', overflow: 'hidden', background: '#fff', border: '1px solid #ddd',
            fontFamily: 'sans-serif', color: 'black', display: 'flex', flexDirection: 'column'
          }}
        >
          {/* Top section: Banner image */}
          <div style={{ position: 'relative', width: '100%', height: '180px' }}>
            <img 
              src={getImageUrl(order.banner_url)} 
              alt="Banner preview" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', padding: '5px 10px', borderRadius: '6px' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }}>{order.event_title}</h3>
              <p style={{ margin: '2px 0 0 0', color: '#ccc', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }}>📍 {order.event_venue}</p>
            </div>
            {order.operation_type === 'Cortesia' && (
              <span style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '8px', fontWeight: 900, background: '#e50914', color: '#fff', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>CORTESÍA</span>
            )}
          </div>

          {/* Perforated separator line */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '10px', background: '#fff', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '-5px', width: '10px', height: '10px', borderRadius: '50%', background: '#111' }}></div>
            <div style={{ flex: 1, borderTop: '2px dashed #ddd', margin: '0 5px' }}></div>
            <div style={{ position: 'absolute', right: '-5px', width: '10px', height: '10px', borderRadius: '50%', background: '#111' }}></div>
          </div>

          {/* Bottom details section */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 15px 15px 15px', background: '#fff', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center', width: '100%' }}>
              <span style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Comprador</span>
              <h2 style={{ margin: '1px 0 0 0', fontSize: '13px', fontWeight: 900, color: '#111', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.customer_name}</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src={qrUrl} alt="QR" style={{ width: '120px', height: '120px' }} />
              <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#555', marginTop: '4px', letterSpacing: '0.5px' }}>{order.order_num}</span>
            </div>

            <div style={{ textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
              <span style={{ fontSize: '8px', color: '#666', fontWeight: 'bold' }}>{dateFormatted}</span>
              <span style={{ 
                fontSize: '9px', fontWeight: '900', color: '#d32f2f', background: '#ffebeb', 
                padding: '3px 8px', borderRadius: '4px', display: 'inline-block',
                maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                🎟️ {totalQty} ENTRADAS ASOCIADAS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TARJETA VISUAL DE ACCESO (MÓVIL) */}
      <div style={{ 
        width: '100%', maxWidth: '420px', background: '#fff', color: '#000', 
        borderRadius: '24px', overflow: 'hidden', boxShadow: '0 15px 35px rgba(241,165,28,0.25)',
        position: 'relative', marginBottom: '20px'
      }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#111' }}>
          <img 
            src={getImageUrl(order.banner_url)} 
            alt={order.event_title} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
          {order.operation_type === 'Cortesia' && (
            <div style={{ 
              position: 'absolute', top: '20px', left: '-30px', background: '#e50914', 
              color: '#fff', padding: '4px 30px', fontWeight: 900, fontSize: '0.8rem', 
              transform: 'rotate(-45deg)', boxShadow: '0 2px 5px rgba(0,0,0,0.5)', 
              letterSpacing: '1px', zIndex: '10', textAlign: 'center' 
            }}>
              CORTESÍA
            </div>
          )}
        </div>

        <div style={{ padding: '25px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '8px', borderBottom: '2px solid #eee', paddingBottom: '10px', width: '100%', textAlign: 'center' }}>
            {order.customer_name}
          </h2>

          <div style={{ background: '#ffebeb', color: '#d32f2f', padding: '6px 20px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '15px' }}>
            🎟️ ACCESO GENERAL: {totalQty} Entrada{totalQty !== 1 ? 's' : ''}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#555', marginBottom: '15px', fontWeight: 'bold' }}>
            <MapPin size={16} color="var(--accent)" />
            <span>{order.event_venue}</span>
          </div>

          <div style={{ width: '200px', height: '200px', border: '1px solid #eee', padding: '8px', borderRadius: '16px', background: '#fff', marginBottom: '12px' }}>
            <img src={qrUrl} alt="QR Code" style={{ width: '100%', height: '100%' }} />
          </div>

          <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#666', letterSpacing: '0.5px', marginBottom: '20px' }}>
            {order.order_num}
          </div>

          <div style={{ borderTop: '1px dashed #ddd', paddingTop: '15px', width: '100%', textAlign: 'center', marginBottom: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.95rem', color: '#222', fontWeight: 'bold' }}>
              <Calendar size={16} color="var(--accent)" />
              <span>{dateFormatted}</span>
            </div>
          </div>

          {/* Estado de Pago */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            {order.payment_status === 'Anulado' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', padding: '6px 15px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                <ShieldAlert size={16} /> Orden Anulada
              </div>
            ) : order.payment_status === 'Pendiente' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 204, 0, 0.15)', color: '#b28d00', padding: '6px 15px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                <ShieldAlert size={16} /> Pago Pendiente en Boletería
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(52, 199, 89, 0.1)', color: '#34c759', padding: '6px 15px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                <CheckCircle size={16} /> Pago Confirmado
              </div>
            )}
          </div>

          {/* Botón de descarga JPG */}
          <button 
            onClick={descargarOrdenJpg}
            className="btn-primary"
            style={{ width: '100%', height: '45px', fontSize: '0.9rem', padding: '10px' }}
          >
            <Download size={18} /> DESCARGAR ACCESO (JPG)
          </button>
        </div>
      </div>

      {/* 3. LISTADO DE TICKETS INDIVIDUALES Y ACCESO INTERACTIVO */}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', borderLeft: '4px solid var(--accent)', padding: '1.25rem', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Users size={20} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem', color: '#fff', fontWeight: '800' }}>TUS ENTRADAS Y ASIENTOS</h3>
        </div>

        <p style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '15px' }}>
          Para ingresar a la sala, solo muestra el código QR de arriba. Si deseas participar en la votación interactiva, puedes repartir estos links a tus acompañantes:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tickets.map((t, idx) => {
            const ticketUrl = `${window.location.origin}/boleto/${t.ticket_code}`;
            const label = t.seat_label
                ? `Butaca ${t.seat_label} · ${t.ticket_type}`
                : `Entrada ${t.ticket_type}`;

            return (
              <div key={t.id} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Ticket size={16} color="var(--accent)" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>{label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ticket #{idx + 1}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <a href={ticketUrl} target="_blank" rel="noreferrer" style={{ padding: '6px 12px', background: 'rgba(241,165,28,0.15)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '6px', fontSize: '0.75rem', textDecoration: 'none', fontWeight: 'bold' }}>
                    Votar
                  </a>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(ticketUrl);
                      Swal.fire({ title: 'Copiado', text: 'Link interactivo copiado al portapapeles', icon: 'success', timer: 1500, showConfirmButton: false });
                    }}
                    style={{ padding: '6px', background: 'transparent', color: '#ccc', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', cursor: 'pointer' }}
                    title="Copiar Link"
                  >
                    📋
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: '420px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0 10px 30px' }}>
        <Link to="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 'bold' }}>
          Ir al Catálogo de Studio 5
        </Link>
      </div>
    </div>
  );
};

export default OrdenView;
