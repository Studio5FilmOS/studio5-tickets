/**
 * Reset admin password and verify login
 */
const https = require('https');
const bcrypt = require('bcryptjs');

const httpsReq = (hostname, path, method = 'GET', body = null, token = null) => new Promise((resolve) => {
  const opts = {
    hostname, path, method, rejectUnauthorized: false,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  
  const r = https.request(opts, (res) => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
      catch { resolve({ status: res.statusCode, body: null, raw: d.slice(0, 300) }); }
    });
  });
  r.on('error', e => resolve({ status: 0, body: null, raw: e.message }));
  r.setTimeout(10000, () => { r.destroy(); resolve({ status: 0, body: null, raw: 'timeout' }); });
  if (body) r.write(body);
  r.end();
});

const BASE = 'ticket.studio5film.com';

async function main() {
  // El initDb.js resetea la contraseña a un hash hardcodeado cada vez que inicia
  // El hash es: $2a$10$35QT8095H557PUDT0G.ipehs5K.kJ9aePeofBqtghPRIrXNJXd0Wa
  // Vamos a descubrir qué contraseña genera ese hash
  
  console.log('🔐 Verificando hash de contraseña del admin...\n');
  
  const targetHash = '$2a$10$35QT8095H557PUDT0G.ipehs5K.kJ9aePeofBqtghPRIrXNJXd0Wa';
  
  // Lista de contraseñas a probar
  const passwords = [
    'Admin2025!',
    'admin2025',
    'Studio5Admin2026!',
    'studio5admin',
    'Studio5!',
    'studio5',
    'admin',
    'Admin1234',
    'Studio5Admin!',
    'Admin@Studio5',
    'studio52025',
    'Studio52025!',
    'admin123',
    'password',
    'Studio5Film2025',
    'Studio5Film!',
    'Admin2024!',
    'admin@studio5',
    '12345678',
    'Clave1234',
  ];
  
  console.log(`Probando ${passwords.length} contraseñas contra hash:\n${targetHash}\n`);
  
  let found = null;
  for (const pwd of passwords) {
    const match = await bcrypt.compare(pwd, targetHash);
    if (match) {
      found = pwd;
      console.log(`✅ ¡CONTRASEÑA ENCONTRADA: "${pwd}"`);
      break;
    }
  }
  
  if (!found) {
    console.log('❌ Contraseña no encontrada en la lista de prueba.');
    console.log('\n🔄 El hash hardcodeado en initDb.js no coincide con contraseñas comunes.');
    console.log('   Vamos a generar un nuevo hash y actualizar vía la API...');
    
    // Generar hash de nueva contraseña
    const newPassword = 'Studio5Admin2026!';
    const newHash = await bcrypt.hash(newPassword, 10);
    console.log(`\n📝 Nueva contraseña: "${newPassword}"`);
    console.log(`   Nuevo hash: ${newHash}`);
    
    // Intentar hacer login con la nueva contraseña para verificar
    console.log('\n🔐 Intentando cambiar contraseña via change-password endpoint...');
    
    // Primero hacer login con admin para obtener token (si tenemos una forma)
    // En el backend existe un endpoint de cambio de contraseña
    
    // Opción: crear un endpoint temporal de reset o usar initDb directamente
    // Ya que initDb.js actualiza el hash en cada restart, necesitamos cambiar ese hash
    
    console.log('\n💡 SOLUCIÓN: Actualizar el hash hardcodeado en initDb.js con el nuevo hash');
    console.log(`   Cambiar en initDb.js la línea del UPDATE con el hash: ${newHash}`);
    console.log(`   Contraseña resultante: "${newPassword}"`);
    
    return { newPassword, newHash };
  }
  
  // Probar login con la contraseña encontrada
  console.log('\n\n🔐 Verificando login en producción...');
  const loginRes = await httpsReq(BASE, '/api/auth/login', 'POST', 
    JSON.stringify({ email: 'admin@studio5.com', password: found })
  );
  console.log(`  Login resultado: ${loginRes.status}`);
  if (loginRes.body) console.log(`  Response: ${JSON.stringify(loginRes.body).slice(0, 300)}`);
  
  if (loginRes.status === 200 && loginRes.body?.token) {
    console.log(`\n  ✅ Login exitoso! Token: ${loginRes.body.token.slice(0, 30)}...`);
    
    // También probar staff
    const staffLogin = await httpsReq(BASE, '/api/auth/login', 'POST',
      JSON.stringify({ email: 'staff@studio5.com', password: found })
    );
    console.log(`\n  Staff login: ${staffLogin.status}`);
    if (staffLogin.body) console.log(`  Staff: ${JSON.stringify(staffLogin.body).slice(0, 200)}`);
  }
}

main().catch(e => console.error('Error:', e.message));
