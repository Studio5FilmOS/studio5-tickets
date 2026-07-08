const http = require('http');

http.get('http://localhost:5000/api/events', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('📡 Respuesta de la API local (localhost:5000):');
    console.log(data);
  });
}).on('error', (err) => {
  console.error('❌ Error conectando a la API local:', err.message);
});
