const { Client } = require('ssh2');

const conn = new Client();

const commands = [
  // 1. Ver contenedores de Docker activos
  'echo "=== CONTENEDORES DOCKER ACTIVOS ==="',
  'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"',
  
  // 2. Ver logs del contenedor studio5-tickets
  'echo "\\n=== LOGS DE STUDIO5-TICKETS (últimas 50 líneas) ==="',
  'docker logs $(docker ps -q --filter "name=studio5-tickets") --tail 50 2>&1 || echo "Contenedor no encontrado con ese filtro"',
  
  // 3. Ver variables de entorno del contenedor
  'echo "\\n=== VARIABLES DE ENTORNO DEL CONTENEDOR ==="',
  'docker inspect $(docker ps -q --filter "name=studio5-tickets") --format "{{range .Config.Env}}{{.}}\\n{{end}}" 2>&1 || echo "No se pudo inspeccionar"',
  
  // 4. Ver si PostgreSQL studio5-db está corriendo y obtener credenciales
  'echo "\\n=== INFO DE BASE DE DATOS studio5-db ==="',
  'docker inspect $(docker ps -q --filter "name=studio5-db") --format "{{range .Config.Env}}{{.}}\\n{{end}}" 2>&1 | grep -E "(POSTGRES|DB)" || echo "No se encontraron variables de DB"',
  
  // 5. Probar conectividad entre contenedores
  'echo "\\n=== RED DE DOCKER ==="',
  'docker network ls',
  
  // 6. Ver si el puerto 3000 del contenedor studio5-tickets responde
  'echo "\\n=== PRUEBA DE CONECTIVIDAD ==="',
  'curl -s --max-time 5 http://localhost:$(docker port $(docker ps -q --filter "name=studio5-tickets") 3000 2>/dev/null | cut -d: -f2)/health 2>&1 || echo "No responde en el puerto mapeado"',
].join(' && ');

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida. Ejecutando diagnóstico completo...\n');
  
  conn.exec(commands, (err, stream) => {
    if (err) {
      console.error('Error ejecutando comando:', err);
      conn.end();
      return;
    }
    
    stream.on('close', (code) => {
      console.log('\n=== DIAGNÓSTICO COMPLETADO ===');
      conn.end();
    });
    
    stream.on('data', (data) => {
      process.stdout.write(data);
    });
    
    stream.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
});

conn.on('error', (err) => {
  console.error('❌ Error de conexión SSH:', err.message);
});

conn.connect({
  host: '72.62.170.115',
  port: 22,
  username: 'root',
  password: '@AdminIAStudio5',
  readyTimeout: 20000,
  keepaliveInterval: 10000
});
