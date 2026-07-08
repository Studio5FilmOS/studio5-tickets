const { Pool } = require('pg');
require('dotenv').config();

// SIEMPRE usar variables individuales DB_* configuradas en Easypanel.
// Si existe DATABASE_URL pero también están definidas las variables individuales,
// las variables individuales tienen PRIORIDAD (evita conexión a bases de datos incorrectas).
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_DATABASE || 'studio5_tickets',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log(`✅ PostgreSQL conectado: host=${process.env.DB_HOST}, db=${process.env.DB_DATABASE}, user=${process.env.DB_USER}`);
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el cliente de base de datos:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
