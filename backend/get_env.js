const http = require('http');

const HOST = '72.62.170.115';
const PORT_EP = 3000;
const TOKEN = 'cmr7cgrii001o07t65w0j1884';

const trpcGet = (procedure, input = {}) => new Promise((resolve) => {
  const path = `/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input }))}&batch=1`;
  const r = http.request({ hostname: HOST, port: PORT_EP, path, method: 'GET',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
  }, (res) => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
      catch { resolve({ status: res.statusCode, data: null, raw: d.slice(0, 600) }); }
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
  console.log('📋 Buscando proyectos y servicios...');
  const allRes = await trpcGet('projects.listProjectsAndServices', {});
  const allData = extract(allRes);
  
  if (!allData) {
    console.error('No se pudieron obtener los datos. Status:', allRes.status, 'Raw:', allRes.raw);
    return;
  }

  let ticketsService = null;
  if (Array.isArray(allData)) {
    for (const project of allData) {
      const found = project.services?.find(s => s.name === 'studio5-tickets');
      if (found) {
        ticketsService = found;
        console.log(`Proyecto encontrado: ${project.name}`);
        break;
      }
    }
  }

  if (ticketsService) {
    console.log('Servicio encontrado:', ticketsService.name);
    console.log('Token:', ticketsService.token);
    
    console.log('Obteniendo detalles del servicio...');
    // Vamos a buscar los detalles completos de la app para ver variables de entorno
    // En Easypanel, el procedure suele ser 'services.app.inspectApp' o 'services.app.getApp'
    // Probemos con services.app.inspectApp o services.app.getApp
    const appDetailsRes = await trpcGet('services.app.getApp', {
      projectName: 'studio5',
      serviceName: 'studio5-tickets'
    });
    const appDetails = extract(appDetailsRes);
    if (appDetails) {
      console.log('Detalles del App obtenidos con éxito:');
      // Imprimir las variables de entorno si están disponibles en los detalles
      console.log('Variables de Entorno (env):');
      console.log(appDetails.env || 'No se encontró campo .env en getApp');
      if (!appDetails.env) {
        console.log('Objeto completo de configuración:', JSON.stringify(appDetails, null, 2));
      }
    } else {
      console.log('No se pudo obtener detalles con services.app.getApp. Status:', appDetailsRes.status, 'Raw:', appDetailsRes.raw);
    }
  } else {
    console.log('No se encontró el servicio studio5-tickets en la lista de proyectos.');
    console.log('Datos recibidos:', JSON.stringify(allData, null, 2));
  }
}

main().catch(console.error);
