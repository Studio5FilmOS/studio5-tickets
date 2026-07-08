const fs = require('fs');
const path = require('path');
const { query, pool } = require('./db');

/**
 * Ejecuta un archivo SQL dividiendo por punto y coma, 
 * ignorando comentarios. Esto es necesario porque el driver `pg`
 * no soporta múltiples sentencias en un solo query().
 */
const runSqlFile = async (filePath) => {
  const sql = fs.readFileSync(filePath, 'utf8');
  // Eliminar comentarios de una línea (-- ...) y multilínea (/* ... */)
  const cleanSql = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  
  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 5); // ignorar fragmentos vacíos

  for (const stmt of statements) {
    try {
      await query(stmt);
    } catch (err) {
      // Ignorar errores de "ya existe" que son normales con IF NOT EXISTS
      if (!err.message.includes('already exists')) {
        console.warn(`⚠️ Advertencia al ejecutar SQL: ${err.message}`);
      }
    }
  }
};

/**
 * Aplica migraciones seguras (ALTER TABLE ... ADD COLUMN IF NOT EXISTS)
 * para columnas que se agregaron después de la creación inicial del schema.
 * Esto es seguro de correr en cada deploy.
 */
const applyMigrations = async () => {
  const alterSafe = async (sql) => {
    try { await query(sql); } catch (e) { /* ignorar si ya existe */ }
  };

  // Migración: columnas TEXT para imágenes (base64)
  await alterSafe("ALTER TABLE events ALTER COLUMN banner_url TYPE TEXT;");
  await alterSafe("ALTER TABLE events ALTER COLUMN ticket_template_url TYPE TEXT;");
  await alterSafe("ALTER TABLE event_clues ALTER COLUMN image_url TYPE TEXT;");

  // Migración: columna de requerimiento de facturación en eventos
  await alterSafe("ALTER TABLE events ADD COLUMN IF NOT EXISTS require_billing BOOLEAN NOT NULL DEFAULT FALSE;");

  // Migración: columnas de facturación en órdenes
  await alterSafe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_final_consumer BOOLEAN NOT NULL DEFAULT TRUE;");
  await alterSafe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_id_number VARCHAR(50);");
  await alterSafe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_name VARCHAR(255);");
  await alterSafe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_address VARCHAR(255);");
  await alterSafe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);");

  console.log('✅ Migraciones de columnas aplicadas correctamente.');
};

const initDatabase = async () => {
  try {
    // PASO 1: Verificar si las tablas existen, creando el schema si no están
    const usersCheck = await query(
      "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users')"
    );
    const eventsCheck = await query(
      "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events')"
    );
    const ordersCheck = await query(
      "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders')"
    );

    const usersExists = usersCheck.rows[0].exists;
    const eventsExists = eventsCheck.rows[0].exists;
    const ordersExists = ordersCheck.rows[0].exists;

    console.log(`📊 Estado de tablas: users=${usersExists}, events=${eventsExists}, orders=${ordersExists}`);

    // Si ALGUNA tabla crítica falta, ejecutar el schema completo
    if (!usersExists || !eventsExists || !ordersExists) {
      console.log('⚠️ Tablas faltantes detectadas. Inicializando esquema...');
      const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
      await runSqlFile(schemaPath);
      console.log('✅ Esquema de base de datos creado correctamente.');

      // Crear usuarios admin por defecto
      await query(`
        INSERT INTO users (name, email, phone, password_hash, role) VALUES
        ('Administrador Studio 5', 'admin@studio5.com', '0999999999', '$2a$10$35QT8095H557PUDT0G.ipehs5K.kJ9aePeofBqtghPRIrXNJXd0Wa', 'admin'),
        ('Staff Puerta 1', 'staff@studio5.com', '0888888888', '$2a$10$35QT8095H557PUDT0G.ipehs5K.kJ9aePeofBqtghPRIrXNJXd0Wa', 'staff')
        ON CONFLICT (email) DO NOTHING;
      `);
      console.log('✅ Usuarios administrativos creados.');
    } else {
      console.log('✅ Base de datos ya inicializada.');
      // Actualizar credenciales por si acaso
      await query(
        "UPDATE users SET password_hash = '$2a$10$35QT8095H557PUDT0G.ipehs5K.kJ9aePeofBqtghPRIrXNJXd0Wa' WHERE email IN ('admin@studio5.com', 'staff@studio5.com')"
      );
    }

    // PASO 2: SIEMPRE aplicar migraciones (seguro en cada deploy)
    await applyMigrations();

  } catch (err) {
    console.error('❌ Fallo al inicializar base de datos:', err.message);
    console.error(err.stack);
  }
};

module.exports = initDatabase;
