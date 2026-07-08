import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../services/api';
import Swal from 'sweetalert2';
import {
  ScanLine, CheckCircle2, XCircle, AlertTriangle, Users,
  Check, RefreshCw, Search, ChevronRight, Camera, ClipboardList,
  Ticket, UserCheck, Filter, X
} from 'lucide-react';

/* ================================================================
   PESTAÑA: ESCÁNER QR
   ================================================================ */
const QRScannerTab = () => {
  const [scanResult, setScanResult] = useState(null);
  const [selectedTicketIds, setSelectedTicketIds] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const html5QrCodeRef = useRef(null);
  const scannerContainerId = 'qr-scanner-viewport';

  const startScanner = useCallback(async (cameraIdToUse) => {
    // Si ya existe un scanner corriendo, detenerlo primero
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error al detener cámara previa:', e);
      }
      html5QrCodeRef.current = null;
    }

    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        Swal.fire('Sin cámara', 'No se encontró ninguna cámara en este dispositivo.', 'error');
        return;
      }
      setCameras(devices);

      let targetCameraId = cameraIdToUse || selectedCameraId;
      if (!targetCameraId) {
        // Priorizar cámara trasera (environment)
        const backCamera = devices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('trasera') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        targetCameraId = backCamera ? backCamera.id : devices[devices.length - 1].id;
        setSelectedCameraId(targetCameraId);
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { deviceId: { exact: targetCameraId } },
        { fps: 15, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
        onScanSuccess,
        () => {} // Silenciar errores de frame
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Error al iniciar cámara:', err);
      // Fallback: usar facingMode 'environment' directamente
      try {
        const html5QrCode = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 240, height: 240 } },
          onScanSuccess,
          () => {}
        );
        setIsScanning(true);
      } catch (fallbackErr) {
        Swal.fire('Error de Cámara', 'No se pudo acceder a la cámara. Verifica los permisos del navegador.', 'error');
      }
    }
  }, [selectedCameraId]);

  const handleCameraChange = async (e) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    await startScanner(newId);
  };

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error al detener cámara:', e);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    setScannerReady(true);
    // Iniciar cámara automática al montar
    startScanner();
    return () => {
      stopScanner();
    };
  }, []); // Solo al montar

  const onScanSuccess = async (decodedText) => {
    await stopScanner();

    Swal.fire({
      title: 'Verificando QR...',
      allowOutsideClick: false,
      background: '#0d0d0f',
      color: '#f5f5f7',
      didOpen: () => Swal.showLoading()
    });

    try {
      const res = await api.post('/tickets/scan', { ticketCode: decodedText });
      Swal.close();

      if (res.data.status === 'ERROR') {
        Swal.fire({
          title: 'QR No Válido',
          text: res.data.message,
          icon: 'error',
          background: '#0d0d0f',
          color: '#f5f5f7',
          confirmButtonColor: '#DEB841'
        });
        startScanner();
      } else {
        setScanResult(res.data);
        const activeIds = res.data.tickets.filter(t => t.status === 'Active').map(t => t.id);
        setSelectedTicketIds(activeIds);
      }
    } catch (err) {
      Swal.close();
      Swal.fire('Error de Red', 'No se pudo conectar con el servidor.', 'error');
      startScanner();
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setSelectedTicketIds([]);
    startScanner();
  };

  const handleCheckIn = async () => {
    if (selectedTicketIds.length === 0) return;
    setIsCheckingIn(true);
    try {
      const res = await api.post('/tickets/check-in', { ticketIds: selectedTicketIds });
      if (res.data.status === 'OK') {
        await Swal.fire({
          title: '✅ Ingreso Confirmado',
          text: res.data.message,
          icon: 'success',
          timer: 2200,
          showConfirmButton: false,
          background: '#0d0d0f',
          color: '#f5f5f7'
        });
        resetScanner();
      } else {
        Swal.fire('Error', res.data.message, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo registrar el ingreso.', 'error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const toggleTicket = (id) => {
    setSelectedTicketIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div>
      {/* Vista de escaneo */}
      {!scanResult && (
        <div style={{ textAlign: 'center' }}>
          {/* Selector de cámara premium */}
          {cameras.length > 1 && (
            <div style={{ maxWidth: '280px', margin: '0 auto 20px auto', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
              <label style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 'bold' }}>📸 Cambiar Dispositivo / Lente</label>
              <select 
                value={selectedCameraId} 
                onChange={handleCameraChange}
                style={{ 
                  padding: '10px 14px', 
                  fontSize: '0.82rem', 
                  borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--glass-border)', 
                  color: '#fff',
                  cursor: 'pointer',
                  marginBottom: '0'
                }}
              >
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id} style={{ background: '#111', color: '#fff' }}>
                    {cam.label || `Cámara ${cam.id.slice(0,6)}...`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Viewport del escáner */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '340px',
            margin: '0 auto 24px',
            borderRadius: '24px',
            overflow: 'hidden',
            background: '#000',
            aspectRatio: '1/1',
            border: '2px solid rgba(222,184,65,0.4)',
            boxShadow: '0 0 50px rgba(222,184,65,0.18)'
          }}>
            <div id={scannerContainerId} style={{ width: '100%', height: '100%' }} />

            {/* Overlay de guía si cámara inactiva */}
            {!isScanning && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.85)', gap: '16px'
              }}>
                <Camera size={48} color="#DEB841" strokeWidth={1.5} />
                <p style={{ color: '#ccc', fontSize: '0.85rem' }}>Cámara detenida</p>
              </div>
            )}

            {/* Guía de escaneo animada */}
            {isScanning && (
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{
                  width: '200px', height: '200px', position: 'relative'
                }}>
                  {/* Esquinas del visor */}
                  {[
                    { top: 0, left: 0, borderTop: '3px solid #DEB841', borderLeft: '3px solid #DEB841', borderRadius: '4px 0 0 0' },
                    { top: 0, right: 0, borderTop: '3px solid #DEB841', borderRight: '3px solid #DEB841', borderRadius: '0 4px 0 0' },
                    { bottom: 0, left: 0, borderBottom: '3px solid #DEB841', borderLeft: '3px solid #DEB841', borderRadius: '0 0 0 4px' },
                    { bottom: 0, right: 0, borderBottom: '3px solid #DEB841', borderRight: '3px solid #DEB841', borderRadius: '0 0 4px 0' },
                  ].map((s, i) => (
                    <div key={i} style={{ position: 'absolute', width: '22px', height: '22px', ...s }} />
                  ))}

                  {/* Línea de escaneo animada */}
                  <div style={{
                    position: 'absolute', left: '10px', right: '10px', height: '2px',
                    background: 'linear-gradient(90deg, transparent, #DEB841, transparent)',
                    animation: 'scanLine 2s ease-in-out infinite',
                    top: '50%'
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Estado de la cámara */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 18px', borderRadius: '30px', marginBottom: '20px',
            background: isScanning ? 'rgba(52,199,89,0.12)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isScanning ? 'rgba(52,199,89,0.3)' : 'rgba(255,255,255,0.1)'}`,
            fontSize: '0.8rem', color: isScanning ? '#34c759' : '#888'
          }}>
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: isScanning ? '#34c759' : '#555',
              animation: isScanning ? 'pulse 1.5s ease-in-out infinite' : 'none'
            }} />
            {isScanning ? 'Lector de QR en Línea' : 'Cámara Apagada'}
          </div>

          {/* Botón iniciar/detener */}
          <button
            onClick={isScanning ? stopScanner : () => startScanner()}
            className={isScanning ? 'btn-secondary' : 'btn-primary'}
            style={{ maxWidth: '240px', margin: '0 auto' }}
          >
            {isScanning ? (
              <><X size={16} /> Detener Cámara</>
            ) : (
              <><Camera size={16} /> Activar Escáner</>
            )}
          </button>
        </div>
      )}

      {/* Vista de resultado del QR */}
      {scanResult && (
        <div className="fade-in">
          {/* Header de estado */}
          <div style={{
            textAlign: 'center', padding: '20px',
            background: scanResult.status === 'OK'
              ? 'rgba(52,199,89,0.08)'
              : 'rgba(255,204,0,0.08)',
            borderRadius: '20px', marginBottom: '16px',
            border: `1px solid ${scanResult.status === 'OK' ? 'rgba(52,199,89,0.2)' : 'rgba(255,204,0,0.2)'}`
          }}>
            {scanResult.status === 'OK' ? (
              <CheckCircle2 size={40} color="#34c759" style={{ marginBottom: '8px' }} />
            ) : (
              <AlertTriangle size={40} color="#ffcc00" style={{ marginBottom: '8px' }} />
            )}
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '4px' }}>
              {scanResult.order.customer_name}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {scanResult.order.event_title}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '4px', fontWeight: '600' }}>
              Orden #{scanResult.order.order_num}
            </p>
          </div>

          {/* Advertencia pago pendiente */}
          {scanResult.status === 'ADVERTENCIA' && (
            <div style={{
              background: 'rgba(255,204,0,0.1)', border: '1px solid rgba(255,204,0,0.3)',
              borderRadius: '14px', padding: '14px', marginBottom: '16px',
              fontSize: '0.82rem', color: '#ffcc00', fontWeight: '600', textAlign: 'center'
            }}>
              ⚠️ COBRAR ${parseFloat(scanResult.order.amount_total).toFixed(2)} EN PUERTA
            </div>
          )}

          {/* Lista de tickets */}
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', fontWeight: '600' }}>
            Selecciona quiénes ingresan
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {scanResult.tickets.map((t) => {
              const isUsed = t.status === 'Used';
              const isSelected = selectedTicketIds.includes(t.id);
              const label = t.seat_label
                ? `Butaca ${t.seat_label} · ${t.ticket_type}`
                : `Entrada ${t.ticket_type}`;

              return (
                <div
                  key={t.id}
                  onClick={() => !isUsed && toggleTicket(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', borderRadius: '14px', cursor: isUsed ? 'default' : 'pointer',
                    transition: 'all 0.2s ease', opacity: isUsed ? 0.5 : 1,
                    background: isUsed
                      ? 'rgba(255,59,48,0.05)'
                      : isSelected
                        ? 'rgba(52,199,89,0.08)'
                        : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isUsed
                      ? 'rgba(255,59,48,0.15)'
                      : isSelected
                        ? 'rgba(52,199,89,0.25)'
                        : 'var(--glass-border)'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Ticket size={16} color={isUsed ? '#ff3b30' : isSelected ? '#34c759' : '#888'} />
                    <span style={{ fontSize: '0.87rem', fontWeight: '600', color: isUsed ? '#666' : '#fff' }}>
                      {label}
                    </span>
                  </div>

                  {isUsed ? (
                    <span style={{ fontSize: '0.72rem', color: '#ff3b30', fontWeight: '700', background: 'rgba(255,59,48,0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                      INGRESÓ
                    </span>
                  ) : (
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${isSelected ? '#34c759' : '#444'}`,
                      background: isSelected ? '#34c759' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}>
                      {isSelected && <Check size={13} color="#000" strokeWidth={3} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCheckIn}
              disabled={isCheckingIn || selectedTicketIds.length === 0}
              className="btn-primary"
              style={{ flex: 2 }}
            >
              <UserCheck size={18} />
              {isCheckingIn ? 'REGISTRANDO...' : `CONFIRMAR (${selectedTicketIds.length})`}
            </button>
            <button onClick={resetScanner} className="btn-secondary" style={{ flex: 1 }}>
              <RefreshCw size={16} /> Nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ================================================================
   PESTAÑA: REGISTRO MANUAL
   ================================================================ */
const ManualRegistryTab = () => {
  const [orders, setOrders] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [expandedOrder, setExpandedOrder] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders');
      if (res.data.status === 'OK') setOrders(res.data.orders);
    } catch (err) {
      Swal.fire('Error', 'No se pudo cargar el registro de asistentes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events');
      if (res.data.status === 'OK') {
        setEvents(res.data.events);
        if (res.data.events.length > 0 && selectedEventId === 'ALL') {
          setSelectedEventId(res.data.events[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchOrders();
  }, []);

  const currentEvent = events.find(e => e.id === selectedEventId);

  // Aforo disponible
  let capacityAvailable = 0;
  if (selectedEventId === 'ALL') {
    events.forEach(e => {
      e.schedules?.forEach(s => { capacityAvailable += s.available_capacity || 0; });
    });
  } else if (currentEvent) {
    currentEvent.schedules?.forEach(s => { capacityAvailable += s.available_capacity || 0; });
  }

  // Vendidas, Pendientes, Cortesías, Validadas
  let soldCount = 0;
  let pendingCount = 0;
  let cortesiasCount = 0;
  let validatedCount = 0;

  orders.forEach(o => {
    if (selectedEventId !== 'ALL' && o.event_id !== selectedEventId) return;

    const ticketsQty = (parseInt(o.ticket_count_adult || 0) + parseInt(o.ticket_count_child || 0));

    if (o.payment_status === 'Anulado') return;

    if (o.operation_type === 'Cortesia' || o.payment_status === 'Cortesía') {
      cortesiasCount += ticketsQty;
    } else if (o.payment_status === 'Pendiente') {
      pendingCount += ticketsQty;
    } else if (o.payment_status === 'Pagado') {
      soldCount += ticketsQty;
    }

    validatedCount += parseInt(o.checked_in_count || 0);
  });

  const filteredOrders = orders.filter(o => {
    const matchEvent = selectedEventId === 'ALL' || o.event_id === selectedEventId;
    const matchStatus = filterStatus === 'ALL' || o.payment_status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchQ = !q ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.order_num?.toLowerCase().includes(q) ||
      o.customer_whatsapp?.includes(q) ||
      o.customer_email?.toLowerCase().includes(q);
    return matchEvent && matchStatus && matchQ;
  });

  const handleManualCheckIn = async (orderId, orderNum) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Ingreso Manual',
      text: `¿Registrar manualmente el ingreso de la orden ${orderNum}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#DEB841',
      cancelButtonColor: '#333',
      background: '#0d0d0f',
      color: '#f5f5f7',
      confirmButtonText: 'Sí, Ingresar',
      cancelButtonText: 'Cancelar'
    });

    if (!isConfirmed) return;

    try {
      const res = await api.post('/tickets/scan', { ticketCode: orderId, byOrderId: true });
      if (res.data.status !== 'ERROR') {
        const activeIds = res.data.tickets.filter(t => t.status === 'Active').map(t => t.id);
        if (activeIds.length === 0) {
          Swal.fire('Aviso', 'Todos los tickets de esta orden ya han ingresado.', 'info');
          return;
        }
        const checkinRes = await api.post('/tickets/check-in', { ticketIds: activeIds });
        if (checkinRes.data.status === 'OK') {
          Swal.fire({
            title: 'Ingreso Registrado',
            text: checkinRes.data.message,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            background: '#0d0d0f',
            color: '#f5f5f7'
          });
          fetchOrders();
        }
      } else {
        Swal.fire('Error', res.data.message, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo procesar el ingreso manual.', 'error');
    }
  };

  const statusBadge = (status) => {
    const map = {
      'Pagado': { bg: 'rgba(52,199,89,0.12)', color: '#34c759', border: 'rgba(52,199,89,0.25)' },
      'Pendiente': { bg: 'rgba(255,204,0,0.12)', color: '#ffcc00', border: 'rgba(255,204,0,0.25)' },
      'Cortesía': { bg: 'rgba(222,184,65,0.12)', color: '#DEB841', border: 'rgba(222,184,65,0.25)' },
      'Anulado': { bg: 'rgba(255,59,48,0.12)', color: '#ff3b30', border: 'rgba(255,59,48,0.25)' },
    };
    const style = map[status] || { bg: 'rgba(255,255,255,0.05)', color: '#888', border: 'rgba(255,255,255,0.1)' };
    return (
      <span style={{
        fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px',
        padding: '3px 9px', borderRadius: '6px',
        background: style.bg, color: style.color, border: `1px solid ${style.border}`
      }}>
        {status}
      </span>
    );
  };

  return (
    <div>
      {/* Selector de Evento */}
      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>Filtrar por Evento</label>
        <select 
          value={selectedEventId} 
          onChange={(e) => setSelectedEventId(e.target.value)}
          style={{
            padding: '11px 12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--glass-border)',
            borderRadius: '10px',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <option value="ALL" style={{ background: '#111' }}>Todos los eventos</option>
          {events.map(e => (
            <option key={e.id} value={e.id} style={{ background: '#111' }}>{e.title}</option>
          ))}
        </select>
      </div>

      {/* Tarjetas de Resumen (Dashboard Staff) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '4px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Aforo Disponible</span>
          <span style={{ fontSize: '1.3rem', fontWeight: '900', color: '#fff' }}>{capacityAvailable}</span>
        </div>
        <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '4px solid #34c759', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Vendidas</span>
          <span style={{ fontSize: '1.3rem', fontWeight: '900', color: '#34c759' }}>{soldCount}</span>
        </div>
        <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '4px solid #0a84ff', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Adentro (Validadas)</span>
          <span style={{ fontSize: '1.3rem', fontWeight: '900', color: '#0a84ff' }}>{validatedCount}</span>
        </div>
        <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '4px solid #af52de', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Cortesías</span>
          <span style={{ fontSize: '1.3rem', fontWeight: '900', color: '#af52de' }}>{cortesiasCount}</span>
        </div>
        <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '4px solid #ff9f0a', display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Pagos Pendientes en Puerta</span>
          <span style={{ fontSize: '1.3rem', fontWeight: '900', color: '#ff9f0a' }}>{pendingCount}</span>
        </div>
      </div>

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '20px 0' }} />

      {/* Buscador */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre, orden, WhatsApp..."
          style={{ paddingLeft: '42px', marginBottom: '0', padding: '12px 14px 12px 42px' }}
        />
      </div>

      {/* Filtros de estado */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['ALL', 'Pagado', 'Pendiente', 'Cortesía', 'Anulado'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600',
              cursor: 'pointer', border: '1px solid',
              background: filterStatus === s ? 'var(--accent)' : 'transparent',
              color: filterStatus === s ? '#000' : 'var(--text-muted)',
              borderColor: filterStatus === s ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
              transition: 'all 0.2s'
            }}
          >
            {s === 'ALL' ? 'Todos' : s}
          </button>
        ))}
        <button onClick={fetchOrders} style={{
          marginLeft: 'auto', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px', padding: '6px 12px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem'
        }}>
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Contador */}
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
        {filteredOrders.length} asistente{filteredOrders.length !== 1 ? 's' : ''} encontrado{filteredOrders.length !== 1 ? 's' : ''}
      </p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="spinner" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <Users size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p style={{ fontSize: '0.85rem' }}>No se encontraron registros.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredOrders.map(o => {
            const isExpanded = expandedOrder === o.id;
            const totalT = parseInt(o.ticket_count_adult || 0) + parseInt(o.ticket_count_child || 0);
            const dateStr = o.schedule_time
              ? new Date(o.schedule_time).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              : 'Sin fecha';

            return (
              <div
                key={o.id}
                style={{
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '16px', overflow: 'hidden', transition: 'all 0.3s'
                }}
              >
                {/* Fila principal */}
                <div
                  onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', cursor: 'pointer'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      {statusBadge(o.payment_status)}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        #{o.order_num}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.customer_name}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      🎟️ {totalT} entrada{totalT !== 1 ? 's' : ''} · 📅 {dateStr}
                    </p>
                  </div>
                  <ChevronRight
                    size={18}
                    color="var(--text-muted)"
                    style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                  />
                </div>

                {/* Detalles expandidos */}
                {isExpanded && (
                  <div className="fade-in" style={{
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    padding: '14px 16px', background: 'rgba(0,0,0,0.3)'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px', fontSize: '0.78rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>📞 WhatsApp</span>
                        <span style={{ color: '#fff', fontWeight: '600' }}>{o.customer_whatsapp || 'N/A'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>📧 Email</span>
                        <span style={{ color: '#fff', fontWeight: '600' }}>{o.customer_email || 'N/A'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>🎬 Evento</span>
                        <span style={{ color: '#fff', fontWeight: '600' }}>{o.event_title}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>💰 Monto</span>
                        <span style={{ color: 'var(--accent)', fontWeight: '700' }}>${parseFloat(o.amount_total || 0).toFixed(2)}</span>
                      </div>
                      {o.desglose && (
                        <div style={{ gridColumn: '1/-1' }}>
                          <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>🪑 Butacas</span>
                          <span style={{ color: '#fff', fontWeight: '600' }}>{o.desglose}</span>
                        </div>
                      )}
                    </div>

                    {o.payment_status !== 'Anulado' && (
                      <button
                        onClick={() => handleManualCheckIn(o.id, o.order_num)}
                        className="btn-primary"
                        style={{ padding: '10px', fontSize: '0.82rem' }}
                      >
                        <UserCheck size={15} /> Registrar Ingreso Manual
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ================================================================
   COMPONENTE PRINCIPAL
   ================================================================ */
const ScannerDashboard = () => {
  const [activeTab, setActiveTab] = useState('manual');

  return (
    <div className="fade-in" style={{ paddingBottom: '10px' }}>
      {/* Animación de línea de escaneo */}
      <style>{`
        @keyframes scanLine {
          0%   { top: 10%; }
          50%  { top: 85%; }
          100% { top: 10%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(0.85); }
        }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '54px', height: '54px', borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(222,184,65,0.2), rgba(222,184,65,0.05))',
          border: '1px solid rgba(222,184,65,0.3)', marginBottom: '12px'
        }}>
          <ScanLine size={26} color="#DEB841" />
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', letterSpacing: '0.5px' }}>
          Control de Portería
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Studio 5 · Sistema de Acceso
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '14px',
        padding: '4px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.07)'
      }}>
        {[
          { id: 'manual', icon: ClipboardList, label: 'Resumen de Sala' },
          { id: 'scanner', icon: Camera, label: 'Escáner QR' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              padding: '11px 14px', borderRadius: '11px', border: 'none', cursor: 'pointer',
              fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.25s',
              background: activeTab === tab.id
                ? 'linear-gradient(135deg, #DEB841, #b08d2b)'
                : 'transparent',
              color: activeTab === tab.id ? '#000' : 'var(--text-muted)',
              boxShadow: activeTab === tab.id ? '0 4px 12px rgba(222,184,65,0.25)' : 'none'
            }}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido de tabs */}
      <div key={activeTab} className="fade-in">
        {activeTab === 'scanner' ? <QRScannerTab /> : <ManualRegistryTab />}
      </div>
    </div>
  );
};

export default ScannerDashboard;
