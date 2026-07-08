const fs = require('fs');
const path = require('path');
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
  const client = await pool.connect();
  try {
    console.log('🔌 Conectando a la base de datos...');
    
    // Leer schema.sql
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Intentar crear la extensión uuid-ossp primero por separado
    console.log('📦 Intentando habilitar la extensión uuid-ossp...');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      console.log('✅ Extensión uuid-ossp habilitada.');
    } catch (err) {
      console.warn('⚠️ No se pudo crear la extensión uuid-ossp directamente:', err.message);
      console.log('Intentando continuar...');
    }

    // Eliminar comentarios de una línea (-- ...) y comentarios multilínea (/* ... */)
    const cleanSql = schemaSql
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');

    // Dividir el archivo SQL en comandos por el punto y coma (;)
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`🎬 Ejecutando ${statements.length} sentencias del esquema...`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      // Saltar la línea de CREATE EXTENSION que ya manejamos
      if (stmt.toLowerCase().includes('create extension')) continue;
      
      const firstLine = stmt.split('\n')[0].trim();
      console.log(`⏳ Ejecutando: ${firstLine}...`);
      try {
        await client.query(stmt);
        console.log(`   ✅ Completado.`);
      } catch (err) {
        console.error(`   ❌ ERROR en sentencia:`, err.message);
      }
    }
    
    console.log('🏁 Proceso de creación de esquema finalizado.');
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
