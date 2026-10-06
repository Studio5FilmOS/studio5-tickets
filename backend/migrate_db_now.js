const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_DATABASE || 'studio5_tickets',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('🔧 Ejecutando migraciones de base de datos...');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS ticket_count_child INTEGER NOT NULL DEFAULT 0;');
    console.log('✅ Migración exitosa: ticket_count_child agregado a orders.');
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
