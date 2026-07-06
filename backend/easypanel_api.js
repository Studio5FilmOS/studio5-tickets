/**
 * Trigger redeploy de studio5-tickets en Easypanel
 * via el endpoint correcto de deploy
 */
const http = require('http');
const https = require('https');

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

const trpcPost = (procedure, input) => new Promise((resolve) => {
  const bodyStr = JSON.stringify({ "0": { json: input } });
  const path = `/api/trpc/${procedure}?batch=1`;
  const r = http.request({ hostname: HOST, port: PORT_EP, path, method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) }
  }, (res) => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
      catch { resolve({ status: res.statusCode, data: null, raw: d.slice(0, 600) }); }
    });
  });
  r.on('error', e => resolve({ status: 0, data: null, raw: e.message }));
  r.setTimeout(30000, () => { r.destroy(); resolve({ status: 0, data: null, raw: 'timeout' }); });
  r.write(bodyStr);
  r.end();
});

const extract = (r) => {
  if (Array.isArray(r.data)) return r.data[0]?.result?.data?.json ?? r.data[0]?.result?.data ?? r.data[0];
  return r.data;
};

const getFile = (path) => new Promise(resolve => {
  const r = http.request({ hostname: HOST, port: PORT_EP, path, method: 'GET' }, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d));
  });
  r.on('error', () => resolve(''));
  r.setTimeout(30000, () => { r.destroy(); resolve(''); });
  r.end();
});

