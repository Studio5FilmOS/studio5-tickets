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

async function main() {
  console.log('Fetching projects and services...');
  const allRes = await trpcGet('projects.listProjectsAndServices', {});
  const allData = extract(allRes);
  
  let studio5Project = null;
  if (Array.isArray(allData)) {
    studio5Project = allData.find(p => p.name === 'studio5');
  }
  
  if (!studio5Project) {
    console.log('Project "studio5" not found in:', JSON.stringify(allData, null, 2));
    return;
  }
  
  console.log('Services in project "studio5":', studio5Project.services?.map(s => s.name));
  
  // Now let's fetch the environment variables of "studio5-tickets"
  // Wait, let's see what procedures exist. We can query the service schema/info.
  // In TRPC, we often have something like 'services.app.inspectApp' or 'services.app.getApp' or 'services.app.getService' or 'services.app.getAppConfig'
  // Let's call services.app.getApp or check what mutations/queries exist.
  // We can try to list/search in projects or call 'services.app.getApp' with { projectName: 'studio5', serviceName: 'studio5-tickets' }
  const appConfigRes = await trpcGet('services.app.getApp', {
    projectName: 'studio5',
    serviceName: 'studio5-tickets'
  });
  console.log('services.app.getApp status:', appConfigRes.status);
  console.log('services.app.getApp data:', JSON.stringify(extract(appConfigRes), null, 2));
}

main().catch(e => console.error(e));
