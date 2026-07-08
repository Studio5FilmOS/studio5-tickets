/**
Script de inserción manual de boletos - LADY CARRILLO
Este script busca el evento "Enredados" y la función del 18 de Julio de 2026 a las 20:00
e inserta la orden y el boleto correspondiente.
**/

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_DATABASE,
});

async function execute() {
  const client = await pool.connect();
  try {
    console.log('🔌 Conectando a la base de datos...');
    
    // Iniciar transacción
    await client.query('BEGIN');
    
    // 1. Buscar o crear el evento "Enredados"
    let eventId;
    const eventCheck = await client.query(
      "SELECT id FROM events WHERE title ILIKE '%Enredados%' LIMIT 1"
    );
    
    if (eventCheck.rows.length > 0) {
      eventId = eventCheck.rows[0].id;
      console.log(`✅ Evento "Enredados" encontrado (ID: ${eventId})`);
    } else {
      console.log('📝 Creando evento "Enredados" en la base de datos...');
      const eventInsertRes = await client.query(`
        INSERT INTO events (title, description, venue, banner_url, ticket_template_url, price_adult, price_child, capacity_total, is_single_rate, has_assigned_seats, seating_layout, promo_type, price_promo, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [
        'Enredados', 'Una producción de Studio 5 Film & Art.', 'Sala La Bota', 
        'https://i.imgur.com/0z5756T.png', null, 15.00, 0.00, 150, true, false, null, 'Preventa', 10.00, 'active'
      ]);
      eventId = eventInsertRes.rows[0].id;
      console.log(`✅ Evento "Enredados" creado (ID: ${eventId})`);
    }
    
    // 2. Buscar o crear la función (schedule) del 18 de Julio de 2026 (08:00 PM / 20:00)
    let scheduleId;
    const scheduleTime = '2026-07-18 20:00:00-05';
    const scheduleCheck = await client.query(
      "SELECT id FROM event_schedules WHERE event_id = $1 AND schedule_time = $2 LIMIT 1",
      [eventId, scheduleTime]
    );
    
    if (scheduleCheck.rows.length > 0) {
      scheduleId = scheduleCheck.rows[0].id;
      console.log(`✅ Horario del 18 de Julio encontrado (ID: ${scheduleId})`);
    } else {
      console.log('📝 Creando horario del 18 de Julio (20:00)...');
      const scheduleInsertRes = await client.query(`
        INSERT INTO event_schedules (event_id, schedule_time)
        VALUES ($1, $2)
        RETURNING id
      `, [eventId, scheduleTime]);
      scheduleId = scheduleInsertRes.rows[0].id;
      console.log(`✅ Horario del 18 de Julio creado (ID: ${scheduleId})`);
    }
    
    // 3. Verificar si la orden ya existe
    const orderCheck = await client.query(
      "SELECT * FROM orders WHERE transaction_ref = '88421289' OR order_num = 'ORD-1783370086305'"
    );
    
    if (orderCheck.rows.length > 0) {
      console.log('⚠️ LA ORDEN YA EXISTE EN LA BASE DE DATOS. No se realizaron cambios.');
      await client.query('ROLLBACK');
      return;
    }
    
    const orderNum = 'ORD-1783370086305';
    const clientName = 'LADY CARRILLO';
    const clientEmail = 'ladycarrillo_201@hotmail.com';
    const clientPhone = '593990846630';
    const docNumber = '0955189675';
    const txRef = '88421289';
    
    console.log('📝 Insertando orden de compra...');
    const orderRes = await client.query(`
      INSERT INTO orders (
        order_num, buyer_id, customer_name, customer_email, customer_whatsapp, event_id, schedule_id,
        operation_type, payment_method, payment_status, amount_total, amount_net,
        ticket_count_adult, ticket_count_child, transaction_ref, is_final_consumer,
        billing_id_number, billing_name, billing_email
      )
      VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id, order_num
    `, [
      orderNum, clientName, clientEmail, clientPhone, eventId, scheduleId,
      'Venta', 'Payphone', 'Pagado', 10.76, 10.00,
      1, 0, txRef, false,
      docNumber, clientName, clientEmail
    ]);
    
    const orderId = orderRes.rows[0].id;
    console.log(`✅ Orden insertada con éxito: #${orderRes.rows[0].order_num}`);
    
    console.log('🎟️ Creando ticket individual...');
    const ticketCode = 'TKT-1783370086305-1';
    await client.query(`
      INSERT INTO tickets (order_id, ticket_code, ticket_type, seat_label, status)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      orderId, ticketCode, 'General', null, 'Active'
    ]);
    
    console.log(`✅ Ticket creado con código: ${ticketCode}`);
    
    await client.query('COMMIT');
    console.log('🎉 CLIENTE Y TICKET REGISTRADOS CON ÉXITO EN LA BASE DE DATOS.');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ ERROR DURANTE LA INSERCIÓN:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

execute();
