import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { ScanBarcode, AlertTriangle, CheckCircle, XCircle, Users, Check } from 'lucide-react';

const ScannerDashboard = () => {
  // Estados para manejar el resultado del escaneo
  const [scanResult, setScanResult] = useState(null); // { status, message, order, tickets }
  const [selectedTicketIds, setSelectedTicketIds] = useState([]);
  const [isScanning, setIsScanning] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    // Inicializar el escáner QR en el contenedor 'reader'
    const scanner = new Html5QrcodeScanner(
      'reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      false
    );

    scanner.render(onScanSuccess, onScanFailure);
    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error('Error al desmontar escáner:', err));
      }
    };
  }, []);

  const onScanSuccess = async (decodedText) => {
    if (!scannerRef.current) return;

    try {
      scannerRef.current.pause(true);
    } catch (e) {
      console.warn('Fallo al pausar escáner:', e);
    }

    setIsScanning(false);
    
    // Cargar datos en el servidor
    Swal.fire({
      title: 'Cargando datos...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const res = await api.post('/tickets/scan', { ticketCode: decodedText });
      Swal.close();

      if (res.data.status === 'ERROR') {
        Swal.fire('Error', res.data.message, 'error');
        resetScanner();
      } else {
        // Guardar resultado (OK o ADVERTENCIA por pago pendiente)
        setScanResult(res.data);
        // Pre-seleccionar todos los tickets que estén activos/disponibles
        const activeIds = res.data.tickets.filter(t => t.status === 'Active').map(t => t.id);
        setSelectedTicketIds(activeIds);
      }
    } catch (err) {
      Swal.close();
      console.error(err);
      Swal.fire('Error de red', 'No se pudo conectar con el servidor para validar el QR.', 'error');
      resetScanner();
    }
  };

  const onScanFailure = (error) => {
    // Lecturas fallidas continuas se ignoran silenciosamente
  };

  // Reanudar cámara y limpiar estados
  const resetScanner = () => {
    setScanResult(null);
    setSelectedTicketIds([]);
    setIsScanning(true);
    if (scannerRef.current) {
      try {
        scannerRef.current.resume();
      } catch (e) {
        console.warn('Error al reanudar cámara:', e);
      }
    }
  };

  // Manejar el check-in (Ingreso parcial / total)
  const handleCheckIn = async () => {
    if (selectedTicketIds.length === 0) {
      Swal.fire('Atención', 'Selecciona al menos un boleto para registrar el ingreso.', 'warning');
      return;
    }

    setIsCheckingIn(true);
    try {
      const res = await api.post('/tickets/check-in', { ticketIds: selectedTicketIds });
      
      if (res.data.status === 'OK') {
        await Swal.fire({
          title: 'Ingreso Registrado',
          text: res.data.message,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        
        // Volver a activar escaneo automáticamente
        resetScanner();
      } else {
        Swal.fire('Error', res.data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo realizar el check-in de las entradas.', 'error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Toggle de selección de ticket individual
  const toggleTicketSelection = (ticketId) => {
    if (selectedTicketIds.includes(ticketId)) {
      setSelectedTicketIds(selectedTicketIds.filter(id => id !== ticketId));
    } else {
      setSelectedTicketIds([...selectedTicketIds, ticketId]);
    }
  };

  return (
    <div className="glass-panel fade-in" style={{ textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '5px', color: 'var(--accent)' }}>PORTERÍA - ESCÁNER</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
        {isScanning ? 'Enfoque el código QR único de la compra' : 'Detalle de ingreso del grupo'}
      </p>

      {/* 1. MODO ESCANEO ACTIVO */}
      <div 
        style={{ 
          background: '#fff', borderRadius: '16px', overflow: 'hidden', 
          maxWidth: '380px', margin: '0 auto 20px', border: '2px solid var(--glass-border)',
          display: isScanning ? 'block' : 'none'
        }}
      >
        <div id="reader" style={{ width: '100%' }}></div>
      </div>

      {isScanning && (
        <div style={{ marginTop: '15px', fontSize: '0.8rem', color: 'var(--success)' }}>
          ● Cámara Activa - Escaneando...
        </div>
      )}

      {/* 2. MODO INTERACTIVO (RESULTADO DE ESCANEO DE COMPRA) */}
      {scanResult && (
        <div className="fade-in" style={{ textAlign: 'left' }}>
          {/* Tarjeta con detalles de compra */}
          <div className="glass-card" style={{ marginBottom: '15px', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#fff' }}>{scanResult.order.customer_name}</h3>
              <span className={`badge ${scanResult.order.payment_status === 'Pagado' ? 'badge-active' : 'badge-promo'}`}>
                {scanResult.order.payment_status}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Orden: <b>{scanResult.order.order_num}</b> | Evento: <b>{scanResult.order.event_title}</b>
            </p>
          </div>

          {/* Advertencia si el pago está pendiente */}
          {scanResult.status === 'ADVERTENCIA' && (
            <div style={{ 
              background: 'rgba(255, 204, 0, 0.15)', border: '1px solid var(--warning)', 
              borderRadius: '12px', padding: '12px', marginBottom: '15px', fontSize: '0.8rem', 
              color: 'var(--warning)', fontWeight: 'bold'
            }}>
              ⚠️ PAGO PENDIENTE: Cobrar ${parseFloat(scanResult.order.amount_total).toFixed(2)} en puerta antes de permitir acceso.
            </div>
          )}

          {/* Listado interactivo de boletos / butacas (check-in parcial) */}
          <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px' }}>
            Selecciona quiénes ingresan:
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {scanResult.tickets.map((t) => {
              const isUsed = t.status === 'Used';
              const labelText = t.seat_label ? `Butaca ${t.seat_label} (${t.ticket_type})` : `Entrada ${t.ticket_type}`;
              
              return (
                <div 
                  key={t.id} 
                  onClick={() => !isUsed && toggleTicketSelection(t.id)}
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: isUsed ? 'rgba(255,59,48,0.06)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isUsed ? 'rgba(255,59,48,0.1)' : 'var(--glass-border)'}`,
                    padding: '12px 15px', borderRadius: '12px',
                    cursor: isUsed ? 'not-allowed' : 'pointer',
                    opacity: isUsed ? 0.6 : 1
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: isUsed ? 'var(--text-muted)' : '#fff' }}>
                    {labelText}
                  </span>
                  
                  {isUsed ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--error)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Adentro
                    </span>
                  ) : (
                    <input 
                      type="checkbox" 
                      checked={selectedTicketIds.includes(t.id)}
                      onChange={() => {}} // Manejado por el onClick del contenedor
                      style={{ width: '18px', height: '18px', cursor: 'pointer', marginBottom: '0' }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Botones de acción del Staff */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleCheckIn} 
              disabled={isCheckingIn || selectedTicketIds.length === 0}
              className="btn-primary" 
              style={{ flex: '2' }}
            >
              <Check size={18} /> CONFIRMAR INGRESO ({selectedTicketIds.length})
            </button>
            
            <button 
              onClick={resetScanner} 
              className="btn-secondary" 
              style={{ flex: '1' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScannerDashboard;
