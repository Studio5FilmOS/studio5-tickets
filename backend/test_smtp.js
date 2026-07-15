const nodemailer = require('nodemailer');

const config = {
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: 'ventas@studio5film.com',
    pass: '@Ventas12345'
  }
};

const transporter = nodemailer.createTransport(config);

async function test() {
  console.log('Probando conexión SMTP con Hostinger...');
  try {
    const verified = await transporter.verify();
    console.log('✅ Conexión SMTP verificada con éxito:', verified);
    
    // Opcionalmente enviar un correo de prueba a ventas@studio5film.com
    console.log('Enviando correo de prueba a ventas@studio5film.com...');
    const info = await transporter.sendMail({
      from: '"Studio 5 Test" <ventas@studio5film.com>',
      to: 'ventas@studio5film.com',
      subject: 'Prueba de Conexión SMTP',
      text: 'Este es un correo de prueba del sistema de tickets para verificar la conexión SMTP.'
    });
    console.log('✅ Correo enviado con éxito:', info.messageId);
  } catch (error) {
    console.error('❌ Error de conexión SMTP:', error);
  }
}

test();
