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
    
    // 1. Buscar el evento "Enredados"
    const eventRes = await client.query(
      "SELECT * FROM events WHERE title ILIKE '%Enredados%' LIMIT 1"
    );
    
    if (eventRes.rows.length === 0) {
      console.log('❌ ERROR: No se encontró ningún evento con el título "Enredados".');
      console.log('Por favor, asegúrate de crear el evento primero desde el panel de administración.');
      return;
    }
    
    const event = eventRes.rows[0];
    console.log(`✅ Evento encontrado: "${event.title}" (ID: ${event.id})`);
    
    // 2. Buscar la función (schedule) del 18 de Julio de 2026 (08:00 PM / 20:00)
    const scheduleRes = await client.query(
      "SELECT * FROM event_schedules WHERE event_id = $1 ORDER BY schedule_time ASC",
      [event.id]
    );
    
    if (scheduleRes.rows.length === 0) {
      console.log(`❌ ERROR: No se encontraron funciones (horarios) para el evento "${event.title}".`);
      console.log('Por favor, agrega el horario del sábado 18 de julio de 2026 a las 20:00 (08:00 PM) al evento.');
      return;
    }
    
    // Buscar la función que sea del 18 de julio de 2026
    let targetSchedule = null;
    for (const sch of scheduleRes.rows) {
      const schDate = new Date(sch.schedule_time);
      // Ajustado a la zona horaria de Ecuador (UTC-5) o local
      console.log(`   Función disponible: ${sch.schedule_time} (${schDate.toISOString()})`);
      
      const day = schDate.getUTCDate();
      const month = schDate.getUTCMonth() + 1; // 0-indexed
      const year = schDate.getUTCFullYear();
      
      // Si coincide con el 18 de Julio de 2026
      // También verificamos con la zona horaria local en caso de que esté guardada localmente
      if ((schDate.getDate() === 18 && schDate.getMonth() === 6 && schDate.getFullYear() === 2026) ||
          (day === 18 && month === 7 && year === 2026)) {
        targetSchedule = sch;
        break;
      }
    }
    
    if (!targetSchedule) {
      console.log('❌ ERROR: No se encontró una función para el 18 de Julio de 2026.');
      console.log('Por favor, crea el horario de esa función en la cartelera del administrador.');
      return;
    }
    
    console.log(`✅ Función seleccionada: ${targetSchedule.schedule_time} (ID: ${targetSchedule.id})`);
    
    // 3. Verificar si la orden ya existe
    const orderCheck = await client.query(
      "SELECT * FROM orders WHERE transaction_ref = '88421289' OR order_num = 'ORD-1783370086305'"
    );
    
    if (orderCheck.rows.length > 0) {
      console.log('⚠️ LA ORDEN YA EXISTE EN LA BASE DE DATOS. No se realizaron cambios.');
      return;
    }
    
    // Iniciar transacción
    await client.query('BEGIN');
    
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
      orderNum, clientName, clientEmail, clientPhone, event.id, targetSchedule.id,
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
