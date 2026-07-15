const http = require('http');

const HOST = '72.62.170.115';
const PORT_EP = 3000;
const EMAIL = 'jesseanazco@gmail.com';
const PASSWORD = '@Studio5film2025#';

const trpcPost = (procedure, input, token = null) => new Promise((resolve) => {
  const bodyStr = JSON.stringify({ "0": { json: input } });
  const path = `/api/trpc/${procedure}?batch=1`;
  const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const r = http.request({ hostname: HOST, port: PORT_EP, path, method: 'POST', headers }, (res) => {
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

const trpcGet = (procedure, input = {}, token) => new Promise((resolve) => {
  const path = `/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input }))}&batch=1`;
  const r = http.request({ hostname: HOST, port: PORT_EP, path, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  }, (res) => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
      catch { resolve({ status: res.statusCode, data: null, raw: d.slice(0, 1000) }); }
    });
  });
  r.on('error', e => resolve({ status: 0, data: null, raw: e.message }));
  r.setTimeout(15000, () => { r.destroy(); resolve({ status: 0, data: null, raw: 'timeout' }); });
  r.end();
});

const extract = (r) => {
  if (Array.isArray(r.data)) return r.data[0]?.result?.data?.json ?? r.data[0]?.result?.data ?? r.data[0];
  return r.data;
};

async function main() {
  console.log('1. Intentando login en EasyPanel...');
  const loginRes = await trpcPost('auth.login', { email: EMAIL, password: PASSWORD });
  
  if (loginRes.status !== 200) {
    console.error(`❌ Error de login (status ${loginRes.status}):`, JSON.stringify(loginRes.data || loginRes.raw));
    return;
  }

  const loginData = extract(loginRes);
  const token = loginData.token;
  console.log('✅ Login exitoso! Token obtenido:', token);

  console.log('\n2. Buscando proyectos y servicios...');
  const allRes = await trpcGet('projects.listProjectsAndServices', {}, token);
  const allData = extract(allRes);

  let ticketsService = null;
  if (Array.isArray(allData)) {
    for (const project of allData) {
      console.log(`Proyecto: ${project.name}`);
      const found = project.services?.find(s => s.name === 'studio5-tickets');
      if (found) {
        ticketsService = found;
        console.log(`  -> Encontrado servicio studio5-tickets en proyecto ${project.name}`);
      }
    }
  }

  if (!ticketsService) {
    console.error('❌ No se encontró el servicio studio5-tickets.');
    return;
  }

  // Obtener logs del servicio.
  // En Easypanel, para ver logs de una app de compose se suele llamar a services.app.getLogs o similar.
  // Intentemos buscar qué logs podemos obtener.
  // O podemos ver los detalles del servicio
  console.log('\n3. Obteniendo información detallada del servicio...');
  const appConfigRes = await trpcGet('services.app.getApp', {
    projectName: 'studio5',
    serviceName: 'studio5-tickets'
  }, token);
  const appConfig = extract(appConfigRes);
  console.log('Configuración del servicio:', JSON.stringify(appConfig, null, 2));

  // Let's also check if we can get logs using services.app.getLogs or services.compose.getLogs
  console.log('\n4. Intentando obtener logs de la app...');
  // A veces el endpoint es services.app.getLogs o services.app.inspectApp
  // Probemos services.app.getLogs
  const logsRes = await trpcGet('services.app.getLogs', {
    projectName: 'studio5',
    serviceName: 'studio5-tickets'
  }, token);
  console.log('Logs (services.app.getLogs):', JSON.stringify(extract(logsRes), null, 2));
}

main().catch(console.error);
