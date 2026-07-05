import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';
import { MapPin, Calendar, CheckCircle, ShieldAlert, Sparkles, Download, Send } from 'lucide-react';

const BoletoView = () => {
  const { code } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados de interactividad en vivo
  const [activePoll, setActivePoll] = useState(null);
  const [revealedClues, setRevealedClues] = useState([]);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await api.get(`/tickets/${code}`);
        if (res.data.status === 'OK') {
          setTicket(res.data.ticket);
        } else {
          setError('Boleto no encontrado en el sistema.');
        }
      } catch (err) {
        console.error(err);
        setError('Error al conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [code]);

  useEffect(() => {
    if (!ticket) return;

    const fetchLiveUpdates = async () => {
      try {
        const res = await api.get(
          `/tickets/interaction/active/${ticket.event_id}/${ticket.schedule_id}/${ticket.id}`
        );
        if (res.data.status === 'OK') {
          setActivePoll(res.data.poll);
          setRevealedClues(res.data.clues);
        }
      } catch (err) {
        console.warn('Error al jalar actualizaciones interactivas:', err);
      }
    };

    fetchLiveUpdates();
    const interval = setInterval(fetchLiveUpdates, 4000);

    return () => clearInterval(interval);
  }, [ticket]);

  // Votar
  const handleVote = async (option) => {
    if (!ticket || !activePoll || isSubmittingVote) return;

    setIsSubmittingVote(true);

    const payload = {
      pollId: activePoll.id,
      scheduleId: ticket.schedule_id,
      ticketId: ticket.id,
      option
    };

    try {
      const res = await api.post('/tickets/interaction/vote', payload);
      if (res.data.status === 'OK') {
        Swal.fire({
          title: '¡Voto Registrado!',
          text: `Elegiste: ${option}`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        
        setActivePoll({
          ...activePoll,
          user_vote: option
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'No se pudo registrar tu voto.', 'error');
    } finally {
      setIsSubmittingVote(false);
    }
  };

  // Descarga del boleto en imagen JPG
  const descargarTicketJpg = () => {
    if (!ticket) return;
    const element = document.getElementById(`export-ticket-${ticket.ticket_code}`);
    if (!element) return;

    Swal.fire({
      title: 'Generando imagen...',
      text: 'Tu ticket premium se está compilando en la galería.',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    setTimeout(() => {
      html2canvas(element, { scale: 2, useCORS: true, logging: false }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Ticket_${ticket.ticket_code}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 1.0);
        link.click();
        Swal.close();
      }).catch(err => {
        console.error(err);
        Swal.fire('Error', 'No se pudo generar la imagen del ticket.', 'error');
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

  if (error || !ticket) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', borderColor: 'var(--error)' }}>
        <ShieldAlert size={48} color="var(--error)" style={{ margin: '0 auto 15px' }} />
        <h3 style={{ color: 'var(--error)', marginBottom: '10px' }}>Error de Acceso</h3>
        <p style={{ color: '#ccc' }}>{error || 'El boleto solicitado no es válido.'}</p>
        <Link to="/" className="btn-outline" style={{ marginTop: '20px', textDecoration: 'none' }}>Ir a Cartelera</Link>
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ticket.ticket_code)}&color=000000&bgcolor=ffffff`;
  
  const dateFormatted = new Date(ticket.schedule_time).toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      
      {/* 1. MOLDE GRÁFICO DEL TICKET PARA DESCARGAR (OCULTO EN COORDENADAS NEGATIVAS PARA RENDERIZADO PERFECTO DE IMAGEN) */}
      <div style={{ position: 'fixed', top: '-10000px', left: '-10000px' }}>
        <div 
          id={`export-ticket-${ticket.ticket_code}`}
          style={{ 
            position: 'relative', width: '600px', height: '200px', 
            borderRadius: '0', overflow: 'hidden', background: '#fff', border: '1px solid #ddd',
            fontFamily: 'sans-serif', color: 'black'
          }}
        >
          <div style={{ 
            width: '100%', height: '100%', 
            backgroundImage: `url(${ticket.ticket_template_url || ticket.banner_url})`,
            backgroundSize: 'cover', backgroundPosition: 'center'
          }}></div>
          <div style={{ 
            position: 'absolute', right: '4%', top: '10%', height: '80%', width: '28%', 
            background: 'rgba(255, 255, 255, 0.96)', borderRadius: '8px', display: 'flex', 
            flexDirection: 'column', justifyContent: 'center', alignItems: 'center', 
            padding: '2% 3%', boxSizing: 'border-box', boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
          }}>
            {ticket.operation_type === 'Cortesia' && (
              <span style={{ fontSize: '9px', fontWeight: 900, border: '1px solid #e50914', color: '#e50914', padding: '1px 3px', borderRadius: '3px', marginBottom: '1px', textTransform: 'uppercase' }}>CORTESÍA</span>
            )}
            <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center', borderBottom: '1px solid #ddd', paddingBottom: '2px' }}>{ticket.customer_name}</span>
            <img src={qrUrl} alt="QR" style={{ width: '70%', aspectRatio: '1/1', margin: '3px 0' }} />
            <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#555' }}>{ticket.ticket_code}</span>
            <span style={{ fontSize: '8px', fontWeight: '900', color: '#d32f2f', background: '#ffebeb', padding: '1px 5px', borderRadius: '4px', marginTop: '2px' }}>
              Entrada {ticket.ticket_type} {ticket.seat_label && `[Butaca: ${ticket.seat_label}]`}
            </span>
          </div>
        </div>
      </div>

      {/* 2. TARJETA VISUAL DE ENTRADA (MÓVIL) */}
      <div style={{ 
        width: '100%', maxWidth: '420px', background: '#fff', color: '#000', 
        borderRadius: '24px', overflow: 'hidden', boxShadow: '0 15px 35px rgba(241,165,28,0.25)',
        position: 'relative', marginBottom: '20px'
      }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#111' }}>
          <img 
            src={ticket.banner_url} 
            alt={ticket.event_title} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
          {ticket.operation_type === 'Cortesia' && (
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
            {ticket.customer_name}
          </h2>

          <div style={{ background: '#ffebeb', color: '#d32f2f', padding: '6px 20px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '15px' }}>
            🎟️ Entrada {ticket.ticket_type} {ticket.seat_label && `[Butaca ${ticket.seat_label}]`}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#555', marginBottom: '15px', fontWeight: 'bold' }}>
            <MapPin size={16} color="var(--accent)" />
            <span>{ticket.event_venue}</span>
          </div>

          <div style={{ width: '200px', height: '200px', border: '1px solid #eee', padding: '8px', borderRadius: '16px', background: '#fff', marginBottom: '12px' }}>
            <img src={qrUrl} alt="QR Code" style={{ width: '100%', height: '100%' }} />
          </div>

          <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#666', letterSpacing: '0.5px', marginBottom: '20px' }}>
            {ticket.ticket_code}
          </div>

          <div style={{ borderTop: '1px dashed #ddd', paddingTop: '15px', width: '100%', textAlign: 'center', marginBottom: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.95rem', color: '#222', fontWeight: 'bold' }}>
              <Calendar size={16} color="var(--accent)" />
              <span>{dateFormatted}</span>
            </div>
          </div>

          {/* Estado de Uso */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            {ticket.status === 'Used' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', padding: '6px 15px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                <CheckCircle size={16} /> Boleto Ingresado
              </div>
            ) : ticket.payment_status === 'Pendiente' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 204, 0, 0.15)', color: '#b28d00', padding: '6px 15px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                <ShieldAlert size={16} /> Pago Pendiente en Boletería
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(52, 199, 89, 0.1)', color: '#34c759', padding: '6px 15px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                <CheckCircle size={16} /> Boleto Activo
              </div>
            )}
          </div>

          {/* Botón de descarga JPG para el cliente público */}
          <button 
            onClick={descargarTicketJpg}
            className="btn-primary"
            style={{ width: '100%', height: '45px', fontSize: '0.9rem', padding: '10px' }}
          >
            <Download size={18} /> DESCARGAR BOLETO (JPG)
          </button>
        </div>
      </div>

      {/* 3. CONEXIÓN DE INTERACTIVIDAD EN VIVO (MOMENTO WOW) */}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', borderLeft: '4px solid var(--accent)', padding: '1.25rem', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Sparkles size={20} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem', color: '#fff', fontWeight: '800' }}>PANTALLA INTERACTIVA</h3>
        </div>

        {/* Encuestas */}
        {activePoll ? (
          <div className="fade-in" style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '15px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--accent)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HelpCircle size={16} /> ¡VOTACIÓN EN VIVO!
            </h4>
            <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '15px', color: '#fff' }}>{activePoll.question}</p>

            {activePoll.user_vote ? (
              <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(52, 199, 89, 0.1)', borderRadius: '8px', border: '1px solid rgba(52, 199, 89, 0.2)', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                ✔️ Votaste por: <span style={{ textDecoration: 'underline' }}>{activePoll.user_vote}</span>
                <p style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)', marginTop: '4px' }}>Espera las indicaciones en el escenario...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activePoll.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleVote(opt)}
                    disabled={isSubmittingVote}
                    className="btn-secondary"
                    style={{ padding: '10px 15px', fontSize: '0.8rem', textAlign: 'left', justifyContent: 'flex-start' }}
                  >
                    {idx + 1}. {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 10px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px dashed var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '15px' }}>
            ⌛ Esperando señales interactivas de la obra...
          </div>
        )}

        {/* Pistas */}
        {revealedClues.length > 0 ? (
          <div className="fade-in">
            <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
              📂 Pistas del Espectáculo ({revealedClues.length})
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {revealedClues.map((clue) => (
                <div 
                  key={clue.id} 
                  style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', padding: '12px 15px', borderRadius: '12px' }}
                >
                  <strong style={{ fontSize: '0.85rem', color: '#fff', display: 'block', marginBottom: '6px' }}>🔍 {clue.title}</strong>
                  <p style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: '1.4' }}>{clue.content}</p>
                  {clue.image_url && (
                    <img 
                      src={clue.image_url} 
                      alt={clue.title} 
                      style={{ width: '100%', borderRadius: '8px', marginTop: '10px', maxHeight: '150px', objectFit: 'cover' }} 
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ maxWidth: '420px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0 10px 30px' }}>
        <Link to="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 'bold' }}>
          Ir al Catálogo de Studio 5
        </Link>
      </div>
    </div>
  );
};

export default BoletoView;
