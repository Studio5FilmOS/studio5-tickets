require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { query } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Importar Rutas
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const orderRoutes = require('./routes/orderRoutes');
const ticketRoutes = require('./routes/ticketRoutes');

// Vincular Rutas a endpoints de la API
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tickets', ticketRoutes);

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
