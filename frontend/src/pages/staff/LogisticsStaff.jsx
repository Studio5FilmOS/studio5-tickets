import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Camera, Keyboard, ArrowRightCircle, CheckCircle2, PackageSearch } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const LogisticsStaff = () => {
  const { user } = useAuth();
  const [inputMode, setInputMode] = useState('scanner'); // 'scanner' | 'manual'
  const [actionType, setActionType] = useState('dispatch'); // 'dispatch' | 'receive'
  const [manualCode, setManualCode] = useState('');

  // Estados del formulario (Dinámico)
  const [formData, setFormData] = useState({
    nombre: '',
    celular: '',
    cantidad: 1
  });

  const [campaignId, setCampaignId] = useState('1'); 
  const [scanResult, setScanResult] = useState(null);

  // Inicializar escáner QR cuando el modo sea 'scanner'
  useEffect(() => {
    let scanner = null;
    if (inputMode === 'scanner') {
      scanner = new Html5QrcodeScanner("reader", { 
        qrbox: { width: 250, height: 250 }, 
        fps: 10,
        rememberLastUsedCamera: true
      });
      
      scanner.render((decodedText) => {
        // Extraemos el código de la URL (Ej: https://studio5.com/org/i/034 -> 034)
        const parts = decodedText.split('/');
        const extractedCode = parts[parts.length - 1];
        setScanResult(extractedCode);
        
        // Sonido de éxito sutil
        try {
          const audio = new Audio('/success-beep.mp3'); // Asumiendo que existe en tu public folder
          audio.play();
        } catch(e){}

      }, (err) => {
        // Ignorar errores continuos de no detección
      });
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error(e));
      }
    };
  }, [inputMode]);

  const handleAction = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    // Si estamos en modo manual, usamos manualCode. Si estamos en escáner, usamos scanResult.
    const codeToUse = inputMode === 'manual' ? manualCode : scanResult; 
    
    if (!codeToUse) {
      alert('Por favor ingrese o escanee un código.');
      return;
    }

    try {
      let endpoint = actionType === 'dispatch' ? '/api/logistics/dispatch' : '/api/logistics/receive';
      let payload = actionType === 'dispatch' 
        ? {
            campaign_id: campaignId,
            start_code: codeToUse,
            quantity: formData.cantidad,
            assigned_data: { nombre: formData.nombre, celular: formData.celular }
          }
        : {
            campaign_id: campaignId,
            item_code: codeToUse
          };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.status === 'OK') {
        alert('Éxito: ' + data.message);
        setManualCode(''); // Limpiar
        if (actionType === 'dispatch') setFormData({ nombre: '', celular: '', cantidad: 1 });
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      alert('Error de conexión con el servidor.');
    }
  };

  return (
    <div className="staff-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#fff' }}>
          <PackageSearch size={28} style={{ color: 'var(--accent)' }} />
          Logística - Operaciones
        </h2>
        <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.3)', padding: '10px 20px', borderRadius: '30px', display: 'inline-flex', gap: '20px', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Mi Lote: <strong>100</strong></span>
          <span style={{ color: '#4ade80' }}>Asignadas: <strong>0</strong></span>
          <span style={{ color: '#60a5fa' }}>Recibidas: <strong>0</strong></span>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '30px' }}>
        
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '5px', marginBottom: '25px' }}>
          <button onClick={() => setInputMode('scanner')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: inputMode === 'scanner' ? 'var(--accent)' : 'transparent', color: inputMode === 'scanner' ? '#000' : '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <Camera size={18} /> Escáner Activo
          </button>
          <button onClick={() => setInputMode('manual')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: inputMode === 'manual' ? 'var(--accent)' : 'transparent', color: inputMode === 'manual' ? '#000' : '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <Keyboard size={18} /> Ingreso Manual
          </button>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
          <div onClick={() => setActionType('dispatch')} style={{ flex: 1, padding: '15px', textAlign: 'center', borderRadius: '12px', border: actionType === 'dispatch' ? '2px solid var(--accent)' : '2px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: actionType === 'dispatch' ? 'rgba(222,184,65,0.1)' : 'transparent' }}>
            <ArrowRightCircle size={24} style={{ color: actionType === 'dispatch' ? 'var(--accent)' : 'var(--text-muted)', marginBottom: '5px' }} />
            <div style={{ fontWeight: 'bold', color: actionType === 'dispatch' ? '#fff' : 'var(--text-muted)' }}>Despachar (Asignar)</div>
          </div>
          <div onClick={() => setActionType('receive')} style={{ flex: 1, padding: '15px', textAlign: 'center', borderRadius: '12px', border: actionType === 'receive' ? '2px solid #4ade80' : '2px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: actionType === 'receive' ? 'rgba(74,222,128,0.1)' : 'transparent' }}>
            <CheckCircle2 size={24} style={{ color: actionType === 'receive' ? '#4ade80' : 'var(--text-muted)', marginBottom: '5px' }} />
            <div style={{ fontWeight: 'bold', color: actionType === 'receive' ? '#fff' : 'var(--text-muted)' }}>Validar Recepción</div>
          </div>
        </div>

        <form onSubmit={handleAction}>
          <div style={{ marginBottom: '25px', padding: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', textAlign: 'center' }}>
            {inputMode === 'scanner' ? (
              <div>
                <div id="reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', background: '#fff', borderRadius: '8px', overflow: 'hidden' }}></div>
                {scanResult ? (
                  <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(74,222,128,0.2)', color: '#4ade80', borderRadius: '8px', fontWeight: 'bold' }}>
                    ✅ Código Detectado: {scanResult}
                  </div>
                ) : (
                  <p style={{ marginTop: '15px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Apunta el código QR de la canasta</p>
                )}
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', textAlign: 'left', marginBottom: '8px', color: 'var(--text-muted)' }}>Ingrese el código de la canasta:</label>
                <input 
                  type="text" 
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ej: 001" 
                  style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1.2rem', textAlign: 'center' }}
                  required
                />
              </div>
            )}
          </div>

          {actionType === 'dispatch' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)' }}>Nombre de quien recibe:</label>
                <input type="text" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff' }} required />
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)' }}>Celular:</label>
                  <input type="text" value={formData.celular} onChange={(e) => setFormData({...formData, celular: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff' }} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)' }}>Cantidad de Canastas:</label>
                  <input type="number" min="1" value={formData.cantidad} onChange={(e) => setFormData({...formData, cantidad: parseInt(e.target.value) || 1})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff' }} required />
                </div>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={inputMode === 'scanner' && !scanResult}
            className="btn-primary" 
            style={{ 
              width: '100%', padding: '15px', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
              opacity: (inputMode === 'scanner' && !scanResult) ? 0.5 : 1
            }}
          >
            {actionType === 'dispatch' ? 'Completar Asignación' : 'Validar Recepción Ahora'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LogisticsStaff;
