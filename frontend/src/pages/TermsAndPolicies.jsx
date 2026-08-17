import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, ArrowLeft, DollarSign, Lock, AlertCircle, CheckCircle, Scale } from 'lucide-react';

const TermsAndPolicies = () => {
  return (
    <div className="fade-in" style={{ maxWidth: '840px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Botón Volver */}
      <Link 
        to="/" 
        style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '8px', 
          color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem',
          marginBottom: '20px', transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <ArrowLeft size={16} /> Volver a la Cartelera
      </Link>

      {/* Header */}
      <div className="glass-card" style={{ padding: '30px 24px', textAlign: 'center', marginBottom: '30px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(222,184,65,0.15)', border: '1px solid rgba(222,184,65,0.3)',
          padding: '6px 16px', borderRadius: '20px', fontSize: '0.75rem',
          fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '14px'
        }}>
          <Scale size={14} /> MARCO LEGAL Y POLÍTICAS OPERATIVAS
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>
          Términos, Condiciones y Políticas de Marca Blanca
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '600px', margin: '0 auto' }}>
          Studio 5 Tickets Pro v2.0 · Plataforma Integral de Emisión, Control de Acceso y Marca Blanca
        </p>
      </div>

      {/* Contenido de Términos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Sección 1: Espectadores y Compradores */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(52,199,89,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} color="#34c759" />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              1. Políticas para Espectadores y Compradores de Boletos
            </h2>
          </div>

          <ul style={{ color: '#d1d5db', fontSize: '0.85rem', lineHeight: '1.7', paddingLeft: '20px', margin: 0 }}>
            <li>
              <strong>Validez del Boleto Digital:</strong> Cada entrada adquirida contiene un código QR criptográfico único e intransferible. Una vez escaneado y validado en la puerta del evento, queda automáticamente invalidado para nuevos ingresos.
            </li>
            <li>
              <strong>Billetera Digital y Acceso:</strong> Los usuarios registrados disponen de la sección <em>"Mis Tickets"</em> para acceder a sus códigos QR en cualquier momento desde su teléfono inteligente, sin necesidad de impresión física.
            </li>
            <li>
              <strong>Pagos y Seguridad:</strong> Las transacciones con tarjeta de crédito/débito son procesadas bajo los más altos estándares de seguridad y cifrado bancario a través de la pasarela certificada Payphone.
            </li>
            <li>
              <strong>Transferencias Bancarias:</strong> Las órdenes pagadas vía transferencia directa quedan en estado <em>Pendiente</em> hasta que el organizador o el staff verifique el comprobante de depósito.
            </li>
            <li>
              <strong>Políticas de Reembolso:</strong> La devolución del importe de las entradas es gestionada exclusivamente por la productora u organizador responsable de cada evento específico.
            </li>
          </ul>
        </div>

        {/* Sección 2: Productores y Servicio de Marca Blanca */}
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(222,184,65,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} color="var(--accent)" />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              2. Términos del Servicio de Marca Blanca para Organizadores
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', color: '#d1d5db', fontSize: '0.85rem', lineHeight: '1.7' }}>
            <p style={{ margin: 0 }}>
              Studio 5 Tickets Pro provee la infraestructura tecnológica completa (venta online, pasarela, generador de QR, escáner de portería y personalización de marca) bajo las siguientes condiciones comerciales:
            </p>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h4 style={{ color: 'var(--accent)', fontSize: '0.9rem', margin: '0 0 6px 0', fontWeight: 700 }}>
                💵 Tarifa de Comisión por Emisión Tecnológica
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem' }}>
                La plataforma aplica una comisión fija de <strong>$0.50 USD por cada ticket pagado y emitido</strong> a través del sistema del organizador. No existen cobros sobre entradas de cortesía ni órdenes anuladas.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h4 style={{ color: 'var(--accent)', fontSize: '0.9rem', margin: '0 0 6px 0', fontWeight: 700 }}>
                💳 Tarjeta de Garantía y Liquidación por Lotes (Batch Billing)
              </h4>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '0.82rem' }}>
                <li>Para publicar eventos en la plataforma, el organizador debe registrar y tokenizar una tarjeta de crédito o débito válida como garantía.</li>
                <li>Las comisiones acumuladas se liquidan automáticamente a su tarjeta al alcanzar el umbral de <strong>$50.00 USD</strong> o al corte mensual.</li>
                <li>Si un intento de cobro falla, el sistema notificará al organizador otorgando un período de gracia de 24 horas antes de suspender temporalmente la venta pública del evento.</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h4 style={{ color: 'var(--accent)', fontSize: '0.9rem', margin: '0 0 6px 0', fontWeight: 700 }}>
                🛡️ Deslinde de Responsabilidad Legal
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem' }}>
                Studio 5 opera estrictamente como proveedor tecnológico de intermediación de software. La realización del evento, cumplimiento de aforos, permisos municipales, seguridad en sala y reprogramaciones son responsabilidad civil y legal exclusiva de la productora u organizador contratante.
              </p>
            </div>
          </div>
        </div>

        {/* Sección 3: Staff de Portería y Control de Acceso */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,102,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={20} color="#0066FF" />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              3. Seguridad y Control de Portería
            </h2>
          </div>

          <p style={{ color: '#d1d5db', fontSize: '0.85rem', lineHeight: '1.7', margin: 0 }}>
            El personal de staff tiene acceso restringido al panel de escaneo y validación en tiempo real. No tienen permisos para modificar precios, alterar aforos ni acceder a los datos financieros de la plataforma o de las productoras.
          </p>
        </div>

      </div>

      {/* Footer info */}
      <div style={{ textAlign: 'center', marginTop: '30px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        © {new Date().getFullYear()} Studio 5 Tickets Pro · Todos los derechos reservados.
      </div>
    </div>
  );
};

export default TermsAndPolicies;
