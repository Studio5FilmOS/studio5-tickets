const nodemailer = require('nodemailer');
require('dotenv').config();

// Configurar transportador de correo
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465' || !process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER || 'ventas@studio5film.com',
    pass: process.env.SMTP_PASS || '@Ventas12345'
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

  const orderQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(orderNum)}&color=000000&bgcolor=ffffff`;
  const orderUrl = `${frontendUrl}/orden/${orderNum}`;

  let ticketsHtml = `
    <div style="background-color: #1a1a1a; padding: 20px; border-radius: 16px; max-width: 400px; margin: 15px auto; border: 1px solid #333; color: white; font-family: sans-serif;">
      <h4 style="color: #F1A51C; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">E-TICKET DE ACCESO</h4>
      <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">Orden #${orderNum}</div>
      <img src="${orderQrUrl}" style="width: 180px; height: 180px; margin: 10px 0; border: 8px solid white; border-radius: 8px;" alt="QR Code">
      <div style="color: #F1A51C; font-weight: bold; font-size: 16px; letter-spacing: 1px; margin-bottom: 10px;">${ticketCount} Entrada(s)</div>
      <a href="${orderUrl}" target="_blank" style="background-color: #F1A51C; color: black; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">VER BOLETOS Y ENTRAR AL EVENTO</a>
    </div>
  `;

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
    const smtpUser = process.env.SMTP_USER || 'ventas@studio5film.com';
    const smtpPass = process.env.SMTP_PASS || '@Ventas12345';

    // Si no están configuradas las credenciales SMTP ni las predeterminadas, simulamos el envío
    if (!smtpUser || !smtpPass) {
      console.log('----- EMAIL SIMULATION -----');
      console.log('To:', email);
      console.log('Subject:', `Tus entradas para ${eventTitle}`);
      console.log('Content size:', htmlBody.length, 'bytes');
      console.log('Tickets count:', tickets.length);
      console.log('----------------------------');
      return true;
    }

    await transporter.sendMail({
      from: `"${fromName}" <${smtpUser}>`,
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

// Función para enviar correo de reserva pendiente de transferencia
exports.sendPendingTransferEmail = async ({ email, customerName, orderNum, eventTitle, eventVenue, scheduleTime, ticketCount, ticketDesglose, amountTotal }) => {
  if (!email || !email.includes('@')) {
    console.log('Correo omitido o inválido:', email);
    return false;
  }

  const { query } = require('../config/db');
  let bankAccounts = [];
  try {
    const result = await query('SELECT * FROM bank_accounts WHERE is_active = true ORDER BY bank_name ASC');
    bankAccounts = result.rows;
  } catch (err) {
    console.error('Error fetching bank accounts for email:', err);
  }

  let bankAccountsHtml = '';
  if (bankAccounts.length > 0) {
    bankAccountsHtml = `
      <div style="background-color: #111; padding: 20px; border-radius: 16px; max-width: 450px; margin: 20px auto; border: 1px solid #222; text-align: left;">
        <h4 style="color: #F1A51C; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #333; padding-bottom: 5px; font-family: sans-serif;">Datos de Transferencia Bancaria</h4>
    `;
    for (let acc of bankAccounts) {
      bankAccountsHtml += `
        <div style="margin-bottom: 15px; font-size: 14px; color: #ccc; font-family: sans-serif; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
          <p style="margin: 3px 0;">🏦 <b>Banco:</b> ${acc.bank_name}</p>
          <p style="margin: 3px 0;">📂 <b>Tipo:</b> ${acc.account_type}</p>
          <p style="margin: 3px 0;">🔢 <b>Número de Cuenta:</b> ${acc.account_number}</p>
          <p style="margin: 3px 0;">👤 <b>Beneficiario:</b> ${acc.owner_name}</p>
          <p style="margin: 3px 0;">🆔 <b>Cédula/RUC:</b> ${acc.owner_id}</p>
          ${acc.owner_email ? `<p style="margin: 3px 0;">📧 <b>Correo:</b> ${acc.owner_email}</p>` : ''}
        </div>
      `;
    }
    bankAccountsHtml += `</div>`;
  }

  const fromName = process.env.SMTP_FROM_NAME || 'Studio 5 Film & Art';

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
      <h2 style="color: #F1A51C; margin-bottom: 5px;">¡Reserva registrada con éxito, ${customerName}!</h2>
      <p style="color: #ccc; margin-top: 0; margin-bottom: 25px;">Tu orden <b>#${orderNum}</b> ha sido recibida y está <b>pendiente de comprobación de pago</b>.</p>
      
      <div style="background-color: #111; padding: 20px; border-radius: 16px; max-width: 450px; margin: 0 auto 30px auto; border: 1px solid #222; text-align: left;">
        <h3 style="color: #fff; margin-top: 0; border-bottom: 1px solid #333; padding-bottom: 10px; text-transform: uppercase;">${eventTitle}</h3>
        <p style="color: #aaa; font-size: 15px; margin: 10px 0;">📅 <b>Función:</b> ${formattedDate}</p>
        <p style="color: #aaa; font-size: 15px; margin: 10px 0;">📍 <b>Lugar:</b> ${eventVenue}</p>
        <p style="color: #aaa; font-size: 15px; margin: 10px 0;">🎟️ <b>Cantidad:</b> ${ticketCount} (${ticketDesglose})</p>
        <p style="color: #F1A51C; font-size: 16px; margin: 15px 0 0 0; font-weight: bold; border-top: 1px solid #222; padding-top: 10px;">💰 Total a Pagar: $${parseFloat(amountTotal || 0).toFixed(2)}</p>
      </div>

      <div style="max-width: 450px; margin: 0 auto; text-align: left; font-size: 14px; line-height: 1.6; color: #ccc; font-family: sans-serif;">
        <p>⚠️ <b>Nota Importante:</b> Tu e-ticket premium con los códigos de acceso QR se generará y enviará a tu correo una vez que nuestro departamento de administración valide la transferencia bancaria.</p>
      </div>

      ${bankAccountsHtml}

      <div style="margin-top: 40px; color: #555; font-size: 12px; border-top: 1px solid #222; padding-top: 20px;">
        Este es un correo automático. Por favor no respondas a este mensaje.<br>
        &copy; 2026 ${fromName}
      </div>
    </div>
  `;

  try {
    const smtpUser = process.env.SMTP_USER || 'ventas@studio5film.com';
    const smtpPass = process.env.SMTP_PASS || '@Ventas12345';

    if (!smtpUser || !smtpPass) {
      console.log('----- EMAIL SIMULATION (PENDING) -----');
      console.log('To:', email);
      console.log('Subject:', `Reserva pendiente de confirmación para ${eventTitle}`);
      console.log('Content size:', htmlBody.length, 'bytes');
      console.log('--------------------------------------');
      return true;
    }

    await transporter.sendMail({
      from: `"${fromName}" <${smtpUser}>`,
      to: email,
      subject: `Tu reserva para ${eventTitle} (Orden #${orderNum} - Pendiente de Pago)`,
      html: htmlBody
    });

    console.log(`Correo de reserva pendiente enviado con éxito a ${email}`);
    return true;
  } catch (err) {
    console.error('Error al enviar el correo electrónico de reserva pendiente:', err);
    return false;
  }
};

