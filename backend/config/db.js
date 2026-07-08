const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
} else {
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_DATABASE || 'studio5_tickets',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
}

pool.on('connect', () => {
  console.log('Base de datos PostgreSQL conectada con éxito.');
});

pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de base de datos:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
