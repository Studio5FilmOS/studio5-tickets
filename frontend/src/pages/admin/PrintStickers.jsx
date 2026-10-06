import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const PrintStickers = () => {
  const { tenant, campaignId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar campaña
        const campRes = await api.get(`/logistics/campaigns/${campaignId}`);
        if (campRes.data?.status === 'OK') {
          setCampaign(campRes.data.data);
        }

        // Cargar artículos reales de la campaña
        const itemsRes = await api.get(`/logistics/campaigns/${campaignId}/items?limit=5000`);
        if (itemsRes.data?.status === 'OK' && itemsRes.data.data.length > 0) {
          const baseUrl = window.location.origin;
          const mappedItems = itemsRes.data.data.map(item => ({
            code: item.item_code,
            url: `${baseUrl}/${tenant || 'studio5'}/logistica/staff?code=${item.item_code}&cid=${campaignId}`
          }));
          setItems(mappedItems);
        }
      } catch (err) {
        console.error('Error cargando stickers:', err);
      } finally {
        setLoading(false);
        setIsPrinting(true);

        let currentProgress = 0;
        const progressInterval = setInterval(() => {
          currentProgress += 15;
          setProgress(Math.min(currentProgress, 100));
          if (currentProgress >= 100) {
            clearInterval(progressInterval);
            setTimeout(() => {
              setIsPrinting(false);
              window.print();
            }, 300);
          }
        }, 150);
      }
    };

    fetchData();
  }, [campaignId, tenant]);

  if (loading) return <div style={{ padding: '50px', textAlign: 'center', color: '#fff' }}>Preparando datos de la campaña...</div>;

  return (
    <div className="print-container">
      {/* Estilos específicos para forzar el layout A4 */}
      <style>
        {`
          body { background: #fff !important; color: #000 !important; margin: 0; padding: 0; }
          .desktop-sidebar, .mobile-nav, .mobile-header, .whitelabel-footer { display: none !important; }
          .app-main-content { margin: 0 !important; padding: 0 !important; width: 100% !important; }
          
          .sheet {
            width: 210mm;
            min-height: 297mm;
            padding: 5mm;
            margin: 0 auto;
            background: white;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-auto-rows: 50mm;
            gap: 2mm;
            page-break-after: always;
          }

          .sticker {
            width: 95mm;
            height: 48mm;
            border: 1px dashed #bbb;
            display: flex;
            align-items: center;
            padding: 4mm;
            box-sizing: border-box;
            page-break-inside: avoid;
            background: #fff;
          }

          .sticker-qr {
            width: 36mm;
            height: 36mm;
            flex-shrink: 0;
          }

          .sticker-info {
            flex: 1;
            padding-left: 4mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .sticker-title {
            font-size: 11px;
            font-family: sans-serif;
            font-weight: 800;
            color: #111;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            line-height: 1.2;
          }

          .sticker-subtitle {
            font-size: 9px;
            font-family: sans-serif;
            color: #555;
            margin-top: 2px;
          }

          .sticker-code {
            font-size: 26px;
            font-family: monospace;
            font-weight: 900;
            color: #000;
            margin-top: 4px;
            letter-spacing: 1px;
          }

          @media print {
            @page { size: A4 portrait; margin: 0; }
            body, html { width: 100%; height: 100%; background: #fff; }
            .no-print { display: none !important; }
            .print-container { background: #fff; }
          }
        `}
      </style>

      {/* Overlay de Carga */}
      {isPrinting && (
        <div className="no-print" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.85)', zIndex: 10000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(5px)', color: '#fff'
        }}>
          <h2 style={{ marginBottom: '20px', fontSize: '1.4rem' }}>Generando Plantilla de Stickers A4...</h2>
          <div style={{ width: '300px', height: '16px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.2s ease-in-out' }} />
          </div>
          <p style={{ marginTop: '12px', color: '#9ca3af', fontSize: '0.85rem' }}>{progress}% Completado. Preparando impresora...</p>
        </div>
      )}

      {/* Botones de control */}
      {!isPrinting && (
        <div className="no-print" style={{ position: 'fixed', bottom: 20, right: 20, display: 'flex', gap: '10px', zIndex: 999 }}>
          <button onClick={() => navigate(-1)} style={{ padding: '10px 18px', background: '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Volver al Panel</button>
          <button onClick={() => window.print()} style={{ padding: '10px 18px', background: '#DEB841', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>🖨️ Re-Imprimir</button>
        </div>
      )}

      {/* División en Hojas A4 (10 stickers por hoja) */}
      {Array.from({ length: Math.ceil(items.length / 10) }).map((_, pageIndex) => {
        const pageItems = items.slice(pageIndex * 10, (pageIndex + 1) * 10);
        return (
          <div key={pageIndex} className="sheet">
            {pageItems.map(item => (
              <div key={item.code} className="sticker">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(item.url)}`} 
                  alt={`QR ${item.code}`} 
                  className="sticker-qr"
                />
                <div className="sticker-info">
                  <div className="sticker-title">{campaign?.name || 'Campaña Logística'}</div>
                  <div className="sticker-subtitle">Ticket de Entrega / Canje</div>
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
