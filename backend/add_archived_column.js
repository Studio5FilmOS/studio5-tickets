require('dotenv').config();
const { query } = require('./config/db');

async function run() {
  try {
    await query('ALTER TABLE events ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE');
    console.log('Column is_archived added successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error adding column:', err);
    process.exit(1);
  }
}

run();
