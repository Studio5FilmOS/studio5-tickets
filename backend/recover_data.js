/**
 * SCRIPT DE RECUPERACIÓN DE DATOS - Studio 5 Tickets
 * ====================================================
 * CÓMO USARLO:
 *   1. Este script debe correr DENTRO del contenedor de studio5-tickets en el VPS
 *      (usa la red interna de Docker para conectar a studio5-db)
 *   2. Ejecutar via Easypanel → studio5-tickets → Terminal:
 *      node recover_data.js
 *
 * QUÉ HACE:
 *   - Se conecta a la BD ANTIGUA (studio5-db) en modo SOLO LECTURA
 *   - Muestra PRIMERO todas las tablas encontradas para que veas cuáles existen
 *   - Solo copia las tablas del sistema de tickets (events, orders, tickets, etc.)
 *   - IGNORA completamente cualquier tabla de la otra app
 *   - Importa los datos a la BD NUEVA (tickets-db)
 */

require('dotenv').config();
const { Client } = require('pg');

// =========================================================
// TABLAS QUE PERTENECEN EXCLUSIVAMENTE AL SISTEMA DE TICKETS
// Cualquier otra tabla de la BD antigua será IGNORADA
// =========================================================
const TICKETS_TABLES = [
  'users',
  'events',
  'event_schedules',
  'orders',
  'tickets',
  'promotions',
  'event_polls',
  'poll_votes',
  'event_clues',
];

// Columnas clave que IDENTIFICAN que una tabla es del sistema de tickets
// Si la tabla NO tiene estas columnas, NO se importa (es de la otra app)
const TABLE_FINGERPRINTS = {
  users:           ['id', 'name', 'email', 'role', 'password_hash'],
  events:          ['id', 'title', 'venue', 'price_adult', 'capacity_total'],
  event_schedules: ['id', 'event_id', 'schedule_time'],
  orders:          ['id', 'order_num', 'event_id', 'payment_status', 'amount_total'],
  tickets:         ['id', 'order_id', 'ticket_code', 'ticket_type'],
  promotions:      ['id', 'title', 'active'],
  event_polls:     ['id', 'event_id', 'question', 'options'],
  poll_votes:      ['id', 'poll_id', 'ticket_id', 'selected_option'],
  event_clues:     ['id', 'event_id', 'content', 'is_revealed'],
};

// =========================================================
// CONEXIONES A BASE DE DATOS
// =========================================================

// BD ANTIGUA — usando red interna de Docker (host interno de Easypanel)
const OLD_DB_CONFIG = {
  host: 'studio5_studio5-db',   // Nombre interno de Docker del contenedor antiguo
  port: 5432,
  user: 'postgres',
  password: 'Studio5_Master_2026',
  database: 'studio5',          // La BD compartida de la otra app
  connectionTimeoutMillis: 15000,
};

// BD NUEVA — usando las variables de entorno ya configuradas en el contenedor
const NEW_DB_CONFIG = {
  host: process.env.DB_HOST || 'studio5_tickets-db',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'tickets_user',
  password: process.env.DB_PASSWORD || 'Tickets_Studio5_2026',
  database: process.env.DB_DATABASE || 'studio5_tickets',
  connectionTimeoutMillis: 15000,
};

