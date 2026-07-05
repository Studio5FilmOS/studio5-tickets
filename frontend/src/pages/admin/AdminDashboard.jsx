import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { RefreshCw, Save, Check, X, Info, FileSpreadsheet, DollarSign, Calendar, Search, Users, Sparkles } from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('ventas'); // 'ventas' o 'crear'
  const [orders, setOrders] = useState([]);
  const [events, setEvents] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  
  // Estados para filtros
  const [filterEventId, setFilterEventId] = useState('ALL');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para formulario de nuevo evento
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [ticketTemplateUrl, setTicketTemplateUrl] = useState('');
  const [priceAdult, setPriceAdult] = useState(15.00);
  const [priceChild, setPriceChild] = useState(7.50);
  const [capacityTotal, setCapacityTotal] = useState(12);
  const [isSingleRate, setIsSingleRate] = useState(false);
  const [hasAssignedSeats, setHasAssignedSeats] = useState(true);
  const [seatingLayoutStr, setSeatingLayoutStr] = useState('A1, A2, A3, A4, B1, B2, B3, B4, C1, C2, C3, C4');
  const [promoType, setPromoType] = useState('Ninguna'); // Ninguna, Preventa, 2x1
  const [pricePromo, setPricePromo] = useState(0.00);
  const [promoDeadline, setPromoDeadline] = useState('');
  const [status, setStatus] = useState('active');
  const [fechasStr, setFechasStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar órdenes y eventos
  const fetchData = async () => {
    setLoadingOrders(true);
    try {
      const [ordersRes, eventsRes] = await Promise.all([
        api.get('/orders'),
        api.get('/events')
      ]);
      
      if (ordersRes.data.status === 'OK') {
        setOrders(ordersRes.data.orders);
      }
      if (eventsRes.data.status === 'OK') {
        setEvents(eventsRes.data.events);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudieron obtener los datos de administración.', 'error');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Actualizar estado de pago
  const handleUpdateStatus = async (orderId, currentStatus, newStatus) => {
    if (currentStatus === newStatus) return;

    const confirmRes = await Swal.fire({
      title: `¿Cambiar estado a ${newStatus}?`,
      text: newStatus === 'Anulado' ? 'Esto cancelará el acceso de todos los tickets asociados.' : 'Se activará el acceso y se enviarán los correos correspondientes.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: newStatus === 'Anulado' ? '#ff3b30' : '#F1A51C',
      cancelButtonColor: '#333'
    });

    if (confirmRes.isConfirmed) {
      try {
        const res = await api.patch(`/orders/${orderId}/status`, { payment_status: newStatus });
        if (res.data.status === 'OK') {
          Swal.fire('Actualizado', `Orden marcada como ${newStatus}`, 'success');
          fetchData();
        }
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'No se pudo cambiar el estado de la orden.', 'error');
      }
    }
  };

  // Crear nuevo evento
  const handleCreateEvent = async (e) => {
    e.preventDefault();

    if (!title || !venue || !bannerUrl || !fechasStr) {
      Swal.fire('Error', 'Completa los campos obligatorios y añade al menos una fecha.', 'error');
      return;
    }

    setIsSubmitting(true);

    const schedules = fechasStr.split(',').map(f => {
      const trimmed = f.trim();
      return Date.parse(trimmed) ? new Date(trimmed).toISOString() : null;
    }).filter(f => f !== null);

    let layoutArray = null;
    let actualCapacity = parseInt(capacityTotal);
    
    if (hasAssignedSeats && seatingLayoutStr) {
      layoutArray = seatingLayoutStr.split(',').map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
      actualCapacity = layoutArray.length;
    }

    const payload = {
      title,
      description,
      venue,
      banner_url: bannerUrl,
      ticket_template_url: ticketTemplateUrl || null,
      price_adult: priceAdult,
      price_child: isSingleRate ? 0.00 : priceChild,
      capacity_total: actualCapacity,
      is_single_rate: isSingleRate,
      has_assigned_seats: hasAssignedSeats,
      seating_layout: layoutArray,
      promo_type: promoType,
      price_promo: promoType === 'Preventa' ? pricePromo : 0.00,
      promo_deadline: promoType !== 'Ninguna' && promoDeadline ? new Date(promoDeadline).toISOString() : null,
      status,
      schedules
    };

    try {
      const res = await api.post('/events', payload);
      if (res.data.status === 'OK') {
        Swal.fire('Publicado', 'Evento publicado con éxito.', 'success');
        setTitle('');
        setDescription('');
        setVenue('');
        setBannerUrl('');
        setTicketTemplateUrl('');
        setPriceAdult(15);
        setPriceChild(7.5);
        setCapacityTotal(12);
        setIsSingleRate(false);
        setHasAssignedSeats(true);
        setSeatingLayoutStr('A1, A2, A3, A4, B1, B2, B3, B4, C1, C2, C3, C4');
        setPromoType('Ninguna');
        setPricePromo(0);
        setPromoDeadline('');
        setFechasStr('');
        setActiveTab('ventas');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'Error al guardar evento.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- FILTRADO DE LA LISTA DE ÓRDENES ---
  const filteredOrders = orders.filter(o => {
    // 1. Filtro por Evento
    const matchEvent = filterEventId === 'ALL' || o.event_id === filterEventId;
    
    // 2. Filtro por Estado de Pago
    const matchStatus = filterPaymentStatus === 'ALL' || o.payment_status === filterPaymentStatus;

    // 3. Filtro por Barra de Búsqueda (Nombre, Teléfono o Código de Orden)
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const matchQuery = !normalizedQuery || 
      o.customer_name.toLowerCase().includes(normalizedQuery) ||
      o.order_num.toLowerCase().includes(normalizedQuery) ||
      (o.customer_whatsapp && o.customer_whatsapp.includes(normalizedQuery)) ||
      (o.customer_email && o.customer_email.toLowerCase().includes(normalizedQuery));

    return matchEvent && matchStatus && matchQuery;
  });

  // --- CÁLCULO DE MÉTRICAS CONTABLES EN TIEMPO REAL (Bajo el filtro actual) ---
  const metrics = filteredOrders.reduce((acc, o) => {
    if (o.payment_status === 'Pagado') {
      acc.revenuePaid += parseFloat(o.amount_total) || 0;
    } else if (o.payment_status === 'Pendiente') {
      acc.revenuePending += parseFloat(o.amount_total) || 0;
    } else if (o.payment_status === 'Cortesía') {
      acc.cortesiasCount += (parseInt(o.ticket_count_adult) + parseInt(o.ticket_count_child)) || 0;
    }

    if (o.payment_status !== 'Anulado') {
      acc.totalTicketsSold += (parseInt(o.ticket_count_adult) + parseInt(o.ticket_count_child)) || 0;
    }

    return acc;
  }, {
    revenuePaid: 0,
    revenuePending: 0,
    cortesiasCount: 0,
    totalTicketsSold: 0
  });

  // --- EXPORTAR LISTADO A EXCEL (CSV COMPATIBLE CON EXCEL) ---
  const handleExportToExcel = () => {
    if (filteredOrders.length === 0) {
      Swal.fire('Aviso', 'No hay datos filtrados para exportar.', 'warning');
      return;
    }

    // Cabeceras del Excel
    const headers = [
      'Código Orden',
      'Cliente',
      'Email',
      'WhatsApp',
      'Evento',
      'Función',
      'Adultos',
      'Niños',
      'Entradas Totales',
      'Valor Total ($)',
      'Método Pago',
      'Banco',
      'Ref. Transacción',
      'Estado Pago',
      'Fecha Registro'
    ];

    // Mapear los datos de las filas
    const rows = filteredOrders.map(o => {
      const dateFormatted = new Date(o.schedule_time).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' });
      const createdFormatted = new Date(o.created_at).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' });
      const totalT = parseInt(o.ticket_count_adult) + parseInt(o.ticket_count_child);

      return [
        o.order_num,
        `"${o.customer_name.replace(/"/g, '""')}"`,
        o.customer_email || 'N/A',
        o.customer_whatsapp || 'N/A',
        `"${o.event_title.replace(/"/g, '""')}"`,
        `"${dateFormatted}"`,
        o.ticket_count_adult,
        o.ticket_count_child,
        totalT,
        parseFloat(o.amount_total).toFixed(2),
        o.payment_method,
        o.bank_name || 'N/A',
        o.transaction_ref || 'N/A',
        o.payment_status,
        `"${createdFormatted}"`
      ];
    });

    // Combinar cabeceras y filas con separador por comas (CSV estándar)
    // Usamos delimitador punto y coma ";" que es el estándar regional en Excel en Español
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    // Añadir el BOM de UTF-8 (\uFEFF) para asegurar que Excel reconozca correctamente las tildes y eñes
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Crear enlace de descarga automático
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Ventas_Studio5_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire('Exportado', 'El archivo CSV/Excel se ha descargado correctamente.', 'success');
  };

  return (
    <div className="fade-in">
      {/* Selector de Pestañas */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('ventas')} 
          className={activeTab === 'ventas' ? 'btn-primary' : 'btn-secondary'}
          style={{ flex: '1', padding: '10px' }}
        >
          Panel Contable / Ventas
        </button>
        <button 
          onClick={() => setActiveTab('crear')} 
          className={activeTab === 'crear' ? 'btn-primary' : 'btn-secondary'}
          style={{ flex: '1', padding: '10px' }}
        >
          Crear Evento
        </button>
      </div>

      {/* PESTAÑA: PANEL CONTABLE Y VENTAS */}
      {activeTab === 'ventas' && (
        <div className="fade-in">
          
          {/* --- INDICADORES CONTABLES (DASHBOARD METRICS) --- */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(52, 199, 89, 0.1)' }}>
              <div style={{ background: 'var(--success)', padding: '8px', borderRadius: '8px', color: '#000' }}>
                <DollarSign size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Ingresos Cobrados</span>
                <strong style={{ fontSize: '1.15rem', color: 'var(--success)' }}>${metrics.revenuePaid.toFixed(2)}</strong>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 204, 0, 0.1)' }}>
              <div style={{ background: 'var(--warning)', padding: '8px', borderRadius: '8px', color: '#000' }}>
                <DollarSign size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Reservas Pendientes</span>
                <strong style={{ fontSize: '1.15rem', color: 'var(--warning)' }}>${metrics.revenuePending.toFixed(2)}</strong>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(3, 169, 244, 0.1)' }}>
              <div style={{ background: 'var(--accent-secondary)', padding: '8px', borderRadius: '8px', color: '#fff' }}>
                <Users size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Entradas Vendidas</span>
                <strong style={{ fontSize: '1.15rem', color: '#fff' }}>{metrics.totalTicketsSold}</strong>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(241, 165, 28, 0.1)' }}>
              <div style={{ background: 'var(--accent)', padding: '8px', borderRadius: '8px', color: '#000' }}>
                <Sparkles size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Cortesías Emitidas</span>
                <strong style={{ fontSize: '1.15rem', color: 'var(--accent)' }}>{metrics.cortesiasCount}</strong>
              </div>
            </div>
          </div>

          {/* --- SECCIÓN DE FILTROS CONTABLES --- */}
          <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>Filtros y Reportes</h4>
            
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                {/* Filtrar por Evento */}
                <div style={{ flex: '1' }}>
                  <label style={{ fontSize: '0.65rem' }}>Evento</label>
                  <select 
                    value={filterEventId} 
                    onChange={(e) => setFilterEventId(e.target.value)}
                    style={{ marginBottom: '0', padding: '10px' }}
                  >
                    <option value="ALL">Todos los eventos</option>
                    {events.map(e => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>
                </div>

                {/* Filtrar por Estado */}
                <div style={{ flex: '1' }}>
                  <label style={{ fontSize: '0.65rem' }}>Estado de Pago</label>
                  <select 
                    value={filterPaymentStatus} 
                    onChange={(e) => setFilterPaymentStatus(e.target.value)}
                    style={{ marginBottom: '0', padding: '10px' }}
                  >
                    <option value="ALL">Todos los estados</option>
                    <option value="Pagado">Pagado</option>
                    <option value="Pendiente">Reserva (Pendiente)</option>
                    <option value="Cortesía">Cortesía</option>
                    <option value="Anulado">Anulado</option>
                  </select>
                </div>
              </div>

              {/* Barra de Búsqueda */}
              <div style={{ position: 'relative' }}>
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por cliente, QR o whatsapp..." 
                  style={{ paddingLeft: '38px', marginBottom: '0', padding: '10px 10px 10px 38px' }}
                />
              </div>

              {/* Botón Exportar a Excel */}
              <button 
                onClick={handleExportToExcel}
                className="btn-outline" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(52, 199, 89, 0.1)', borderColor: 'var(--success)', color: 'var(--success)' }}
              >
                <FileSpreadsheet size={18} /> Exportar Listado a Excel (CSV)
              </button>
            </div>
          </div>

          {/* --- TABLA DE REGISTROS DE ASISTENCIA --- */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>Asistentes y Ventas ({filteredOrders.length})</h3>
              <button onClick={fetchData} className="btn-secondary" style={{ width: 'auto', padding: '8px 12px' }}>
                <RefreshCw size={14} />
              </button>
            </div>

            {loadingOrders ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
                <div className="spinner"></div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No hay ventas que coincidan con los filtros.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredOrders.map((o) => {
                  const dateFormatted = new Date(o.schedule_time).toLocaleDateString('es-EC', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  });
                  const totalT = parseInt(o.ticket_count_adult) + parseInt(o.ticket_count_child);

                  return (
                    <div key={o.id} className="glass-card" style={{ fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{o.order_num}</span>
                        <span className={`badge ${
                          o.payment_status === 'Pagado' ? 'badge-active' : 
                          o.payment_status === 'Anulado' ? 'badge-inactive' : 'badge-promo'
                        }`}>
                          {o.payment_status}
                        </span>
                      </div>

                      <p style={{ color: '#fff', fontWeight: '600', marginBottom: '2px' }}>{o.customer_name}</p>
                      <p style={{ color: 'var(--text-muted)' }}>🎬 {o.event_title} | 📅 {dateFormatted}</p>
                      <p style={{ color: 'var(--text-muted)' }}>🎟️ Entradas: <b>{totalT}</b> | Asiento: <b>{o.desglose || 'Sin enumerar'}</b></p>
                      <p style={{ color: 'var(--text-muted)' }}>📞 WhatsApp: <b>{o.customer_whatsapp || 'N/A'}</b> | Email: <b>{o.customer_email || 'N/A'}</b></p>
                      
                      {o.payment_method === 'Transferencia' && (
                        <p style={{ color: 'var(--text-muted)' }}>🏦 {o.bank_name} | Ref: {o.transaction_ref}</p>
                      )}

                      <p style={{ color: 'var(--accent)', fontWeight: 'bold', marginTop: '4px' }}>Monto: ${parseFloat(o.amount_total).toFixed(2)} ({o.payment_method})</p>

                      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '10px' }}>
                        {o.payment_status === 'Pendiente' && (
                          <button 
                            onClick={() => handleUpdateStatus(o.id, o.payment_status, 'Pagado')}
                            className="btn-primary" 
                            style={{ flex: '1', padding: '6px', fontSize: '0.75rem', background: 'var(--success)' }}
                          >
                            <Check size={12} /> Registrar Pago
                          </button>
                        )}
                        
                        {o.payment_status !== 'Anulado' && (
                          <button 
                            onClick={() => handleUpdateStatus(o.id, o.payment_status, 'Anulado')}
                            className="btn-secondary" 
                            style={{ flex: '1', padding: '6px', fontSize: '0.75rem', color: 'var(--error)' }}
                          >
                            <X size={12} /> Anular Compra
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA: CREAR NUEVO EVENTO */}
      {activeTab === 'crear' && (
        <div className="glass-panel fade-in">
          <h3 style={{ color: 'var(--accent)', marginBottom: '15px' }}>Crear Nuevo Evento</h3>
          
          <form onSubmit={handleCreateEvent}>
            <label>Nombre del Evento *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: El Misterio de la Calle 5" required />

            <label>Descripción</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Sinopsis del show..." rows="2" />

            <label>Lugar / Sala *</label>
            <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Ej: Teatro Principal" required />

            <label>URL Afiche Posterior (Horizontal 1920x1080) *</label>
            <input type="url" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="Enlace del afiche" required />

            <label>URL Molde Boleto (Alargado 1200x400) (Opcional)</label>
            <input type="url" value={ticketTemplateUrl} onChange={(e) => setTicketTemplateUrl(e.target.value)} placeholder="Enlace del fondo del ticket" />

            {/* Checkbox Asientos Asignados */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: '1px solid var(--glass-border)', marginBottom: '15px' }}>
              <input 
                type="checkbox" 
                id="assignedSeats" 
                checked={hasAssignedSeats} 
                onChange={(e) => setHasAssignedSeats(e.target.checked)} 
                style={{ width: '18px', height: '18px', marginBottom: '0', cursor: 'pointer' }}
              />
              <label htmlFor="assignedSeats" style={{ marginBottom: '0', cursor: 'pointer', color: 'var(--success)' }}>
                🪑 Evento Numerado (Con Asientos Asignados)
              </label>
            </div>

            {hasAssignedSeats ? (
              <div className="fade-in" style={{ background: 'rgba(0,169,244,0.04)', border: '1px solid rgba(3,169,244,0.2)', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
                <label>Plano de Asientos (Butacas separadas por comas) *</label>
                <textarea 
                  value={seatingLayoutStr} 
                  onChange={(e) => setSeatingLayoutStr(e.target.value)} 
                  placeholder="Ej: A1, A2, A3, B1, B2, B3" 
                  rows="2"
                  required={hasAssignedSeats}
                />
                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '-5px' }}>
                  <Info size={14} style={{ marginTop: '2px', flexShrink: '0' }} />
                  <span>El aforo máximo será de {seatingLayoutStr.split(',').filter(x => x.trim().length > 0).length} butacas.</span>
                </div>
              </div>
            ) : (
              <>
                <label>Aforo Máx. General *</label>
                <input type="number" value={capacityTotal} onChange={(e) => setCapacityTotal(parseInt(e.target.value) || 0)} required={!hasAssignedSeats} />
              </>
            )}

            {/* Checkbox Tarifa Única */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: '1px solid var(--glass-border)', marginBottom: '15px' }}>
              <input 
                type="checkbox" 
                id="singleRate" 
                checked={isSingleRate} 
                onChange={(e) => setIsSingleRate(e.target.checked)} 
                style={{ width: '18px', height: '18px', marginBottom: '0', cursor: 'pointer' }}
              />
              <label htmlFor="singleRate" style={{ marginBottom: '0', cursor: 'pointer', color: 'var(--success)' }}>
                🎟️ Tarifa Única (Precio General único)
              </label>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: '1' }}>
                <label>{isSingleRate ? 'Precio General ($)' : 'Precio Adulto ($)'}</label>
                <input type="number" step="0.01" value={priceAdult} onChange={(e) => setPriceAdult(parseFloat(e.target.value) || 0)} required />
              </div>

              {!isSingleRate && (
                <div style={{ flex: '1' }}>
                  <label>Precio Niño ($)</label>
                  <input type="number" step="0.01" value={priceChild} onChange={(e) => setPriceChild(parseFloat(e.target.value) || 0)} required />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: '1' }}>
                <label>Estado Inicial</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>

            <label>Configuración de Promoción</label>
            <select value={promoType} onChange={(e) => setPromoType(e.target.value)}>
              <option value="Ninguna">Ninguna</option>
              <option value="Preventa">Preventa Especial</option>
              <option value="2x1">2x1 Adultos</option>
            </select>

            {promoType !== 'Ninguna' && (
              <div className="fade-in" style={{ background: 'rgba(241,165,28,0.05)', border: '1px solid var(--accent-glow)', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
                {promoType === 'Preventa' && (
                  <>
                    <label>Precio Promocional ($)</label>
                    <input type="number" step="0.01" value={pricePromo} onChange={(e) => setPricePromo(parseFloat(e.target.value) || 0)} />
                  </>
                )}
                <label>Fecha Límite de Promoción (Opcional)</label>
                <input type="datetime-local" value={promoDeadline} onChange={(e) => setPromoDeadline(e.target.value)} />
              </div>
            )}

            <label>Fechas / Funciones * (Formato YYYY-MM-DD HH:MM separados por coma)</label>
            <textarea 
              value={fechasStr} 
              onChange={(e) => setFechasStr(e.target.value)} 
              placeholder="Ej: 2026-11-27 19:00, 2026-12-05 20:00" 
              rows="2"
              required 
            />

            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              <Save size={18} /> {isSubmitting ? 'GUARDANDO...' : 'PUBLICAR EVENTO'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
