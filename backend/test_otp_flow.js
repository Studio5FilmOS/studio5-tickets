const { sendVerificationOtpEmail } = require('./services/emailService');

async function testOtpEmail() {
  console.log('==============================================');
  console.log('🧪 TEST: SERVICIO DE CORREO OTP');
  console.log('==============================================');

  const testEmail = 'cliente.test@ejemplo.com';
  const testName = 'Usuario Demo';
  const testCode = '849201';

  console.log(`Enviando código de prueba "${testCode}" a "${testEmail}"...`);
  const success = await sendVerificationOtpEmail({
    email: testEmail,
    name: testName,
    code: testCode
  });

  if (success) {
    console.log('✅ Función sendVerificationOtpEmail ejecutada correctamente');
  } else {
    console.error('❌ Error enviando email de OTP');
  }

  console.log('==============================================');
}

testOtpEmail().catch(console.error);
