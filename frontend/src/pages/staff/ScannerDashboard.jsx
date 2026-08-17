import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [selectedScheduleId, setSelectedScheduleId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterAttendance, setFilterAttendance] = useState('ALL'); // 'ALL', 'VALIDATED' (Adentro 100%), 'PENDING_ENTRY' (Por ingresar), 'PARTIAL' (Parciales), 'UNPAID' (Pendientes cobro), 'CORTESIA'
  const [expandedOrder, setExpandedOrder] = useState(null);

  // Estados para edición y comprobante
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderEditForm, setOrderEditForm] = useState({});
  const [uploadingReceiptOrder, setUploadingReceiptOrder] = useState(null);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState(null);

  // Bloquear scroll de fondo cuando hay modales abiertos
  useEffect(() => {
    if (editingOrder || uploadingReceiptOrder || selectedReceiptUrl) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [editingOrder, uploadingReceiptOrder, selectedReceiptUrl]);

  const handleUpdateOrderDetails = async (e) => {
    e.preventDefault();
    try {
      const res = await api.patch(`/orders/${editingOrder.id}`, orderEditForm);
      if (res.data.status === 'OK') {
        Swal.fire('¡Éxito!', 'Los datos de la orden fueron actualizados.', 'success');
        setEditingOrder(null);
        fetchOrders();
      } else {
        Swal.fire('Error', res.data.message || 'Error al actualizar', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'Error de conexión', 'error');
    }
  };

  const compressImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => resolve(ev.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleUploadReceipt = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      Swal.fire('Error', 'Selecciona un archivo de imagen válido', 'error');
      return;
    }

    Swal.fire({ title: 'Subiendo comprobante...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
      const base64 = await compressImage(file);
      const res = await api.post(`/orders/${uploadingReceiptOrder.id}/receipt`, { comprobanteBase64: base64 });
      
      Swal.close();
      if (res.data.status === 'OK') {
        Swal.fire('¡Éxito!', 'Comprobante subido correctamente.', 'success');
        setUploadingReceiptOrder(null);
        fetchOrders();
      } else {
        Swal.fire('Error', res.data.message || 'Error al subir', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.close();
      Swal.fire('Error', err.response?.data?.message || 'Error de conexión', 'error');
    }
  };

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
    currentEvent.schedules?.forEach(s => { 
      if (selectedScheduleId === 'ALL' || s.id === selectedScheduleId) {
        capacityAvailable += s.available_capacity || 0; 
      }
    });
  }

  // Vendidas, Pendientes, Cortesías, Validadas, Por Ingresar
  let soldCount = 0;
  let pendingCount = 0;
  let cortesiasCount = 0;
  let validatedCount = 0;
  let pendingEntryCount = 0;

  orders.forEach(o => {
    if (selectedEventId !== 'ALL' && o.event_id !== selectedEventId) return;
    if (selectedScheduleId !== 'ALL' && o.schedule_id !== selectedScheduleId) return;

    const ticketsQty = (parseInt(o.ticket_count_adult || 0) + parseInt(o.ticket_count_child || 0));
    const checkedIn = parseInt(o.checked_in_count || 0);

    if (o.payment_status === 'Anulado') return;

    if (o.operation_type === 'Cortesia' || o.payment_status === 'Cortesía') {
      cortesiasCount += ticketsQty;
    } else if (o.payment_status === 'Pendiente') {
      pendingCount += ticketsQty;
    } else if (o.payment_status === 'Pagado') {
      soldCount += ticketsQty;
    }

    validatedCount += checkedIn;
    if (o.payment_status === 'Pagado' || o.operation_type === 'Cortesia') {
      pendingEntryCount += Math.max(0, ticketsQty - checkedIn);
    }
  });

  const filteredOrders = orders.filter(o => {
    const matchEvent = selectedEventId === 'ALL' || o.event_id === selectedEventId;
    const matchSchedule = selectedScheduleId === 'ALL' || o.schedule_id === selectedScheduleId;
    
    // Estado de pago
    const matchStatus = filterStatus === 'ALL' || o.payment_status === filterStatus;

    // Estado de validación / asistencia
    const totalT = parseInt(o.ticket_count_adult || 0) + parseInt(o.ticket_count_child || 0);
    const checkedIn = parseInt(o.checked_in_count || 0);
    const isAllIn = checkedIn >= totalT && totalT > 0;
    const isPartial = checkedIn > 0 && checkedIn < totalT;

    let matchAttendance = true;
    if (filterAttendance === 'VALIDATED') {
      matchAttendance = isAllIn;
    } else if (filterAttendance === 'PENDING_ENTRY') {
      matchAttendance = !isAllIn && o.payment_status !== 'Anulado';
    } else if (filterAttendance === 'PARTIAL') {
      matchAttendance = isPartial;
    } else if (filterAttendance === 'UNPAID') {
      matchAttendance = o.payment_status === 'Pendiente';
    } else if (filterAttendance === 'CORTESIA') {
      matchAttendance = o.operation_type === 'Cortesia' || o.payment_status === 'Cortesía';
    }

    const q = searchQuery.toLowerCase();
    const matchQ = !q ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.order_num?.toLowerCase().includes(q) ||
      o.customer_whatsapp?.includes(q) ||
      o.customer_email?.toLowerCase().includes(q);

    return matchEvent && matchSchedule && matchStatus && matchAttendance && matchQ;
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
      <div style={{ marginBottom: selectedEventId !== 'ALL' ? '12px' : '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>Filtrar por Evento</label>
        <select 
          value={selectedEventId} 
          onChange={(e) => { setSelectedEventId(e.target.value); setSelectedScheduleId('ALL'); }}
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

      {/* Selector de Función */}
      {selectedEventId !== 'ALL' && (
        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>Filtrar por Función</label>
          <select 
            value={selectedScheduleId} 
            onChange={(e) => setSelectedScheduleId(e.target.value)}
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
            <option value="ALL" style={{ background: '#111' }}>Todas las funciones</option>
            {events.find(e => e.id === selectedEventId)?.schedules?.map(sch => (
              <option key={sch.id} value={sch.id} style={{ background: '#111' }}>
                {new Date(sch.schedule_time).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tarjetas de Resumen Clicables e Interactivas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {/* Aforo Disponible */}
        <div 
          onClick={() => { setFilterAttendance('ALL'); setFilterStatus('ALL'); }}
          className="glass-panel" 
          style={{ 
            padding: '14px 16px', 
            borderLeft: '4px solid var(--accent)', 
            display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer',
            border: filterAttendance === 'ALL' && filterStatus === 'ALL' ? '1.5px solid var(--accent)' : '1px solid var(--glass-border)',
            boxShadow: filterAttendance === 'ALL' && filterStatus === 'ALL' ? '0 0 12px var(--accent-glow)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AFORO DISPONIBLE</span>
          <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff' }}>{capacityAvailable}</span>
        </div>

        {/* Por Ingresar */}
        <div 
          onClick={() => { setFilterAttendance('PENDING_ENTRY'); setFilterStatus('ALL'); }}
          className="glass-panel" 
          style={{ 
            padding: '14px 16px', 
            borderLeft: '4px solid #34c759', 
            display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer',
            border: filterAttendance === 'PENDING_ENTRY' ? '1.5px solid #34c759' : '1px solid var(--glass-border)',
            boxShadow: filterAttendance === 'PENDING_ENTRY' ? '0 0 12px rgba(52,199,89,0.3)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ fontSize: '0.68rem', color: '#34c759', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⏳ POR INGRESAR</span>
          <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#34c759' }}>{pendingEntryCount} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>de {soldCount}</span></span>
        </div>

        {/* Validadas */}
        <div 
          onClick={() => { setFilterAttendance('VALIDATED'); setFilterStatus('ALL'); }}
          className="glass-panel" 
          style={{ 
            padding: '14px 16px', 
            borderLeft: '4px solid #0a84ff', 
            display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer',
            border: filterAttendance === 'VALIDATED' ? '1.5px solid #0a84ff' : '1px solid var(--glass-border)',
            boxShadow: filterAttendance === 'VALIDATED' ? '0 0 12px rgba(10,132,255,0.3)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ fontSize: '0.68rem', color: '#0a84ff', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✅ VALIDADAS</span>
          <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0a84ff' }}>{validatedCount}</span>
        </div>

        {/* Cortesías */}
        <div 
          onClick={() => { setFilterAttendance('CORTESIA'); setFilterStatus('ALL'); }}
          className="glass-panel" 
          style={{ 
            padding: '14px 16px', 
            borderLeft: '4px solid #af52de', 
            display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer',
            border: filterAttendance === 'CORTESIA' ? '1.5px solid #af52de' : '1px solid var(--glass-border)',
            boxShadow: filterAttendance === 'CORTESIA' ? '0 0 12px rgba(175,82,222,0.3)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ fontSize: '0.68rem', color: '#af52de', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🎁 CORTESÍAS</span>
          <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#af52de' }}>{cortesiasCount}</span>
        </div>

        {/* Pagos Pendientes en Puerta */}
        <div 
          onClick={() => { setFilterAttendance('UNPAID'); setFilterStatus('ALL'); }}
          className="glass-panel" 
          style={{ 
            padding: '14px 16px', 
            borderLeft: '4px solid #ff9f0a', 
            display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2', cursor: 'pointer',
            border: filterAttendance === 'UNPAID' ? '1.5px solid #ff9f0a' : '1px solid var(--glass-border)',
            boxShadow: filterAttendance === 'UNPAID' ? '0 0 12px rgba(255,159,10,0.3)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ fontSize: '0.68rem', color: '#ff9f0a', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💰 PAGOS PENDIENTES EN PUERTA</span>
          <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ff9f0a' }}>{pendingCount}</span>
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

      {/* Filtros Rápidos de Asistencia e Ingreso */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { id: 'ALL', label: '🔘 Todos' },
          { id: 'VALIDATED', label: '✅ Validadas' },
          { id: 'PENDING_ENTRY', label: '⏳ Por Ingresar' },
          { id: 'PARTIAL', label: '🌓 Parciales' },
          { id: 'UNPAID', label: '💰 Pendientes Pago' },
          { id: 'CORTESIA', label: '🎁 Cortesías' }
        ].map(chip => {
          const isSelected = filterAttendance === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => {
                setFilterAttendance(chip.id);
                setFilterStatus('ALL');
              }}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: '700',
                cursor: 'pointer', border: `1px solid ${isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                background: isSelected ? 'rgba(222,184,65,0.18)' : 'rgba(255,255,255,0.03)',
                color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'all 0.2s',
                boxShadow: isSelected ? '0 0 10px rgba(222,184,65,0.2)' : 'none'
              }}
            >
              {chip.label}
            </button>
          );
        })}

        <button onClick={fetchOrders} style={{
          marginLeft: 'auto', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px', padding: '6px 12px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem'
        }}>
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Contador */}
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
        Mostrando {filteredOrders.length} orden{filteredOrders.length !== 1 ? 'es' : ''}
      </p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="spinner" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <Users size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p style={{ fontSize: '0.85rem' }}>No se encontraron registros con este filtro.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredOrders.map(o => {
            const isExpanded = expandedOrder === o.id;
            const totalT = parseInt(o.ticket_count_adult || 0) + parseInt(o.ticket_count_child || 0);
            const checkedIn = parseInt(o.checked_in_count || 0);
            const isAllIn = checkedIn >= totalT && totalT > 0;
            const isPartial = checkedIn > 0 && checkedIn < totalT;
            const isNoneIn = checkedIn === 0;

            const dateStr = o.schedule_time
              ? new Date(o.schedule_time).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              : 'Sin fecha';

            return (
              <div
                key={o.id}
                style={{
                  background: isAllIn ? 'rgba(52,199,89,0.03)' : (isPartial ? 'rgba(255,204,0,0.03)' : 'rgba(255,255,255,0.025)'),
                  border: isAllIn ? '1px solid rgba(52,199,89,0.2)' : (isPartial ? '1px solid rgba(255,204,0,0.2)' : '1px solid rgba(255,255,255,0.07)'),
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      {statusBadge(o.payment_status)}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        #{o.order_num}
                      </span>
                      {/* Badge de Ingreso / Asistencia */}
                      {isAllIn ? (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, background: 'rgba(52,199,89,0.15)', color: '#34c759', border: '1px solid rgba(52,199,89,0.3)', padding: '2px 8px', borderRadius: '6px' }}>
                          ✅ {checkedIn}/{totalT} Validados
                        </span>
                      ) : isPartial ? (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, background: 'rgba(255,204,0,0.15)', color: '#ffcc00', border: '1px solid rgba(255,204,0,0.3)', padding: '2px 8px', borderRadius: '6px' }}>
                          ⏳ {checkedIn}/{totalT} (Faltan {totalT - checkedIn})
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                          0/{totalT}
                        </span>
                      )}
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
                          <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>🪑 Butacas / Localidad</span>
                          <span style={{ color: '#fff', fontWeight: '600' }}>{o.desglose}</span>
                        </div>
                      )}
                    </div>

                    {/* Botones de acción inteligente */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {o.payment_status !== 'Anulado' && (
                        isAllIn ? (
                          <div style={{
                            background: 'rgba(52,199,89,0.12)', border: '1px solid rgba(52,199,89,0.3)',
                            color: '#34c759', padding: '10px 14px', borderRadius: '10px',
                            textAlign: 'center', fontSize: '0.82rem', fontWeight: 800, width: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                          }}>
                            <CheckCircle2 size={18} color="#34c759" /> Todos los boletos han sido validados ({checkedIn}/{totalT})
                          </div>
                        ) : isPartial ? (
                          <button
                            onClick={() => handleManualCheckIn(o.id, o.order_num)}
                            className="btn-primary"
                            style={{
                              background: 'linear-gradient(135deg, #ff9f0a, #d48000)',
                              color: '#000', padding: '10px', fontSize: '0.82rem',
                              flex: '1 1 100%', fontWeight: 800,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                          >
                            <UserCheck size={18} /> Validar restantes ({totalT - checkedIn} por ingresar · {checkedIn}/{totalT} adentro)
                          </button>
                        ) : (
                          <button
                            onClick={() => handleManualCheckIn(o.id, o.order_num)}
                            className="btn-primary"
                            style={{
                              padding: '10px', fontSize: '0.82rem', flex: '1 1 100%', fontWeight: 800,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                          >
                            <UserCheck size={18} /> Registrar Ingreso Manual ({totalT} entradas)
                          </button>
                        )
                      )}
                      
                      <button
                        onClick={() => {
                          setEditingOrder(o);
                          setOrderEditForm({
                            customer_name: o.customer_name || '',
                            customer_email: o.customer_email || '',
                            customer_whatsapp: o.customer_whatsapp || '',
                            is_final_consumer: Boolean(o.is_final_consumer),
                            billing_id_number: o.billing_id_number || '',
                            billing_name: o.billing_name || '',
                            billing_address: o.billing_address || '',
                            billing_email: o.billing_email || ''
                          });
                        }}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
                          background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.78rem'
                        }}
                      >
                        Editar Datos
                      </button>

                      {o.payment_status === 'Pendiente' && !o.comprobante_url && (
                        <button
                          onClick={() => setUploadingReceiptOrder(o)}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            padding: '8px', borderRadius: '10px', border: '1px solid rgba(222,184,65,0.25)', cursor: 'pointer',
                            background: 'rgba(222,184,65,0.15)', color: '#DEB841', fontWeight: '700', fontSize: '0.78rem'
                          }}
                        >
                          Subir Comprobante
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Editar Orden */}
      {editingOrder && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '20px' }} className="fade-in">
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: '#fff', marginBottom: '5px' }}>Editar Datos</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{editingOrder.order_num}</p>
            
            <form onSubmit={handleUpdateOrderDetails} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              <label>Nombre del Cliente</label>
              <input type="text" value={orderEditForm.customer_name} onChange={e => setOrderEditForm({...orderEditForm, customer_name: e.target.value})} required />
              
              <label>WhatsApp</label>
              <input type="text" value={orderEditForm.customer_whatsapp} onChange={e => setOrderEditForm({...orderEditForm, customer_whatsapp: e.target.value})} />
              
              <label>Email</label>
              <input type="email" value={orderEditForm.customer_email} onChange={e => setOrderEditForm({...orderEditForm, customer_email: e.target.value})} />
              
              <div style={{ margin: '15px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={orderEditForm.is_final_consumer} onChange={e => setOrderEditForm({...orderEditForm, is_final_consumer: e.target.checked})} style={{ width: 'auto' }} />
                  Consumidor Final
                </label>
              </div>

              {!orderEditForm.is_final_consumer && (
                <>
                  <label>RUC/Cédula Facturación</label>
                  <input type="text" value={orderEditForm.billing_id_number} onChange={e => setOrderEditForm({...orderEditForm, billing_id_number: e.target.value})} required />
                  <label>Nombre Facturación</label>
                  <input type="text" value={orderEditForm.billing_name} onChange={e => setOrderEditForm({...orderEditForm, billing_name: e.target.value})} required />
                  <label>Dirección Facturación</label>
                  <input type="text" value={orderEditForm.billing_address} onChange={e => setOrderEditForm({...orderEditForm, billing_address: e.target.value})} required />
                  <label>Email Facturación</label>
                  <input type="email" value={orderEditForm.billing_email} onChange={e => setOrderEditForm({...orderEditForm, billing_email: e.target.value})} required />
                </>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setEditingOrder(null)} className="btn-outline" style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Subir Comprobante */}
      {uploadingReceiptOrder && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '20px' }} className="fade-in">
          <div className="glass-panel" style={{ width: '100%', maxWidth: '350px', padding: '20px', textAlign: 'center' }}>
            <h3 style={{ color: '#fff', marginBottom: '5px' }}>Subir Comprobante</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '5px 0 20px 0' }}>{uploadingReceiptOrder.order_num}</p>
            
            <input 
              type="file" 
              accept="image/*"
              onChange={handleUploadReceipt}
              style={{ display: 'block', width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: '#fff' }}
            />

            <button type="button" onClick={() => setUploadingReceiptOrder(null)} className="btn-outline" style={{ width: '100%', marginTop: '20px' }}>Cancelar</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

/* ================================================================
   COMPONENTE PRINCIPAL
   ================================================================ */
const ScannerDashboard = () => {
  const [activeTab, setActiveTab] = useState('manual');
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('ALL');
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const res = await api.get('/events');
        if (res.data.status === 'OK') {
          setEvents(res.data.events || []);
          if (res.data.events.length > 0) {
            setSelectedEventId(res.data.events[0].id);
          }
        }
      } catch (err) {
        console.error('Error al cargar eventos en Scanner:', err);
      } finally {
        setLoadingEvents(false);
      }
    };
    loadEvents();
  }, []);

  const currentEvent = events.find(e => e.id === selectedEventId);
  const isScanningBlocked = currentEvent && currentEvent.qr_scanning_enabled === false;

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
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '54px', height: '54px', borderRadius: '16px',
          background: isScanningBlocked 
            ? 'linear-gradient(135deg, rgba(255,59,48,0.2), rgba(255,59,48,0.05))'
            : 'linear-gradient(135deg, rgba(222,184,65,0.2), rgba(222,184,65,0.05))',
          border: isScanningBlocked ? '1px solid rgba(255,59,48,0.4)' : '1px solid rgba(222,184,65,0.3)', 
          marginBottom: '12px'
        }}>
          {isScanningBlocked ? <AlertTriangle size={26} color="var(--error)" /> : <ScanLine size={26} color="var(--accent)" />}
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', letterSpacing: '0.5px' }}>
          Control de Portería
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Studio 5 · Sistema de Acceso Inteligente
        </p>
      </div>

      {/* Selector de Evento en Cabecera */}
      {events.length > 1 && (
        <div style={{ marginBottom: '16px' }}>
          <select 
            value={selectedEventId} 
            onChange={(e) => setSelectedEventId(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)',
              color: '#fff', fontSize: '0.9rem'
            }}
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.id} style={{ background: '#111' }}>
                {ev.title} {ev.qr_scanning_enabled === false ? '⛔ (Bloqueado por Morosidad)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Banner Kill Switch Anti-Morosidad */}
      {isScanningBlocked ? (
        <div className="killswitch-alert-banner">
          <AlertTriangle size={48} color="#ff3b30" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ color: '#ff3b30', fontWeight: 900, fontSize: '1.25rem', marginBottom: '8px' }}>
            ⛔ ACCESO Y ESCÁNER BLOQUEADOS
          </h3>
          <p style={{ color: '#f5f5f7', fontSize: '0.95rem', fontWeight: 600, maxWidth: '450px', margin: '0 auto 12px' }}>
            El escaneo y validación de boletos para el evento <strong style={{ color: '#ffcc00' }}>"{currentEvent?.title}"</strong> ha sido desactivado automáticamente debido a saldo pendiente de liquidación.
          </p>
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '10px', display: 'inline-block', border: '1px solid rgba(255,59,48,0.3)' }}>
            <span style={{ color: '#ffaaaa', fontSize: '0.85rem' }}>
              Por favor, contacte inmediatamente al <strong>Organizador</strong> para que regularice el pago y reactive la puerta.
            </span>
          </div>
        </div>
      ) : (
        <>
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
                    ? 'linear-gradient(135deg, var(--accent), var(--accent-secondary))'
                    : 'transparent',
                  color: activeTab === tab.id ? '#000' : 'var(--text-muted)',
                  boxShadow: activeTab === tab.id ? '0 4px 12px var(--accent-glow)' : 'none'
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
        </>
      )}
    </div>
  );
};

export default ScannerDashboard;
