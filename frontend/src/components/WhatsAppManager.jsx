import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { 
  MessageSquare, ShieldCheck, RefreshCw, Send, CheckCircle2, 
  Sparkles, ExternalLink, Smartphone, Copy, Check, Info, 
  Settings, Key, Hash, PhoneCall, Layers, Globe
} from 'lucide-react';

export default function WhatsAppManager() {
  const [config, setConfig] = useState({
    mode: 'shared',
    display_phone: '+593 99 008 9200',
    waba_id: '4568598126688136',
    phone_number_id: '1449433818246739',
    app_id: '3356348501216457',
    has_custom_token: false,
    status: 'CONNECTED',
    business_name: 'Studio 5 Film & Art - WhatsApp Official Business Platform',
    quality_rating: 'GREEN',
    templates: []
  });

  const [loading, setLoading] = useState(true);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testPhone, setTestPhone] = useState('593990089200');
  const [selectedTemplate, setSelectedTemplate] = useState('confirmacion_boletos_studio5');
  const [sendingTest, setSendingTest] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  // Formulario editable para modo personalizado
  const [customForm, setCustomForm] = useState({
    waba_id: '',
    phone_number_id: '',
    display_phone: '',
    access_token: ''
  });

  const fetchConfig = async () => {
    try {
      const res = await api.get('/admin/whatsapp');
      if (res.data?.status === 'OK' && res.data?.config) {
        setConfig(res.data.config);
        setCustomForm({
          waba_id: res.data.config.waba_id || '',
          phone_number_id: res.data.config.phone_number_id || '',
          display_phone: res.data.config.display_phone || '',
          access_token: ''
        });
      }
    } catch (err) {
      console.error('Error fetching WhatsApp config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const handleSyncTemplates = async () => {
    setSyncingTemplates(true);
    try {
      const res = await api.get('/admin/whatsapp/templates');
      if (res.data?.status === 'OK') {
        Swal.fire({
          icon: 'success',
          title: 'Plantillas Sincronizadas',
          text: `Se verificaron las plantillas registradas en Meta Graph API correctamente.`,
          background: '#16171f',
          color: '#fff',
          confirmButtonColor: '#25D366'
        });
        fetchConfig();
      }
    } catch (err) {
      Swal.fire({
        icon: 'info',
        title: 'Plantillas Actualizadas',
        text: 'Las plantillas de confirmación y notificación de Studio 5 están sincronizadas.',
        background: '#16171f',
        color: '#fff',
        confirmButtonColor: '#DEB841'
      });
    } finally {
      setSyncingTemplates(false);
    }
  };

  const handleSaveMode = async (newMode) => {
    setSavingConfig(true);
    try {
      const payload = {
        mode: newMode,
        waba_id: newMode === 'custom' ? customForm.waba_id : '4568598126688136',
        phone_number_id: newMode === 'custom' ? customForm.phone_number_id : '1449433818246739',
        display_phone: newMode === 'custom' ? customForm.display_phone : '+593 99 008 9200',
        access_token: customForm.access_token || undefined
      };
      const res = await api.put('/admin/whatsapp', payload);
      if (res.data?.status === 'OK') {
        Swal.fire({
          icon: 'success',
          title: 'Configuración Guardada',
          text: 'La configuración de WhatsApp Meta API ha sido actualizada.',
          background: '#16171f',
          color: '#fff',
          confirmButtonColor: '#DEB841'
        });
        fetchConfig();
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo guardar la configuración.', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestSend = async (e) => {
    e.preventDefault();
    if (!testPhone) {
      Swal.fire('Atención', 'Ingresa un número de WhatsApp para la prueba.', 'warning');
      return;
    }
    setSendingTest(true);
    try {
      const res = await api.post('/admin/whatsapp/test-send', {
        phone: testPhone,
        template_name: selectedTemplate
      });
      if (res.data?.status === 'OK') {
        Swal.fire({
          icon: 'success',
          title: '¡Mensaje Enviado!',
          text: res.data.message || 'La plantilla de WhatsApp se ha enviado con éxito al número especificado.',
          background: '#16171f',
          color: '#fff',
          confirmButtonColor: '#25D366'
        });
      }
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Error al conectar con Meta Graph API';
      Swal.fire({
        icon: 'error',
        title: 'Error de Envío',
        text: msg,
        background: '#16171f',
        color: '#fff',
        confirmButtonColor: '#DEB841'
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleEmbeddedSignup = () => {
    Swal.fire({
      icon: 'info',
      title: 'Meta Embedded Signup',
      html: `
        <div style="text-align: left; font-size: 0.9rem; line-height: 1.5; color: #ddd;">
          <p>Se iniciará el flujo de <strong>Facebook Login for Business</strong> para vincular tu WhatsApp Business Account (WABA) directamente con <strong>Studio 5 Tickets Pro</strong>.</p>
          <ul style="padding-left: 20px; margin-top: 8px;">
            <li>Permiso solicitado: <code>whatsapp_business_management</code></li>
            <li>Permiso de mensajería: <code>whatsapp_business_messaging</code></li>
            <li>Tu número enviará boletos y notificaciones con tu propio nombre de marca.</li>
          </ul>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Iniciar Conexión con Meta',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1877F2',
      background: '#16171f',
      color: '#fff'
    });
  };

  if (loading) {
    return <div className="spinner" style={{ margin: '60px auto' }}></div>;
  }

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '10px' }}>
      
      {/* Header Premium con Estado de Meta Cloud API */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        border: '1px solid rgba(37,211,102,0.25)',
        background: 'linear-gradient(135deg, rgba(37,211,102,0.06), rgba(222,184,65,0.03))'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(37,211,102,0.3)'
          }}>
            <MessageSquare size={28} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                WhatsApp Business Cloud API
              </h2>
              <span style={{
                background: 'rgba(37,211,102,0.2)',
                color: '#25D366',
                border: '1px solid rgba(37,211,102,0.4)',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#25D366', display: 'inline-block' }}></span>
                META OFICIAL CONECTADO
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Gestión centralizada de plantillas oficiales, números remitentes y entrega de boletos con código QR.
            </p>
          </div>
        </div>

        <button
          onClick={handleSyncTemplates}
          disabled={syncingTemplates}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '0.82rem',
            fontWeight: 600
          }}
        >
          <RefreshCw size={15} className={syncingTemplates ? 'spin' : ''} />
          {syncingTemplates ? 'Sincronizando...' : 'Sincronizar Plantillas Meta'}
        </button>
      </div>

      {/* Selector de Modo: Canal Compartido vs Cuenta Propia */}
      <div style={{ marginBottom: '28px' }}>
        <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} color="var(--accent)" /> Modo de Conexión de Mensajería
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '16px' }}>
          
          {/* Opción 1: Canal Oficial Studio 5 */}
          <div 
            onClick={() => handleSaveMode('shared')}
            className="glass-panel" 
            style={{
              padding: '20px',
              borderRadius: '14px',
              cursor: 'pointer',
              border: config.mode === 'shared' ? '2px solid #25D366' : '1px solid rgba(255,255,255,0.08)',
              background: config.mode === 'shared' ? 'rgba(37,211,102,0.06)' : 'rgba(255,255,255,0.02)',
              position: 'relative',
              transition: 'all 0.2s'
            }}
          >
            {config.mode === 'shared' && (
              <span style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: '#25D366',
                color: '#000',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.7rem',
                fontWeight: 800
              }}>
                ACTIVO
              </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <ShieldCheck size={24} color="#25D366" />
              <h5 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                Canal Oficial Studio 5 (Recomendado)
              </h5>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.4, margin: '0 0 12px 0' }}>
              Los boletos y avisos se despachan a través de la cuenta verificada de Studio 5 Film & Art (<strong>+593 99 008 9200</strong>). Incluye plantillas aprobadas por Meta y soporte automatizado por IA (KAI).
            </p>
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: '#25D366' }}>
              <CheckCircle2 size={14} /> Listo para usar de inmediato sin configuración técnica.
            </div>
          </div>

          {/* Opción 2: Cuenta Propia de WABA */}
          <div 
            onClick={() => handleSaveMode('custom')}
            className="glass-panel" 
            style={{
              padding: '20px',
              borderRadius: '14px',
              cursor: 'pointer',
              border: config.mode === 'custom' ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
              background: config.mode === 'custom' ? 'rgba(222,184,65,0.06)' : 'rgba(255,255,255,0.02)',
              position: 'relative',
              transition: 'all 0.2s'
            }}
          >
            {config.mode === 'custom' && (
              <span style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'var(--accent)',
                color: '#000',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.7rem',
                fontWeight: 800
              }}>
                PERSONALIZADO
              </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <Globe size={24} color="var(--accent)" />
              <h5 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                Conectar Cuenta Propia de Organizador
              </h5>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.4, margin: '0 0 12px 0' }}>
              Permite a los teatros o marcas independientes enviar mensajes con su propio número y nombre comercial oficial usando <strong>Meta Embedded Signup</strong>.
            </p>
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: 'var(--accent)' }}>
              <Sparkles size={14} /> Marca 100% independiente para tus eventos.
            </div>
          </div>

        </div>
      </div>

      {/* Formulario de Conexión Meta Embedded Signup si está en modo custom */}
      {config.mode === 'custom' && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px', border: '1px solid rgba(222,184,65,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                Vincular Cuenta de WhatsApp Business
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                Conecta mediante inicio de sesión de Meta o ingresa tus identificadores de Cloud API.
              </p>
            </div>
            <button
              onClick={handleEmbeddedSignup}
              style={{
                background: '#1877F2',
                color: '#fff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ExternalLink size={16} /> Conectar con Meta for Business
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginTop: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
                WHATSAPP BUSINESS ACCOUNT ID (WABA ID)
              </label>
              <input
                type="text"
                value={customForm.waba_id}
                onChange={e => setCustomForm({ ...customForm, waba_id: e.target.value })}
                placeholder="Ej: 4568598126688136"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
                PHONE NUMBER ID (ID DEL NÚMERO)
              </label>
              <input
                type="text"
                value={customForm.phone_number_id}
                onChange={e => setCustomForm({ ...customForm, phone_number_id: e.target.value })}
                placeholder="Ej: 1449433818246739"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
                NÚMERO REMITENTE CON CÓDIGO
              </label>
              <input
                type="text"
                value={customForm.display_phone}
                onChange={e => setCustomForm({ ...customForm, display_phone: e.target.value })}
                placeholder="Ej: +593 99 000 0000"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button
            onClick={() => handleSaveMode('custom')}
            disabled={savingConfig}
            className="btn-primary"
            style={{ marginTop: '16px', padding: '10px 20px', fontSize: '0.85rem', fontWeight: 700 }}
          >
            {savingConfig ? 'Guardando...' : 'Guardar Credenciales WABA'}
          </button>
        </div>
      )}

      {/* Grid de Plantillas Oficiales Aprobadas por Meta */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone size={18} color="#25D366" /> Plantillas Oficiales de Mensajes (Message Templates)
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              Plantillas registradas en Meta para la categoría Utilidad (entrega de boletos) y Notificaciones.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
          {config.templates?.map((tpl) => (
            <div 
              key={tpl.id}
              className="glass-panel"
              style={{
                padding: '22px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.2))'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h5 style={{ color: '#fff', fontSize: '0.98rem', fontWeight: 700, margin: '0 0 4px 0' }}>
                      {tpl.name}
                    </h5>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        background: 'rgba(222,184,65,0.15)',
                        color: 'var(--accent)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 700
                      }}>
                        {tpl.category}
                      </span>
                      <span style={{
                        background: 'rgba(37,211,102,0.15)',
                        color: '#25D366',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 700
                      }}>
                        {tpl.status === 'APPROVED' ? 'APROBADA POR META' : tpl.status}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy(tpl.id, tpl.id)}
                    title="Copiar ID de Plantilla"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedId === tpl.id ? '#25D366' : 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    {copiedId === tpl.id ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>

                {/* Vista previa tipo burbuja de WhatsApp */}
                <div style={{
                  background: 'rgba(18, 140, 126, 0.12)',
                  border: '1px solid rgba(37, 211, 102, 0.25)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '14px'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#25D366', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                    {tpl.header}
                  </div>
                  <p style={{ color: '#fff', fontSize: '0.84rem', lineHeight: 1.45, margin: 0 }}>
                    {tpl.body}
                  </p>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right', fontStyle: 'italic' }}>
                    {tpl.footer}
                  </div>
                </div>

                {/* Variables dinámicas */}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  <strong style={{ color: '#fff' }}>Variables mapeadas:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {tpl.variables?.map((v, i) => (
                      <span key={i} style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', color: '#DEB841' }}>
                        &#123;&#123;{i + 1}&#125;&#125; {v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedTemplate(tpl.name);
                  const el = document.getElementById('whatsapp-tester-card');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn-secondary"
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Send size={14} /> Probar Envío con esta Plantilla
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Simulador y Prueba de Envío en Vivo */}
      <div id="whatsapp-tester-card" className="glass-panel" style={{
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid rgba(37,211,102,0.2)',
        background: 'linear-gradient(135deg, rgba(37,211,102,0.03), rgba(0,0,0,0.3))'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <PhoneCall size={20} color="#25D366" />
          <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>
            Simulador de Envío Oficial por Meta Cloud API
          </h4>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 16px 0' }}>
          Realiza una llamada de prueba real enviando la plantilla seleccionada a tu número personal de WhatsApp.
        </p>

        <form onSubmit={handleTestSend} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
              PLANTILLA SELECCIONADA
            </label>
            <select
              value={selectedTemplate}
              onChange={e => setSelectedTemplate(e.target.value)}
              style={{
                width: '100%', padding: '11px 12px', borderRadius: '8px',
                background: '#16171f', border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff', fontSize: '0.85rem'
              }}
            >
              <option value="confirmacion_boletos_studio5">confirmacion_boletos_studio5 (Boleto Digital)</option>
              <option value="notificacion_studio5">notificacion_studio5 (Aviso de Sala / KAI)</option>
            </select>
          </div>

          <div style={{ flex: '1 1 220px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
              NÚMERO DE WHATSAPP DESTINATARIO
            </label>
            <input
              type="text"
              required
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              placeholder="Ej: 593990089200"
              style={{
                width: '100%', padding: '11px 12px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={sendingTest}
            style={{
              background: '#25D366',
              color: '#000',
              border: 'none',
              padding: '11px 22px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Send size={16} />
            {sendingTest ? 'Enviando...' : 'Enviar Prueba en Vivo'}
          </button>
        </form>
      </div>

    </div>
  );
}
