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
    const res = await pool.query('SELECT * FROM events');
    console.log('🎟️ Eventos en la base de datos:');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
