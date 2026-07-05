import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';
import { ChevronLeft, Download, Send, Armchair, CreditCard } from 'lucide-react';

const DetalleObra = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isStaff } = useAuth();

  // Estados del Evento
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados del Formulario de Compra
  const [scheduleId, setScheduleId] = useState('');
  const [tipoVenta, setTipoVenta] = useState('Venta');
  const [metodoPago, setMetodoPago] = useState(''); // Se establecerá por defecto según rol
  const [banco, setBanco] = useState('Pichincha');
  const [bancoOtro, setBancoOtro] = useState('');
  const [numTransaccion, setNumTransaccion] = useState('');
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  
  // Para eventos no numerados
  const [cantAdultos, setCantAdultos] = useState(1);
  const [cantNinos, setCantNinos] = useState(0);

  // Para eventos numerados
  const [selectedSeats, setSelectedSeats] = useState([]);

  // Estados de Payphone (Simulación Tarjeta)
  const [showPayphoneModal, setShowPayphoneModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  // Estados del Resultado (Éxito)
  const [successData, setSuccessData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await api.get(`/events/${id}`);
        if (res.data.status === 'OK') {
          setEvent(res.data.event);
          if (res.data.event.schedules.length > 0) {
            setScheduleId(res.data.event.schedules[0].id);
          }
          // Si es staff/admin, por defecto Efectivo. Si es público general, por defecto Payphone (Tarjeta)
          const defaultMet = isStaff ? 'Efectivo' : 'Payphone';
          setMetodoPago(defaultMet);
        }
      } catch (err) {
        console.error(err);
        setError('Error al obtener los detalles del evento.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, isStaff]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px 0' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', borderColor: 'var(--error)' }}>
        <p style={{ color: 'var(--error)' }}>{error || 'El evento solicitado no existe.'}</p>
        <button onClick={() => navigate('/')} className="btn-outline" style={{ marginTop: '15px' }}>Volver a Cartelera</button>
      </div>
    );
  }

  const selectedSchedule = event.schedules.find(s => s.id === scheduleId);
  const disponibles = selectedSchedule ? selectedSchedule.available_capacity : 0;
  const bookedSeats = selectedSchedule ? selectedSchedule.booked_seats : [];

  const handleScheduleChange = (e) => {
    setScheduleId(e.target.value);
    setSelectedSeats([]);
  };

  let promoActiva = false;
  if (event.promo_type !== 'Ninguna') {
    if (!event.promo_deadline) promoActiva = true;
    else if (new Date() <= new Date(event.promo_deadline)) promoActiva = true;
  }

  const priceAd = promoActiva && event.promo_type === 'Preventa' ? parseFloat(event.price_promo) : parseFloat(event.price_adult);
  const priceNi = parseFloat(event.price_child);

  const numAdultos = event.has_assigned_seats ? Math.max(0, selectedSeats.length - cantNinos) : cantAdultos;
  const numNinos = event.has_assigned_seats ? cantNinos : cantNinos;
  const totalQty = event.has_assigned_seats ? selectedSeats.length : (cantAdultos + cantNinos);

  const calculateTotal = () => {
    if (tipoVenta === 'Cortesia') return 0;
    
    let total = 0;
    if (event.is_single_rate) {
      if (promoActiva && event.promo_type === '2x1') {
        total = (Math.floor(totalQty / 2) * parseFloat(event.price_adult)) + ((totalQty % 2) * parseFloat(event.price_adult));
      } else {
        total = totalQty * priceAd;
      }
    } else {
      if (promoActiva && event.promo_type === '2x1') {
        total = ((Math.floor(numAdultos / 2) * parseFloat(event.price_adult)) + ((numAdultos % 2) * parseFloat(event.price_adult))) + (numNinos * priceNi);
      } else {
        total = (numAdultos * priceAd) + (numNinos * priceNi);
      }
    }
    return total;
  };

  const toggleSeat = (seat) => {
    if (bookedSeats.includes(seat)) return;
    
    if (selectedSeats.includes(seat)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seat));
      if (cantNinos >= selectedSeats.length) {
        setCantNinos(Math.max(0, selectedSeats.length - 2));
      }
    } else {
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  // Enviar orden al servidor
  const submitOrderToServer = async (payphoneTxId = null) => {
    setIsProcessing(true);

    let met = metodoPago;
    let bankName = null;
    let refNum = payphoneTxId;

    if (metodoPago === 'Transferencia') {
      bankName = banco === 'Otro' ? bancoOtro : banco;
      refNum = numTransaccion;
      met = `Transf. ${bankName} (${refNum})`;
    } else if (metodoPago === 'Payphone') {
      met = 'Payphone';
    }

    const payload = {
      idEvento: event.id,
      fecha: scheduleId,
      nombre,
      email,
      whatsapp,
      cantAdultos: numAdultos,
      cantNinos: numNinos,
      tipoVenta: isStaff ? tipoVenta : 'Venta',
      metodoPago: met,
      banco: bankName,
      numTransaccion: refNum,
      seat_labels: event.has_assigned_seats ? selectedSeats : null
    };

    try {
      const res = await api.post('/orders', payload);
      if (res.data.status === 'OK') {
        Swal.fire('¡Compra Exitosa!', 'Tu pago ha sido procesado por Payphone.', 'success');
        setSuccessData(res.data);
      } else {
        Swal.fire('Error', res.data.message || 'No se pudo procesar la orden', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'Error de conexión.', 'error');
    } finally {
      setIsProcessing(false);
      setShowPayphoneModal(false);
    }
  };

  const handleRegisterClick = (e) => {
    e.preventDefault();

    if (totalQty <= 0) {
      Swal.fire('Error', 'La cantidad de entradas debe ser mayor a 0.', 'error');
      return;
    }

    if (!event.has_assigned_seats && totalQty > disponibles) {
      Swal.fire('Aforo Excedido', `No quedan suficientes asientos disponibles (${disponibles} restantes).`, 'warning');
      return;
    }

    if (metodoPago === 'Payphone') {
      // Si el método es Payphone, desplegamos la simulación del botón/widget de pago con tarjeta
      setShowPayphoneModal(true);
    } else {
      // Si es efectivo/reserva o transferencia, procesamos directo
      submitOrderToServer();
    }
  };

  // Simulación de transacción Payphone
  const handlePayphonePaymentSubmit = (e) => {
    e.preventDefault();
    if (cardNumber.length < 16 || cardExpiry.length < 5 || cardCvv.length < 3 || !cardHolder) {
      Swal.fire('Datos Incompletos', 'Por favor ingresa datos de tarjeta válidos.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Procesando Tarjeta...',
      text: 'Conectando con el servidor seguro de Payphone',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    setTimeout(() => {
      // Simular la devolución de un ID de transacción aprobado por Payphone
      const simulatedTxId = Math.floor(1000000 + Math.random() * 9000000).toString();
      Swal.close();
      submitOrderToServer(simulatedTxId);
    }, 2000);
  };

  const descargarTicket = (tCode) => {
    const element = document.getElementById(`export-ticket-${tCode}`);
    if (!element) return;
    
    Swal.fire({
      title: 'Generando Ticket...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    setTimeout(() => {
      html2canvas(element, { scale: 2, useCORS: true, logging: false }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Ticket_${tCode}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 1.0);
        link.click();
        Swal.close();
      }).catch(err => {
        console.error(err);
        Swal.fire('Error', 'No se pudo generar la imagen del ticket.', 'error');
      });
    }, 500);
  };

  // Formateadores automáticos de tarjeta
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatCardExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  if (successData) {
    const { order, tickets, schedule_time } = successData;
    const dateFormatted = new Date(schedule_time).toLocaleDateString('es-EC', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    });

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${order.order_num}&color=000000&bgcolor=ffffff`;
    const seatLabels = tickets.map(t => t.seat_label).filter(s => s !== null);
    const hasSeats = seatLabels.length > 0;
    const seatsText = hasSeats ? `Butacas: ${seatLabels.join(', ')}` : '';

    return (
      <div className="glass-panel fade-in" style={{ textAlign: 'center' }}>
        <h2 style={{ color: 'var(--success)', marginBottom: '10px' }}>¡Compra Exitosa!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Código Único: <b>{order.order_num}</b></p>
        
        <div style={{ marginBottom: '30px' }}>
          <div 
            id={`export-ticket-${order.order_num}`}
            style={{ 
              position: 'relative', width: '600px', height: '200px', 
              borderRadius: '0', overflow: 'hidden', background: '#fff', border: '1px solid #ddd',
              margin: '0 auto 15px auto', fontFamily: 'sans-serif', color: 'black'
            }}
          >
            <div style={{ 
              width: '100%', height: '100%', 
              backgroundImage: `url(${event.ticket_template_url || event.banner_url})`,
              backgroundSize: 'cover', backgroundPosition: 'center'
            }}></div>
            <div style={{ 
              position: 'absolute', right: '4%', top: '10%', height: '80%', width: '28%', 
              background: 'rgba(255, 255, 255, 0.96)', borderRadius: '8px', display: 'flex', 
              flexDirection: 'column', justifyContent: 'center', alignItems: 'center', 
              padding: '2% 3%', boxSizing: 'border-box', boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
            }}>
              {order.payment_status === 'Cortesía' && (
                <span style={{ fontSize: '7px', fontWeight: 900, border: '1px solid #e50914', color: '#e50914', padding: '1px 3px', borderRadius: '3px', marginBottom: '1px', textTransform: 'uppercase' }}>Cortesía</span>
              )}
              <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center', borderBottom: '1px solid #ddd', paddingBottom: '2px' }}>{order.customer_name}</span>
              <img src={qrUrl} alt="QR" style={{ width: '70%', aspectRatio: '1/1', margin: '3px 0' }} />
              <span style={{ fontSize: '6px', fontWeight: 'bold', color: '#555' }}>{order.order_num}</span>
              <span style={{ fontSize: '7px', fontWeight: '900', color: '#d32f2f', background: '#ffebeb', padding: '1px 4px', borderRadius: '4px', marginTop: '2px', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {totalQty} {totalQty === 1 ? 'Entrada' : 'Entradas'} {hasSeats && `[${seatLabels.join(',')}]`}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', maxWidth: '500px', margin: '0 auto' }}>
            <button onClick={() => descargarTicket(order.order_num)} className="btn-outline" style={{ flex: '1', padding: '10px 15px', fontSize: '0.85rem' }}>
              <Download size={16} /> Descargar JPG
            </button>
            
            {order.customer_whatsapp && (
              <a 
                href={`https://wa.me/${order.customer_whatsapp.startsWith('0') ? '593' + order.customer_whatsapp.substring(1) : order.customer_whatsapp}?text=${encodeURIComponent(
                  `¡Hola ${order.customer_name}! Aquí tienes tu e-ticket oficial de acceso para *${event.title}*.\n\n*Código QR Único:* ${order.order_num}\n*Entradas:* ${totalQty} (${event.is_single_rate ? 'General' : `${numAdultos} Adultos / ${numNinos} Niños`})\n${seatsText ? `*${seatsText}*\n` : ''}*Función:* ${dateFormatted}\n*Lugar:* ${event.venue}\n\n🎟️ *VER E-TICKET ONLINE EN TU CELULAR:* \n${window.location.origin}/boleto/${tickets[0].ticket_code}`
                )}`}
                target="_blank" 
                rel="noreferrer"
                className="btn-primary" 
                style={{ flex: '1', padding: '10px 15px', fontSize: '0.85rem', background: '#25D366', color: '#fff', boxShadow: 'none' }}
              >
                <Send size={16} /> WhatsApp
              </a>
            )}
          </div>
        </div>

        <button onClick={() => setSuccessData(null)} className="btn-secondary" style={{ marginTop: '20px' }}>Hacer Otra Venta</button>
      </div>
    );
  }

  const renderSeatingMap = () => {
    const layout = event.seating_layout || [];
    if (layout.length === 0) return <p>Sin distribución de asientos configurada.</p>;

    const rows = {};
    layout.forEach(seat => {
      const match = seat.match(/^([a-zA-Z]+)(\d+)$/);
      if (match) {
        const rowLabel = match[1];
        if (!rows[rowLabel]) rows[rowLabel] = [];
        rows[rowLabel].push(seat);
      } else {
        if (!rows['Otros']) rows['Otros'] = [];
        rows['Otros'].push(seat);
      }
    });

    return (
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px 10px', borderRadius: '16px', border: '1px solid var(--glass-border)', margin: '15px 0 25px 0' }}>
        <div style={{ width: '70%', height: '4px', background: 'var(--accent-glow)', margin: '0 auto 20px auto', borderRadius: '2px', boxShadow: '0 0 10px var(--accent-glow)', textAlign: 'center', fontSize: '0.65rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '2px', paddingTop: '8px' }}>
          Escenario / Pantalla
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          {Object.keys(rows).sort().map(rowName => (
            <div key={rowName} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', width: '15px', color: 'var(--text-muted)' }}>{rowName}</span>
              {rows[rowName].sort((a,b) => parseInt(a.replace(/\D/g,'')) - parseInt(b.replace(/\D/g,''))).map(seat => {
                const isBooked = bookedSeats.includes(seat);
                const isSelected = selectedSeats.includes(seat);
                
                let seatColor = 'var(--text-muted)';
                if (isBooked) seatColor = 'var(--error)';
                else if (isSelected) seatColor = 'var(--accent)';
                else seatColor = 'var(--success)';

                return (
                  <button
                    key={seat}
                    type="button"
                    onClick={() => toggleSeat(seat)}
                    disabled={isBooked}
                    style={{
                      background: 'none', border: 'none', cursor: isBooked ? 'not-allowed' : 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'var(--transition-smooth)'
                    }}
                    title={`Asiento ${seat} - ${isBooked ? 'Ocupado' : isSelected ? 'Seleccionado' : 'Disponible'}`}
                  >
                    <Armchair size={22} color={seatColor} style={{ transform: isSelected ? 'scale(1.15)' : 'none' }} />
                    <span style={{ fontSize: '0.55rem', color: isBooked ? 'var(--text-muted)' : '#fff', marginTop: '2px', fontWeight: 'bold' }}>{seat}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px', fontSize: '0.7rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Armchair size={14} color="var(--success)" /> Disponible</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Armchair size={14} color="var(--accent)" /> Seleccionado</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Armchair size={14} color="var(--error)" /> Ocupado</div>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel fade-in">
      <button onClick={() => navigate('/')} className="btn-secondary" style={{ padding: '8px 15px', width: 'auto', marginBottom: '20px', fontSize: '0.85rem' }}>
        <ChevronLeft size={16} /> Volver a Cartelera
      </button>

      <h2 style={{ color: 'var(--accent)', marginBottom: '5px' }}>{event.title}</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>📍 {event.venue}</p>

      {promoActiva && (
        <div style={{ background: 'rgba(241,165,28,0.1)', border: '1px solid var(--accent-glow)', padding: '10px 15px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>🔥 PROMOCIÓN ACTIVA: </span>
          {event.promo_type === '2x1' ? '2x1 en entradas de adultos' : `Preventa especial por $${event.price_promo}`}
          {event.promo_deadline && ` hasta el ${new Date(event.promo_deadline).toLocaleDateString('es-EC')}`}
        </div>
      )}

      <form onSubmit={handleRegisterClick}>
        {/* Vista Admin/Staff: Selección de tipo de operación */}
        {isStaff && (
          <>
            <label>Tipo Operación (POS)</label>
            <select value={tipoVenta} onChange={(e) => setTipoVenta(e.target.value)}>
              <option value="Venta">Venta Pagada</option>
              <option value="Pendiente">Reserva Pendiente</option>
              <option value="Cortesia">Cortesía</option>
            </select>
          </>
        )}

        {/* Métodos de Pago Diferenciados (Admin/Staff vs. Compradores Públicos) */}
        {tipoVenta !== 'Cortesia' && (
          <>
            <label>Método de Pago</label>
            {isStaff ? (
              // Métodos para el personal en boletería/POS
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                <option value="Efectivo">Efectivo (Directo)</option>
                <option value="Transferencia">Transferencia Bancaria</option>
              </select>
            ) : (
              // Métodos para el Comprador Web (tipo Meet2go)
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                <option value="Payphone">💳 Tarjeta de Crédito/Débito (Payphone)</option>
                <option value="Transferencia">🏦 Transferencia Bancaria (Reserva)</option>
              </select>
            )}

            {metodoPago === 'Transferencia' && (
              <div className="fade-in" style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <label>Banco de Destino</label>
                <select value={banco} onChange={(e) => setBanco(e.target.value)}>
                  <option value="Pichincha">Banco Pichincha</option>
                  <option value="Guayaquil">Banco Guayaquil</option>
                  <option value="Otro">Otro Banco</option>
                </select>

                {banco === 'Otro' && (
                  <input type="text" value={bancoOtro} onChange={(e) => setBancoOtro(e.target.value)} placeholder="Nombre del Banco" required />
                )}

                <label>Ref. Transacción / Comprobante</label>
                <input type="text" value={numTransaccion} onChange={(e) => setNumTransaccion(e.target.value)} placeholder={isStaff ? "Código de referencia" : "Código del comprobante transferido"} required />
              </div>
            )}
          </>
        )}

        <label>Nombre del Cliente</label>
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del espectador" required />

        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ flex: '1' }}>
            <label>WhatsApp</label>
            <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Ej: 0995123456" />
          </div>
          <div style={{ flex: '1' }}>
            <label>Email (Recomendado)</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Para recibir boletos" required={!isStaff} />
          </div>
        </div>

        <label>Función</label>
        <select value={scheduleId} onChange={handleScheduleChange}>
          {event.schedules.map((sch) => {
            const dateFormatted = new Date(sch.schedule_time).toLocaleDateString('es-EC', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            });
            return (
              <option key={sch.id} value={sch.id}>
                {dateFormatted} {!event.has_assigned_seats && `(${sch.available_capacity} asientos)`}
              </option>
            );
          })}
        </select>

        {/* Asientos Numerados */}
        {event.has_assigned_seats && (
          <div className="fade-in">
            <label>Selecciona tus Asientos en el Mapa *</label>
            {renderSeatingMap()}
            
            {selectedSeats.length > 0 && (
              <div className="glass-card" style={{ marginBottom: '20px' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Asientos Seleccionados: {selectedSeats.join(', ')}</p>
                {!event.is_single_rate && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px', marginTop: '10px' }}>
                    <label style={{ marginBottom: '0' }}>¿Cuántos son Niños?</label>
                    <input 
                      type="number" 
                      value={cantNinos} 
                      onChange={(e) => setCantNinos(Math.min(selectedSeats.length, Math.max(0, parseInt(e.target.value) || 0)))}
                      min="0"
                      max={selectedSeats.length}
                      style={{ width: '80px', marginBottom: '0', textAlign: 'center' }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Asientos No Numerados */}
        {!event.has_assigned_seats && (
          <div className="fade-in">
            <div style={{ textAlign: 'center', marginBottom: '15px', fontWeight: 'bold' }}>
              {disponibles > 0 ? (
                <span style={{ color: 'var(--success)' }}>🎟️ {disponibles} asientos disponibles</span>
              ) : (
                <span style={{ color: 'var(--error)' }}>🚨 FUNCIÓN AGOTADA</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <div style={{ flex: '1', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                <label style={{ color: 'var(--text-primary)' }}>
                  {event.is_single_rate ? 'GENERAL' : 'ADULTOS'} (${priceAd.toFixed(2)})
                </label>
                <input 
                  type="number" 
                  value={cantAdultos} 
                  onChange={(e) => setCantAdultos(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  style={{ textAlign: 'center', marginBottom: '0', fontSize: '1.2rem', fontWeight: 'bold', marginTop: '8px' }}
                />
              </div>

              {!event.is_single_rate && (
                <div style={{ flex: '1', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                  <label style={{ color: 'var(--text-primary)' }}>NIÑOS (${priceNi.toFixed(2)})</label>
                  <input 
                    type="number" 
                    value={cantNinos} 
                    onChange={(e) => setCantNinos(Math.max(0, parseInt(e.target.value) || 0))}
                    min="0"
                    style={{ textAlign: 'center', marginBottom: '0', fontSize: '1.2rem', fontWeight: 'bold', marginTop: '8px' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={isProcessing || (event.has_assigned_seats ? selectedSeats.length === 0 : disponibles <= 0)}
        >
          {isProcessing ? 'PROCESANDO...' : `PAGAR $${calculateTotal().toFixed(2)}`}
        </button>
      </form>

      {/* --- MODAL / OVERLAY DE SIMULACIÓN DE CHECKOUT DE PAYPHONE --- */}
      {showPayphoneModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000,
          padding: '15px'
        }} className="fade-in">
          <div className="glass-panel" style={{ width: '100%', maxWidth: '380px', border: '2px solid rgba(3,169,244,0.3)' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img src="https://i.imgur.com/Gezz740.png" style={{ width: '40px', marginBottom: '10px', filter: 'hue-rotate(190deg)' }} alt="Payphone" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent-secondary)', letterSpacing: '1px' }}>PAYPHONE CHECKOUT</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Conexión segura de tarjetas de crédito/débito</p>
            </div>

            {/* Simulación Gráfica de Tarjeta de Crédito */}
            <div style={{
              background: 'linear-gradient(135deg, #0288d1 0%, #005682 100%)',
              borderRadius: '12px', padding: '15px', color: '#fff',
              boxShadow: '0 8px 16px rgba(0,0,0,0.4)', marginBottom: '20px',
              fontFamily: 'monospace', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <CreditCard size={32} />
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Payphone</span>
              </div>
              
              <div style={{ fontSize: '1.15rem', letterSpacing: '2px', marginBottom: '15px' }}>
                {cardNumber || '•••• •••• •••• ••••'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                <div>
                  <span style={{ color: '#b3e5fc', display: 'block', fontSize: '0.55rem' }}>TARJETAHABIENTE</span>
                  <span>{cardHolder.toUpperCase() || 'NOMBRE APELLIDO'}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: '#b3e5fc', display: 'block', fontSize: '0.55rem' }}>EXPIRA</span>
                  <span>{cardExpiry || 'MM/YY'}</span>
                </div>
              </div>
            </div>

            {/* Formulario de Pago */}
            <form onSubmit={handlePayphonePaymentSubmit}>
              <label style={{ fontSize: '0.65rem' }}>Número de Tarjeta</label>
              <input 
                type="text" 
                maxLength="19"
                value={cardNumber} 
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="4000 1234 5678 9010" 
                required 
              />

              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: '1' }}>
                  <label style={{ fontSize: '0.65rem' }}>Fecha Expiración</label>
                  <input 
                    type="text" 
                    maxLength="5"
                    value={cardExpiry} 
                    onChange={(e) => setCardExpiry(formatCardExpiry(e.target.value))}
                    placeholder="MM/YY" 
                    required 
                  />
                </div>
                <div style={{ flex: '1' }}>
                  <label style={{ fontSize: '0.65rem' }}>CVV / CVC</label>
                  <input 
                    type="password" 
                    maxLength="4"
                    value={cardCvv} 
                    onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123" 
                    required 
                  />
                </div>
              </div>

              <label style={{ fontSize: '0.65rem' }}>Nombre en Tarjeta</label>
              <input 
                type="text" 
                value={cardHolder} 
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="JUAN PEREZ" 
                required 
              />

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" className="btn-primary" style={{ flex: '2', background: 'var(--accent-secondary)', color: '#fff', boxShadow: 'none' }}>
                  Confirmar ${calculateTotal().toFixed(2)}
                </button>
                <button type="button" onClick={() => setShowPayphoneModal(false)} className="btn-secondary" style={{ flex: '1' }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DetalleObra;
