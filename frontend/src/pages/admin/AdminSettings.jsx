import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { Phone, MessageSquare, Save, CheckCircle2, ShieldCheck, ExternalLink } from 'lucide-react';
import { clearSettingsCache } from '../../services/settingsService';

export default function AdminSettings() {
  const [form, setForm] = useState({
    contact_whatsapp: '593963162788',
    cartelera_contact_message: 'Hola, deseo contratar el módulo de Cartelera de Eventos en mi cuenta.',
    logistics_contact_message: 'Hola, deseo contratar el módulo de Logística en mi cuenta.'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/admin/settings');
        if (res.data?.status === 'OK' && res.data?.settings) {
          setForm(prev => ({
            ...prev,
            contact_whatsapp: res.data.settings.contact_whatsapp || prev.contact_whatsapp,
            cartelera_contact_message: res.data.settings.cartelera_contact_message || prev.cartelera_contact_message,
            logistics_contact_message: res.data.settings.logistics_contact_message || prev.logistics_contact_message
          }));
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/admin/settings', form);
      if (res.data?.status === 'OK') {
        clearSettingsCache();
        Swal.fire({
          icon: 'success',
          title: 'Configuración Guardada',
          text: 'El número de contacto y mensajes se han actualizado en toda la plataforma.',
          background: '#16171f',
          color: '#fff',
          confirmButtonColor: '#DEB841'
        });
      }
    } catch (err) {
      Swal.fire('Error', err?.response?.data?.message || 'No se pudo guardar la configuración.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const cleanPhone = form.contact_whatsapp.replace(/\D/g, '');
  const testUrlCartelera = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(form.cartelera_contact_message)}`;
  const testUrlLogistics = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(form.logistics_contact_message)}`;

  if (loading) {
    return <div className="spinner" style={{ margin: '50px auto' }}></div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '10px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 6px 0' }}>
          <Phone size={22} color="var(--accent)" /> Contacto de Plataforma & Monetización
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
          Este número de WhatsApp se utilizará en los botones de "Contratar Módulo" y contacto directo cuando un organizador o espectador no tenga contratada una función.
        </p>
      </div>

      <form onSubmit={handleSave} className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
            NÚMERO DE WHATSAPP DEL DUEÑO / ADMIN (CON CÓDIGO DE PAÍS) *
          </label>
          <div style={{ position: 'relative' }}>
            <Phone size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
            <input
              type="text"
              required
              value={form.contact_whatsapp}
              onChange={e => setForm({ ...form, contact_whatsapp: e.target.value })}
              placeholder="Ej: 593963162788"
              style={{
                width: '100%',
                padding: '12px 14px 12px 45px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
            Ejemplo Ecuador: 5939XXXXXXXX (sin el símbolo + ni espacios).
          </span>
        </div>

        <div>
          <label style={{ display: 'block', color: '#fff', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
            MENSAJE PARA CONTRATAR MÓDULO DE CARTELERA / EVENTOS
          </label>
          <textarea
            rows="2"
            value={form.cartelera_contact_message}
            onChange={e => setForm({ ...form, cartelera_contact_message: e.target.value })}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
              resize: 'vertical'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', color: '#fff', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
            MENSAJE PARA CONTRATAR MÓDULO DE LOGÍSTICA / CAMPAÑAS
          </label>
          <textarea
            rows="2"
            value={form.logistics_contact_message}
            onChange={e => setForm({ ...form, logistics_contact_message: e.target.value })}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Vista previa y prueba en vivo */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '10px' }}>
            🧪 Probar enlaces directos a WhatsApp
          </span>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href={testUrlCartelera}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'rgba(37,211,102,0.15)',
                border: '1px solid rgba(37,211,102,0.3)',
                color: '#25D366',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Probar Mensaje Cartelera <ExternalLink size={14} />
            </a>
            <a
              href={testUrlLogistics}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'rgba(37,211,102,0.15)',
                border: '1px solid rgba(37,211,102,0.3)',
                color: '#25D366',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Probar Mensaje Logística <ExternalLink size={14} />
            </a>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', fontSize: '1rem', fontWeight: 700 }}
        >
          <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </form>
    </div>
  );
}
