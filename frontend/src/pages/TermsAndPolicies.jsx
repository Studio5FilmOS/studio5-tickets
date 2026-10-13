import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, ArrowLeft, DollarSign, Lock, CheckCircle, 
  Scale, Box, Tv, Sparkles, Database, Users, HelpCircle 
} from 'lucide-react';

const TermsAndPolicies = () => {
  return (
    <div className="fade-in" style={{ maxWidth: '860px', margin: '0 auto', paddingBottom: '60px' }}>
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

      {/* Header General */}
      <div className="glass-card" style={{ padding: '32px 24px', textAlign: 'center', marginBottom: '30px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(222,184,65,0.15)', border: '1px solid rgba(222,184,65,0.3)',
          padding: '6px 16px', borderRadius: '20px', fontSize: '0.75rem',
          fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '14px'
        }}>
          <Scale size={14} /> MARCO LEGAL Y CONDICIONES GENERALES
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#fff', margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>
          Términos, Condiciones y Políticas de la Plataforma
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '650px', margin: '0 auto', lineHeight: '1.6' }}>
          Studio 5 · Ticket Pro · Suite Integral de Emisión de Boletos, Control de Portería, Logística de Campañas y Marca Personalizada
        </p>
      </div>

      {/* Contenido de Términos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        
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
              <strong>Billetera Digital y Acceso Móvil:</strong> Los usuarios disponen de la sección <em>"Mis Tickets"</em> para visualizar y presentar sus boletos en tiempo real desde cualquier dispositivo móvil sin necesidad de impresión física.
            </li>
            <li>
              <strong>Seguridad en Pagos Electrónicos:</strong> Las transacciones con tarjeta de crédito/débito son procesadas con cifrado bancario bajo el protocolo PCI-DSS a través de la pasarela autorizada Payphone.
            </li>
            <li>
              <strong>Pagos por Transferencia Bancaria:</strong> Los pedidos pagados vía transferencia permanecen en estado <em>Pendiente</em> hasta que el organizador o el staff verifique el comprobante de depósito.
            </li>
            <li>
              <strong>Políticas de Reembolso y Devolución:</strong> Las solicitudes de reembolso, cancelación o reprogramación son gestionadas exclusivamente por la productora u organizador responsable de cada evento.
            </li>
          </ul>
        </div>

        {/* Sección 2: Productores y Venta de Entradas */}
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(222,184,65,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} color="var(--accent)" />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              2. Términos de Servicio para Organizadores y Productores
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', color: '#d1d5db', fontSize: '0.85rem', lineHeight: '1.7' }}>
            <p style={{ margin: 0 }}>
              Studio 5 provee el software para publicación, gestión de aforos, pasarela integrada, asignación de butacas y control de taquilla bajo las siguientes cláusulas comerciales:
            </p>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h4 style={{ color: 'var(--accent)', fontSize: '0.9rem', margin: '0 0 6px 0', fontWeight: 700 }}>
                💵 Comisión de Plataforma y Cupo de Cortesías VIP
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem' }}>
                La plataforma aplica una comisión fija de <strong>$0.50 USD por cada boleto emitido</strong> a través del sistema del organizador.
              </p>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '0.82rem' }}>
                <li><strong>Cortesías VIP Gratuitas:</strong> Cada función incluye un cupo de hasta <strong>4 cortesías libres de comisión ($0.00)</strong> para invitados de la productora.</li>
                <li><strong>Cortesías Adicionales:</strong> A partir de la 5ª entrada de cortesía emitida en una misma función, se factura la comisión estándar de <strong>$0.50 USD</strong>.</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h4 style={{ color: 'var(--accent)', fontSize: '0.9rem', margin: '0 0 6px 0', fontWeight: 700 }}>
                💳 Tarjeta de Garantía y Liquidación por Lotes
              </h4>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '0.82rem' }}>
                <li>Para publicar eventos, el organizador debe registrar una tarjeta de crédito o débito de garantía.</li>
                <li>Las comisiones acumuladas se liquidan automáticamente a la tarjeta vinculada al alcanzar el umbral de <strong>$50.00 USD</strong> o al corte mensual del período.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sección 3: Módulo de Logística de Campañas y Canastas (NUEVO) */}
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box size={20} color="#10b981" />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              3. Módulo de Logística de Campañas, Canastas y Entregas
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#d1d5db', fontSize: '0.85rem', lineHeight: '1.7' }}>
            <p style={{ margin: 0 }}>
              El módulo logístico permite a las organizaciones gestionar la distribución, despacho y canje de productos, víveres o kits bajo estrictas normas de control:
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>
                <strong>Códigos Secuenciales y Trazabilidad:</strong> Cada producto o ticket de canje cuenta con un identificador único con código de barras y código QR generado por el sistema.
              </li>
              <li>
                <strong>Asignación Estricta por Lotes de Staff:</strong> Para evitar sobreventas, cruces y fraudes, cada operador de staff tiene asignado un rango de códigos específico (por ejemplo, del código 1 al 50). La plataforma <strong>bloquea automáticamente</strong> cualquier intento de escanear o registrar códigos fuera del lote asignado al operador.
              </li>
              <li>
                <strong>Registro de Entregas Parciales y Totales:</strong> Cuando un ticket ampara múltiples artículos (por ejemplo, 5 canastas), el sistema permite validar entregas parciales (ej. 2 de 5), guardando el historial con operador responsable, beneficiario, teléfono y fecha, reflejándose inmediatamente en los contadores y metas.
              </li>
              <li>
                <strong>Auditoría y Exportación de Datos:</strong> Toda la información registrada en una campaña puede ser exportada en formato Excel/CSV estructurado con marcas de tiempo para auditorías internas o liquidaciones.
              </li>
            </ul>
          </div>
        </div>

        {/* Sección 4: Pantalla en Vivo de Metas y Proyección (NUEVO) */}
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tv size={20} color="#3b82f6" />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              4. Pantallas en Vivo de Metas y Proyección en Escenario
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#d1d5db', fontSize: '0.85rem', lineHeight: '1.7' }}>
            <p style={{ margin: 0 }}>
              Las pantallas de metas proyectan animaciones interactivas en tiempo real adaptadas para pantallas LED, televisores y proyectores:
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>
                <strong>Enlace Público Autónomo:</strong> La animación en vivo cuenta con una URL pública que no requiere inicio de sesión, permitiendo a operadores técnicos proyectar la pantalla en monitores sin exponer credenciales ni paneles de administración.
              </li>
              <li>
                <strong>Diseño Limpio para Proyección:</strong> La vista de pantalla completa elimina barras de navegación, menús y cabeceras distractores, ofreciendo únicamente una interfaz interactiva de 100vw x 100vh con botón discreto de retorno al panel.
              </li>
              <li>
                <strong>Temas Visuales Integrados:</strong> La animación respeta estrictamente el tema preconfigurado en la campaña (Estrellas de Belén, Jardín de Rosas florecientes o Barra de métricas en vivo).
              </li>
            </ul>
          </div>
        </div>

        {/* Sección 5: Personalización de Marca Blanca e Identidad Visual */}
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} color="#8b5cf6" />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              5. Personalización de Marca, Identidad Visual y Fondo
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#d1d5db', fontSize: '0.85rem', lineHeight: '1.7' }}>
            <p style={{ margin: 0 }}>
              Los organizadores pueden adaptar la apariencia del portal para sus usuarios y clientes:
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>
                <strong>Subdominio y Enlace Directo:</strong> Los organizadores pueden establecer su identificador personalizado (slug en URL) para compartir una cartelera con su identidad de marca.
              </li>
              <li>
                <strong>Compresión y Carga de Logotipos:</strong> La plataforma incorpora compresión inteligente del lado del cliente para optimizar el peso y las dimensiones de los archivos de imagen, asegurando una carga ultrarrápida en dispositivos móviles.
              </li>
              <li>
                <strong>Paleta de Colores y Fondo Global:</strong> Permite personalizar los colores de acento, gradientes de botones y el tono de fondo total de la aplicación para una experiencia inmersiva acorde a la identidad del organizador.
              </li>
            </ul>
          </div>
        </div>

        {/* Sección 6: Personal de Staff y Aislamiento Multi-tenant */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,102,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={20} color="#0066FF" />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              6. Control de Acceso, Staff y Jerarquía Multi-tenant
            </h2>
          </div>

          <p style={{ color: '#d1d5db', fontSize: '0.85rem', lineHeight: '1.7', margin: 0 }}>
            El personal de staff creado por un organizador opera bajo un estricto aislamiento por cuenta (Multi-tenant). Los operadores de staff solo tienen acceso a escanear y consultar los eventos y campañas de la organización que los creó. No tienen permisos para modificar precios, alterar aforos ni acceder a los datos financieros de la plataforma o de otros organizadores.
          </p>
        </div>

        {/* Sección 7: Módulo Add-On "Experiencias en Vivo / Momento Wow" */}
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #f1a51c' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(241,165,28,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={20} color="#f1a51c" />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              7. Módulo Add-On "Experiencia en Vivo & Momento Wow"
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#d1d5db', fontSize: '0.85rem', lineHeight: '1.7' }}>
            <p style={{ margin: 0 }}>
              Las productoras pueden contratar la suite de interactividad en tiempo real bajo los siguientes lineamientos:
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>
                <strong>Modalidad y Tarifa:</strong> Se adquiere mediante <strong>Pago Único de $29.00 USD por Temporada / Producción</strong> mediante pasarela Payphone.
              </li>
              <li>
                <strong>Definición y Duración de la Temporada:</strong> Una temporada comprende todas las funciones programadas de una misma producción desde la primera función hasta un plazo máximo continuo de 60 días calendario.
              </li>
              <li>
                <strong>Alcance del Servicio:</strong> Incluye encuestas y votaciones del público en vivo ilimitadas, pistas interactivas desbloqueables y generación de códigos QR de sala en alta resolución sin costo adicional por espectador conectado.
              </li>
            </ul>
          </div>
        </div>

        {/* Sección 8: Deslinde de Responsabilidad Legal */}
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scale size={20} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              8. Deslinde de Responsabilidad Técnica e Infraestructura
            </h2>
          </div>

          <p style={{ color: '#d1d5db', fontSize: '0.85rem', lineHeight: '1.7', margin: 0 }}>
            Studio 5 opera estrictamente como proveedor tecnológico de infraestructura y software. La realización física de los espectáculos, el cumplimiento de los aforos permitidos, los permisos municipales o gubernamentales, la seguridad dentro del recinto, la calidad de los productos entregados en campañas y cualquier reprogramación son responsabilidad civil, administrativa y legal exclusiva de la productora u organización contratante.
          </p>
        </div>

      </div>

      {/* Footer info */}
      <div style={{ textAlign: 'center', marginTop: '35px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
        © {new Date().getFullYear()} Studio 5 · Ticket Pro · Todos los derechos reservados.
      </div>
    </div>
  );
};

export default TermsAndPolicies;
