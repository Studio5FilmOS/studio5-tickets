require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { query } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Auto-Migration para añadir columnas (ignora el error si ya existen)
// Función para ejecutar migraciones (añadir columnas y tablas nuevas) de forma segura
const runMigrations = async () => {
  try {
    await query('ALTER TABLE events ADD COLUMN require_billing BOOLEAN NOT NULL DEFAULT FALSE;');
    console.log('Migration: Added require_billing to events');
  } catch (err) {
    console.log('Migration: require_billing already exists or could not be added:', err.message);
  }
  try {
    await query('ALTER TABLE orders ADD COLUMN is_final_consumer BOOLEAN NOT NULL DEFAULT TRUE;');
    await query('ALTER TABLE orders ADD COLUMN billing_id_number VARCHAR(50);');
    await query('ALTER TABLE orders ADD COLUMN billing_name VARCHAR(255);');
    await query('ALTER TABLE orders ADD COLUMN billing_address VARCHAR(255);');
    await query('ALTER TABLE orders ADD COLUMN billing_email VARCHAR(255);');
    await query('ALTER TABLE orders ADD COLUMN amount_net NUMERIC(10, 2) NOT NULL DEFAULT 0.00;');
    await query('UPDATE orders SET amount_net = amount_total WHERE amount_net = 0.00 AND amount_total > 0.00;');
    console.log('Migration: Added billing fields and amount_net to orders');
  } catch (err) {
    console.log('Migration: Billing fields/amount_net already exist or could not be added:', err.message);
  }
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
  } catch (err) {
    console.error('Migration promotions error:', err.message);
  }
};

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

// Ruta de diagnóstico de base de datos (temporal)
app.get('/api/debug-events', async (req, res) => {
  try {
    const dbInfo = await query('SELECT current_database(), current_user');
    const tables = await query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    let events = [];
    let eventsError = null;
    try {
      const evRes = await query('SELECT id, title, status, created_at FROM events ORDER BY created_at DESC');
      events = evRes.rows;
    } catch(e) { eventsError = e.message; }
    res.json({
      db: dbInfo.rows[0],
      tables: tables.rows.map(r => r.tablename),
      events,
      eventsError,
      env: {
        DB_HOST: process.env.DB_HOST,
        DB_DATABASE: process.env.DB_DATABASE,
        DB_USER: process.env.DB_USER,
        NODE_ENV: process.env.NODE_ENV,
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_SECURE: process.env.SMTP_SECURE,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS ? (process.env.SMTP_PASS.slice(0, 3) + '...' + process.env.SMTP_PASS.slice(-2)) : undefined
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ruta de diagnóstico de archivos subidos (temporal)
app.get('/api/debug-uploads', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    
    const getFiles = (dir) => {
      if (!fs.existsSync(dir)) return { exists: false, files: [] };
      const items = fs.readdirSync(dir);
      const files = [];
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          files.push({ name: item, isDir: true, contents: getFiles(fullPath) });
        } else {
          files.push({ name: item, size: stat.size, isDir: false });
        }
      });
      return { exists: true, files };
    };

    res.json({
      uploadsDir,
      structure: getFiles(uploadsDir),
      publicDirExists: fs.existsSync(path.join(__dirname, 'public')),
      publicContents: fs.existsSync(path.join(__dirname, 'public')) ? fs.readdirSync(path.join(__dirname, 'public')) : []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
const userRoutes = require('./routes/userRoutes');
const bankAccountRoutes = require('./routes/bankAccountRoutes');
const pushRoutes = require('./routes/pushRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Vincular Rutas a endpoints de la API
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/admin', adminRoutes);

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

// Inicializar base de datos, ejecutar migraciones e iniciar servidor
const initDatabase = require('./config/initDb');

// ─── Job de monitoreo de almacenamiento (cada hora) ───────────────────────────
const startStorageMonitor = () => {
  const fs = require('fs');
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  const WARN_THRESHOLD_MB = 800; // Notificar si supera 800 MB (~80% de 1 GB)
  
  const checkStorage = () => {
    try {
      let totalBytes = 0;
      const walkDir = (dir) => {
        if (!fs.existsSync(dir)) return;
        fs.readdirSync(dir).forEach(file => {
          const fullPath = path.join(dir, file);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) walkDir(fullPath);
            else totalBytes += stat.size;
          } catch (_) {}
        });
      };
      walkDir(uploadsDir);
      const totalMB = totalBytes / (1024 * 1024);
      console.log(`📁 Almacenamiento uploads: ${totalMB.toFixed(1)} MB`);
      if (totalMB > WARN_THRESHOLD_MB) {
        const { sendPushToAdmins } = require('./services/pushService');
        sendPushToAdmins(
          '⚠️ Almacenamiento casi lleno',
          `El volumen de uploads ocupa ${totalMB.toFixed(0)} MB. Considera limpiar eventos finalizados.`,
          { tag: 'storage-warning', url: 'http://72.62.170.115:3000/projects/studio5/app/studio5-tickets/storage' }
        );
      }
    } catch (err) {
      console.error('Error en monitoreo de almacenamiento:', err.message);
    }
  };

  // Revisar al inicio y luego cada hora
  setTimeout(checkStorage, 30000);
  setInterval(checkStorage, 60 * 60 * 1000);
};

initDatabase()
  .then(() => runMigrations())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(`🔌 CONFIGURACIÓN DE CONEXIÓN A BASE DE DATOS:`);
      console.log(`  - Host: ${process.env.DB_HOST || 'localhost (default)'}`);
      console.log(`  - Database: ${process.env.DB_DATABASE || 'studio5_tickets (default)'}`);
      console.log(`  - User: ${process.env.DB_USER || 'postgres (default)'}`);
      console.log(`  - Port: ${process.env.DB_PORT || '5432 (default)'}`);
      console.log(`==================================================`);
      console.log(`Servidor de Tickets corriendo en el puerto ${PORT}`);
      console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
    });
    startStorageMonitor();
  })
  .catch(err => {
    console.error('❌ Error durante la inicialización del servidor:', err);
  });
