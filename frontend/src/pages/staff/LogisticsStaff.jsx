import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { Camera, Keyboard, ArrowRightCircle, CheckCircle2, PackageSearch, RefreshCw, AlertTriangle, Layers } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const LogisticsStaff = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Pestañas principales: 'dispatch' (Registro / Asignación) vs 'receive' (Validación / Canje)
  const [actionType, setActionType] = useState('receive');
  const [inputMode, setInputMode] = useState('scanner'); // 'scanner' | 'manual'
  const [manualCode, setManualCode] = useState('');

  // Campañas disponibles para el Staff
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [campaignMetrics, setCampaignMetrics] = useState(null);

  // Estados del formulario de despacho / registro
  const [formData, setFormData] = useState({
    nombre: '',
    celular: '',
    cantidad: 1
  });

  const [scanResult, setScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastDeliveredInfo, setLastDeliveredInfo] = useState(null);

  // 1. Cargar Campañas
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await api.get('/logistics/staff/campaigns');
        if (res.data?.status === 'OK' && res.data.data.length > 0) {
          setCampaigns(res.data.data);

          // Si viene en la URL ?cid=...
          const urlCid = searchParams.get('cid');
          if (urlCid && res.data.data.some(c => c.id === urlCid)) {
            setSelectedCampaignId(urlCid);
          } else {
            setSelectedCampaignId(res.data.data[0].id);
          }

          // Si viene código en la URL ?code=...
          const urlCode = searchParams.get('code');
          if (urlCode) {
            setManualCode(urlCode);
            setInputMode('manual');
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
      console.error('Error cargando métricas:', err);
    }
  };

  useEffect(() => {
    if (selectedCampaignId) {
      fetchMetrics(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  // 3. Inicializar Escáner QR
  useEffect(() => {
    let scanner = null;
    if (inputMode === 'scanner') {
      try {
        scanner = new Html5QrcodeScanner("reader-logistics", { 
          qrbox: { width: 250, height: 250 }, 
          fps: 10,
          rememberLastUsedCamera: true
        });
        
        scanner.render((decodedText) => {
          let code = decodedText.trim();
          // Si el QR contiene una URL (ej: ...?code=0001&cid=...)
          if (code.includes('code=')) {
            const urlObj = new URL(code, window.location.origin);
            code = urlObj.searchParams.get('code') || code;
          } else if (code.includes('/')) {
            const parts = code.split('/');
            code = parts[parts.length - 1];
          }

          setScanResult(code);
        }, () => {});
      } catch (e) {
        console.error('Error iniciando cámara:', e);
      }
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [inputMode]);

  // 4. Manejar Acción (Despacho o Validación)
  const handleAction = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const codeToUse = inputMode === 'manual' ? manualCode.trim() : scanResult;

    if (!selectedCampaignId) {
      Swal.fire('Selecciona Campaña', 'Debes seleccionar una campaña primero.', 'warning');
      return;
    }

    if (!codeToUse) {
      Swal.fire('Código Requerido', 'Escanea o ingresa un código para continuar.', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      if (actionType === 'dispatch') {
        // Pestaña: Registro / Despacho
        const res = await api.post('/logistics/dispatch', {
          campaign_id: selectedCampaignId,
          start_code: codeToUse,
          quantity: formData.cantidad,
          assigned_data: {
            nombre: formData.nombre.trim(),
            celular: formData.celular.trim()
          }
        });

        if (res.data?.status === 'OK') {
          Swal.fire({
            icon: 'success',
            title: '¡Lote Asignado!',
            text: res.data.message,
            background: '#16171f',
            color: '#fff',
            confirmButtonColor: '#DEB841'
          });
          setManualCode('');
          setScanResult(null);
          setFormData({ nombre: '', celular: '', cantidad: 1 });
          fetchMetrics(selectedCampaignId);
        }
      } else {
        // Pestaña: Validación / Canje
        const res = await api.post('/logistics/receive', {
          campaign_id: selectedCampaignId,
          item_code: codeToUse
        });

        if (res.data?.status === 'OK') {
          setLastDeliveredInfo({
            code: codeToUse,
            beneficiary: res.data.data?.nombre || 'Beneficiario Registrado',
            phone: res.data.data?.celular || 'Sin celular',
            items: res.data.items_breakdown || []
          });

          Swal.fire({
            icon: 'success',
            title: '✅ ¡Entrega Validada!',
            html: `
              <p>Código: <b>#${codeToUse}</b></p>
              <p>Beneficiario: <b>${res.data.data?.nombre || 'General'}</b></p>
              <p style="color: #4ade80; font-weight: bold;">Canasta confirmada y marcada como canjeada.</p>
            `,
            background: '#16171f',
            color: '#fff',
            confirmButtonColor: '#10b981'
          });

          setManualCode('');
          setScanResult(null);
          fetchMetrics(selectedCampaignId);
        }
      }
    } catch (err) {
      const errData = err?.response?.data;
      if (errData?.status === 'ALREADY_RECEIVED') {
        Swal.fire({
          icon: 'warning',
          title: '⚠️ Ya Entregado',
          html: `
            <p style="color: #ff4444; font-weight: bold;">Este código ya fue entregado y canjeado con anterioridad.</p>
            <p>Beneficiario: <b>${errData.assigned_data?.nombre || 'Desconocido'}</b></p>
            <p>Fecha de Canje: <b>${new Date(errData.received_at).toLocaleString()}</b></p>
          `,
          background: '#16171f',
          color: '#fff',
          confirmButtonColor: '#ff4444'
        });
      } else {
        Swal.fire('Error', errData?.message || 'Error al procesar la operación.', 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (loadingCampaigns) {
    return <div className="spinner" style={{ margin: '100px auto' }}></div>;
  }

  return (
    <div className="staff-container" style={{ padding: '16px', maxWidth: '750px', margin: '0 auto' }}>
      {/* Selector de Campaña Activa */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} color="var(--accent)" /> Campaña de Logística Activa:
          </label>
        </div>
        
        {campaigns.length === 0 ? (
          <div style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)', padding: '12px 16px', borderRadius: '10px', color: '#ff4444', fontSize: '0.85rem' }}>
            No tienes campañas asignadas para operar. Contacta al Administrador.
          </div>
        ) : (
          <select 
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: '#1a1a2e', color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}
          >
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.total_items} tickets)</option>
            ))}
          </select>
        )}
      </div>

      {/* Pill de Métricas Rápidas */}
      {campaignMetrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Disponibles</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{campaignMetrics.AVAILABLE}</div>
          </div>
          <div style={{ background: 'rgba(59,130,246,0.08)', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(59,130,246,0.2)' }}>
            <span style={{ fontSize: '0.7rem', color: '#93c5fd', textTransform: 'uppercase' }}>Asignadas</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b82f6' }}>{campaignMetrics.DISPATCHED}</div>
          </div>
          <div style={{ background: 'rgba(16,185,129,0.08)', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>
            <span style={{ fontSize: '0.7rem', color: '#6ee7b7', textTransform: 'uppercase' }}>Canjeadas</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{campaignMetrics.RECEIVED}</div>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '24px' }}>
        {/* Pestañas Principales: 1. Validación (Canje) vs 2. Registro (Despacho) */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button 
            type="button"
            onClick={() => setActionType('receive')} 
            style={{ 
              flex: 1, padding: '14px 10px', textAlign: 'center', borderRadius: '12px', 
              border: actionType === 'receive' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)', 
              cursor: 'pointer', 
              background: actionType === 'receive' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.02)',
              color: actionType === 'receive' ? '#fff' : 'var(--text-muted)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
            }}
          >
            <CheckCircle2 size={24} color={actionType === 'receive' ? '#10b981' : 'var(--text-muted)'} />
            <strong style={{ fontSize: '0.9rem' }}>Validar Canje</strong>
            <span style={{ fontSize: '0.7rem' }}>Confirmar entrega de canasta</span>
          </button>

          <button 
            type="button"
            onClick={() => setActionType('dispatch')} 
            style={{ 
              flex: 1, padding: '14px 10px', textAlign: 'center', borderRadius: '12px', 
              border: actionType === 'dispatch' ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)', 
              cursor: 'pointer', 
              background: actionType === 'dispatch' ? 'rgba(222,184,65,0.15)' : 'rgba(255,255,255,0.02)',
              color: actionType === 'dispatch' ? '#fff' : 'var(--text-muted)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
            }}
          >
            <ArrowRightCircle size={24} color={actionType === 'dispatch' ? 'var(--accent)' : 'var(--text-muted)'} />
            <strong style={{ fontSize: '0.9rem' }}>Registro / Lotes</strong>
            <span style={{ fontSize: '0.7rem' }}>Asignar a beneficiario</span>
          </button>
        </div>

        {/* Modo Entrada: Escáner vs Manual */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
          <button 
            type="button"
            onClick={() => setInputMode('scanner')} 
            style={{ 
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', 
              background: inputMode === 'scanner' ? 'var(--accent)' : 'transparent', 
              color: inputMode === 'scanner' ? '#000' : '#fff', fontWeight: 700, 
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', cursor: 'pointer' 
            }}
          >
            <Camera size={16} /> Escáner de Cámara
          </button>
          <button 
            type="button"
            onClick={() => setInputMode('manual')} 
            style={{ 
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', 
              background: inputMode === 'manual' ? 'var(--accent)' : 'transparent', 
              color: inputMode === 'manual' ? '#000' : '#fff', fontWeight: 700, 
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', cursor: 'pointer' 
            }}
          >
            <Keyboard size={16} /> Digitar Código
          </button>
        </div>

        <form onSubmit={handleAction}>
          <div style={{ marginBottom: '20px', padding: '18px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', textAlign: 'center' }}>
            {inputMode === 'scanner' ? (
              <div>
                <div id="reader-logistics" style={{ width: '100%', maxWidth: '380px', margin: '0 auto', background: '#fff', borderRadius: '10px', overflow: 'hidden' }}></div>
                {scanResult ? (
                  <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#4ade80', borderRadius: '8px', fontWeight: 800, fontSize: '1.1rem' }}>
                    🎯 Código Detectado: #{scanResult}
                  </div>
                ) : (
                  <p style={{ marginTop: '14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Apunta al código QR del sticker impreso</p>
                )}
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', textAlign: 'left', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Ingresa el código numérico de la canasta / ticket:
                </label>
                <input 
                  type="text" 
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ej: 0001" 
                  style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1.4rem', textAlign: 'center', letterSpacing: '2px', fontWeight: 800 }}
                  required
                />
              </div>
            )}
          </div>

          {/* Formulario solo en modo Dispatch */}
          {actionType === 'dispatch' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nombre del Beneficiario *</label>
                <input 
                  type="text" 
                  value={formData.nombre} 
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
                  placeholder="Ej: María Zambrano"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff' }} 
                  required 
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1.5 }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Teléfono / Celular</label>
                  <input 
                    type="text" 
                    value={formData.celular} 
                    onChange={(e) => setFormData({...formData, celular: e.target.value})} 
                    placeholder="0991234567"
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cantidad Canastas</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={formData.cantidad} 
                    onChange={(e) => setFormData({...formData, cantidad: parseInt(e.target.value, 10) || 1})} 
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff' }} 
                    required 
                  />
                </div>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isProcessing || (inputMode === 'scanner' && !scanResult)}
            className="btn-primary" 
            style={{ 
              width: '100%', padding: '15px', fontSize: '1.05rem', fontWeight: 800,
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
              opacity: (inputMode === 'scanner' && !scanResult) ? 0.5 : 1,
              background: actionType === 'receive' ? '#10b981' : 'var(--accent)',
              color: '#000'
            }}
          >
            {isProcessing ? 'Procesando...' : (actionType === 'dispatch' ? 'Confirmar Asignación de Lote' : '✅ Confirmar Entrega de Canasta')}
          </button>
        </form>
      </div>

      {/* Tarjeta de Última Entrega Exitosa */}
      {lastDeliveredInfo && (
        <div style={{ marginTop: '20px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '16px' }} className="fade-in">
          <h4 style={{ color: '#10b981', margin: '0 0 6px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} /> Última Entrega Registrada
          </h4>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#fff' }}>
            Código: <strong>#{lastDeliveredInfo.code}</strong> &bull; Beneficiario: <strong>{lastDeliveredInfo.beneficiary}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

export default LogisticsStaff;
