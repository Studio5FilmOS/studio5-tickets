const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connection Ready. Executing diagnostics...');
  
  // Ejecutamos comandos para ver el estado del VPS
  conn.exec('echo "=== DOCKER CONTAINERS ===" && docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}" && echo "" && echo "=== ACTIVE PORT LISTENERS ===" && ss -tuln && echo "" && echo "=== FIREWALL STATUS ===" && ufw status', (err, stream) => {
    if (err) throw err;
    
    let output = '';
    stream.on('close', (code, signal) => {
      console.log('=== VPS DIAGNOSTIC RESULTS ===');
      console.log(output);
      console.log('=== END DIAGNOSTICS ===');
      conn.end();
    }).on('data', (data) => {
      output += data;
    }).stderr.on('data', (data) => {
      console.error('STDERR: ' + data);
    });
  });
}).connect({
  host: '72.62.170.115',
  port: 22,
  username: 'root',
  password: '@AdminIAStudio5'
});
