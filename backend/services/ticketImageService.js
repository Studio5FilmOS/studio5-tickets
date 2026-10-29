const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const QRCode = require('qrcode');
const sharp = require('sharp');

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
}

async function fetchRemoteBuffer(url) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      client.get(url, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return resolve(null);
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', () => resolve(null));
    } catch (_) {
      resolve(null);
    }
  });
}

/**
 * Obtiene el buffer del banner de forma ultra-rápida (disco local o remoto)
 */
async function getBannerBuffer(bannerUrl) {
  if (!bannerUrl) return null;

  try {
    // Si es ruta relativa dentro de uploads
    if (bannerUrl.startsWith('/uploads/') || bannerUrl.startsWith('uploads/')) {
      const cleanPath = bannerUrl.replace(/^\//, '');
      const localPath = path.join(__dirname, '..', 'public', cleanPath);
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
    }

    // Si es URL remota
    if (bannerUrl.startsWith('http://') || bannerUrl.startsWith('https://')) {
      return await fetchRemoteBuffer(bannerUrl);
    }

    // Probar en public directamente
    const fallbackPath = path.join(__dirname, '..', 'public', bannerUrl);
    if (fs.existsSync(fallbackPath)) {
      return fs.readFileSync(fallbackPath);
    }
  } catch (err) {
    console.warn('⚠️ No se pudo cargar el banner del ticket:', err.message);
  }

  return null;
}

/**
 * Renderiza el boleto gráfico idéntico a BoletoView.jsx en resolución retina 640x920
 */
async function generateTicketImage({
  ticket_code,
  customer_name,
  event_title,
  event_venue,
  schedule_time,
  ticket_type,
  seat_label,
  banner_url,
  operation_type
}) {
  const safeCode = ticket_code || ('TK-' + Date.now().toString(36).toUpperCase());
  const safeName = (customer_name || 'Espectador').trim();
  const safeTitle = event_title || 'Evento Studio 5';
  const safeVenue = event_venue || 'Teatro';

  // 1. Generar QR Code local en base64 (240x240 sin márgenes excesivos)
  const qrDataUrl = await QRCode.toDataURL(safeCode, {
    width: 240,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' }
  });

  // 2. Obtener Banner
  const bannerBuffer = await getBannerBuffer(banner_url);
  let bannerBase64 = '';
  if (bannerBuffer) {
    bannerBase64 = `data:image/jpeg;base64,${bannerBuffer.toString('base64')}`;
  }

  // 3. Formatear Fecha (Español Ecuador)
  let dateFormatted = '';
  try {
    const d = new Date(schedule_time);
    if (!isNaN(d.getTime())) {
      dateFormatted = d.toLocaleDateString('es-EC', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } else {
      dateFormatted = String(schedule_time || '');
    }
  } catch (_) {
    dateFormatted = String(schedule_time || '');
  }

  // 4. Formatear etiqueta de entrada
  const seatText = seat_label ? ` [Butaca: ${seat_label}]` : '';
  const badgeText = `Entrada ${ticket_type || 'General'}${seatText}`;
  const badgeWidth = Math.min(560, Math.max(260, badgeText.length * 13 + 30));
  const badgeX = Math.round((640 - badgeWidth) / 2);

  // 5. SVG idéntico al DOM de BoletoView.jsx (640x920)
  const svg = `
  <svg width="640" height="920" viewBox="0 0 640 920" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="banner-clip">
        <rect x="0" y="0" width="640" height="360" />
      </clipPath>
    </defs>

    <!-- Fondo de tarjeta blanco con borde suave -->
    <rect width="640" height="920" fill="#ffffff" stroke="#dddddd" stroke-width="2" />

    <!-- Sección Superior: Banner de la obra -->
    ${bannerBase64 
      ? `<image href="${bannerBase64}" x="0" y="0" width="640" height="360" preserveAspectRatio="xMidYMid slice" clip-path="url(#banner-clip)" />` 
      : `<rect x="0" y="0" width="640" height="360" fill="#181824" clip-path="url(#banner-clip)" />`
    }

    <!-- Píldora translúcida sobre el banner con título y sala -->
    <rect x="20" y="270" width="600" height="74" rx="12" fill="rgba(0,0,0,0.68)" />
    <text x="36" y="306" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="24" font-weight="bold">${escapeXml(safeTitle)}</text>
    <text x="36" y="331" fill="#dddddd" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="17">📍 ${escapeXml(safeVenue)}</text>

    <!-- Badge Cortesía si aplica -->
    ${operation_type === 'Cortesia' ? `
      <rect x="20" y="20" width="130" height="34" rx="8" fill="#e50914" />
      <text x="85" y="43" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="16" font-weight="900" letter-spacing="1">CORTESÍA</text>
    ` : ''}

    <!-- Línea punteada perforada con muescas circulares negras -->
    <circle cx="0" cy="370" r="16" fill="#111111" />
    <circle cx="640" cy="370" r="16" fill="#111111" />
    <line x1="22" y1="370" x2="618" y2="370" stroke="#dddddd" stroke-width="4" stroke-dasharray="10,10" />

    <!-- Sección Inferior: Espectador -->
    <text x="320" y="420" text-anchor="middle" fill="#888888" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="18" font-weight="600" letter-spacing="2">ESPECTADOR</text>
    <text x="320" y="458" text-anchor="middle" fill="#111111" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="26" font-weight="900">${escapeXml(safeName).toUpperCase()}</text>

    <!-- Código QR e Identificador de Boleto -->
    <image href="${qrDataUrl}" x="200" y="485" width="240" height="240" />
    <text x="320" y="755" text-anchor="middle" fill="#555555" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="17" font-weight="bold" letter-spacing="1">${escapeXml(safeCode)}</text>

    <!-- Fecha y Hora -->
    <text x="320" y="805" text-anchor="middle" fill="#555555" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="bold">${escapeXml(dateFormatted)}</text>

    <!-- Píldora de Entrada y Butaca -->
    <rect x="${badgeX}" y="835" width="${badgeWidth}" height="44" rx="10" fill="#ffebeb" />
    <text x="320" y="863" text-anchor="middle" fill="#d32f2f" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="18" font-weight="900">${escapeXml(badgeText)}</text>
  </svg>
  `;

  // 6. Renderizar con Sharp a JPG de alta calidad
  const jpgBuffer = await sharp(Buffer.from(svg))
    .jpeg({ quality: 95 })
    .toBuffer();

  // 7. Guardar en public/tickets/
  const ticketsDir = path.join(__dirname, '..', 'public', 'tickets');
  if (!fs.existsSync(ticketsDir)) {
    fs.mkdirSync(ticketsDir, { recursive: true });
  }

  const fileName = `ticket_${safeCode}.jpg`;
  const filePath = path.join(ticketsDir, fileName);
  fs.writeFileSync(filePath, jpgBuffer);

  const frontendUrl = (process.env.FRONTEND_URL || 'https://ticket.studio5film.com').replace(/\/$/, '');
  const publicUrl = `${frontendUrl}/tickets/${fileName}`;

  return {
    ticket_code: safeCode,
    filePath,
    publicUrl,
    buffer: jpgBuffer
  };
}

module.exports = {
  generateTicketImage
};
