import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';
import { ChevronLeft, Download, Send, Armchair, CreditCard, Calendar } from 'lucide-react';

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const backendUrl = apiUrl.replace(/\/api$/, '');
  return `${backendUrl}${url}`;
};

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

  // Estados de Payphone
  const [showPayphoneModal, setShowPayphoneModal] = useState(false);
  const [payphoneToken, setPayphoneToken] = useState('');
  const [isPayphoneScriptLoaded, setIsPayphoneScriptLoaded] = useState(false);
  const [surchargeEnable, setSurchargeEnable] = useState(false);
  const [surchargeRate, setSurchargeRate] = useState(0.043);
  const [surchargeFixed, setSurchargeFixed] = useState(0.30);

  // Estados del Resultado (Éxito)
  const [successData, setSuccessData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados de Facturación
  const [isFinalConsumer, setIsFinalConsumer] = useState(true);
  const [billingIdNumber, setBillingIdNumber] = useState('');
  const [billingName, setBillingName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingEmail, setBillingEmail] = useState('');

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

  // Cargar configuración de Payphone y script SDK
  useEffect(() => {
    const fetchPayphoneConfig = async () => {
      try {
        const res = await api.get('/config/payphone');
        if (res.data.status === 'OK') {
          setPayphoneToken(res.data.token);
          setSurchargeEnable(res.data.surcharge_enable || false);
          setSurchargeRate(res.data.surcharge_rate || 0.043);
          setSurchargeFixed(res.data.surcharge_fixed || 0.30);
        }
      } catch (err) {
        console.warn('No se pudo obtener el token de Payphone:', err);
      }
    };
    fetchPayphoneConfig();

    // Cargar CSS de la Cajita de Pagos
    const cssId = 'payphone-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.css';
      document.head.appendChild(link);
    }

    // Cargar JS de la Cajita de Pagos
    const scriptId = 'payphone-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.js';
      script.type = 'module';
      script.onload = () => setIsPayphoneScriptLoaded(true);
      document.body.appendChild(script);
    } else {
      setIsPayphoneScriptLoaded(true);
    }
  }, []);

  // Renderizar el botón/cajita de pagos oficial de Payphone
  useEffect(() => {
    if (!showPayphoneModal || !isPayphoneScriptLoaded || !payphoneToken) return;

    const timer = setTimeout(() => {
      const element = document.getElementById('payphone-element');
      if (!element) return;
      
      element.innerHTML = '';

      const uniqueClientTxId = `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`.substring(0, 20);

      try {
        if (window.PPaymentButtonBox) {
          // Guardar orden pendiente en localStorage antes de que ocurra la redirección
          const orderData = {
            idEvento: event.id,
            fecha: scheduleId,
            nombre,
            email,
            whatsapp,
            cantAdultos,
            cantNinos,
            tipoVenta: 'Venta',
            metodoPago: 'Payphone',
            seat_labels: selectedSeats,
            clientTxId: uniqueClientTxId
          };
          localStorage.setItem('pending_order', JSON.stringify(orderData));

          const subtotal = calculateTotal();
          const surcharge = surchargeEnable ? calculatePayphoneSurcharge(subtotal) : 0;
          const finalAmountCents = Math.round((subtotal + surcharge) * 100);

          const ppb = new window.PPaymentButtonBox({
            token: payphoneToken,
            amount: finalAmountCents, // en centavos
            amountWithoutTax: finalAmountCents,
            currency: "USD",
            clientTransactionId: uniqueClientTxId,
            reference: `Entradas para ${event.title}`,
            lang: "es",
            defaultMethod: "card"
          });
          ppb.render('payphone-element');
        } else {
          console.error('PPaymentButtonBox no está disponible en window');
        }
      } catch (err) {
        console.error('Error al inicializar PPaymentButtonBox:', err);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [showPayphoneModal, isPayphoneScriptLoaded, payphoneToken]);

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

  const handleScheduleSelect = (id) => {
    setScheduleId(id);
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

  const calculatePayphoneSurcharge = (subtotal) => {
    if (subtotal <= 0) return 0;
    const total = (subtotal + surchargeFixed) / (1 - surchargeRate);
    const roundedTotal = Math.round(total * 100) / 100;
    return Math.max(0, Math.round((roundedTotal - subtotal) * 100) / 100);
  };

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
  const submitOrderToServer = async (payphoneTxId = null, clientTxId = null) => {
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
      seat_labels: event.has_assigned_seats ? selectedSeats : null,
      clientTxId: clientTxId,
      // Datos de facturación
      is_final_consumer: isFinalConsumer,
      billing_id_number: isFinalConsumer ? null : billingIdNumber,
      billing_name: isFinalConsumer ? null : billingName,
      billing_address: isFinalConsumer ? null : billingAddress,
      billing_email: isFinalConsumer ? null : billingEmail
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

  // Descargar ticket en formato de imagen JPG
  const descargarTicket = (orderNum) => {
    const element = document.getElementById(`export-ticket-${orderNum}`);
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
        link.download = `Ticket_${orderNum}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 1.0);
        link.click();
        Swal.close();
      }).catch(err => {
        console.error(err);
        Swal.fire('Error', 'No se pudo generar la imagen del ticket.', 'error');
      });
    }, 500);
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
              position: 'relative', width: '320px', height: '420px', 
              borderRadius: '16px', overflow: 'hidden', background: '#fff', border: '1px solid #ddd',
              margin: '0 auto 15px auto', fontFamily: 'sans-serif', color: 'black',
              display: 'flex', flexDirection: 'column', boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
            }}
          >
            {/* Top section: Banner image */}
            <div style={{ position: 'relative', width: '100%', height: '140px' }}>
              <img 
                src={getImageUrl(event.ticket_template_url || event.banner_url)} 
                alt="Banner preview" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', padding: '5px 10px', borderRadius: '6px' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }}>{event.title}</h3>
                <p style={{ margin: '2px 0 0 0', color: '#ccc', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }}>📍 {event.venue}</p>
              </div>
              {order.payment_status === 'Cortesía' && (
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
                <span style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Espectador</span>
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
                  {totalQty} {totalQty === 1 ? 'Entrada' : 'Entradas'} {hasSeats && `[${seatLabels.join(',')}]`}
                </span>
              </div>
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

  // Helper para asegurar distribución en formato matriz 2D
  const ensure2DLayout = (layout) => {
    if (!layout || layout.length === 0) return [];
    if (Array.isArray(layout[0])) return layout;
    
    const rows = {};
    layout.forEach(seat => {
      if (!seat) return;
      const match = seat.match(/^([a-zA-Z]+)(\d+)$/);
      if (match) {
        const rowLabel = match[1].toUpperCase();
        if (!rows[rowLabel]) rows[rowLabel] = [];
        rows[rowLabel].push(seat);
      } else {
        if (!rows['Otros']) rows['Otros'] = [];
        rows['Otros'].push(seat);
      }
    });

    let maxSeatNum = 1;
    layout.forEach(seat => {
      if (!seat) return;
      const match = seat.match(/^([a-zA-Z]+)(\d+)$/);
      if (match) {
        const seatNum = parseInt(match[2]);
        if (seatNum > maxSeatNum) maxSeatNum = seatNum;
      }
    });

    const grid = [];
    Object.keys(rows).sort().forEach(rowName => {
      const rowSeats = [];
      const rowSeatsMap = {};
      rows[rowName].forEach(s => {
        const match = s.match(/\d+/);
        if (match) {
          rowSeatsMap[parseInt(match[0])] = s;
        }
      });

      for (let c = 1; c <= maxSeatNum; c++) {
        rowSeats.push(rowSeatsMap[c] || "");
      }
      grid.push(rowSeats);
    });

    return grid;
  };

  const renderSeatingMap = () => {
    const rawLayout = event.seating_layout || [];
    if (rawLayout.length === 0) return <p>Sin distribución de asientos configurada.</p>;

    const grid = ensure2DLayout(rawLayout);

    const bookedSeatsUpper = bookedSeats.map(s => s.trim().toUpperCase());
    const selectedSeatsUpper = selectedSeats.map(s => s.trim().toUpperCase());

    return (
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px 10px', borderRadius: '16px', border: '1px solid var(--glass-border)', margin: '15px 0 25px 0' }}>
        <div style={{ width: '70%', height: '4px', background: 'var(--accent-glow)', margin: '0 auto 20px auto', borderRadius: '2px', boxShadow: '0 0 10px var(--accent-glow)', textAlign: 'center', fontSize: '0.65rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '2px', paddingTop: '8px' }}>
          Escenario / Pantalla
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', width: '100%', overflowX: 'auto', padding: '10px 0' }}>
          {grid.map((row, rowIndex) => {
            let rowName = "";
            const firstActive = row.find(s => s !== "");
            if (firstActive) {
              const match = firstActive.match(/^([a-zA-Z]+)/);
              if (match) rowName = match[1];
            }
            if (!rowName) {
              rowName = String.fromCharCode(65 + rowIndex);
            }

            return (
              <div key={rowIndex} style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', width: 'max-content', minWidth: '100%', padding: '0 10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', width: '15px', color: 'var(--text-muted)', textAlign: 'center' }}>{rowName}</span>
                {row.map((seat, colIndex) => {
                  const isActive = seat !== "";
                  if (!isActive) {
                    return (
                      <div 
                        key={`spacer-${rowIndex}-${colIndex}`} 
                        style={{ width: '22px', height: '36px' }} 
                      />
                    );
                  }

                  const isBooked = bookedSeatsUpper.includes(seat.toUpperCase());
                  const isSelected = selectedSeatsUpper.includes(seat.toUpperCase());
                  
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
            );
          })}
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
    <div className="detalle-obra-page fade-in">
      <button onClick={() => navigate('/')} className="btn-secondary" style={{ padding: '8px 15px', width: 'auto', marginBottom: '20px', fontSize: '0.85rem' }}>
        <ChevronLeft size={16} /> Volver a Cartelera
      </button>

      <div className="detalle-obra-layout">
        {/* Columna Izquierda: Banner e Info */}
        <div className="detalle-media-col glass-panel">
          <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '20px', aspectRatio: '16/9' }}>
            <img 
              src={getImageUrl(event.banner_url)} 
              alt={event.title} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
          <h2 style={{ color: 'var(--accent)', marginBottom: '5px', fontSize: '1.8rem', fontWeight: 900 }}>{event.title}</h2>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '15px' }}>📍 {event.venue}</p>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.6', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
            <p>Disfruta de esta increíble producción. Selecciona tu función preferida, define la cantidad de entradas o butacas, ingresa tus datos y realiza tu pago en segundos.</p>
          </div>
        </div>

        {/* Columna Derecha: Formulario y Asientos */}
        <div className="detalle-form-col glass-panel">
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

        <label>Selecciona una Función *</label>
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          overflowX: 'auto', 
          padding: '5px 0 15px 0', 
          scrollbarWidth: 'thin',
          marginBottom: '15px'
        }}>
          {event.schedules.map((sch) => {
            const dateObj = new Date(sch.schedule_time);
            const dayName = dateObj.toLocaleDateString('es-EC', { weekday: 'short' });
            const dayNum = dateObj.toLocaleDateString('es-EC', { day: 'numeric' });
            const monthName = dateObj.toLocaleDateString('es-EC', { month: 'short' });
            const timeStr = dateObj.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
            
            const isSelected = sch.id === scheduleId;
            const isSoldOut = sch.available_capacity <= 0;
            
            return (
              <button
                key={sch.id}
                type="button"
                onClick={() => !isSoldOut && handleScheduleSelect(sch.id)}
                disabled={isSoldOut}
                style={{
                  flex: '0 0 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px 18px',
                  borderRadius: '16px',
                  cursor: isSoldOut ? 'not-allowed' : 'pointer',
                  background: isSelected 
                    ? 'rgba(222,184,65,0.15)' 
                    : isSoldOut 
                      ? 'rgba(255,59,48,0.02)' 
                      : 'rgba(255,255,255,0.03)',
                  border: `2px solid ${isSelected 
                    ? 'var(--accent)' 
                    : isSoldOut 
                      ? 'rgba(255,59,48,0.15)' 
                      : 'var(--glass-border)'}`,
                  color: isSelected ? '#fff' : isSoldOut ? 'rgba(255,59,48,0.4)' : 'var(--text-primary)',
                  boxShadow: isSelected ? '0 0 15px rgba(222,184,65,0.2)' : 'none',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: isSelected ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                  {dayName}
                </span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, margin: '2px 0' }}>
                  {dayNum} {monthName}
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: '600' }}>
                  🕒 {timeStr}
                </span>
                <span style={{ fontSize: '0.62rem', marginTop: '4px', opacity: 0.8, color: isSoldOut ? 'var(--error)' : 'var(--success)', fontWeight: 'bold' }}>
                  {isSoldOut ? 'AGOTADO' : `${sch.available_capacity} disp.`}
                </span>
              </button>
            );
          })}
        </div>

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

        {/* Sección de Facturación (opcional, solo si el evento lo requiere) */}
        {event.require_billing && (
          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isFinalConsumer ? '0' : '16px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>🧾 Datos de Facturación</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>¿Necesitas factura con tus datos?</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '26px', marginBottom: 0, cursor: 'pointer' }}>
                <input type="checkbox" checked={!isFinalConsumer} onChange={e => setIsFinalConsumer(!e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: !isFinalConsumer ? 'var(--accent)' : 'rgba(255,255,255,0.12)', borderRadius: '26px', transition: 'background 0.3s' }}>
                  <span style={{ position: 'absolute', height: '20px', width: '20px', left: !isFinalConsumer ? '22px' : '3px', bottom: '3px', background: '#fff', borderRadius: '50%', transition: 'left 0.3s' }} />
                </span>
              </label>
            </div>

            {isFinalConsumer && (
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '8px 0 0 0' }}>Consumidor Final. Activa el toggle si necesitas factura con tus datos.</p>
            )}

            {!isFinalConsumer && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: '1' }}>
                    <label style={{ fontSize: '0.65rem' }}>Cédula / RUC *</label>
                    <input type="text" value={billingIdNumber} onChange={e => setBillingIdNumber(e.target.value)} placeholder="0912345678" style={{ marginBottom: 0 }} required />
                  </div>
                  <div style={{ flex: '2' }}>
                    <label style={{ fontSize: '0.65rem' }}>Razón Social / Nombre *</label>
                    <input type="text" value={billingName} onChange={e => setBillingName(e.target.value)} placeholder="Empresa S.A. o Tu Nombre" style={{ marginBottom: 0 }} required />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem' }}>Dirección</label>
                  <input type="text" value={billingAddress} onChange={e => setBillingAddress(e.target.value)} placeholder="Av. Principal 123, Ciudad" style={{ marginBottom: 0 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem' }}>Correo para Factura</label>
                  <input type="email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} placeholder="factura@empresa.com" style={{ marginBottom: 0 }} />
                </div>
              </div>
            )}
          </div>
        )}

        {metodoPago === 'Payphone' && surchargeEnable && calculateTotal() > 0 && (
          <div className="glass-card" style={{ marginBottom: '15px', padding: '12px', background: 'rgba(222,184,65,0.03)', border: '1px solid var(--accent-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
              <span>Subtotal:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
              <span>Recargo por Servicio de Tarjeta:</span>
              <span>${calculatePayphoneSurcharge(calculateTotal()).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--accent)', paddingTop: '5px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span>Total a Pagar:</span>
              <span>${(calculateTotal() + calculatePayphoneSurcharge(calculateTotal())).toFixed(2)}</span>
            </div>
          </div>
        )}

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={isProcessing || (event.has_assigned_seats ? selectedSeats.length === 0 : disponibles <= 0)}
        >
          {isProcessing ? 'PROCESANDO...' : `PAGAR $${(metodoPago === 'Payphone' && surchargeEnable ? calculateTotal() + calculatePayphoneSurcharge(calculateTotal()) : calculateTotal()).toFixed(2)}`}
        </button>
      </form>
        </div>
      </div>

      {/* --- MODAL / OVERLAY DE CHECKOUT DE PAYPHONE REAL --- */}
      {showPayphoneModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000,
          padding: '15px'
        }} className="fade-in">
          <div className="glass-panel" style={{ width: '100%', maxWidth: '380px', border: '2px solid rgba(222,184,65,0.3)', padding: '25px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img src="https://i.imgur.com/Gezz740.png" style={{ width: '40px', marginBottom: '10px', filter: 'hue-rotate(190deg)' }} alt="Payphone" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent)', letterSpacing: '1px' }}>PAYPHONE CHECKOUT</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Procesamiento seguro de tarjetas de crédito y débito</p>
            </div>

            {/* Elemento de renderizado para el botón de Payphone */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', border: '1px dashed var(--glass-border)', textAlign: 'center', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {!isPayphoneScriptLoaded ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cargando pasarela de pagos...</div>
              ) : !payphoneToken ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--error)' }}>Error al obtener credenciales de pago.</div>
              ) : (
                <div id="payphone-element" style={{ width: '100%' }}></div>
              )}
            </div>

            <div style={{ marginTop: '20px' }}>
              <button 
                type="button" 
                onClick={() => setShowPayphoneModal(false)} 
                className="btn-secondary" 
                style={{ width: '100%' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DetalleObra;
