import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';
import { ChevronLeft, Download, Send, Armchair, CreditCard, Calendar, ChevronDown, Copy, Upload, Trash2, Check, Info } from 'lucide-react';

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

// Componente de Select Moderno y Premium
const CustomSelect = ({ value, onChange, options, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
      {label && <label>{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '14px 16px',
          background: 'rgba(0, 0, 0, 0.4)',
          border: isOpen ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
          borderRadius: '12px',
          color: 'var(--text-primary)',
          fontSize: '0.95rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: isOpen ? '0 0 12px var(--accent-glow)' : 'none',
          transition: 'var(--transition-smooth)'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedOption.icon && <selectedOption.icon size={16} color="var(--accent)" />}
          {selectedOption.label}
        </span>
        <ChevronDown size={16} style={{ 
          color: 'var(--accent)', 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease'
        }} />
      </div>
      
      {isOpen && (
        <>
          <div 
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
          />
          <div 
            className="fade-in"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '6px',
              background: 'rgba(10, 10, 10, 0.98)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--glass-border)',
              borderRadius: '12px',
              overflow: 'hidden',
              zIndex: 1000,
              boxShadow: '0 10px 25px rgba(0,0,0,0.8)'
            }}
          >
            {options.map((opt) => (
              <div 
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  color: opt.value === value ? 'var(--accent)' : 'var(--text-primary)',
                  background: opt.value === value ? 'rgba(222, 184, 65, 0.08)' : 'transparent',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: opt.value === value ? '700' : '500',
                  fontSize: '0.9rem'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = opt.value === value ? 'rgba(222, 184, 65, 0.08)' : 'transparent'}
              >
                {opt.icon && <opt.icon size={15} />}
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
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

  // Nuevos estados para transferencia bancaria
  const [comprobanteBase64, setComprobanteBase64] = useState('');
  const [comprobanteName, setComprobanteName] = useState('');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);

  // Cargar cuentas bancarias activas al seleccionar transferencia
  useEffect(() => {
    if (metodoPago === 'Transferencia') {
      const fetchBankAccounts = async () => {
        setLoadingBanks(true);
        try {
          const res = await api.get('/bank-accounts');
          if (res.data.status === 'OK') {
            setBankAccounts(res.data.bankAccounts);
          }
        } catch (err) {
          console.error('Error al cargar cuentas bancarias:', err);
        } finally {
          setLoadingBanks(false);
        }
      };
      fetchBankAccounts();
    }
  }, [metodoPago]);

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
            defaultMethod: "card",
            email: email || '',
            phoneNumber: whatsapp ? whatsapp.replace(/\D/g, '') : '',
            ...(isFinalConsumer ? {} : { documentId: billingIdNumber || '' })
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
      met = 'Transferencia Bancaria';
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
      billing_email: isFinalConsumer ? null : billingEmail,
      // Comprobante
      comprobante: metodoPago === 'Transferencia' ? comprobanteBase64 : null
    };

    try {
      const res = await api.post('/orders', payload);
      if (res.data.status === 'OK') {
        const isPending = res.data.order?.payment_status === 'Pendiente';
        if (isPending) {
          Swal.fire('¡Reserva Registrada!', 'Tu comprobante ha sido recibido. Se encuentra pendiente de verificación.', 'success');
        } else {
          Swal.fire('¡Compra Exitosa!', 'Tu reserva ha sido procesada con éxito.', 'success');
        }
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

  // Auxiliar para copiar texto del panel de transferencias
  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `${fieldName} copiado al portapapeles`,
      showConfirmButton: false,
      timer: 1500,
      background: '#151515',
      color: '#fff'
    });
  };

  // Auxiliar para manejar la subida del comprobante bancario
  const handleReceiptFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      Swal.fire('Error', 'Por favor selecciona un archivo de imagen (PNG, JPG) o PDF.', 'error');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      Swal.fire('Archivo muy grande', 'El comprobante no debe pesar más de 8MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setComprobanteBase64(event.target.result);
      setComprobanteName(file.name);
    };
    reader.readAsDataURL(file);
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

    const isPending = order.payment_status === 'Pendiente';

    if (isPending) {
      return (
        <div className="glass-panel fade-in" style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255, 204, 0, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto',
            border: '2px solid var(--warning)'
          }}>
            <Info size={32} color="var(--warning)" />
          </div>
          <h2 style={{ color: 'var(--warning)', marginBottom: '10px' }}>¡Reserva Registrada!</h2>
          <p style={{ color: '#ccc', marginBottom: '20px', fontSize: '0.95rem' }}>
            Tu reserva <b style={{ color: 'var(--accent)' }}>#{order.order_num}</b> ha sido recibida con éxito.
          </p>
          
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px', padding: '20px', textAlign: 'left', marginBottom: '25px'
          }}>
            <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>Detalles de la Reserva</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '6px 0' }}>🎬 <b>Evento:</b> {event.title}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '6px 0' }}>📅 <b>Función:</b> {dateFormatted}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '6px 0' }}>📍 <b>Lugar:</b> {event.venue}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '6px 0' }}>🎟️ <b>Cantidad:</b> {order.ticket_count_adult + order.ticket_count_child} entradas</p>
            <p style={{ fontSize: '0.95rem', color: 'var(--accent)', fontWeight: '700', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>💰 Total a Reservar: ${parseFloat(order.amount_total).toFixed(2)}</p>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: '1.5', marginBottom: '25px' }}>
            Hemos enviado un correo a <b>{order.customer_email || 'tu email'}</b> confirmando que tu comprobante ha sido subido. Los tickets definitivos con códigos QR se te enviarán una vez aprobado el pago por la administración.
          </p>

          <button onClick={() => navigate('/')} className="btn-primary">
            Volver a Cartelera
          </button>
        </div>
      );
    }

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
              position: 'relative', width: '320px', height: '460px', 
              borderRadius: '16px', overflow: 'hidden', background: '#fff', border: '1px solid #ddd',
              margin: '0 auto 15px auto', fontFamily: 'sans-serif', color: 'black',
              display: 'flex', flexDirection: 'column', boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
            }}
          >
            {/* Top section: Banner image */}
            <div style={{ position: 'relative', width: '100%', height: '180px' }}>
              <img 
                src={getImageUrl(event.banner_url)} 
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
          <CustomSelect 
            value={tipoVenta} 
            onChange={setTipoVenta} 
            options={[
              { value: 'Venta', label: 'Venta Pagada' },
              { value: 'Pendiente', label: 'Reserva Pendiente' },
              { value: 'Cortesia', label: 'Cortesía' }
            ]} 
            label="Tipo Operación (POS)" 
          />
        )}

        {/* Métodos de Pago Diferenciados (Admin/Staff vs. Compradores Públicos) */}
        {tipoVenta !== 'Cortesia' && (
          <>
            {isStaff ? (
              // Métodos para el personal en boletería/POS
              <CustomSelect 
                value={metodoPago} 
                onChange={setMetodoPago} 
                options={[
                  { value: 'Efectivo', label: 'Efectivo (Directo)' },
                  { value: 'Transferencia', label: 'Transferencia Bancaria' }
                ]} 
                label="Método de Pago" 
              />
            ) : (
              // Métodos para el Comprador Web (tipo Meet2go)
              <CustomSelect 
                value={metodoPago} 
                onChange={setMetodoPago} 
                options={[
                  { value: 'Payphone', label: 'Tarjeta de Crédito/Débito (Payphone)', icon: CreditCard },
                  { value: 'Transferencia', label: 'Transferencia Bancaria (Reserva)', icon: Calendar }
                ]} 
                label="Método de Pago" 
              />
            )}

            {metodoPago === 'Transferencia' && (
              <div className="fade-in" style={{ 
                background: 'rgba(255,255,255,0.02)', 
                padding: '20px', 
                borderRadius: '16px', 
                marginBottom: '20px', 
                border: '1px solid rgba(255,255,255,0.08)' 
              }}>
                <h4 style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Datos para Transferencia Bancaria
                </h4>

                {loadingBanks ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '15px 0' }}>
                    <div className="spinner" style={{ width: '25px', height: '25px' }} />
                  </div>
                ) : bankAccounts.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No hay cuentas bancarias configuradas por el administrador.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    {bankAccounts.map((acc) => (
                      <div key={acc.id} style={{ 
                        background: 'rgba(0,0,0,0.3)', 
                        borderRadius: '12px', 
                        padding: '12px 14px', 
                        border: '1px solid rgba(255,255,255,0.05)',
                        position: 'relative'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#fff' }}>{acc.bank_name}</span>
                          <span style={{ fontSize: '0.7rem', background: 'rgba(222,184,65,0.1)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{acc.account_type}</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Cuenta: <b style={{ color: '#fff' }}>{acc.account_number}</b></span>
                            <button 
                              type="button" 
                              onClick={() => handleCopy(acc.account_number, 'Número de cuenta')}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: '4px', display: 'flex', alignItems: 'center' }}
                              title="Copiar número de cuenta"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Titular: <b style={{ color: '#fff' }}>{acc.owner_name}</b></span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Cédula/RUC: <b style={{ color: '#fff' }}>{acc.owner_id}</b></span>
                            <button 
                              type="button" 
                              onClick={() => handleCopy(acc.owner_id, 'Identificación')}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: '4px', display: 'flex', alignItems: 'center' }}
                              title="Copiar identificación"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                          
                          {acc.owner_email && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Correo: <b style={{ color: '#fff' }}>{acc.owner_email}</b></span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recuadro de carga de Comprobante */}
                <div>
                  <label style={{ marginBottom: '8px' }}>Subir Comprobante de Pago {!isStaff && <span style={{ color: 'var(--error)' }}>*</span>}</label>
                  
                  {!comprobanteBase64 ? (
                    <div 
                      style={{
                        border: '2px dashed rgba(255,255,255,0.15)',
                        borderRadius: '12px',
                        padding: '24px 16px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: 'rgba(0,0,0,0.2)',
                        transition: 'var(--transition-smooth)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                      onClick={() => document.getElementById('comprobante-upload').click()}
                    >
                      <Upload size={28} color="var(--text-muted)" style={{ marginBottom: '8px', margin: '0 auto' }} />
                      <p style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '600', marginTop: '6px' }}>Selecciona tu comprobante de pago</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Formatos soportados: JPG, PNG, PDF (Máx. 8MB)</p>
                      <input 
                        id="comprobante-upload"
                        type="file" 
                        accept="image/*,application/pdf"
                        onChange={handleReceiptFileChange}
                        style={{ display: 'none' }}
                      />
                    </div>
                  ) : (
                    <div style={{ 
                      background: 'rgba(0,0,0,0.3)', 
                      borderRadius: '12px', 
                      padding: '12px 16px', 
                      border: '1px solid rgba(52,199,89,0.3)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div style={{ background: 'rgba(52,199,89,0.1)', color: 'var(--success)', borderRadius: '8px', padding: '8px', display: 'flex' }}>
                          <Check size={16} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{comprobanteName}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--success)' }}>Listo para enviar</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setComprobanteBase64('');
                          setComprobanteName('');
                        }}
                        style={{
                          background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.2)',
                          borderRadius: '8px', padding: '6px', color: 'var(--error)', cursor: 'pointer',
                          display: 'flex'
                        }}
                        title="Eliminar comprobante"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
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
                <input 
                  type="checkbox" 
                  checked={!isFinalConsumer} 
                  onChange={e => {
                    const needsBilling = e.target.checked;
                    setIsFinalConsumer(!needsBilling);
                    if (needsBilling) {
                      if (!billingName) setBillingName(nombre);
                      if (!billingEmail) setBillingEmail(email);
                    }
                  }} 
                  style={{ opacity: 0, width: 0, height: 0 }} 
                />
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
          disabled={isProcessing || (event.has_assigned_seats ? selectedSeats.length === 0 : disponibles <= 0) || (metodoPago === 'Transferencia' && !isStaff && !comprobanteBase64)}
        >
          {isProcessing ? 'PROCESANDO...' : (metodoPago === 'Transferencia' ? `RESERVAR POR $${calculateTotal().toFixed(2)}` : `PAGAR $${(metodoPago === 'Payphone' && surchargeEnable ? calculateTotal() + calculatePayphoneSurcharge(calculateTotal()) : calculateTotal()).toFixed(2)}`)}
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
