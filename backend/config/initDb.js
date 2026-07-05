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
      // Asegurar que las credenciales semilla tengan el hash correcto
      // Contraseña: Studio5Admin2026!
      await query(
        "UPDATE users SET password_hash = '$2a$10$pQkAJlbvbPvPE1Uk2D0MFOVl3dAtcXCFN9ICL2wCScNiDXZdm4oRK' WHERE email IN ('admin@studio5.com', 'staff@studio5.com')"
      );
      console.log('Credenciales de administrador y staff verificadas/actualizadas.');

      // Alterar columnas para soportar base64 si no se ha hecho (seguro en re-deploys)
      const alterSafe = async (sql) => {
        try { await query(sql); } catch (e) { /* columna ya modificada, ignorar */ }
      };
      await alterSafe("ALTER TABLE events ALTER COLUMN banner_url TYPE TEXT;");
      await alterSafe("ALTER TABLE events ALTER COLUMN ticket_template_url TYPE TEXT;");
      await alterSafe("ALTER TABLE event_clues ALTER COLUMN image_url TYPE TEXT;");
      console.log('Migración de columnas TEXT de imágenes completada.');
    }
  } catch (err) {
    console.error('Fallo al inicializar base de datos de forma automática:', err);
  }
};

module.exports = initDatabase;
