const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_DATABASE,
});

async function main() {
  try {
    const res = await pool.query('SELECT current_database(), current_user');
    console.log('✅ Conectado a la base de datos:', res.rows[0]);
    
    const tables = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    console.log('📋 Tablas encontradas:', tables.rows.map(r => r.tablename));
    
    // Si la tabla events existe, listar los eventos
    const hasEventsTable = tables.rows.some(r => r.tablename === 'events');
    if (hasEventsTable) {
      const events = await pool.query('SELECT id, title FROM events');
      console.log('🎟️ Eventos en esta base de datos:', events.rows);
    } else {
      console.log('❌ La tabla "events" NO existe en esta base de datos.');
    }
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
  } finally {
    await pool.end();
  }
}

main();
