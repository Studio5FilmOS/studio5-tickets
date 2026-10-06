import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const PrintStickers = () => {
  const { tenant, campaignId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    // Simulamos la obtención de los códigos de la base de datos (luego se cambiará al fetch real)
    // Supongamos que esta campaña tiene 200 items (para imprimir 20 páginas de 10)
    const mockItems = Array.from({ length: 200 }, (_, i) => {
      const code = String(i + 1).padStart(3, '0');
      return { code, url: `https://studio5.com/${tenant}/i/${code}` }; // La URL que irá dentro del QR
    });
    setItems(mockItems);
    setLoading(false);
    setIsPrinting(true);

    // Animación de la barra de progreso (simulando carga de QRs)
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);
      if (currentProgress >= 100) {
        clearInterval(progressInterval);
        setTimeout(() => {
          setIsPrinting(false); // Ocultar overlay de carga
          window.print();
        }, 300); // Pequeña pausa al llegar a 100% antes de abrir el print
      }
    }, 150); // 1.5 segundos en total aprox
  }, [tenant]);

  if (loading) return <div style={{ padding: '50px', textAlign: 'center', color: '#fff' }}>Preparando datos...</div>;

  return (
    <div className="print-container">
      {/* Estilos específicos para anular la web normal y forzar el layout A4 */}
      <style>
        {`
          /* Ocultar elementos de UI globales (Navegación, Sidebar, etc) solo cuando entramos aquí */
          body { background: #fff !important; color: #000 !important; margin: 0; padding: 0; }
          .desktop-sidebar, .mobile-nav, .mobile-header, .whitelabel-footer { display: none !important; }
          .app-main-content { margin: 0 !important; padding: 0 !important; width: 100% !important; }
          
          /* Estilo del A4 */
          .sheet {
            width: 210mm;
            min-height: 297mm;
            padding: 5mm; /* Margen de seguridad de la impresora */
            margin: 0 auto;
            background: white;
            display: grid;
            grid-template-columns: 1fr 1fr; /* 2 columnas (10cm cada una) */
            grid-auto-rows: 50mm; /* 5cm de alto por sticker */
            gap: 2mm; /* Separación mínima para el corte */
            page-break-after: always; /* Nueva página A4 al llenarse */
          }

          /* El Sticker individual (10x5 cm) */
          .sticker {
            width: 95mm; /* Ligeramente menos de 10cm para acomodar bordes y gap */
            height: 48mm;
            border: 1px dashed #ccc; /* Línea de corte visible pero suave */
            display: flex;
            align-items: center;
            padding: 5mm;
            box-sizing: border-box;
            page-break-inside: avoid;
          }

          .sticker-qr {
            width: 35mm;
            height: 35mm;
            flex-shrink: 0;
          }

          .sticker-info {
            flex: 1;
            padding-left: 5mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .sticker-title {
            font-size: 10px;
            font-family: sans-serif;
            font-weight: bold;
            color: #333;
            text-transform: uppercase;
          }

          .sticker-code {
            font-size: 28px;
            font-family: monospace;
            font-weight: 900;
            color: #000;
            margin-top: 2px;
          }

          /* Reglas específicas para el momento de imprimir */
          @media print {
            @page { size: A4 portrait; margin: 0; }
            body, html { width: 100%; height: 100%; background: #fff; }
            .no-print { display: none !important; }
            .print-container { background: #fff; }
          }
        `}
      </style>

      {/* Overlay de Carga (Bloquea la pantalla mientras se preparan los QRs) */}
      {isPrinting && (
        <div className="no-print" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.85)', zIndex: 10000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(5px)', color: '#fff'
        }}>
          <h2 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>Generando QRs de Alta Calidad...</h2>
          <div style={{ width: '300px', height: '20px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.2s ease-in-out' }} />
          </div>
          <p style={{ marginTop: '15px', color: '#9ca3af' }}>{progress}% Completado. Por favor espera...</p>
        </div>
      )}

      {/* Botón flotante para regresar o re-imprimir (Se oculta al imprimir y durante la carga) */}
      {!isPrinting && (
        <div className="no-print" style={{ position: 'fixed', bottom: 20, right: 20, display: 'flex', gap: '10px' }}>
        <button onClick={() => navigate(-1)} style={{ padding: '10px 20px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Volver al Panel</button>
        <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Re-Imprimir</button>
      </div>
      )}

      {/* División en Hojas A4 (10 stickers por hoja) */}
      {Array.from({ length: Math.ceil(items.length / 10) }).map((_, pageIndex) => {
        const pageItems = items.slice(pageIndex * 10, (pageIndex + 1) * 10);
        return (
          <div key={pageIndex} className="sheet">
            {pageItems.map(item => (
              <div key={item.code} className="sticker">
                {/* Generador de QR gratuito externo para no inflar dependencias locales */}
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(item.url)}`} 
                  alt={`QR ${item.code}`} 
                  className="sticker-qr"
                />
                <div className="sticker-info">
                  <div className="sticker-title">Item de Campaña</div>
                  <div className="sticker-code">{item.code}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default PrintStickers;
