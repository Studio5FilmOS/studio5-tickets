import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import QRCode from 'qrcode';

const PrintStickers = () => {
  const { tenant, campaignId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const fetchDataAndGenerateQRs = async () => {
      try {
        // 1. Cargar detalles de la campaña
        const campRes = await api.get(`/logistics/campaigns/${campaignId}`);
        if (campRes.data?.status === 'OK') {
          setCampaign(campRes.data.data);
        }

        // 2. Cargar items reales de la campaña
        const itemsRes = await api.get(`/logistics/campaigns/${campaignId}/items?limit=10000`);
        const rawItems = itemsRes.data?.data || [];

        if (rawItems.length > 0) {
          const baseUrl = window.location.origin;
          const mappedItems = [];
          const total = rawItems.length;

          // 3. Generar códigos QR localmente como DataURL (100% offline, cero fallos de red)
          for (let i = 0; i < total; i++) {
            const it = rawItems[i];
            const targetUrl = `${baseUrl}/${tenant || 'studio5'}/logistica/staff?code=${it.item_code}&cid=${campaignId}`;
            
            const qrDataUrl = await QRCode.toDataURL(targetUrl, {
              errorCorrectionLevel: 'M',
              margin: 1,
              width: 180,
              color: {
                dark: '#000000',
                light: '#ffffff'
              }
            });

            mappedItems.push({
              code: it.item_code,
              qrDataUrl
            });

            if (i % 25 === 0 || i === total - 1) {
              setProgress(Math.round(((i + 1) / total) * 100));
            }
          }

          setItems(mappedItems);
        }
      } catch (err) {
        console.error('Error preparando stickers:', err);
      } finally {
        setLoading(false);
        setIsPrinting(true);

        // Pequeña pausa para asegurar que el DOM pintó todas las imágenes base64
        setTimeout(() => {
          setIsPrinting(false);
          window.print();
        }, 500);
      }
    };

    fetchDataAndGenerateQRs();
  }, [campaignId, tenant]);

  if (loading) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: '#111827', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', color: '#fff'
      }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Generando QRs de Alta Resolución...</h2>
        <div style={{ width: '320px', height: '16px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#DEB841', transition: 'width 0.2s ease-in-out' }} />
        </div>
        <p style={{ marginTop: '12px', color: '#9ca3af', fontSize: '0.9rem' }}>{progress}% procesado. Por favor espera...</p>
      </div>
    );
  }

  return (
    <div className="print-container">
      {/* Estilos para corte único con guillotina (zero gap) y formato A4 perfecto */}
      <style>
        {`
          body { background: #fff !important; color: #000 !important; margin: 0; padding: 0; }
          .desktop-sidebar, .mobile-nav, .mobile-header, .whitelabel-footer { display: none !important; }
          .app-main-content { margin: 0 !important; padding: 0 !important; width: 100% !important; }

          /* Hoja A4 con 10 stickers (2 columnas x 5 filas) pegados borde con borde */
          .sheet {
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            padding: 6mm 5mm; /* Margen externo mínimo para que la impresora no corte las orillas */
            box-sizing: border-box;
            background: #fff;
            display: grid;
            grid-template-columns: 100mm 100mm; /* 2 columnas exactas */
            grid-template-rows: repeat(5, 57mm); /* 5 filas exactas */
            gap: 0; /* CERO separación para hacer un solo corte de guillotina */
            page-break-after: always;
            border-top: 1px dashed #999;
            border-left: 1px dashed #999;
          }

          /* Sticker individual pegado con línea compartida */
          .sticker {
            width: 100mm;
            height: 57mm;
            box-sizing: border-box;
            border-right: 1px dashed #999;
            border-bottom: 1px dashed #999;
            display: flex;
            align-items: center;
            padding: 4mm 5mm;
            background: #fff;
            page-break-inside: avoid;
          }

          .sticker-qr {
            width: 36mm;
            height: 36mm;
            flex-shrink: 0;
            display: block;
          }

          .sticker-info {
            flex: 1;
            padding-left: 4mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
          }

          .sticker-title {
            font-size: 11px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-weight: 900;
            color: #000;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            line-height: 1.2;
            word-break: break-word;
          }

          .sticker-subtitle {
            font-size: 9px;
            font-family: sans-serif;
            color: #444;
            margin-top: 3px;
            text-transform: uppercase;
          }

          .sticker-code {
            font-size: 28px;
            font-family: monospace;
            font-weight: 900;
            color: #000;
            margin-top: 4px;
            letter-spacing: 1.5px;
          }

          @media print {
            @page { 
              size: A4 portrait; 
              margin: 0; 
            }
            body, html { 
              width: 210mm; 
              height: 297mm; 
              background: #fff; 
              margin: 0; 
              padding: 0; 
            }
            .no-print { display: none !important; }
            .sheet {
              box-shadow: none;
              page-break-after: always;
            }
          }
        `}
      </style>

      {/* Botones de acción (No se imprimen) */}
      <div className="no-print" style={{
        position: 'fixed', bottom: 20, right: 20, display: 'flex', gap: '10px',
        zIndex: 999, background: 'rgba(0,0,0,0.85)', padding: '10px 14px', borderRadius: '12px'
      }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ padding: '10px 18px', background: '#374151', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          Volver al Panel
        </button>
        <button 
          onClick={() => window.print()} 
          style={{ padding: '10px 20px', background: '#DEB841', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 800 }}
        >
          🖨️ Re-Imprimir Ahora
        </button>
      </div>

      {/* División en Hojas A4 (10 stickers exactos por hoja) */}
      {Array.from({ length: Math.ceil(items.length / 10) }).map((_, pageIndex) => {
        const pageItems = items.slice(pageIndex * 10, (pageIndex + 1) * 10);
        return (
          <div key={pageIndex} className="sheet">
            {pageItems.map(item => (
              <div key={item.code} className="sticker">
                {/* Código QR Generado Localmente (Incrustado en Base64) */}
                <img 
                  src={item.qrDataUrl} 
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