async function main() {
  // Extraer el procedure de deploy del bundle JS
  const html = await getFile('/');
  const jsMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  
  let deployProcedure = null;
  let deployInput = null;
  
  if (jsMatch) {
    const js = await getFile(jsMatch[1]);
    
    // Buscar el procedure exacto de deploy
    // Del contexto anterior vimos: deployService.useMutation + projectName + serviceName
    // También vimos references a "deployment" type en actions.listActions
    
    // Buscar todos los useMutation relacionados con "deploy"
    const deployMutations = [];
    for (const m of js.matchAll(/I\.([a-zA-Z.]+)\.useMutation\b[^)]*?onSuccess[^}]*?deployed/g)) {
      deployMutations.push(m[1]);
    }
    
    // Buscar el handler de deploy del botón
    const deployBtnIdx = js.indexOf('deployService');
    if (deployBtnIdx !== -1) {
      const ctx = js.substring(Math.max(0, deployBtnIdx - 300), deployBtnIdx + 500);
      console.log('📍 Contexto de deployService:');
      console.log(ctx.replace(/[^\x20-\x7E]/g, '.').slice(0, 600));
      
      // Extraer el procedure completo
      const procMatch = ctx.match(/I\.([\w.]+\.deployService)/);
      if (procMatch) {
        deployProcedure = procMatch[1];
        console.log(`\n✅ Deploy procedure: ${deployProcedure}`);
      }
    }
    
    // También buscar "runDeployment" o similar
    const patterns = ['runDeployment', 'triggerDeploy', 'startDeploy', 'buildService', 'redeployService'];
    for (const pattern of patterns) {
      const idx = js.indexOf(pattern);
      if (idx !== -1) {
        const ctx = js.substring(Math.max(0, idx - 200), idx + 300);
        console.log(`\n📍 Contexto de "${pattern}":`);
        console.log(ctx.replace(/[^\x20-\x7E]/g, '.').slice(0, 400));
      }
    }
    
    // Buscar el token de webhook o el endpoint /api/deploy
    const webhookIdx = js.indexOf('token');
    const webhookCtxs = [];
    let idx = 0;
    while ((idx = js.indexOf('token', idx)) !== -1) {
      const ctx = js.substring(Math.max(0, idx - 50), idx + 150);
      if (ctx.includes('deploy') || ctx.includes('webhook') || ctx.includes('/api/')) {
        webhookCtxs.push(ctx.replace(/[^\x20-\x7E]/g, '.'));
      }
      idx++;
      if (webhookCtxs.length >= 5) break;
    }
    
    if (webhookCtxs.length > 0) {
      console.log('\n🔑 Contextos con "token" y "deploy/webhook":');
      webhookCtxs.slice(0, 3).forEach(c => console.log('  ' + c.slice(0, 200)));
    }
  }
  
  // El servicio studio5-tickets tiene un "token" en su configuración
  // Ese token se usa para disparar deploys via webhook
  // Vamos a obtenerlo
  console.log('\n\n📋 Obteniendo token de deploy del servicio...');
  const allRes = await trpcGet('projects.listProjectsAndServices', {});
  const allData = extract(allRes);
  let tickets = null;
  if (Array.isArray(allData)) {
    for (const project of allData) {
      const found = project.services?.find(s => s.name === 'studio5-tickets');
      if (found) {
        tickets = found;
        break;
      }
    }
  } else {
    tickets = allData?.services?.find(s => s.name === 'studio5-tickets');
  }
  
  if (tickets) {
    console.log(`Token del servicio: ${tickets.token}`);
    
    // El webhook endpoint de Easypanel es típicamente:
    // POST /api/webhooks/deploy/:token
    // o GET/POST /api/deploy/:token
    
    const deployToken = tickets.token;
    
    // Intentar varios formatos de webhook de deploy
    const webhookAttempts = [
      `http://${HOST}:${PORT_EP}/api/webhooks/deploy/${deployToken}`,
      `http://${HOST}:${PORT_EP}/api/deploy/${deployToken}`,
      `http://${HOST}:${PORT_EP}/webhook/${deployToken}`,
      `http://${HOST}:${PORT_EP}/api/projects/studio5/services/studio5-tickets/deploy`,
    ];
    
    console.log('\n🚀 Intentando disparar deploy via webhook token...');
    
    for (const url of webhookAttempts) {
      const parsed = new URL(url);
      const result = await new Promise(resolve => {
        const r = http.request({
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname + parsed.search,
          method: 'POST',
          headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'Content-Length': 2 }
        }, (res) => {
          let d = ''; res.on('data', c => d += c);
          res.on('end', () => resolve({ status: res.statusCode, body: d.slice(0, 200) }));
        });
        r.on('error', e => resolve({ status: 0, body: e.message }));
        r.setTimeout(8000, () => { r.destroy(); resolve({ status: 0, body: 'timeout' }); });
        r.write('{}');
        r.end();
      });
      
      const isHtml = result.body.includes('<!doctype');
      const icon = result.status >= 200 && result.status < 300 && !isHtml ? '✅' : result.status === 404 ? '❌' : '⚠️';
      console.log(`  ${icon} POST ${parsed.pathname} → ${result.status}: ${isHtml ? '[HTML]' : result.body.slice(0, 100)}`);
      
      if (result.status >= 200 && result.status < 300 && !isHtml) {
        console.log('  🎉 Deploy disparado!');
        break;
      }
    }
    
    // Intentar también con el procedure services.compose.deployService
    console.log('\n🔄 Intentando services.compose.deployService...');
    const deployRes = await trpcPost('services.compose.deployService', {
      projectName: 'studio5',
      serviceName: 'studio5-tickets'
    });
    const deployData = extract(deployRes);
    console.log(`  → ${deployRes.status}: ${JSON.stringify(deployData || deployRes.raw?.slice(0, 200))}`);
  }
  
  // Finalmente verificar si la app ya tiene el nuevo código
  console.log('\n\n🌐 Verificando app en producción...');
  const appRes = await new Promise(resolve => {
    const r = https.request({ hostname: 'ticket.studio5film.com', path: '/health', method: 'GET', rejectUnauthorized: false }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d.slice(0, 300) }));
    });
    r.on('error', e => resolve({ status: 0, body: e.message }));
    r.setTimeout(8000, () => { r.destroy(); resolve({ status: 0, body: 'timeout' }); });
    r.end();
  });
  console.log(`  /health → ${appRes.status}: ${appRes.body}`);
}

main().catch(e => console.error('Error:', e.message));
