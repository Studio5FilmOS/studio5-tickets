const fs = require('fs');
const path = require('path');
const { query } = require('./db');

// Hash bcrypt de 'password123' — contraseña por defecto de admin/staff
const DEFAULT_HASH = '$2a$10$35QT8095H557PUDT0G.ipehs5K.kJ9aePeofBqtghPRIrXNJXd0Wa';

/**
 * Ejecuta un archivo SQL dividiendo por punto y coma,
 * ignorando comentarios. Necesario porque el driver `pg`
 * no soporta múltiples sentencias en un solo query().
 */
const runSqlFile = async (filePath) => {
  const sql = fs.readFileSync(filePath, 'utf8');
  const cleanSql = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const statements = cleanSql.split(';').map(s => s.trim()).filter(s => s.length > 5);
  for (const stmt of statements) {
    try {
      await query(stmt);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.warn(`⚠️ SQL warning: ${err.message}`);
      }
    }
  }
};

/**
 * Aplica migraciones seguras (ADD COLUMN IF NOT EXISTS) en cada deploy.
 */
const applyMigrations = async () => {
  const safe = async (sql) => { try { await query(sql); } catch (e) { /* already exists */ } };
  await safe("ALTER TABLE events ALTER COLUMN banner_url TYPE TEXT;");
  await safe("ALTER TABLE events ALTER COLUMN ticket_template_url TYPE TEXT;");
  await safe("ALTER TABLE event_clues ALTER COLUMN image_url TYPE TEXT;");
  await safe("ALTER TABLE events ADD COLUMN IF NOT EXISTS require_billing BOOLEAN NOT NULL DEFAULT FALSE;");
  await safe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_final_consumer BOOLEAN NOT NULL DEFAULT TRUE;");
  await safe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_id_number VARCHAR(50);");
  await safe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_name VARCHAR(255);");
  await safe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_address VARCHAR(255);");
  await safe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);");
  await safe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS comprobante_url TEXT;");
  
  await safe(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      bank_name VARCHAR(255) NOT NULL,
      account_type VARCHAR(100) NOT NULL,
      account_number VARCHAR(100) NOT NULL,
      owner_name VARCHAR(255) NOT NULL,
      owner_id VARCHAR(50) NOT NULL,
      owner_email VARCHAR(255),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  try {
    const bankCheck = await query("SELECT COUNT(*)::integer FROM bank_accounts;");
    if (bankCheck.rows[0].count === 0) {
      await query(`
        INSERT INTO bank_accounts (bank_name, account_type, account_number, owner_name, owner_id, owner_email, is_active)
        VALUES ('Banco Pichincha', 'Ahorros', '2200888333', 'Studio 5 Film', '1722883344', 'ventas@studio5film.com', true);
      `);
      console.log('✅ Cuenta bancaria semilla insertada.');
    }
  } catch (err) {
    console.error('Error seeding bank_accounts table:', err.message);
  }

  // Tabla de suscripciones push (notificaciones web)
  await safe(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Columna comprobante_url en orders (si no existe ya)
  await safe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS comprobante_url TEXT;");

  console.log('✅ Migraciones de columnas aplicadas correctamente.');
};

/**
 * UPSERT de usuarios admin/staff — corre siempre en cada deploy
 * para garantizar que las credenciales funcionen sin importar el estado de la BD.
 */
const upsertAdminUsers = async () => {
  await query(`
    INSERT INTO users (name, email, phone, password_hash, role) VALUES
    ('Administrador Studio 5', 'admin@studio5.com', '0999999999', '${DEFAULT_HASH}', 'admin'),
    ('Staff Puerta 1', 'staff@studio5.com', '0888888888', '${DEFAULT_HASH}', 'staff')
    ON CONFLICT (email) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role,
      name = EXCLUDED.name;
  `);
  console.log('✅ Usuarios admin/staff creados o verificados (contraseña: password123).');
};

const initDatabase = async () => {
  try {
    // PASO 1: Verificar qué tablas existen
    const check = async (table) => {
      const r = await query(`SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='${table}')`);
      return r.rows[0].exists;
    };

    const usersExists = await check('users');
    const eventsExists = await check('events');
    const ordersExists = await check('orders');

    console.log(`📊 Tablas: users=${usersExists}, events=${eventsExists}, orders=${ordersExists}`);

    // Si alguna tabla crítica falta, crear todas las tablas
    if (!usersExists || !eventsExists || !ordersExists) {
      console.log('⚠️ Tablas faltantes. Inicializando esquema...');
      const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
      await runSqlFile(schemaPath);
      console.log('✅ Esquema creado correctamente.');
    } else {
      console.log('✅ Base de datos ya inicializada.');
    }

    // PASO 2: SIEMPRE actualizar/crear usuarios admin y staff
    await upsertAdminUsers();

    // PASO 3: SIEMPRE aplicar migraciones de columnas
    await applyMigrations();

  } catch (err) {
    console.error('❌ Error al inicializar base de datos:', err.message);
    console.error(err.stack);
  }
};

module.exports = initDatabase;