// =========================================================
// VERIFICAR QUE UNA TABLA TIENE LAS COLUMNAS DE TICKETS
// =========================================================
async function verifyTableIsTickets(client, tableName) {
  try {
    const res = await client.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = $1`,
      [tableName]
    );
    const existingCols = res.rows.map(r => r.column_name);
    const requiredCols = TABLE_FINGERPRINTS[tableName] || [];
    const hasAllCols = requiredCols.every(col => existingCols.includes(col));
    return { exists: res.rows.length > 0, isTickets: hasAllCols, columns: existingCols };
  } catch (e) {
    return { exists: false, isTickets: false, columns: [] };
  }
}

// =========================================================
// PASO 1: EXPLORAR LA BD ANTIGUA
// =========================================================
async function explorateOldDB(client) {
  console.log('\n🔍 EXPLORANDO LA BD ANTIGUA (studio5)...');
  console.log('   (Solo lectura — no se modifica nada todavía)\n');

  // Listar TODAS las tablas existentes en la BD antigua
  const allTablesRes = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );
  const allTables = allTablesRes.rows.map(r => r.tablename);

  console.log(`📋 Tablas encontradas en la BD antigua (${allTables.length} en total):`);
  for (const t of allTables) {
    const isTicketTable = TICKETS_TABLES.includes(t);
    const icon = isTicketTable ? '🎟️' : '🔵';
    const label = isTicketTable ? ' ← TABLA DE TICKETS (se importará)' : ' ← otra app (se IGNORA)';
    console.log(`   ${icon} ${t}${label}`);
  }

  console.log('\n📊 Verificando tablas de tickets (que tengan las columnas correctas)...\n');

  const data = {};
  let totalRecords = 0;

  for (const tableName of TICKETS_TABLES) {
    if (!allTables.includes(tableName)) {
      console.log(`   ⬜ ${tableName}: no existe en la BD antigua`);
      data[tableName] = [];
      continue;
    }

    // Verificar que las columnas coincidan (evitar confusión con la otra app)
    const check = await verifyTableIsTickets(client, tableName);

    if (!check.isTickets) {
      console.log(`   ⛔ ${tableName}: existe pero NO tiene las columnas de tickets → IGNORADA`);
      console.log(`      Columnas encontradas: ${check.columns.join(', ')}`);
      data[tableName] = [];
      continue;
    }

    // Contar y extraer registros
    const countRes = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
    const count = parseInt(countRes.rows[0].count);

    if (count > 0) {
      const rows = await client.query(`SELECT * FROM ${tableName} ORDER BY created_at ASC NULLS LAST`);
      data[tableName] = rows.rows;
      totalRecords += count;
      console.log(`   ✅ ${tableName}: ${count} registro(s) → SE IMPORTARÁ`);
    } else {
      data[tableName] = [];
      console.log(`   ⬜ ${tableName}: existe pero está vacía`);
    }
  }

  console.log(`\n   📦 Total a importar: ${totalRecords} registro(s)`);
  return data;
}

// =========================================================
// PASO 2: IMPORTAR DATOS A LA BD NUEVA
// =========================================================
async function importData(client, data) {
  console.log('\n📥 IMPORTANDO DATOS A LA BD NUEVA (tickets-db)...\n');

  // Desactivar restricciones de FK temporalmente para importar en orden
  await client.query('SET session_replication_role = replica;');

  let imported = 0;
  let skipped = 0;

  // ── Usuarios ──────────────────────────────────────────
  for (const row of (data.users || [])) {
    try {
      await client.query(
        `INSERT INTO users (id, name, email, phone, password_hash, role, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [row.id, row.name, row.email, row.phone, row.password_hash, row.role, row.created_at, row.updated_at]
      );
      imported++;
    } catch (e) { skipped++; }
  }

  // ── Eventos ───────────────────────────────────────────
  for (const row of (data.events || [])) {
    try {
      await client.query(
        `INSERT INTO events (id, title, description, venue, banner_url, ticket_template_url,
           price_adult, price_child, capacity_total, is_single_rate, has_assigned_seats,
           seating_layout, promo_type, price_promo, promo_deadline, status,
           require_billing, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.title, row.description, row.venue, row.banner_url, row.ticket_template_url,
         row.price_adult, row.price_child, row.capacity_total, row.is_single_rate, row.has_assigned_seats,
         row.seating_layout, row.promo_type, row.price_promo, row.promo_deadline, row.status,
         row.require_billing || false, row.created_at, row.updated_at]
      );
      console.log(`   🎭 Evento importado: "${row.title}"`);
      imported++;
    } catch (e) {
      console.log(`   ⚠️  Evento "${row.title}": ${e.message}`);
      skipped++;
    }
  }

  // ── Horarios ──────────────────────────────────────────
  for (const row of (data.event_schedules || [])) {
    try {
      await client.query(
        `INSERT INTO event_schedules (id, event_id, schedule_time, created_at)
         VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
        [row.id, row.event_id, row.schedule_time, row.created_at]
      );
      imported++;
    } catch (e) { skipped++; }
  }
  if (data.event_schedules?.length > 0)
    console.log(`   📅 Horarios importados: ${data.event_schedules.length}`);

  // ── Órdenes/Ventas ────────────────────────────────────
  for (const row of (data.orders || [])) {
    try {
      await client.query(
        `INSERT INTO orders (id, order_num, buyer_id, customer_name, customer_email, customer_whatsapp,
           event_id, schedule_id, operation_type, payment_method, payment_status,
           amount_total, amount_net, ticket_count_adult, ticket_count_child,
           transaction_ref, bank_name, is_final_consumer, billing_id_number,
           billing_name, billing_address, billing_email, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.order_num, row.buyer_id, row.customer_name, row.customer_email, row.customer_whatsapp,
         row.event_id, row.schedule_id, row.operation_type, row.payment_method, row.payment_status,
         row.amount_total, row.amount_net || row.amount_total, row.ticket_count_adult, row.ticket_count_child,
         row.transaction_ref, row.bank_name, row.is_final_consumer !== false,
         row.billing_id_number, row.billing_name, row.billing_address, row.billing_email,
         row.created_at, row.updated_at]
      );
      console.log(`   💳 Venta importada: Orden #${row.order_num} — ${row.customer_name} — $${row.amount_total} (${row.payment_status})`);
      imported++;
    } catch (e) {
      console.log(`   ⚠️  Orden ${row.order_num}: ${e.message}`);
      skipped++;
    }
  }

  // ── Tickets individuales ──────────────────────────────
  for (const row of (data.tickets || [])) {
    try {
      await client.query(
        `INSERT INTO tickets (id, order_id, ticket_code, ticket_type, seat_label, status, checked_in_at, checked_in_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [row.id, row.order_id, row.ticket_code, row.ticket_type, row.seat_label,
         row.status, row.checked_in_at, row.checked_in_by, row.created_at]
      );
      imported++;
    } catch (e) { skipped++; }
  }
  if (data.tickets?.length > 0)
    console.log(`   🎫 Tickets individuales importados: ${data.tickets.length}`);

  // ── Promociones ───────────────────────────────────────
  for (const row of (data.promotions || [])) {
    try {
      await client.query(
        `INSERT INTO promotions (id, title, subtitle, image_url, link_url, active, start_date, end_date, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [row.id, row.title, row.subtitle, row.image_url, row.link_url, row.active,
         row.start_date, row.end_date, row.created_at, row.updated_at]
      );
      imported++;
    } catch (e) { skipped++; }
  }

  // Restaurar restricciones FK
  await client.query('SET session_replication_role = DEFAULT;');

  return { imported, skipped };
}

// =========================================================
// MAIN
// =========================================================
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  RECUPERADOR DE DATOS — Studio 5 Tickets');
  console.log('='.repeat(60));
  console.log(`  BD Origen : ${OLD_DB_CONFIG.host} / ${OLD_DB_CONFIG.database}`);
  console.log(`  BD Destino: ${NEW_DB_CONFIG.host} / ${NEW_DB_CONFIG.database}`);
  console.log('='.repeat(60));

  // --- Conectar a BD antigua (solo lectura) ---
  const oldClient = new Client(OLD_DB_CONFIG);
  try {
    await oldClient.connect();
    console.log('\n✅ Conectado a BD ANTIGUA (solo lectura)');
  } catch (err) {
    console.error('\n❌ Error conectando a BD antigua:', err.message);
    console.log('\nSugerencia: Verifica que el host "studio5_studio5-db" sea correcto.');
    console.log('Puedes verlo en Easypanel → studio5 → studio5-db → Credenciales → "Internal Host"\n');
    process.exit(1);
  }

  // --- Explorar y extraer solo datos de tickets ---
  let extractedData;
  try {
    extractedData = await explorateOldDB(oldClient);
  } finally {
    await oldClient.end();
    console.log('\n   (Conexión a BD antigua cerrada)');
  }

  const hasData = Object.values(extractedData).some(arr => arr.length > 0);
  if (!hasData) {
    console.log('\n⚠️  No se encontraron datos de tickets en la BD antigua.');
    console.log('   Los datos podrían estar bajo otro nombre de base de datos.');
    console.log('   Verifica en Easypanel cuál era el DB_DATABASE original.\n');
    process.exit(0);
  }

  // --- Conectar a BD nueva ---
  const newClient = new Client(NEW_DB_CONFIG);
  try {
    await newClient.connect();
    console.log('\n✅ Conectado a BD NUEVA');
  } catch (err) {
    console.error('\n❌ Error conectando a BD nueva:', err.message);
    process.exit(1);
  }

  // --- Importar ---
  let result;
  try {
    result = await importData(newClient, extractedData);
  } finally {
    await newClient.end();
  }

  console.log('\n' + '='.repeat(60));
  console.log('  ✅ RECUPERACIÓN COMPLETADA');
  console.log(`  Registros importados : ${result.imported}`);
  console.log(`  Omitidos (duplicados): ${result.skipped}`);
  console.log('='.repeat(60));
  console.log('\n  Ahora ve a https://ticket.studio5film.com');
  console.log('  y verifica que aparezcan los eventos y ventas.\n');
}

main().catch(err => {
  console.error('\n💥 Error inesperado:', err.message);
  process.exit(1);
});
