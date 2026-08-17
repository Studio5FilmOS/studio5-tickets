import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, X, Ticket, ShieldCheck, Layers, QrCode, 
  ArrowRight, UserCheck, CheckCircle2, Zap, Palette 
} from 'lucide-react';

const VersionModal = ({ forceOpen, onCloseCustom }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const STORAGE_KEY = 'studio5_v2_titanium_announcement_seen';

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      // Pequeño delay de 600ms para entrada suave tras cargar la cartelera
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [forceOpen]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
    if (onCloseCustom) onCloseCustom();
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 6, 10, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.3s ease-out'
      }}
      onClick={handleClose}
    >
      <div 
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'linear-gradient(145deg, rgba(26, 28, 38, 0.95), rgba(13, 14, 20, 0.98))',
          border: '1px solid rgba(222, 184, 65, 0.35)',
          borderRadius: '24px',
          padding: '28px 24px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(222, 184, 65, 0.15)',
          color: '#ffffff',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón Cerrar */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a1a1aa',
            cursor: 'pointer',
            transition: 'all 0.2s',
            zIndex: 10
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
        >
          <X size={18} />
        </button>

        {/* Encabezado del Anuncio */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, rgba(222,184,65,0.2), rgba(176,141,43,0.1))',
            border: '1px solid rgba(222,184,65,0.4)',
            padding: '5px 14px',
            borderRadius: '20px',
            fontSize: '0.72rem',
            fontWeight: 800,
            color: 'var(--accent)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '12px'
          }}>
            <Sparkles size={13} color="var(--accent)" /> STUDIO 5 TICKETS 2.0 · TITANIUM
          </div>

          <h2 style={{
            fontSize: '1.45rem',
            fontWeight: 900,
            margin: '0 0 6px 0',
            letterSpacing: '-0.5px',
            background: 'linear-gradient(135deg, #ffffff, #e4e4e7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            ¡Bienvenido a la Nueva Era de Boletaje!
          </h2>

          <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: 0, lineHeight: '1.4' }}>
            Descubre las nuevas características diseñadas para elevar tu experiencia.
          </p>
        </div>

        {/* Cuadrícula de Nuevas Implementaciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            padding: '12px',
            borderRadius: '14px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(222, 184, 65, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Layers size={18} color="var(--accent)" />
            </div>
            <div>
              <strong style={{ fontSize: '0.85rem', color: '#fff', display: 'block', marginBottom: '2px' }}>
                Zonas & Localidades Múltiples
              </strong>
              <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0, lineHeight: '1.3' }}>
                Elige entre VIP, General, Preferencia con butacas seleccionables y tarifas en tiempo real.
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            padding: '12px',
            borderRadius: '14px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(52, 199, 89, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={18} color="#34c759" />
            </div>
            <div>
              <strong style={{ fontSize: '0.85rem', color: '#fff', display: 'block', marginBottom: '2px' }}>
                Seguridad OTP y Verificación de Cuenta
              </strong>
              <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0, lineHeight: '1.3' }}>
                Protección con código de 6 dígitos enviado directamente a tu correo electrónico.
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            padding: '12px',
            borderRadius: '14px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(0, 102, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <QrCode size={18} color="#0066FF" />
            </div>
            <div>
              <strong style={{ fontSize: '0.85rem', color: '#fff', display: 'block', marginBottom: '2px' }}>
                Billetera Digital "Mis Tickets"
              </strong>
              <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0, lineHeight: '1.3' }}>
                Tus boletos QR siempre a mano desde el celular, listos para ingresar a la sala y con descarga en JPG.
              </p>
            </div>
          </div>
        </div>

        {/* Sección de Llamado a la Acción (CTA) */}
        {!isAuthenticated ? (
          <div style={{
            background: 'linear-gradient(135deg, rgba(222,184,65,0.12), rgba(0,0,0,0.4))',
            border: '1.5px dashed rgba(222,184,65,0.35)',
            borderRadius: '16px',
            padding: '16px',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            <h4 style={{ color: 'var(--accent)', fontSize: '0.92rem', fontWeight: 800, margin: '0 0 4px 0' }}>
              💡 ¿Aún no tienes cuenta?
            </h4>
            <p style={{ color: '#d1d5db', fontSize: '0.78rem', margin: '0 0 14px 0', lineHeight: '1.4' }}>
              Regístrate gratis para guardar tus entradas, ver tus códigos QR al instante y recibir promociones exclusivas.
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { handleClose(); navigate('/registro'); }}
                className="btn-primary"
                style={{ flex: 1.2, padding: '10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Ticket size={15} /> Crear Cuenta Gratis
              </button>
              <button
                onClick={() => { handleClose(); navigate('/login'); }}
                className="btn-outline"
                style={{ flex: 0.9, padding: '10px', fontSize: '0.8rem' }}
              >
                Iniciar Sesión
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'rgba(52, 199, 89, 0.08)',
            border: '1px solid rgba(52, 199, 89, 0.25)',
            borderRadius: '16px',
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <span style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 'bold', display: 'block' }}>
                👋 ¡Hola, {user?.name}!
              </span>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                Tu cuenta está activa y lista para usar la versión 2.0.
              </span>
            </div>
            <button
              onClick={() => { handleClose(); navigate('/mis-tickets'); }}
              className="btn-primary"
              style={{ width: 'auto', padding: '8px 14px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Ticket size={14} /> Mis Tickets
            </button>
          </div>
        )}

        {/* Botón de Cierre / Explorar */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: '0.78rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '6px 12px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
          >
            Continuar a la Cartelera de Obras →
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionModal;
