require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { query } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middleware para procesar JSON
app.use(express.json());

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
