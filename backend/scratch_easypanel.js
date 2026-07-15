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
      catch { resolve({ status: res.statusCode, data: null, raw: d.slice(0, 1000) }); }
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
      catch { resolve({ status: res.statusCode, data: null, raw: d.slice(0, 1000) }); }
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
  console.log('--- Fetching Projects & Services ---');
  const res = await trpcGet('projects.listProjectsAndServices', {});
  const data = extract(res);
  console.log('Status:', res.status);
  console.log('Projects:', JSON.stringify(data, null, 2));
}

main().catch(console.error);
