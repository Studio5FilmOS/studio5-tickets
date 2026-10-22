import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, X, Ticket, QrCode, Zap, ArrowRight, UserCheck
} from 'lucide-react';

const VersionModal = ({ forceOpen, onCloseCustom }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const STORAGE_KEY = 'studio5_v2_welcome_announcement_seen';

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [forceOpen]);

  // Bloquea el scroll del body en móviles mientras el modal esté visible
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
    if (onCloseCustom) onCloseCustom();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="version-modal-backdrop"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="version-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón Cerrar */}
        <button
          onClick={handleClose}
          aria-label="Cerrar ventana"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a1a1aa',
            cursor: 'pointer',
            transition: 'all 0.2s',
            zIndex: 10
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
        >
          <X size={17} />
        </button>

        {/* Encabezado: Bienvenida, Nombre de App y Versión */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, rgba(222,184,65,0.22), rgba(176,141,43,0.08))',
            border: '1px solid rgba(222,184,65,0.4)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.7rem',
            fontWeight: 800,
            color: 'var(--accent)',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            marginBottom: '10px'
          }}>
            <Sparkles size={12} color="var(--accent)" /> STUDIO 5 TICKETS · v2.1
          </div>

          <h2 style={{
            fontSize: '1.35rem',
            fontWeight: 900,
            margin: '0 0 6px 0',
            letterSpacing: '-0.3px',
            background: 'linear-gradient(135deg, #ffffff 40%, #DEB841 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            ¡Bienvenido a Studio 5 Tickets!
          </h2>

          <p style={{ color: '#d1d5db', fontSize: '0.82rem', margin: '0 auto', lineHeight: '1.4', maxWidth: '400px' }}>
            La boletería digital oficial de <strong>Studio 5 Film & Art</strong> para descubrir cartelera, reservar tus asientos y disfrutar las mejores obras y eventos.
          </p>
        </div>

        {/* Funciones Principales (Brevidad y claridad sin saturar) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(222, 184, 65, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Ticket size={18} color="var(--accent)" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <strong style={{ fontSize: '0.82rem', color: '#fff', display: 'block', marginBottom: '1px' }}>
                Cartelera & Obras en Vivo
              </strong>
              <p style={{ color: '#9ca3af', fontSize: '0.72rem', margin: 0, lineHeight: '1.25' }}>
                Funciones, fechas, butacas por zonas y promociones actualizadas al instante.
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0, 102, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <QrCode size={18} color="#3b82f6" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <strong style={{ fontSize: '0.82rem', color: '#fff', display: 'block', marginBottom: '1px' }}>
                Tus Boletos QR en el Celular
              </strong>
              <p style={{ color: '#9ca3af', fontSize: '0.72rem', margin: 0, lineHeight: '1.25' }}>
                Entradas 100% digitales en tu billetera "Mis Tickets", sin necesidad de imprimir.
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(52, 199, 89, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={18} color="#34c759" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <strong style={{ fontSize: '0.82rem', color: '#fff', display: 'block', marginBottom: '1px' }}>
                Acceso Rápido & Seguro
              </strong>
              <p style={{ color: '#9ca3af', fontSize: '0.72rem', margin: 0, lineHeight: '1.25' }}>
                Ingreso ágil en puerta con validación instantánea y comprobante de compra.
              </p>
            </div>
          </div>
        </div>

        {/* Sección de Acción (CTA) */}
        {!isAuthenticated ? (
          <div style={{
            background: 'rgba(222, 184, 65, 0.06)',
            border: '1px solid rgba(222, 184, 65, 0.22)',
            borderRadius: '14px',
            padding: '12px 14px',
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            <p style={{ color: '#e5e7eb', fontSize: '0.76rem', margin: '0 0 10px 0', lineHeight: '1.3' }}>
              💡 Crea tu cuenta gratis para tener tus boletos guardados y disfrutar una compra rápida:
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { handleClose(); navigate('/registro'); }}
                className="btn-primary"
                style={{ flex: 1.2, padding: '9px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Ticket size={14} /> Registrarme Gratis
              </button>
              <button
                onClick={() => { handleClose(); navigate('/login'); }}
                className="btn-outline"
                style={{ flex: 0.9, padding: '9px 12px', fontSize: '0.78rem' }}
              >
                Iniciar Sesión
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'rgba(52, 199, 89, 0.08)',
            border: '1px solid rgba(52, 199, 89, 0.25)',
            borderRadius: '14px',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} color="#34c759" />
              <div>
                <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold', display: 'block' }}>
                  ¡Hola, {user?.name || 'Cliente'}!
                </span>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                  Sesión activa y lista para usar.
                </span>
              </div>
            </div>
            <button
              onClick={() => { handleClose(); navigate('/mis-tickets'); }}
              className="btn-primary"
              style={{ width: 'auto', padding: '7px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Ticket size={13} /> Mis Tickets
            </button>
          </div>
        )}

        {/* Botón Sutil para Explorar la Cartelera */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: '0.76rem',
              cursor: 'pointer',
              padding: '6px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
          >
            <span>Explorar Cartelera de Obras</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default VersionModal;
