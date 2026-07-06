require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { query } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Auto-Migration para añadir columnas (ignora el error si ya existen)
(async () => {
  try {
    await query('ALTER TABLE events ADD COLUMN require_billing BOOLEAN NOT NULL DEFAULT FALSE;');
    console.log('Migration: Added require_billing to events');
  } catch (err) { }
  try {
    await query('ALTER TABLE orders ADD COLUMN is_final_consumer BOOLEAN NOT NULL DEFAULT TRUE;');
    await query('ALTER TABLE orders ADD COLUMN billing_id_number VARCHAR(50);');
    await query('ALTER TABLE orders ADD COLUMN billing_name VARCHAR(255);');
    await query('ALTER TABLE orders ADD COLUMN billing_address VARCHAR(255);');
    await query('ALTER TABLE orders ADD COLUMN billing_email VARCHAR(255);');
    await query('ALTER TABLE orders ADD COLUMN amount_net NUMERIC(10, 2) NOT NULL DEFAULT 0.00;');
    await query('UPDATE orders SET amount_net = amount_total WHERE amount_net = 0.00 AND amount_total > 0.00;');
    console.log('Migration: Added billing fields and amount_net to orders');
  } catch (err) { }
  try {
    await query(`CREATE TABLE IF NOT EXISTS promotions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title VARCHAR(255) NOT NULL,
      subtitle VARCHAR(255),
      image_url TEXT,
      link_url TEXT,
      active BOOLEAN NOT NULL DEFAULT FALSE,
      start_date DATE,
      end_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`);
    console.log('Migration: promotions table ready');
  } catch (err) { console.error('Migration promotions error:', err.message); }
})();

// Configuración de CORS — permite el mismo dominio y orígenes configurados
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [])
];

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (mismo servidor, Postman, apps móviles)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // En producción, permitir el mismo host del servidor
    if (process.env.NODE_ENV === 'production') return callback(null, true);
    callback(new Error(`CORS: Origen no permitido: ${origin}`));
  },
  optionsSuccessStatus: 200,
  credentials: true
};
app.use(cors(corsOptions));

// Middleware para procesar JSON (límite aumentado para imágenes en base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ruta de estado general (Health Check)
app.get('/health', async (req, res) => {
  try {
    const dbTest = await query('SELECT NOW()');
    res.json({
      status: 'OK',
      message: 'Servidor y Base de Datos funcionando correctamente',
      timestamp: dbTest.rows[0].now
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al conectar con la base de datos',
      error: err.message
    });
  }
});

// Ruta para obtener la configuración pública de Payphone
app.get('/api/config/payphone', (req, res) => {
  res.json({
    status: 'OK',
    token: process.env.PAYPHONE_TOKEN || '',
    surcharge_enable: process.env.PAYPHONE_SURCHARGE_ENABLE !== 'false',
    surcharge_rate: parseFloat(process.env.PAYPHONE_SURCHARGE_RATE) || 0.043,
    surcharge_fixed: parseFloat(process.env.PAYPHONE_SURCHARGE_FIXED) || 0.30
  });
});

// Importar Rutas
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const orderRoutes = require('./routes/orderRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const promotionRoutes = require('./routes/promotionRoutes');

// Vincular Rutas a endpoints de la API
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/promotions', promotionRoutes);

// Servir archivos estáticos del Frontend compilado
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Ruta comodín para que React Router maneje las rutas del cliente
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware para manejo de errores generales (Fallback)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'ERROR',
    message: 'Ocurrió un error interno en el servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Inicializar base de datos e iniciar servidor
const initDatabase = require('./config/initDb');

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor de Tickets corriendo en el puerto ${PORT}`);
    console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
  });
});