// Función para enviar código de verificación OTP de 6 dígitos
exports.sendVerificationOtpEmail = async ({ email, name, code }) => {
  if (!email || !email.includes('@')) {
    console.log('Correo omitido o inválido:', email);
    return false;
  }

  const fromName = process.env.SMTP_FROM_NAME || 'Studio 5 Tickets';

  const htmlBody = `
    <div style="background-color: #0c0d14; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff; text-align: center;">
      <div style="max-width: 460px; margin: 0 auto; background: #161822; border: 1px solid rgba(222,184,65,0.25); border-radius: 20px; padding: 36px 28px; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
        <div style="display: inline-block; width: 52px; height: 52px; line-height: 52px; border-radius: 50%; background: rgba(222,184,65,0.15); border: 1px solid #DEB841; font-size: 24px; margin-bottom: 16px;">
          🔐
        </div>
        <h2 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: -0.5px;">Verifica tu Cuenta</h2>
        <p style="color: #9ca3af; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0;">
          Hola <strong style="color: #ffffff;">${name || 'Usuario'}</strong>, utiliza el siguiente código de seguridad de 6 dígitos para confirmar tu correo y activar tu cuenta:
        </p>

        <div style="background: linear-gradient(135deg, rgba(222,184,65,0.12), rgba(176,141,43,0.08)); border: 2px dashed #DEB841; border-radius: 14px; padding: 18px 24px; margin: 20px 0;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #DEB841; display: inline-block; text-shadow: 0 0 15px rgba(222,184,65,0.4);">
            ${code}
          </span>
        </div>

        <p style="color: #6b7280; font-size: 12px; margin: 16px 0 0 0;">
          ⏱️ Este código expira en <b>15 minutos</b>. Si no creaste esta cuenta, puedes ignorar este mensaje con total seguridad.
        </p>
      </div>

      <div style="margin-top: 30px; color: #4b5563; font-size: 11px; text-align: center;">
        &copy; 2026 ${fromName} · Seguridad y Autenticación Unificada
      </div>
    </div>
  `;

  try {
    const smtpUser = process.env.SMTP_USER || 'ventas@studio5film.com';
    const smtpPass = process.env.SMTP_PASS || '@Ventas12345';

    if (!smtpUser || !smtpPass) {
      console.log('----- EMAIL SIMULATION (OTP CODE) -----');
      console.log('To:', email);
      console.log('OTP Code:', code);
      console.log('---------------------------------------');
      return true;
    }

    await transporter.sendMail({
      from: `"${fromName}" <${smtpUser}>`,
      to: email,
      subject: `${code} es tu código de verificación - ${fromName}`,
      html: htmlBody
    });

    console.log(`✅ [Email Service] Código OTP enviado con éxito a ${email}`);
    return true;
  } catch (err) {
    console.error('❌ [Email Service] Error al enviar código OTP:', err.message);
    return false;
  }
};
