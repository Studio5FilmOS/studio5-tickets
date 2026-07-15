const http = require('http');

const HOST = '72.62.170.115';
const PORT_EP = 3000;

const trpcPost = (procedure, input) => new Promise((resolve) => {
  const bodyStr = JSON.stringify({ "0": { json: input } });
  const path = `/api/trpc/${procedure}?batch=1`;
  const r = http.request({ hostname: HOST, port: PORT_EP, path, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) }
  }, (res) => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
      catch { resolve({ status: res.statusCode, data: null, raw: d.slice(0, 1000) }); }
    });
  });
  r.on('error', e => resolve({ status: 0, data: null, raw: e.message }));
  r.setTimeout(15000, () => { r.destroy(); resolve({ status: 0, data: null, raw: 'timeout' }); });
  r.write(bodyStr);
  r.end();
});

async function main() {
  const combinations = [
    { email: 'admin@studio5film.com', password: '@AdminIAStudio5' },
    { email: 'admin@studio5.com', password: '@AdminIAStudio5' },
    { email: 'ventas@studio5film.com', password: '@AdminIAStudio5' },
    { email: 'admin@admin.com', password: '@AdminIAStudio5' },
    { email: 'admin@studio5.com', password: 'password123' },
    { email: 'admin@studio5film.com', password: 'password123' },
    { email: 'ventas@studio5film.com', password: '@Ventas12345' },
    { email: 'root@studio5film.com', password: '@AdminIAStudio5' }
  ];

  for (const comb of combinations) {
    console.log(`Intentando login con ${comb.email}...`);
    const res = await trpcPost('auth.login', comb);
    if (res.status === 200) {
      console.log('✅ Login exitoso para:', comb.email);
      console.log('Respuesta:', JSON.stringify(res.data, null, 2));
      break;
    } else {
      console.log(`❌ Falló con status ${res.status}:`, res.data?.[0]?.error?.message || res.raw);
    }
  }
}

main().catch(console.error);
