import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { 
  Camera, Keyboard, ArrowRightCircle, CheckCircle2, 
  PackageSearch, RefreshCw, AlertTriangle, Layers, X, 
  Plus, Minus, Check, Sparkles, UserCheck, Phone, User,
  Search, ClipboardList, ChevronLeft, ChevronRight, Power, Video
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

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
  const [isStartingScanner, setIsStartingScanner] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [showCameraSelectModal, setShowCameraSelectModal] = useState(false);
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

  // Estados para visualización y búsqueda de registros (Item 4)
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [staffRecords, setStaffRecords] = useState([]);
  const [staffRecordsLoading, setStaffRecordsLoading] = useState(false);
  const [staffRecordsSearch, setStaffRecordsSearch] = useState('');
  const [staffRecordsStatus, setStaffRecordsStatus] = useState('ALL');
  const [staffRecordsPage, setStaffRecordsPage] = useState(0);
  const [staffRecordsTotal, setStaffRecordsTotal] = useState(0);

  const fetchStaffRecords = async (campaignId, page = 0, search = '', status = 'ALL') => {
    if (!campaignId) return;
    setStaffRecordsLoading(true);
    try {
      const offset = page * 25;
      const q = new URLSearchParams({ limit: 25, offset, status, search });
      const res = await api.get(`/logistics/campaigns/${campaignId}/items?${q.toString()}`);
      if (res.data?.status === 'OK') {
        setStaffRecords(res.data.data || []);
        setStaffRecordsTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Error cargando registros:', err);
    } finally {
      setStaffRecordsLoading(false);
    }
  };

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

  // 4. Funciones y Control del Escáner
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
  };

  const stopScanner = useCallback(async () => {
    if (html5ScannerRef.current) {
      try {
        if (html5ScannerRef.current.isScanning) {
          await html5ScannerRef.current.stop();
        }
        html5ScannerRef.current.clear();
      } catch (e) {
        console.warn('Error al detener scanner:', e);
      }
      html5ScannerRef.current = null;
    }
    setIsScannerRunning(false);
    setIsStartingScanner(false);
  }, []);

  const startCameraWithConfig = async (cameraConfig) => {
    setIsStartingScanner(true);
    await stopScanner();

    const qrRegion = document.getElementById('logistics-live-scanner');
    if (!qrRegion) {
      setIsStartingScanner(false);
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode('logistics-live-scanner');
      html5ScannerRef.current = html5QrCode;

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            return { width: Math.floor(minEdge * 0.72), height: Math.floor(minEdge * 0.72) };
          },
          aspectRatio: 1.0
        },
        (decodedText) => {
          if (decodedText) {
            handleProcessCode(decodedText);
          }
        },
        () => {} // Ignorar errores comunes de búsqueda de frame
      );

      setIsScannerRunning(true);
    } catch (err) {
      console.error('Error iniciando escáner con config:', cameraConfig, err);
      throw err;
    } finally {
      setIsStartingScanner(false);
    }
  };

  const startCameraDirectly = async () => {
    setIsStartingScanner(true);
    await stopScanner();

    try {
      // 1. Intentar enumerar cámaras y seleccionar la cámara trasera
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const backCamera = devices.find(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('trasera') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          );
          const targetId = backCamera ? backCamera.id : devices[devices.length - 1].id;
          await startCameraWithConfig({ deviceId: { exact: targetId } });
          return;
        }
      } catch (enumErr) {
        console.warn('No se pudieron listar cámaras, probando facingMode directo:', enumErr);
      }

      // 2. Si no enumeró o falló deviceId, intentar facingMode environment
      try {
        await startCameraWithConfig({ facingMode: "environment" });
        return;
      } catch (faceErr) {
        console.warn('Fallo facingMode environment:', faceErr);
      }

      // 3. Fallback con cámara frontal o genérica
      await startCameraWithConfig({ facingMode: "user" });
    } catch (finalErr) {
      console.error('Error total al iniciar cámara:', finalErr);
      await stopScanner();
      Swal.fire({
        icon: 'warning',
        title: 'Acceso a la Cámara',
        text: 'No se pudo acceder a la cámara. Por favor verifica que diste permisos de cámara a la página en tu navegador.',
        background: '#16171f',
        color: '#fff',
        confirmButtonColor: '#DEB841'
      });
    } finally {
      setIsStartingScanner(false);
    }
  };

  const handleStartScanClick = async () => {
    if (isStartingScanner || isScannerRunning) return;

    if (isMobileDevice()) {
      // Móvil: Activar directamente la cámara trasera sin retrasos
      await startCameraDirectly();
    } else {
      // PC: Consultar cámaras disponibles
      try {
        setIsStartingScanner(true);
        const devices = await Html5Qrcode.getCameras();
        setIsStartingScanner(false);

        if (!devices || devices.length === 0) {
          Swal.fire({
            icon: 'error',
            title: 'Sin Cámara',
            text: 'No se detectó ninguna cámara conectada en tu equipo.',
            background: '#16171f',
            color: '#fff',
            confirmButtonColor: '#ef4444'
          });
          return;
        }

        if (devices.length === 1) {
          await startCameraWithConfig({ deviceId: { exact: devices[0].id } });
        } else {
          setAvailableCameras(devices);
          setShowCameraSelectModal(true);
        }
      } catch (err) {
        setIsStartingScanner(false);
        console.warn('Error listando cámaras en PC:', err);
        await startCameraDirectly();
      }
    }
  };

  // Pausar/Detener cámara si se abre alguna modal
  useEffect(() => {
    if (floatingItem || showManualModal || showRegistrationsModal) {
      stopScanner();
    }
  }, [floatingItem, showManualModal, showRegistrationsModal, stopScanner]);

  // Limpiar escáner al desmontar
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

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

        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            onClick={() => {
              setShowRegistrationsModal(true);
              fetchStaffRecords(selectedCampaignId, 0, '', 'ALL');
            }}
            className="btn-secondary"
            style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              padding: '8px 10px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#cbd5e1', fontSize: '0.72rem', fontWeight: 700, minWidth: '60px' 
            }}
            title="Ver listado de registros"
          >
            <ClipboardList size={18} style={{ marginBottom: '2px' }} />
            <span>Registros</span>
          </button>

          <button 
            onClick={() => setShowManualModal(true)}
            className="btn-secondary"
            style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              padding: '8px 10px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#cbd5e1', fontSize: '0.72rem', fontWeight: 700, minWidth: '60px' 
            }}
            title="Ingresar código con teclado"
          >
            <Keyboard size={18} style={{ marginBottom: '2px' }} />
            <span>Manual</span>
          </button>
        </div>
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
            background: '#090a0f', border: '2px solid rgba(222,184,65,0.35)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)', minHeight: '380px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {/* Contenedor nativo donde Html5Qrcode inyectará el video (siempre renderizado con dimensiones para visor) */}
          <div 
            id="logistics-live-scanner" 
            style={{ 
              width: '100%', 
              minHeight: '380px',
              height: '100%'
            }} 
          />

          {/* ESTADO EN REPOSO: Botón único Escanear sobre overlay */}
          {!isScannerRunning && !isStartingScanner && (
            <div style={{
              position: 'absolute', inset: 0,
              background: '#090a0f',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '36px 20px', textAlign: 'center', gap: '14px', width: '100%',
              zIndex: 10
            }}>
              <div style={{
                width: '74px', height: '74px', borderRadius: '50%',
                background: 'rgba(222,184,65,0.08)', border: '1px solid rgba(222,184,65,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 25px rgba(222,184,65,0.15)'
              }}>
                <Camera size={34} color="var(--accent)" />
              </div>

              <div>
                <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px 0' }}>
                  Escáner en Espera
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0, maxWidth: '280px' }}>
                  Activa la cámara para escanear el código QR del beneficiario o sticker.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartScanClick}
                className="btn-primary"
                style={{
                  width: 'auto', minWidth: '180px', padding: '12px 28px',
                  borderRadius: '12px', fontWeight: 800, fontSize: '0.92rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  marginTop: '6px', cursor: 'pointer'
                }}
              >
                <Camera size={18} /> Escanear
              </button>
            </div>
          )}

          {/* SPINNER DE INICIALIZACIÓN */}
          {isStartingScanner && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(9, 10, 15, 0.94)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '40px 20px', gap: '14px', zIndex: 12
            }}>
              <div className="spinner" style={{ width: '38px', height: '38px', borderTopColor: 'var(--accent)' }} />
              <p style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>
                Iniciando sensor de cámara...
              </p>
            </div>
          )}

          {/* HUD & Mira Láser Holográfica (Visible solo al escanear) */}
          {isScannerRunning && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              
              {/* Cuadro Objetivo Central */}
              <div style={{ position: 'relative', width: '230px', height: '230px' }}>
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
          )}

          {/* Botón flotante para Detener Escáner (cuando esté activo) */}
          {isScannerRunning && (
            <button
              type="button"
              onClick={stopScanner}
              style={{
                position: 'absolute', top: '12px', right: '12px',
                background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)', borderRadius: '20px',
                padding: '6px 14px', color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                zIndex: 20
              }}
            >
              <Power size={13} color="#ef4444" />
              <span>Detener</span>
            </button>
          )}

          {/* Overlay de Carga si está consultando */}
          {isLookingUp && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
              <div className="spinner" style={{ marginBottom: '12px' }} />
              <p style={{ color: '#DEB841', fontWeight: 800, fontSize: '1rem', margin: 0 }}>Analizando Código...</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL SELECTOR DE CÁMARA (PC) ──────────────────────────────────── */}
      {showCameraSelectModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '16px'
        }}>
          <div 
            className="glass-panel" 
            style={{ 
              width: '100%', maxWidth: '420px', padding: '24px',
              background: 'linear-gradient(145deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.99))',
              border: '1px solid rgba(222, 184, 65, 0.35)', borderRadius: '20px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.8), 0 0 30px rgba(222,184,65,0.15)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Video size={18} color="var(--accent)" />
                <h3 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                  Seleccionar Cámara
                </h3>
              </div>
              <button
                onClick={() => setShowCameraSelectModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#a1a1aa', cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Se detectaron múltiples dispositivos de video. Elige la cámara con la que deseas escanear:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {availableCameras.map((cam, idx) => (
                <button
                  key={cam.id}
                  onClick={async () => {
                    setShowCameraSelectModal(false);
                    await startCameraWithConfig({ deviceId: { exact: cam.id } });
                  }}
                  className="btn-secondary"
                  style={{
                    padding: '12px 14px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#fff', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(222,184,65,0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                >
                  <Camera size={16} color="var(--accent)" />
                  <span style={{ flex: 1 }}>{cam.label || `Cámara ${idx + 1}`}</span>
                  <ArrowRightCircle size={16} color="var(--text-muted)" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
        #logistics-live-scanner video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 20px !important;
        }
      `}</style>

      {/* ─── MODAL LISTA DE REGISTROS PARA STAFF (Item 1 & 4) ──────────────────── */}
      {showRegistrationsModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '14px'
        }}>
          <div 
            className="glass-panel" 
            style={{ 
              width: '100%', maxWidth: '620px', height: '88vh', display: 'flex', flexDirection: 'column', 
              padding: '24px 20px', borderRadius: '24px', overflow: 'hidden',
              background: 'linear-gradient(145deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.99))',
              border: '1px solid rgba(222, 184, 65, 0.35)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 35px rgba(222, 184, 65, 0.12)'
            }}
          >
            
            {/* Header del Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: 'rgba(222,184,65,0.1)', border: '1px solid rgba(222,184,65,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ClipboardList size={20} color="var(--accent)" />
                </div>
                <div>
                  <h3 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 900, margin: 0, letterSpacing: '0.3px' }}>
                    Registros de Campaña
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {staffRecordsTotal} tickets registrados en tiempo real
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowRegistrationsModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
                  width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#a1a1aa', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Barra de Búsqueda */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={16} color="var(--accent)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Buscar por código, beneficiario o celular..."
                value={staffRecordsSearch}
                onChange={(e) => {
                  setStaffRecordsSearch(e.target.value);
                  setStaffRecordsPage(0);
                  fetchStaffRecords(selectedCampaignId, 0, e.target.value, staffRecordsStatus);
                }}
                style={{
                  width: '100%', padding: '10px 14px 10px 38px', borderRadius: '12px',
                  background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: '0.84rem', marginBottom: 0, outline: 'none'
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 12px rgba(222,184,65,0.25)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
              />
              {staffRecordsSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setStaffRecordsSearch('');
                    setStaffRecordsPage(0);
                    fetchStaffRecords(selectedCampaignId, 0, '', staffRecordsStatus);
                  }}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filtros por Pestañas / Pills (Cero desplegables blancos) */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '2px' }}>
              {[
                { key: 'ALL', label: 'Todos' },
                { key: 'AVAILABLE', label: 'Disponibles', color: '#94a3b8' },
                { key: 'DISPATCHED', label: 'Asignados', color: '#38bdf8' },
                { key: 'RECEIVED', label: 'Entregados', color: '#10b981' }
              ].map(f => {
                const isActive = staffRecordsStatus === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      setStaffRecordsStatus(f.key);
                      setStaffRecordsPage(0);
                      fetchStaffRecords(selectedCampaignId, 0, staffRecordsSearch, f.key);
                    }}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800,
                      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
                      background: isActive ? 'linear-gradient(135deg, var(--accent) 0%, #b08d2b 100%)' : 'rgba(255,255,255,0.04)',
                      color: isActive ? '#000' : (f.color || '#cbd5e1'),
                      border: isActive ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: isActive ? '0 2px 12px rgba(222,184,65,0.35)' : 'none'
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Listado con scroll elegante */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {staffRecordsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px' }}>
                  <div className="spinner" style={{ width: '32px', height: '32px', borderTopColor: 'var(--accent)' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cargando registros...</span>
                </div>
              ) : staffRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                  No se encontraron tickets con los filtros aplicados.
                </div>
              ) : (
                staffRecords.map(item => {
                  const assigned = item.assigned_data?.cantidad ? parseInt(item.assigned_data.cantidad, 10) : (item.status === 'AVAILABLE' ? 0 : 1);
                  const delivered = parseInt(item.delivered_quantity || (item.status === 'RECEIVED' ? assigned : 0), 10);
                  const isDone = item.status === 'RECEIVED';
                  const isDisp = item.status === 'DISPATCHED';

                  const badgeColor = isDone ? '#10b981' : isDisp ? '#38bdf8' : '#94a3b8';
                  const badgeBg = isDone ? 'rgba(16,185,129,0.12)' : isDisp ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.05)';
                  const badgeBorder = isDone ? 'rgba(16,185,129,0.3)' : isDisp ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.1)';

                  return (
                    <div 
                      key={item.id}
                      style={{
                        padding: '12px 14px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', gap: '12px', transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 900, color: 'var(--accent)', fontSize: '0.92rem', letterSpacing: '0.5px' }}>
                            #{item.item_code}
                          </span>
                          <span style={{
                            fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                            background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}`
                          }}>
                            {isDone ? 'Entregado' : isDisp ? 'Asignado' : 'Disponible'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.86rem', color: '#f1f5f9', fontWeight: 700, marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.assigned_data?.nombre || <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Sin asignar</span>}
                        </div>

                        {item.assigned_data?.celular && (
                          <div style={{ fontSize: '0.74rem', color: '#38bdf8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={12} />
                            <span>{item.assigned_data.celular}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: 'right', minWidth: '70px' }}>
                        <div style={{
                          fontSize: '0.88rem', fontWeight: 900,
                          color: isDone ? '#10b981' : isDisp ? 'var(--accent)' : '#94a3b8'
                        }}>
                          {delivered} / {assigned}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                          artículos
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Paginación */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Página {staffRecordsPage + 1} ({staffRecords.length} de {staffRecordsTotal})</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  disabled={staffRecordsPage === 0}
                  onClick={() => {
                    const p = staffRecordsPage - 1;
                    setStaffRecordsPage(p);
                    fetchStaffRecords(selectedCampaignId, p, staffRecordsSearch, staffRecordsStatus);
                  }}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
                    opacity: staffRecordsPage === 0 ? 0.3 : 1, fontWeight: 700
                  }}
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={(staffRecordsPage + 1) * 25 >= staffRecordsTotal}
                  onClick={() => {
                    const p = staffRecordsPage + 1;
                    setStaffRecordsPage(p);
                    fetchStaffRecords(selectedCampaignId, p, staffRecordsSearch, staffRecordsStatus);
                  }}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
                    opacity: (staffRecordsPage + 1) * 25 >= staffRecordsTotal ? 0.3 : 1, fontWeight: 700
                  }}
                >
                  Sig
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default LogisticsStaff;
