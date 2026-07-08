const fs = require('fs');
const path = require('path');
const { query } = require('./db');

const initDatabase = async () => {
  try {
    // 1. Verificar si las tablas críticas ya existen usando pg_tables (más rápido y específico)
    const tableCheck = await query(
      "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users')"
    );
    const usersTableExists = tableCheck.rows[0].exists;
    
    const eventsTableCheck = await query(
      "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events')"
    );
    const eventsTableExists = eventsTableCheck.rows[0].exists;
    
    if (!usersTableExists && !eventsTableExists) {
      console.log('⚠️ Base de datos vacía detectada. Inicializando esquema...');
      
      // Leer y ejecutar schema.sql
      const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await query(schemaSql);
      console.log('✅ Tablas del sistema creadas correctamente.');
      
      // En producción, NO debemos insertar eventos semilla demo para evitar confusiones de cartelera.
      // Solo insertaremos las credenciales administrativas de acceso obligatorias.
      if (process.env.NODE_ENV === 'production') {
        console.log('🚀 Modo producción detectado. Creando únicamente usuarios de acceso administrativo...');
        await query(`
          INSERT INTO users (name, email, phone, password_hash, role) VALUES
          ('Administrador Studio 5', 'admin@studio5.com', '0999999999', '$2a$10$35QT8095H557PUDT0G.ipehs5K.kJ9aePeofBqtghPRIrXNJXd0Wa', 'admin'),
          ('Staff Puerta 1', 'staff@studio5.com', '0888888888', '$2a$10$35QT8095H557PUDT0G.ipehs5K.kJ9aePeofBqtghPRIrXNJXd0Wa', 'staff')
          ON CONFLICT (email) DO NOTHING;
        `);
        console.log('✅ Usuarios administrativos de producción creados.');
      } else {
        console.log('📦 Modo desarrollo/local detectado. Insertando eventos de demostración...');
        const seedsPath = path.join(__dirname, '..', 'database', 'seeds.sql');
        const seedsSql = fs.readFileSync(seedsPath, 'utf8');
        await query(seedsSql);
        console.log('✅ Datos semilla e iniciales insertados con éxito.');
      }
    } else {
      console.log('Base de datos ya inicializada. Cargando tablas existentes.');
      
      if (usersTableExists) {
        // Asegurar que las credenciales semilla tengan el hash correcto
        // Contraseña: password123
        await query(
          "UPDATE users SET password_hash = '$2a$10$35QT8095H557PUDT0G.ipehs5K.kJ9aePeofBqtghPRIrXNJXd0Wa' WHERE email IN ('admin@studio5.com', 'staff@studio5.com')"
        );
        console.log('Credenciales de administrador y staff verificadas/actualizadas.');
      }

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
    console.error('❌ Fallo al inicializar base de datos de forma automática:', err);
  }
};

module.exports = initDatabase;
