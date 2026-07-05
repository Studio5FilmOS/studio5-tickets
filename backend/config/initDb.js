const fs = require('fs');
const path = require('path');
const { query } = require('./db');

const initDatabase = async () => {
  try {
    // Verificar si la tabla 'users' ya existe
    const tableCheck = await query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
    );
    
    if (!tableCheck.rows[0].exists) {
      console.log('Base de datos limpia. Inicializando esquema y semillas...');
      
      // Leer y ejecutar schema.sql
      const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await query(schemaSql);
      console.log('Tablas creadas correctamente.');
      
      // Leer y ejecutar seeds.sql
      const seedsPath = path.join(__dirname, '..', 'database', 'seeds.sql');
      const seedsSql = fs.readFileSync(seedsPath, 'utf8');
      await query(seedsSql);
      console.log('Datos semilla e iniciales insertados con éxito.');
    } else {
      console.log('Base de datos ya inicializada. Cargando tablas existentes.');
    }
  } catch (err) {
    console.error('Fallo al inicializar base de datos de forma automática:', err);
  }
};

module.exports = initDatabase;
