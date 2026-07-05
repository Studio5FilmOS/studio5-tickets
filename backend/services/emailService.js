const nodemailer = require('nodemailer');
require('dotenv').config();

// Configurar transportador de correo
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Función para enviar e-ticket por correo
exports.sendTicketEmail = async ({ email, customerName, orderNum, eventTitle, eventVenue, scheduleTime, ticketCount, ticketDesglose, tickets }) => {
  if (!email || !email.includes('@')) {
    console.log('Correo omitido o inválido:', email);
    return false;
  }

  // Generar URLs de QR y bloques de HTML para cada ticket
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const fromName = process.env.SMTP_FROM_NAME || 'Studio 5 Film & Art';

  let ticketsHtml = '';
  for (let t of tickets) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(t.ticket_code)}&color=000000&bgcolor=ffffff`;
    const ticketUrl = `${frontendUrl}/boleto/${t.ticket_code}`;

    ticketsHtml += `
      <div style="background-color: #1a1a1a; padding: 20px; border-radius: 16px; max-width: 400px; margin: 15px auto; border: 1px solid #333; color: white; font-family: sans-serif;">
        <h4 style="color: #F1A51C; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">E-TICKET INDIVIDUAL</h4>
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">${t.ticket_type}</div>
        <img src="${qrUrl}" style="width: 180px; height: 180px; margin: 10px 0; border: 8px solid white; border-radius: 8px;" alt="QR Code">
        <div style="color: #F1A51C; font-weight: bold; font-size: 16px; letter-spacing: 1px; margin-bottom: 10px;">${t.ticket_code}</div>
        <a href="${ticketUrl}" target="_blank" style="background-color: #F1A51C; color: black; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">VER EN EL CELULAR</a>
      </div>
    `;
  }

  const formattedDate = new Date(scheduleTime).toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const htmlBody = `
    <div style="background-color: #050505; padding: 40px 20px; text-align: center; font-family: sans-serif; color: white;">
      <h2 style="color: #F1A51C; margin-bottom: 5px;">¡Aquí tienes tus entradas, ${customerName}!</h2>
      <p style="color: #ccc; margin-top: 0; margin-bottom: 25px;">Gracias por tu compra. Tu orden es la <b>#${orderNum}</b></p>
      
      <div style="background-color: #111; padding: 20px; border-radius: 16px; max-width: 450px; margin: 0 auto 30px auto; border: 1px solid #222; text-align: left;">
        <h3 style="color: #fff; margin-top: 0; border-bottom: 1px solid #333; padding-bottom: 10px; text-transform: uppercase;">${eventTitle}</h3>
        <p style="color: #aaa; font-size: 15px; margin: 10px 0;">📅 <b>Función:</b> ${formattedDate}</p>
        <p style="color: #aaa; font-size: 15px; margin: 10px 0;">📍 <b>Lugar:</b> ${eventVenue}</p>
        <p style="color: #aaa; font-size: 15px; margin: 10px 0;">🎟️ <b>Cantidad:</b> ${ticketCount} (${ticketDesglose})</p>
      </div>

      <h3 style="color: #F1A51C; margin-bottom: 10px;">Tus códigos de acceso QR</h3>
      <p style="color: #aaa; font-size: 14px; margin-bottom: 20px;">Muestra estos QRs en la entrada de la sala desde tu celular.</p>
      
      ${ticketsHtml}

      <div style="margin-top: 40px; color: #555; font-size: 12px; border-top: 1px solid #222; padding-top: 20px;">
        Este es un correo automático. Por favor no respondas a este mensaje.<br>
        &copy; 2026 ${fromName}
      </div>
    </div>
  `;

  try {
    // Si no están configuradas las credenciales SMTP, simulamos el envío
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('----- EMAIL SIMULATION -----');
      console.log('To:', email);
      console.log('Subject:', `Tus entradas para ${eventTitle}`);
      console.log('Content size:', htmlBody.length, 'bytes');
      console.log('Tickets count:', tickets.length);
      console.log('----------------------------');
      return true;
    }

    await transporter.sendMail({
      from: `"${fromName}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Tus entradas para ${eventTitle} (Orden #${orderNum})`,
      html: htmlBody
    });

    console.log(`Correo con tickets enviado con éxito a ${email}`);
    return true;
  } catch (err) {
    console.error('Error al enviar el correo electrónico de los tickets:', err);
    return false;
  }
};
