import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { 
  Camera, Keyboard, ArrowRightCircle, CheckCircle2, 
  PackageSearch, RefreshCw, AlertTriangle, Layers, X, 
  Plus, Minus, Check, Sparkles, UserCheck, Phone, User
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.warn('Audio feedback failed:', e);
  }
  if (navigator.vibrate) {
    try { navigator.vibrate([80, 40, 80]); } catch (e) {}
  }
};

const LogisticsStaff = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Campañas disponibles
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [campaignMetrics, setCampaignMetrics] = useState(null);

  // Escáner & Sensor
  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const html5ScannerRef = useRef(null);

  // Modal Flotante de Resultado
  const [floatingItem, setFloatingItem] = useState(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para Registro Rápido (Si el código está disponible)
  const [regForm, setRegForm] = useState({
    nombre: '',
    celular: '',
    cantidad: 1,
    immediate_delivery: true
  });

  // Estados para Entrega por Lotes (Si ya está asignado)
  const [deliverCount, setDeliverCount] = useState(1);

  // 1. Cargar Campañas
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await api.get('/logistics/staff/campaigns');
        if (res.data?.status === 'OK' && res.data.data.length > 0) {
          setCampaigns(res.data.data);
          const urlCid = searchParams.get('cid');
          if (urlCid && res.data.data.some(c => c.id === urlCid)) {
            setSelectedCampaignId(urlCid);
          } else {
            setSelectedCampaignId(res.data.data[0].id);
          }
        }
      } catch (err) {
        console.error('Error cargando campañas:', err);
      } finally {
        setLoadingCampaigns(false);
      }
    };
    fetchCampaigns();
  }, [searchParams]);

  // 2. Cargar Métricas de la campaña seleccionada
  const fetchMetrics = async (cid) => {
    if (!cid) return;
    try {
      const res = await api.get(`/logistics/metrics/${cid}`);
      if (res.data?.status === 'OK') {
        setCampaignMetrics(res.data.data);
      }
    } catch (err) {
      console.warn('Error cargando métricas:', err);
    }
  };

  useEffect(() => {
    if (selectedCampaignId) {
      fetchMetrics(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  // 3. Consultar Código al Backend
  const handleProcessCode = async (rawCode) => {
    if (!selectedCampaignId) {
      Swal.fire('Selecciona Campaña', 'Debes tener una campaña activa seleccionada.', 'warning');
      return;
    }

    let code = rawCode.trim();
    if (code.includes('code=')) {
      try {
        const urlObj = new URL(code, window.location.origin);
        code = urlObj.searchParams.get('code') || code;
      } catch (e) {}
    } else if (code.includes('/')) {
      const parts = code.split('/');
      code = parts[parts.length - 1];
    }

    playBeep();
    setIsLookingUp(true);

    try {
      const res = await api.get(`/logistics/item/lookup?campaign_id=${selectedCampaignId}&item_code=${encodeURIComponent(code)}`);
      if (res.data?.status === 'OK' && res.data.item) {
        const it = res.data.item;
        setFloatingItem(it);
        
        // Resetear formularios según estado
        if (it.status === 'AVAILABLE') {
          setRegForm({
            nombre: '',
            celular: '',
            cantidad: 1,
            immediate_delivery: true
          });
        } else {
          const pending = it.pending_quantity || 1;
          setDeliverCount(pending > 0 ? pending : 1);
        }
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Código No Encontrado',
        text: err?.response?.data?.message || `El código ${code} no existe en esta campaña.`,
        background: '#16171f',
        color: '#fff',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  // 4. Iniciar Escáner de Cámara Automático
  useEffect(() => {
    // Si la modal está abierta, pausar el escaneo
    if (floatingItem || showManualModal || !selectedCampaignId) {
      return;
    }

    let scanner = null;
    const scannerTimer = setTimeout(() => {
      try {
        const container = document.getElementById('logistics-live-scanner');
        if (container) {
          scanner = new Html5QrcodeScanner('logistics-live-scanner', {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              return { width: Math.floor(minEdge * 0.72), height: Math.floor(minEdge * 0.72) };
            },
            rememberLastUsedCamera: true,
            aspectRatio: 1.0
          });

          scanner.render((decodedText) => {
            if (decodedText) {
              handleProcessCode(decodedText);
            }
          }, (err) => {
            // Ignorar errores comunes de búsqueda de frame
          });

          html5ScannerRef.current = scanner;
          setIsScannerRunning(true);
        }
      } catch (e) {
        console.warn('Error inicializando escáner:', e);
      }
    }, 200);

    return () => {
      clearTimeout(scannerTimer);
      if (scanner) {
        scanner.clear().catch(() => {});
      }
      setIsScannerRunning(false);
    };
  }, [floatingItem, showManualModal, selectedCampaignId]);

  // 5. Acción: Guardar Asignación Rápida
  const handleSaveRegistration = async (e) => {
    e.preventDefault();
    if (!floatingItem) return;

    if (!regForm.nombre.trim()) {
      Swal.fire('Nombre Requerido', 'Ingresa el nombre del beneficiario.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/logistics/dispatch', {
        campaign_id: selectedCampaignId,
        start_code: floatingItem.item_code,
        quantity: regForm.cantidad,
        assigned_data: {
          nombre: regForm.nombre.trim(),
          celular: regForm.celular.trim()
        },
        immediate_delivery: regForm.immediate_delivery
      });

      if (res.data?.status === 'OK') {
        Swal.fire({
          icon: 'success',
          title: regForm.immediate_delivery ? '¡Asignado y Entregado!' : '¡Lote Asignado!',
          html: `<p style="color: #4ade80; font-weight: bold;">${res.data.message}</p>`,
          background: '#16171f',
          color: '#fff',
          confirmButtonColor: '#10b981',
          timer: 2000
        });
        setFloatingItem(null);
        fetchMetrics(selectedCampaignId);
      }
    } catch (err) {
      Swal.fire('Error', err?.response?.data?.message || 'Error al guardar asignación.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Acción: Confirmar Entrega de Canastas
  const handleConfirmDelivery = async () => {
    if (!floatingItem) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/logistics/receive', {
        campaign_id: selectedCampaignId,
        item_code: floatingItem.item_code,
        quantity_to_deliver: deliverCount
      });

      if (res.data?.status === 'OK') {
        Swal.fire({
          icon: 'success',
          title: '✅ ¡Entrega Registrada!',
          html: `
            <p style="font-size: 1.1rem; color: #fff;">Beneficiario: <b>${floatingItem.assigned_data?.nombre || 'General'}</b></p>
            <p style="color: #4ade80; font-weight: bold; font-size: 1rem;">${res.data.message}</p>
          `,
          background: '#16171f',
          color: '#fff',
          confirmButtonColor: '#10b981',
          timer: 2200
        });
        setFloatingItem(null);
        fetchMetrics(selectedCampaignId);
      }
    } catch (err) {
      Swal.fire('Error', err?.response?.data?.message || 'Error al procesar la entrega.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingCampaigns) {
    return <div className="spinner" style={{ margin: '100px auto' }}></div>;
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '12px', minHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

      {/* Barra Superior de Control */}
      <div className="glass-panel" style={{ padding: '12px 16px', borderRadius: '16px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Layers size={13} color="var(--accent)" /> Campaña Activa
          </label>
          <select 
            value={selectedCampaignId} 
            onChange={e => setSelectedCampaignId(e.target.value)}
            style={{ 
              width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', 
              color: '#fff', padding: '8px 10px', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem' 
            }}
          >
            {campaigns.map(c => (
              <option key={c.id} value={c.id} style={{ background: '#1a1b26', color: '#fff' }}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button 
          onClick={() => setShowManualModal(true)}
          className="btn-secondary"
          style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
            padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#cbd5e1', fontSize: '0.72rem', fontWeight: 700, minWidth: '65px' 
          }}
          title="Ingresar código con teclado"
        >
          <Keyboard size={18} style={{ marginBottom: '2px' }} />
          <span>Manual</span>
        </button>
      </div>

      {/* Mini Métricas Rápidas en Vivo */}
      {campaignMetrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Disponibles</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#94a3b8' }}>{campaignMetrics.AVAILABLE || 0}</div>
          </div>
          <div style={{ background: 'rgba(59,130,246,0.08)', borderRadius: '12px', padding: '10px', textAlign: 'center', border: '1px solid rgba(59,130,246,0.2)' }}>
            <span style={{ fontSize: '0.68rem', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700 }}>Asignados</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#3b82f6' }}>{campaignMetrics.DISPATCHED || 0}</div>
          </div>
          <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: '12px', padding: '10px', textAlign: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>
            <span style={{ fontSize: '0.68rem', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 700 }}>Canjeados</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981' }}>{campaignMetrics.RECEIVED || 0}</div>
          </div>
        </div>
      )}

      {/* ─── VISOR DE CÁMARA DIRECTA CON SENSOR Y LÁSER ────────────────────────── */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div 
          className="glass-panel" 
          style={{ 
            position: 'relative', borderRadius: '22px', overflow: 'hidden', 
            background: '#090a0f', border: '2px solid rgba(222,184,65,0.3)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)', minHeight: '380px'
          }}
        >
          {/* Contenedor del Escáner HTML5 */}
          <div id="logistics-live-scanner" style={{ width: '100%', minHeight: '380px' }} />

          {/* HUD & Mira Láser Holográfica */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            
            {/* Cuadro Objetivo Central */}
            <div style={{ position: 'relative', width: '230px', height: '230px' }}>
              {/* Esquinas Neón */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '28px', height: '28px', borderTop: '4px solid var(--accent)', borderLeft: '4px solid var(--accent)', borderRadius: '4px 0 0 0' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: '28px', height: '28px', borderTop: '4px solid var(--accent)', borderRight: '4px solid var(--accent)', borderRadius: '0 4px 0 0' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '28px', height: '28px', borderBottom: '4px solid var(--accent)', borderLeft: '4px solid var(--accent)', borderRadius: '0 0 0 4px' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '28px', height: '28px', borderBottom: '4px solid var(--accent)', borderRight: '4px solid var(--accent)', borderRadius: '0 0 4px 0' }} />
              
              {/* Línea Láser Animada */}
              <div className="scanner-laser-line" />
            </div>

            {/* Badge de Sensor Activo */}
            <div style={{
              marginTop: '16px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
              padding: '6px 16px', borderRadius: '20px', border: '1px solid rgba(222,184,65,0.4)',
              display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '0.78rem', fontWeight: 700
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
              Sensor Activo · Apunta al código QR
            </div>
          </div>

          {/* Overlay de Carga si está consultando */}
          {isLookingUp && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
              <div className="spinner" style={{ marginBottom: '12px' }} />
              <p style={{ color: '#DEB841', fontWeight: 800, fontSize: '1rem', margin: 0 }}>Analizando Código...</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL FLOTANTE / BOTTOM SHEET AL DETECTAR CÓDIGO ─────────────────── */}
      {floatingItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9999
        }}>
          <div 
            className="glass-panel" 
            style={{ 
              width: '100%', maxWidth: '540px', background: '#161722',
              borderRadius: '24px 24px 0 0', padding: '24px 20px',
              borderTop: '2px solid var(--accent)', boxShadow: '0 -10px 40px rgba(0,0,0,0.7)',
              maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Header del Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase',
                    background: floatingItem.status === 'AVAILABLE' ? 'rgba(16,185,129,0.15)' : (floatingItem.status === 'RECEIVED' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)'),
                    color: floatingItem.status === 'AVAILABLE' ? '#34d399' : (floatingItem.status === 'RECEIVED' ? '#f87171' : '#60a5fa'),
                    border: `1px solid ${floatingItem.status === 'AVAILABLE' ? '#10b98155' : (floatingItem.status === 'RECEIVED' ? '#ef444455' : '#3b82f655')}`
                  }}>
                    {floatingItem.status === 'AVAILABLE' ? '🟢 Disponible' : (floatingItem.status === 'RECEIVED' ? '⚠️ Canjeado Total' : '📦 Asignado')}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>{floatingItem.campaign_name}</span>
                </div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', margin: '6px 0 0 0' }}>
                  Código #{floatingItem.item_code}
                </h2>
              </div>

              <button 
                onClick={() => setFloatingItem(null)} 
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#cbd5e1', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* CASO A: CÓDIGO DISPONIBLE -> REGISTRO RÁPIDO */}
            {floatingItem.status === 'AVAILABLE' && (
              <form onSubmit={handleSaveRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  Este ticket no tiene dueño asignado. Regístralo al instante para vincularlo a un beneficiario:
                </p>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Nombre del Beneficiario / Titular:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} color="var(--accent)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                    <input 
                      type="text" 
                      className="input-field" 
                      style={{ paddingLeft: '38px' }}
                      value={regForm.nombre}
                      onChange={e => setRegForm({ ...regForm, nombre: e.target.value })}
                      placeholder="Ej. María Josefa González"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Cédula o Celular:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} color="var(--accent)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                    <input 
                      type="text" 
                      className="input-field" 
                      style={{ paddingLeft: '38px' }}
                      value={regForm.celular}
                      onChange={e => setRegForm({ ...regForm, celular: e.target.value })}
                      placeholder="Ej. 0998765432"
                    />
                  </div>
                </div>

                {/* Selector de Cantidad de Canastas para este beneficiario */}
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                    Cantidad de Canastas / Artículos:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                      type="button" 
                      onClick={() => setRegForm(p => ({ ...p, cantidad: Math.max(1, p.cantidad - 1) }))}
                      style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Minus size={18} />
                    </button>
                    <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '10px', fontSize: '1.25rem', fontWeight: 900, color: '#DEB841' }}>
                      {regForm.cantidad} {regForm.cantidad === 1 ? 'canasta' : 'canastas'}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setRegForm(p => ({ ...p, cantidad: p.cantidad + 1 }))}
                      style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={regForm.immediate_delivery}
                    onChange={e => setRegForm({ ...regForm, immediate_delivery: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                  />
                  <span style={{ fontSize: '0.82rem', color: '#6ee7b7', fontWeight: 600 }}>
                    Entregar y canjear canasta(s) en este mismo momento
                  </span>
                </label>

                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={isSubmitting}
                  style={{ padding: '14px', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem', marginTop: '6px' }}
                >
                  {isSubmitting ? 'Guardando...' : (regForm.immediate_delivery ? '💾 Guardar y Entregar Ahora' : '💾 Guardar y Asignar')}
                </button>
              </form>
            )}

            {/* CASO B: CÓDIGO ASIGNADO (DISPATCHED O EN PROGRESO) */}
            {floatingItem.status === 'DISPATCHED' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Beneficiario Registrado</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                    {floatingItem.assigned_data?.nombre || 'Beneficiario'}
                  </div>
                  {floatingItem.assigned_data?.celular && (
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                      📞 {floatingItem.assigned_data.celular}
                    </div>
                  )}
                </div>

                {/* Resumen de Canastas */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Asignadas</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{floatingItem.total_quantity}</div>
                  </div>
                  <div style={{ background: 'rgba(16,185,129,0.1)', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <span style={{ fontSize: '0.68rem', color: '#6ee7b7' }}>Entregadas</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{floatingItem.delivered_quantity}</div>
                  </div>
                  <div style={{ background: 'rgba(222,184,65,0.1)', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(222,184,65,0.3)' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--accent)' }}>Pendientes</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)' }}>{floatingItem.pending_quantity}</div>
                  </div>
                </div>

                {/* Selector de cantidad a entregar ahora */}
                {floatingItem.pending_quantity > 0 ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700 }}>
                        Cantidad a Entregar en este Escaneo:
                      </label>
                      <button 
                        type="button" 
                        onClick={() => setDeliverCount(floatingItem.pending_quantity)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Entregar Todas ({floatingItem.pending_quantity})
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button 
                        type="button" 
                        onClick={() => setDeliverCount(p => Math.max(1, p - 1))}
                        style={{ width: '46px', height: '46px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Minus size={20} />
                      </button>
                      <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '10px', fontSize: '1.35rem', fontWeight: 900, color: '#10b981' }}>
                        {deliverCount} {deliverCount === 1 ? 'canasta' : 'canastas'}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setDeliverCount(p => Math.min(floatingItem.pending_quantity, p + 1))}
                        style={{ width: '46px', height: '46px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Plus size={20} />
                      </button>
                    </div>

                    <button 
                      onClick={handleConfirmDelivery}
                      className="btn-primary"
                      disabled={isSubmitting}
                      style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem', marginTop: '16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    >
                      {isSubmitting ? 'Procesando...' : `✅ Confirmar Entrega de ${deliverCount} Canasta(s)`}
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '12px', color: '#10b981', fontWeight: 700 }}>
                    ¡Todas las canastas de este código ya fueron entregadas!
                  </div>
                )}
              </div>
            )}

            {/* CASO C: CÓDIGO TOTALMENTE CANJEADO (RECEIVED) */}
            {floatingItem.status === 'RECEIVED' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '14px', padding: '20px' }}>
                  <AlertTriangle size={36} color="#ef4444" style={{ margin: '0 auto 10px' }} />
                  <h3 style={{ color: '#fff', margin: '0 0 6px 0', fontSize: '1.15rem' }}>
                    Canasta Ya Entregada Anteriormente
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Este código ya fue marcado como canjeado en su totalidad.
                  </p>
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.82rem', color: '#e2e8f0' }}>
                    Beneficiario: <b>{floatingItem.assigned_data?.nombre || 'General'}</b><br />
                    Total Entregadas: <b>{floatingItem.delivered_quantity} de {floatingItem.total_quantity}</b><br />
                    {floatingItem.received_at && (
                      <span style={{ color: '#94a3b8' }}>
                        Fecha: {new Date(floatingItem.received_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setFloatingItem(null)}
                  className="btn-secondary"
                  style={{ padding: '12px', borderRadius: '10px', fontWeight: 700 }}
                >
                  Continuar Escaneando
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ─── MODAL INGRESO MANUAL ────────────────────────────────────────────── */}
      {showManualModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
            <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>
              Ingreso Manual de Código
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '16px' }}>
              Digita el número o código impreso en el sticker (ej. 0042):
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (manualCodeInput.trim()) {
                setShowManualModal(false);
                handleProcessCode(manualCodeInput.trim());
                setManualCodeInput('');
              }
            }}>
              <input 
                type="text" 
                className="input-field" 
                value={manualCodeInput} 
                onChange={e => setManualCodeInput(e.target.value)} 
                placeholder="0001" 
                autoFocus 
                style={{ fontSize: '1.4rem', textAlign: 'center', letterSpacing: '4px', fontWeight: 900 }}
                required 
              />

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowManualModal(false)} 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '12px', borderRadius: '10px' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', fontWeight: 700 }}
                >
                  Buscar Código
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Estilos del Láser y Animaciones */}
      <style>{`
        @keyframes scanLaser {
          0% { top: 4%; opacity: 0.8; }
          50% { top: 92%; opacity: 1; }
          100% { top: 4%; opacity: 0.8; }
        }
        .scanner-laser-line {
          position: absolute;
          left: 4px;
          right: 4px;
          height: 3px;
          background: linear-gradient(90deg, transparent, #DEB841, #fff, #DEB841, transparent);
          box-shadow: 0 0 14px 3px rgba(222, 184, 65, 0.85);
          animation: scanLaser 2.2s infinite ease-in-out;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

    </div>
  );
};

export default LogisticsStaff;
