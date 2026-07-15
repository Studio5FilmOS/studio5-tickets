/**
 * trigger_resend.js
 * 
 * 1. Hace login como admin en la API de producción
 * 2. Llama al endpoint /api/admin/resend-emails
 * 3. Muestra el reporte detallado de correos enviados
 * 
 * Uso:
 *   node trigger_resend.js            → reenvío REAL
 *   node trigger_resend.js --dry-run  → simulación sin enviar
 */

const https = require('https');

const BASE = 'ticket.studio5film.com';
const ADMIN_EMAIL    = 'admin@studio5.com';
const ADMIN_PASSWORD = 'password123';

const isDryRun = process.argv.includes('--dry-run');

const request = (options, body = null) => new Promise((resolve, reject) => {
  const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
      catch { resolve({ status: res.statusCode, data: null, raw: data.slice(0, 500) }); }
    });
  });
  req.on('error', reject);
  req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout')); });
  if (body) req.write(body);
  req.end();
});

async function main() {
  // ── PASO 1: Login ──────────────────────────────────────────────────────────
  console.log(`\n🔐 Haciendo login como ${ADMIN_EMAIL}...`);
  const loginBody = JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const loginRes = await request({
    hostname: BASE, port: 443, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) },
    rejectUnauthorized: false
  }, loginBody);

  if (loginRes.status !== 200 || !loginRes.data?.token) {
    console.error('❌ Login fallido:', loginRes.data?.message || loginRes.raw);
    console.log('\n💡 Verifica las credenciales de admin en seeds.sql');
    process.exit(1);
  }

  const token = loginRes.data.token;
  console.log('✅ Login exitoso. Token obtenido.\n');

  // ── PASO 2: Llamar endpoint de reenvío ────────────────────────────────────
  const dryParam = isDryRun ? '?dry_run=true' : '';
  console.log(isDryRun
    ? '🔍 Modo DRY-RUN: simulando sin enviar correos reales...'
    : '📧 Enviando correos a todos los clientes...'
  );
  console.log('⏳ Esto puede tomar varios minutos dependiendo del número de órdenes...\n');

  const resendRes = await request({
    hostname: BASE, port: 443,
    path: `/api/admin/resend-emails${dryParam}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    rejectUnauthorized: false
  });

  if (resendRes.status !== 200) {
    console.error('❌ Error en el endpoint de reenvío:', resendRes.data?.message || resendRes.raw);
    process.exit(1);
  }

  const result = resendRes.data;

  // ── PASO 3: Mostrar reporte ───────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('           📊 REPORTE DE REENVÍO DE CORREOS');
  console.log('══════════════════════════════════════════════════');
  console.log(`  Modo:          ${isDryRun ? '🔍 SIMULACIÓN (dry run)' : '✉️  ENVÍO REAL'}`);
  console.log(`  Total órdenes: ${result.total}`);
  console.log(`  ✅ Enviados:   ${result.enviados}`);
  console.log(`  ❌ Errores:    ${result.errores}`);
  console.log(`  ⚠️  Sin ticket: ${result.sin_ticket}`);
  console.log('══════════════════════════════════════════════════\n');

  if (result.detalle && result.detalle.length > 0) {
    console.log('DETALLE POR ORDEN:');
    for (const r of result.detalle) {
      const icon = r.status === 'ENVIADO' ? '✅' : r.status === 'SIN_TICKETS' ? '⚠️ ' : '❌';
      const tipo = r.tipo === 'ticket' ? '🎟️  E-Ticket' : r.tipo === 'pendiente' ? '⏳ Pendiente' : '❓';
      console.log(`  ${icon} [${r.order_num}] ${r.email} — ${tipo} — ${r.payment_status} ${r.error ? `(${r.error})` : ''}`);
    }
  }

  console.log('\n══════════════════════════════════════════════════');
  if (!isDryRun && result.enviados > 0) {
    console.log(`🎉 ¡${result.enviados} correos enviados exitosamente!`);
  } else if (isDryRun) {
    console.log('💡 Simulación completada. Ejecuta sin --dry-run para enviar realmente.');
  }
  console.log('══════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('❌ Error fatal:', err.message);
  process.exit(1);
});
