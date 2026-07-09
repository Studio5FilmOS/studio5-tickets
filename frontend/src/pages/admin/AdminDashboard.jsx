import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { RefreshCw, Save, Check, X, Info, FileSpreadsheet, DollarSign, Calendar, Search, Users, Sparkles, Upload, Trash2, Plus, ShieldCheck, TrendingUp, LayoutGrid, PlusCircle, ChevronDown, ChevronUp, Phone, Mail, Armchair, Edit2, Image, ToggleLeft, ToggleRight, ExternalLink, Receipt, UserCog, Bell, BellOff } from 'lucide-react';
import AdminUsers from './AdminUsers';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '../../services/pushService';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('ventas'); // 'ventas', 'crear', 'eventos', 'banners'
  const [orders, setOrders] = useState([]);
  const [events, setEvents] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  
  // Estados para filtros de ventas
  const [filterEventId, setFilterEventId] = useState('ALL');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Estado para edición de evento
  const [editingEvent, setEditingEvent] = useState(null); // null = creando, objeto = editando
  const [requireBilling, setRequireBilling] = useState(false);

  // Estado para banners / promociones
  const [banners, setBanners] = useState([]);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [bannerForm, setBannerForm] = useState({ title: '', subtitle: '', image_url: '', link_url: '', active: false, start_date: '', end_date: '' });
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [isSavingBanner, setIsSavingBanner] = useState(false);

  // Estados para cuentas bancarias y aprobaciones de transferencia
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState(null);
  const [bankForm, setBankForm] = useState({
    bank_name: '',
    account_type: 'Ahorros',
    account_number: '',
    owner_name: '',
    owner_id: '',
    owner_email: '',
    is_active: true
  });

  // Estados para formulario de nuevo evento
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [bannerUrl, setBannerUrl] = useState(''); // Contendrá la ruta en el servidor (ej: /uploads/banners/...)
  const [ticketTemplateUrl, setTicketTemplateUrl] = useState(''); // Contendrá la ruta en el servidor (ej: /uploads/tickets/...)
  const [bannerCompressInfo, setBannerCompressInfo] = useState('');
  const [ticketCompressInfo, setTicketCompressInfo] = useState('');
  const [priceAdult, setPriceAdult] = useState(15.00);
  const [priceChild, setPriceChild] = useState(7.50);
  const [capacityTotal, setCapacityTotal] = useState(12);
  const [isSingleRate, setIsSingleRate] = useState(false);
  const [hasAssignedSeats, setHasAssignedSeats] = useState(true);
  const [startRow, setStartRow] = useState('A');
  const [endRow, setEndRow] = useState('C');
  const [seatsPerRow, setSeatsPerRow] = useState(4);
  const [seatingLayoutList, setSeatingLayoutList] = useState(['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4']);
  const [promoType, setPromoType] = useState('Ninguna'); // Ninguna, Preventa, 2x1
  const [pricePromo, setPricePromo] = useState(0.00);
  const [promoDeadline, setPromoDeadline] = useState('');
  const [status, setStatus] = useState('active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados nuevos para el selector dinámico de fechas
  const [schedulesList, setSchedulesList] = useState([]);
  const [tempDate, setTempDate] = useState('');
  const [tempTime, setTempTime] = useState('20:00');

  // Helper para asegurar distribución en formato matriz 2D
  const ensure2DLayout = (layout) => {
    if (!layout || layout.length === 0) return [];
    if (Array.isArray(layout[0])) return layout;
    
    const rows = {};
    layout.forEach(seat => {
      if (!seat) return;
      const match = seat.match(/^([a-zA-Z]+)(\d+)$/);
      if (match) {
        const rowLabel = match[1].toUpperCase();
        if (!rows[rowLabel]) rows[rowLabel] = [];
        rows[rowLabel].push(seat);
      } else {
        if (!rows['Otros']) rows['Otros'] = [];
        rows['Otros'].push(seat);
      }
    });

    let maxSeatNum = 1;
    layout.forEach(seat => {
      if (!seat) return;
      const match = seat.match(/^([a-zA-Z]+)(\d+)$/);
      if (match) {
        const seatNum = parseInt(match[2]);
        if (seatNum > maxSeatNum) maxSeatNum = seatNum;
      }
    });

    const grid = [];
    Object.keys(rows).sort().forEach(rowName => {
      const rowSeats = [];
      const rowSeatsMap = {};
      rows[rowName].forEach(s => {
        const match = s.match(/\d+/);
        if (match) {
          rowSeatsMap[parseInt(match[0])] = s;
        }
      });

      for (let c = 1; c <= maxSeatNum; c++) {
        rowSeats.push(rowSeatsMap[c] || "");
      }
      grid.push(rowSeats);
    });

    return grid;
  };

  // Resolver URLs relativas de imágenes
  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const backendUrl = apiUrl.replace(/\/api$/, '');
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${backendUrl}${cleanUrl}`;
  };

  // Helper para comprimir imágenes del lado del cliente
  const compressImage = (file) => {
    return new Promise(async (resolve, reject) => {
      try {
        // createImageBitmap es más rápido y confiable que img.onload
        let bitmap;
        try {
          bitmap = await Promise.race([
            createImageBitmap(file),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout_bitmap')), 12000))
          ]);
        } catch (e) {
          // Fallback: FileReader + Image clásico
          const dataUrl = await new Promise((res2, rej2) => {
            const reader = new FileReader();
            const t = setTimeout(() => rej2(new Error('La imagen tardó demasiado. Intenta con otro formato (JPG o PNG).')), 20000);
            reader.onload = ev => {
              clearTimeout(t);
              const img = new Image();
              img.onload = () => res2(ev.target.result);
              img.onerror = () => { clearTimeout(t); rej2(new Error('Formato de imagen no compatible. Usa JPG o PNG.')); };
              img.src = ev.target.result;
            };
            reader.onerror = () => { clearTimeout(t); rej2(new Error('Error al leer el archivo.')); };
            reader.readAsDataURL(file);
          });
          resolve(dataUrl);
          return;
        }

        const canvas = document.createElement('canvas');
        let { width, height } = bitmap;
        const MAX_DIM = (width > 3000 || height > 3000) ? 900 : 1200;

        if (width > height) {
          if (width > MAX_DIM) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
        } else {
          if (height > MAX_DIM) { width = Math.round(width * MAX_DIM / height); height = MAX_DIM; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No se pudo obtener el contexto del Canvas.');
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close?.();

        const quality = file.size > 5 * 1024 * 1024 ? 0.6 : 0.75;
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (err) {
        reject(err);
      }
    });
  };

  // Manejar subida de archivo
  const handleImageFileChange = async (e, target) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('Error', 'Por favor selecciona un archivo de imagen válido.', 'error');
      return;
    }

    Swal.fire({
      title: 'Procesando imagen...',
      text: 'Aplicando compresión inteligente y subiendo al servidor',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const base64Compressed = await compressImage(file);
      
      // Calcular tamaños para mostrar la métrica de compresión
      const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const base64Length = base64Compressed.length - (base64Compressed.indexOf(',') + 1);
      const compressedSizeKB = (Math.ceil(base64Length * 3 / 4) / 1024).toFixed(0);
      const reduction = Math.round((1 - (Math.ceil(base64Length * 3 / 4) / file.size)) * 100);
      
      const compressMetrics = `Optimizado: ${originalSizeMB}MB → ${compressedSizeKB}KB (-${reduction}%)`;

      // Subir al servidor usando el endpoint /events/upload
      const uploadRes = await api.post('/events/upload', { image: base64Compressed, type: target });
      
      Swal.close();

      if (uploadRes.data.status === 'OK') {
        const fileUrl = uploadRes.data.url;
        if (target === 'banner') {
          setBannerUrl(fileUrl);
          setBannerCompressInfo(compressMetrics);
        } else if (target === 'ticket') {
          setTicketTemplateUrl(fileUrl);
          setTicketCompressInfo(compressMetrics);
        }
      } else {
        throw new Error(uploadRes.data.message || 'Error al guardar archivo.');
      }
    } catch (err) {
      console.error(err);
      Swal.close();
      Swal.fire('Error', err.message || 'Ocurrió un error al procesar la imagen.', 'error');
    }
  };

  // Agregar función de fecha/hora a la lista
  const addScheduleItem = () => {
    if (!tempDate || !tempTime) {
      Swal.fire('Error', 'Por favor selecciona una fecha y hora válidas.', 'error');
      return;
    }
    const combinedStr = `${tempDate}T${tempTime}`;
    const dateObj = new Date(combinedStr);
    
    if (isNaN(dateObj.getTime())) {
      Swal.fire('Error', 'La fecha u hora ingresada no es válida.', 'error');
      return;
    }

    const dateFormatted = dateObj.toISOString();
    
    if (schedulesList.includes(dateFormatted)) {
      Swal.fire('Aviso', 'Esta fecha y hora ya ha sido agregada.', 'warning');
      return;
    }

    setSchedulesList([...schedulesList, dateFormatted].sort());
    setTempDate('');
    setTempTime('20:00');
  };

  // Remover fecha/hora de la lista
  const removeScheduleItem = (indexToRemove) => {
    setSchedulesList(schedulesList.filter((_, idx) => idx !== indexToRemove));
  };

  // Cargar órdenes y eventos
  const fetchData = async () => {
    setLoadingOrders(true);
    try {
      const params = new URLSearchParams();
      if (filterEventId !== 'ALL') params.append('event_id', filterEventId);
      if (filterDateFrom) params.append('date_from', filterDateFrom);
      if (filterDateTo) params.append('date_to', filterDateTo);

      const [ordersRes, eventsRes] = await Promise.all([
        api.get(`/orders?${params.toString()}`),
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

  // Cargar banners
  const fetchBanners = async () => {
    setLoadingBanners(true);
    try {
      const res = await api.get('/promotions');
      if (res.data.status === 'OK') setBanners(res.data.promotions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBanners(false);
    }
  };

  // Obtener cuentas bancarias (Admin)
  const fetchBankAccounts = async () => {
    setLoadingBanks(true);
    try {
      const res = await api.get('/bank-accounts/admin');
      if (res.data.status === 'OK') {
        setBankAccounts(res.data.bankAccounts);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudieron obtener las cuentas bancarias.', 'error');
    } finally {
      setLoadingBanks(false);
    }
  };

  // Guardar cuenta bancaria (Crear / Editar)
  const handleSaveBankAccount = async (e) => {
    e.preventDefault();
    if (!bankForm.bank_name || !bankForm.account_type || !bankForm.account_number || !bankForm.owner_name || !bankForm.owner_id) {
      Swal.fire('Error', 'Faltan campos obligatorios.', 'error');
      return;
    }
    setIsSavingBank(true);
    try {
      let res;
      if (editingBank) {
        res = await api.put(`/bank-accounts/admin/${editingBank.id}`, bankForm);
      } else {
        res = await api.post('/bank-accounts/admin', bankForm);
      }
      if (res.data.status === 'OK') {
        Swal.fire('Éxito', editingBank ? 'Cuenta bancaria actualizada correctamente.' : 'Cuenta bancaria creada correctamente.', 'success');
        setEditingBank(null);
        setBankForm({
          bank_name: '',
          account_type: 'Ahorros',
          account_number: '',
          owner_name: '',
          owner_id: '',
          owner_email: '',
          is_active: true
        });
        fetchBankAccounts();
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'Error al guardar la cuenta bancaria.', 'error');
    } finally {
      setIsSavingBank(false);
    }
  };

  // Cambiar estado activo/inactivo rápido
  const handleToggleBankActive = async (bank) => {
    try {
      const updated = { ...bank, is_active: !bank.is_active };
      const res = await api.put(`/bank-accounts/admin/${bank.id}`, updated);
      if (res.data.status === 'OK') {
        fetchBankAccounts();
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo cambiar el estado de la cuenta bancaria.', 'error');
    }
  };

  // Eliminar cuenta bancaria
  const handleDeleteBankAccount = async (id, bankName) => {
    const confirm = await Swal.fire({
      title: `¿Eliminar cuenta de ${bankName}?`,
      text: "Esta acción no se puede deshacer y eliminará esta cuenta del panel de clientes.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff3b30',
      cancelButtonColor: '#333'
    });
    if (confirm.isConfirmed) {
      try {
        const res = await api.delete(`/bank-accounts/admin/${id}`);
        if (res.data.status === 'OK') {
          Swal.fire('Eliminada', 'La cuenta bancaria ha sido eliminada con éxito.', 'success');
          fetchBankAccounts();
        }
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'No se pudo eliminar la cuenta bancaria.', 'error');
      }
    }
  };

  // Empezar a editar una cuenta
  const handleStartEditBank = (bank) => {
    setEditingBank(bank);
    setBankForm({
      bank_name: bank.bank_name,
      account_type: bank.account_type,
      account_number: bank.account_number,
      owner_name: bank.owner_name,
      owner_id: bank.owner_id,
      owner_email: bank.owner_email || '',
      is_active: bank.is_active
    });
  };

  useEffect(() => {
    if (activeTab === 'banners') {
      fetchBanners();
    } else if (activeTab === 'bancos') {
      fetchBankAccounts();
    } else {
      fetchData();
    }
  }, [activeTab]);

  // Verificar estado de suscripción push al cargar
  useEffect(() => {
    isPushSubscribed().then(subscribed => setPushSubscribed(subscribed));
  }, []);

  // Generar cuadrícula de asientos de la A a la Z
  const generateGrid = () => {
    const start = startRow.trim().toUpperCase().charCodeAt(0);
    const end = endRow.trim().toUpperCase().charCodeAt(0);
    const numSeats = parseInt(seatsPerRow) || 0;

    if (start < 65 || start > 90 || end < 65 || end > 90 || start > end) {
      Swal.fire('Error', 'Las filas deben ir de la A a la Z, y la fila inicial no puede ser posterior a la final.', 'error');
      return;
    }
    if (numSeats <= 0 || numSeats > 50) {
      Swal.fire('Error', 'El número de asientos por fila debe estar entre 1 y 50.', 'error');
      return;
    }

    const newLayout = [];
    for (let r = start; r <= end; r++) {
      const rowChar = String.fromCharCode(r);
      const rowSeats = [];
      for (let s = 1; s <= numSeats; s++) {
        rowSeats.push(`${rowChar}${s}`);
      }
      newLayout.push(rowSeats);
    }
    setSeatingLayoutList(newLayout);
  };

  // Activar/desactivar butaca individual en el editor interactivo
  const toggleSeatLayout = (rowIndex, colIndex) => {
    const grid = ensure2DLayout(seatingLayoutList);
    const updated = grid.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      return row.map((seat, cIdx) => {
        if (cIdx !== colIndex) return seat;
        if (seat !== "") {
          return "";
        } else {
          let rowChar = "";
          const firstActive = row.find(s => s !== "");
          if (firstActive) {
            const match = firstActive.match(/^([a-zA-Z]+)/);
            if (match) rowChar = match[1];
          }
          if (!rowChar) {
            rowChar = String.fromCharCode('A'.charCodeAt(0) + rowIndex);
          }
          return `${rowChar}${colIndex + 1}`;
        }
      });
    });
    setSeatingLayoutList(updated);
  };

  // Cargar croquis y enviarlo a OpenRouter para procesarlo con IA
  const handleAIScanLayout = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Swal.fire({
      title: 'Analizando croquis con IA...',
      text: 'Extrayendo listado de asientos con Gemini',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await api.post('/events/parse-seating-layout', { image: base64Data });
      Swal.close();

      if (response.data.status === 'OK') {
        const rawSeats = response.data.seats;
        // La IA ya devuelve filas de igual longitud con posicionamiento absoluto.
        // Si por alguna razón hay filas de diferente largo, igualamos con "" al final (sin centrar, para respetar el offset real).
        let normalized = rawSeats;
        if (Array.isArray(rawSeats) && Array.isArray(rawSeats[0])) {
          const maxLen = Math.max(...rawSeats.map(r => r.length));
          normalized = rawSeats.map(row =>
            row.length < maxLen ? [...row, ...Array(maxLen - row.length).fill('')] : row
          );
        }
        setSeatingLayoutList(normalized);
        const activeCount = ensure2DLayout(normalized).flat().filter(s => s && s.trim() !== "").length;
        Swal.fire('Éxito', `Plano importado con éxito. Se detectaron ${activeCount} asientos activos.`, 'success');
      } else {
        throw new Error(response.data.message || 'Error en la respuesta de la IA.');
      }
    } catch (err) {
      console.error(err);
      Swal.close();
      Swal.fire('Error de IA', err.response?.data?.message || err.message || 'No se pudo escanear el plano. Asegúrate de configurar la clave de OpenRouter en el servidor.', 'error');
    }
  };

  // Renderizar la cuadrícula interactiva
  const renderInteractiveGrid = () => {
    const grid = ensure2DLayout(seatingLayoutList);
    
    return (
      <div style={{ 
        background: 'rgba(0,0,0,0.3)', 
        border: '1px solid var(--glass-border)', 
        padding: '24px 15px', 
        borderRadius: '16px', 
        margin: '15px 0 25px 0', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '12px' 
      }}>
        <div style={{ 
          width: '70%', 
          height: '4px', 
          background: 'var(--accent-glow)', 
          margin: '0 auto 10px auto', 
          borderRadius: '2px', 
          boxShadow: '0 0 10px var(--accent-glow)', 
          textAlign: 'center', 
          fontSize: '0.65rem', 
          color: 'var(--accent)', 
          textTransform: 'uppercase', 
          letterSpacing: '2px', 
          paddingTop: '8px',
          marginBottom: '20px'
        }}>
          Escenario / Pantalla
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', overflowX: 'auto', padding: '10px 0', alignItems: 'flex-start' }}>
          {grid.map((row, rowIndex) => {
            let rowName = "";
            const firstActive = row.find(s => s !== "");
            if (firstActive) {
              const match = firstActive.match(/^([A-Za-z]+)/);
              if (match) rowName = match[1];
            }
            if (!rowName) {
              rowName = String.fromCharCode(65 + rowIndex);
            }

            return (
              <div key={rowIndex} style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', width: 'max-content', minWidth: '100%', padding: '0 10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', width: '15px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  {rowName}
                </span>
                {row.map((seat, colIndex) => {
                  const isActive = seat !== "";

                  // Pasillo: espacio completamente vacío y transparente, clickeable para reactivar
                  if (!isActive) {
                    return (
                      <button
                        key={colIndex}
                        type="button"
                        onClick={() => toggleSeatLayout(rowIndex, colIndex)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          width: '22px',
                          height: '32px',
                          flexShrink: 0
                        }}
                        title={`Activar asiento en Fila ${rowName}, Columna ${colIndex + 1}`}
                      />
                    );
                  }

                  return (
                    <button
                      key={colIndex}
                      type="button"
                      onClick={() => toggleSeatLayout(rowIndex, colIndex)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        transition: 'all 0.15s',
                        width: '22px'
                      }}
                      title={`Desactivar asiento ${seat} (Convertir en pasillo vacío)`}
                    >
                      <Armchair size={20} color="var(--accent)" style={{ transform: 'scale(1.1)' }} />
                      <span style={{ fontSize: '0.55rem', color: '#fff', marginTop: '2px', fontWeight: 'bold' }}>
                        {seat}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '12px', fontSize: '0.7rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Armchair size={13} color="var(--accent)" />
            <span>Activa ({grid.flat().filter(s => s && s.trim() !== "").length})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '13px', height: '13px', border: '1px dashed rgba(255,255,255,0.25)', borderRadius: '2px' }} />
            <span>Pasillo / Pasadizo (vacío)</span>
          </div>
        </div>
      </div>
    );
  };

  // Actualizar estado de pago
  const handleUpdateStatus = async (orderId, currentStatus, newStatus) => {
    if (currentStatus === newStatus) return;

    const confirmRes = await Swal.fire({
      title: `¿Cambiar estado a ${newStatus}?`,
      text: newStatus === 'Anulado' ? 'Esto cancelará el acceso de todos los tickets asociados.' : 'Se activará el acceso y se enviarán los correos correspondientes.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: newStatus === 'Anulado' ? '#ff3b30' : '#DEB841',
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

  // Helper: eliminar o archivar evento
  const handleDeleteEvent = async (eventId, eventTitle) => {
    const confirmRes = await Swal.fire({
      title: `¿Eliminar "${eventTitle}"?`,
      text: "Si el evento ya tiene ventas registradas, se desactivará automáticamente para preservar el historial. Si no tiene ventas, se eliminará permanentemente.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff3b30',
      cancelButtonColor: '#333',
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmRes.isConfirmed) return;

    try {
      const res = await api.delete(`/events/${eventId}`);
      if (res.data.status === 'OK') {
        if (res.data.action === 'archived') {
          // Tiene ventas — preguntar si quiere borrado forzado (para datos de prueba)
          const forceRes = await Swal.fire({
            title: '⚠️ Evento con Ventas',
            html: `<p>${res.data.message}</p><br/><p style="color:#ff9f0a;font-size:0.85rem"><strong>¿Son ventas de prueba?</strong><br/>Si este era un evento de prueba y quieres borrarlo definitivamente junto con sus órdenes de prueba, usa el botón rojo de abajo.</p>`,
            icon: 'info',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'OK, dejar inactivo',
            denyButtonText: '🗑️ Borrar forzado (pruebas)',
            denyButtonColor: '#ff3b30',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#555',
          });

          if (forceRes.isDenied) {
            // Confirmar borrado forzado con doble advertencia
            const finalConfirm = await Swal.fire({
              title: '¡ÚLTIMO AVISO!',
              html: `<p>Esto borrará <strong>permanentemente</strong> el evento <strong>"${eventTitle}"</strong> junto con <strong>TODAS sus órdenes y tickets</strong>.</p><p style="color:#ff3b30;margin-top:12px">Esta acción <u>NO SE PUEDE DESHACER</u>. ¿Confirmas?</p>`,
              icon: 'error',
              showCancelButton: true,
              confirmButtonColor: '#ff3b30',
              confirmButtonText: 'Sí, borrar todo permanentemente',
              cancelButtonText: 'Cancelar'
            });
            if (finalConfirm.isConfirmed) {
              const forceDeleteRes = await api.delete(`/events/${eventId}/force`);
              if (forceDeleteRes.data.status === 'OK') {
                Swal.fire('¡Eliminado!', forceDeleteRes.data.message, 'success');
                fetchData();
              }
            }
          } else if (forceRes.isConfirmed) {
            fetchData();
          }
        } else {
          Swal.fire('Eliminado', res.data.message, 'success');
          fetchData();
        }
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'No se pudo eliminar el evento.', 'error');
    }
  };


  // Helper: cargar evento en el formulario para edición
  const loadEventForEditing = (evt) => {
    setEditingEvent(evt);
    setTitle(evt.title);
    setDescription(evt.description || '');
    setVenue(evt.venue);
    setBannerUrl(evt.banner_url || '');
    setTicketTemplateUrl(evt.ticket_template_url || '');
    setPriceAdult(parseFloat(evt.price_adult));
    setPriceChild(parseFloat(evt.price_child));
    setCapacityTotal(evt.capacity_total);
    setIsSingleRate(evt.is_single_rate);
    setHasAssignedSeats(evt.has_assigned_seats);
    setSeatingLayoutList(ensure2DLayout(evt.seating_layout || []));
    setPromoType(evt.promo_type || 'Ninguna');
    setPricePromo(parseFloat(evt.price_promo) || 0);
    setPromoDeadline(evt.promo_deadline ? evt.promo_deadline.slice(0, 16) : '');
    setStatus(evt.status);
    setRequireBilling(evt.require_billing || false);
    setSchedulesList((evt.schedules || []).map(s => new Date(s.schedule_time).toISOString()));
    setActiveTab('crear');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetEventForm = () => {
    setEditingEvent(null);
    setTitle(''); setDescription(''); setVenue('');
    setBannerUrl(''); setTicketTemplateUrl('');
    setPriceAdult(15); setPriceChild(7.5); setCapacityTotal(12);
    setIsSingleRate(false); setHasAssignedSeats(true);
    setStartRow('A'); setEndRow('C'); setSeatsPerRow(4);
    setSeatingLayoutList(ensure2DLayout(['A1','A2','A3','A4','B1','B2','B3','B4','C1','C2','C3','C4']));
    setPromoType('Ninguna'); setPricePromo(0); setPromoDeadline('');
    setSchedulesList([]); setRequireBilling(false);
  };

  // Crear o actualizar evento
  const handleCreateEvent = async (e) => {
    e.preventDefault();

    if (!title) {
      Swal.fire('Falta Nombre', 'Por favor ingresa el nombre del evento.', 'warning');
      return;
    }
    if (!venue) {
      Swal.fire('Falta Lugar', 'Por favor ingresa el lugar o sala del evento.', 'warning');
      return;
    }
    if (!bannerUrl) {
      Swal.fire('Falta Imagen', 'Por favor sube la imagen del afiche o banner del evento.', 'warning');
      return;
    }
    if (schedulesList.length === 0) {
      Swal.fire('Falta Fecha', 'Por favor añade al menos una fecha o función para el evento.', 'warning');
      return;
    }

    setIsSubmitting(true);

    let layoutArray = null;
    let actualCapacity = parseInt(capacityTotal);
    
    if (hasAssignedSeats) {
      layoutArray = seatingLayoutList;
      actualCapacity = ensure2DLayout(seatingLayoutList).flat().filter(s => s && s.trim() !== "").length;
    }

    const payload = {
      title, description, venue,
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
      require_billing: requireBilling,
      schedules: schedulesList
    };

    try {
      let res;
      if (editingEvent) {
        res = await api.put(`/events/${editingEvent.id}`, payload);
        if (res.data.status === 'OK') {
          Swal.fire('¡Actualizado!', 'El evento ha sido actualizado correctamente.', 'success');
        }
      } else {
        res = await api.post('/events', payload);
        if (res.data.status === 'OK') {
          Swal.fire('Publicado', 'Evento publicado con éxito.', 'success');
        }
      }
      resetEventForm();
      setActiveTab('ventas');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'Error al guardar evento.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- CRUD de Banners ---
  const handleSaveBanner = async (e) => {
    e.preventDefault();
    if (!bannerForm.title) {
      Swal.fire('Error', 'El título del banner es obligatorio.', 'error');
      return;
    }
    setIsSavingBanner(true);
    try {
      let res;
      if (editingBannerId) {
        res = await api.put(`/promotions/${editingBannerId}`, bannerForm);
      } else {
        res = await api.post('/promotions', bannerForm);
      }
      if (res.data.status === 'OK') {
        Swal.fire('Guardado', 'Banner guardado correctamente.', 'success');
        setBannerForm({ title: '', subtitle: '', image_url: '', link_url: '', active: false, start_date: '', end_date: '' });
        setEditingBannerId(null);
        fetchBanners();
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Error al guardar banner.', 'error');
    } finally {
      setIsSavingBanner(false);
    }
  };

  const handleToggleBanner = async (bannerId) => {
    try {
      const res = await api.patch(`/promotions/${bannerId}/toggle`);
      if (res.data.status === 'OK') fetchBanners();
    } catch (err) {
      Swal.fire('Error', 'No se pudo cambiar el estado del banner.', 'error');
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    const confirmed = await Swal.fire({
      title: '¿Eliminar este banner?', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#ff3b30', cancelButtonColor: '#333',
      confirmButtonText: 'Eliminar'
    });
    if (confirmed.isConfirmed) {
      try {
        await api.delete(`/promotions/${bannerId}`);
        fetchBanners();
      } catch (err) {
        Swal.fire('Error', 'No se pudo eliminar el banner.', 'error');
      }
    }
  };

  const handleBannerImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Swal.fire({ title: 'Subiendo imagen...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const base64 = await compressImage(file);
      const res = await api.post('/events/upload', { image: base64, type: 'banner' });
      Swal.close();
      if (res.data.status === 'OK') {
        setBannerForm(prev => ({ ...prev, image_url: res.data.url }));
      } else throw new Error(res.data.message);
    } catch (err) {
      Swal.close();
      Swal.fire('Error', err.message || 'No se pudo subir la imagen.', 'error');
    }
  };

  // Filtrado de órdenes
  const filteredOrders = orders.filter(o => {
    const matchEvent = filterEventId === 'ALL' || o.event_id === filterEventId;
    const matchStatus = filterPaymentStatus === 'ALL' || o.payment_status === filterPaymentStatus;

    const normalizedQuery = searchQuery.toLowerCase().trim();
    const matchQuery = !normalizedQuery || 
      o.customer_name.toLowerCase().includes(normalizedQuery) ||
      o.order_num.toLowerCase().includes(normalizedQuery) ||
      (o.customer_whatsapp && o.customer_whatsapp.includes(normalizedQuery)) ||
      (o.customer_email && o.customer_email.toLowerCase().includes(normalizedQuery));

    return matchEvent && matchStatus && matchQuery;
  });

  // Filtrado de transferencias pendientes
  const filteredPendingTransfers = orders.filter(o => {
    if (o.payment_status !== 'Pendiente') return false;
    
    const normalizedQuery = searchQuery.toLowerCase().trim();
    return !normalizedQuery || 
      o.customer_name.toLowerCase().includes(normalizedQuery) ||
      o.order_num.toLowerCase().includes(normalizedQuery) ||
      (o.customer_whatsapp && o.customer_whatsapp.includes(normalizedQuery)) ||
      (o.customer_email && o.customer_email.toLowerCase().includes(normalizedQuery));
  });

  // Métricas
  const metrics = filteredOrders.reduce((acc, o) => {
    const netVal = parseFloat(o.amount_net) > 0 ? parseFloat(o.amount_net) : (parseFloat(o.amount_total) || 0);
    if (o.payment_status === 'Pagado') {
      acc.revenuePaid += netVal;
    } else if (o.payment_status === 'Pendiente') {
      acc.revenuePending += netVal;
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

  const handleExportToExcel = () => {
    if (filteredOrders.length === 0) {
      Swal.fire('Aviso', 'No hay datos filtrados para exportar.', 'warning');
      return;
    }

    const headers = [
      'Código Orden', 'Cliente', 'Email', 'WhatsApp', 'Evento', 'Función', 
      'Adultos', 'Niños', 'Entradas Totales', 'Valor Total ($)', 
      'Método Pago', 'Banco', 'Ref. Transacción', 'Estado Pago', 'Fecha Registro'
    ];

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

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          width: '46px', height: '46px', borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(222,184,65,0.2), rgba(222,184,65,0.05))',
          border: '1px solid rgba(222,184,65,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <ShieldCheck size={22} color="#DEB841" />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.3px' }}>Panel de Administración</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Studio 5 · Sistema de Gestión</p>
        </div>
        {/* Botón de notificaciones push */}
        <button
          id="btn-push-notifications"
          onClick={async () => {
            setPushLoading(true);
            try {
              const token = localStorage.getItem('token');
              if (pushSubscribed) {
                await unsubscribeFromPush(token);
                setPushSubscribed(false);
                Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Notificaciones desactivadas', showConfirmButton: false, timer: 2500 });
              } else {
                const ok = await subscribeToPush(token);
                if (ok) {
                  setPushSubscribed(true);
                  // Enviar notificación de prueba
                  await api.post('/push/test');
                  Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: '🔔 Notificaciones activadas', text: 'Recibirás alertas de ventas y comprobantes', showConfirmButton: false, timer: 3500 });
                } else {
                  Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Permiso denegado', text: 'Activa las notificaciones en la configuración del navegador', showConfirmButton: false, timer: 4000 });
                }
              }
            } catch (err) {
              console.error('Error gestionando push:', err);
            } finally {
              setPushLoading(false);
            }
          }}
          title={pushSubscribed ? 'Desactivar notificaciones push' : 'Activar notificaciones push'}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '9px 15px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: pushSubscribed
              ? 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))'
              : 'rgba(255,255,255,0.06)',
            color: pushSubscribed ? '#22c55e' : 'var(--text-muted)',
            fontSize: '0.8rem', fontWeight: 600,
            border: `1px solid ${pushSubscribed ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
            transition: 'all 0.2s ease',
            opacity: pushLoading ? 0.6 : 1
          }}
          disabled={pushLoading}
        >
          {pushSubscribed ? <Bell size={15} /> : <BellOff size={15} />}
          <span style={{ whiteSpace: 'nowrap' }}>
            {pushLoading ? '...' : (pushSubscribed ? 'Notificaciones ON' : 'Activar alertas')}
          </span>
        </button>
      </div>

      {/* Tabs Premium */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', background: 'rgba(255,255,255,0.04)', borderRadius: '14px',
        padding: '4px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.07)', gap: '2px'
      }}>
        {[
          { id: 'ventas', icon: LayoutGrid, label: 'Ventas' },
          { id: 'crear', icon: PlusCircle, label: editingEvent ? '✏️ Editando' : 'Nuevo Evento' },
          { id: 'eventos', icon: Edit2, label: 'Mis Eventos' },
          { id: 'banners', icon: Image, label: 'Banners' },
          { id: 'transferencias', icon: Receipt, label: 'Transferencias' },
          { id: 'bancos', icon: DollarSign, label: 'Cuentas' },
          { id: 'usuarios', icon: UserCog, label: 'Usuarios' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { if (tab.id !== 'crear') setEditingEvent(null); setActiveTab(tab.id); }}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              padding: '11px 14px', borderRadius: '11px', border: 'none', cursor: 'pointer',
              fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.25s',
              background: activeTab === tab.id
                ? 'linear-gradient(135deg, #DEB841, #b08d2b)'
                : 'transparent',
              color: activeTab === tab.id ? '#000' : 'var(--text-muted)',
              boxShadow: activeTab === tab.id ? '0 4px 12px rgba(222,184,65,0.25)' : 'none'
            }}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* PESTAÑA: PANEL CONTABLE Y VENTAS */}
      {activeTab === 'ventas' && (
        <div className="fade-in">
          {/* Métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '22px' }}>
            {[
              { label: 'Cobrado', value: `$${metrics.revenuePaid.toFixed(2)}`, icon: TrendingUp, color: '#34c759', bg: 'rgba(52,199,89,0.08)', border: 'rgba(52,199,89,0.2)' },
              { label: 'Pendiente', value: `$${metrics.revenuePending.toFixed(2)}`, icon: DollarSign, color: '#ffcc00', bg: 'rgba(255,204,0,0.08)', border: 'rgba(255,204,0,0.2)' },
              { label: 'Vendidas', value: metrics.totalTicketsSold, icon: Users, color: '#DEB841', bg: 'rgba(222,184,65,0.08)', border: 'rgba(222,184,65,0.2)' },
              { label: 'Cortesías', value: metrics.cortesiasCount, icon: Sparkles, color: '#888', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)' },
            ].map((m, i) => (
              <div key={i} style={{
                background: m.bg, border: `1px solid ${m.border}`,
                borderRadius: '16px', padding: '14px 16px',
                display: 'flex', flexDirection: 'column', gap: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600' }}>{m.label}</span>
                  <m.icon size={15} color={m.color} />
                </div>
                <strong style={{ fontSize: '1.3rem', color: m.color, fontWeight: 800, letterSpacing: '-0.5px' }}>{m.value}</strong>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>Filtros y Reportes</h4>
            
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
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

              {/* Filtros de Fecha para Cuadre de Caja */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: '1' }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📅 Ventas Desde</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={15} color="var(--accent)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }} />
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      style={{
                        marginBottom: '0',
                        padding: '11px 12px 11px 36px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '10px',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        width: '100%',
                        boxSizing: 'border-box',
                        colorScheme: 'dark'
                      }}
                    />
                  </div>
                </div>
                <div style={{ flex: '1' }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📅 Ventas Hasta</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={15} color="var(--accent)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }} />
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      style={{
                        marginBottom: '0',
                        padding: '11px 12px 11px 36px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '10px',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        width: '100%',
                        boxSizing: 'border-box',
                        colorScheme: 'dark'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={fetchData}
                  className="btn-primary"
                  style={{ flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
                >
                  <Search size={16} /> Aplicar Filtros
                </button>
                <button
                  onClick={() => { setFilterEventId('ALL'); setFilterDateFrom(''); setFilterDateTo(''); setFilterPaymentStatus('ALL'); setTimeout(fetchData, 50); }}
                  className="btn-secondary"
                  style={{ padding: '10px 14px' }}
                >
                  <RefreshCw size={15} />
                </button>
              </div>

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

              <button 
                onClick={handleExportToExcel}
                className="btn-outline" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(52, 199, 89, 0.1)', borderColor: 'var(--success)', color: 'var(--success)' }}
              >
                <FileSpreadsheet size={18} /> Exportar Listado a Excel (CSV)
              </button>
            </div>
          </div>

          {/* Listado */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: '700' }}>Registro de Ventas</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{filteredOrders.length} registros</p>
              </div>
              <button onClick={fetchData} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', padding: '8px 10px', cursor: 'pointer', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem'
              }}>
                <RefreshCw size={13} /> Actualizar
              </button>
            </div>

            {loadingOrders ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <div className="spinner" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Users size={32} color="var(--text-muted)" style={{ marginBottom: '10px', opacity: 0.4 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay ventas que coincidan con los filtros.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredOrders.map((o, idx) => {
                  const dateFormatted = o.schedule_time
                    ? new Date(o.schedule_time).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : 'Sin fecha';
                  const totalT = parseInt(o.ticket_count_adult || 0) + parseInt(o.ticket_count_child || 0);
                  const statusColor = o.payment_status === 'Pagado' ? '#34c759' : o.payment_status === 'Anulado' ? '#ff3b30' : '#ffcc00';
                  const statusBg = o.payment_status === 'Pagado' ? 'rgba(52,199,89,0.1)' : o.payment_status === 'Anulado' ? 'rgba(255,59,48,0.1)' : 'rgba(255,204,0,0.1)';

                  return (
                    <div key={o.id} style={{
                      padding: '16px 18px', borderBottom: idx < filteredOrders.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Fila 1: orden + estado */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--accent)', letterSpacing: '0.5px' }}>#{o.order_num}</span>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px',
                          padding: '3px 9px', borderRadius: '6px',
                          background: statusBg, color: statusColor,
                          border: `1px solid ${statusColor}33`
                        }}>
                          {o.payment_status}
                        </span>
                      </div>

                      {/* Fila 2: nombre */}
                      <p style={{ fontSize: '0.95rem', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{o.customer_name}</p>

                      {/* Fila 3: detalles */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginBottom: '10px', fontSize: '0.77rem', color: 'var(--text-muted)' }}>
                        <span>🎬 {o.event_title}</span>
                        <span>📅 {dateFormatted}</span>
                        <span>🎟️ {totalT} entrada{totalT !== 1 ? 's' : ''}</span>
                        {o.desglose && <span>🪑 {o.desglose}</span>}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginBottom: '12px', fontSize: '0.77rem', color: 'var(--text-muted)' }}>
                        <span>📞 {o.customer_whatsapp || 'N/A'}</span>
                        <span>📧 {o.customer_email || 'N/A'}</span>
                        <span style={{ color: 'var(--accent)', fontWeight: '700' }}>${parseFloat(o.amount_total || 0).toFixed(2)} · {o.payment_method}</span>
                      </div>

                      {/* Acciones */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {o.payment_status === 'Pendiente' && (
                          <button
                            onClick={() => handleUpdateStatus(o.id, o.payment_status, 'Pagado')}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                              padding: '8px', borderRadius: '10px', border: '1px solid rgba(52,199,89,0.25)', cursor: 'pointer',
                              background: 'rgba(52,199,89,0.15)', color: '#34c759', fontWeight: '700', fontSize: '0.78rem'
                            }}
                          >
                            <Check size={13} /> Confirmar Pago
                          </button>
                        )}
                        {o.payment_status !== 'Anulado' && (
                          <button
                            onClick={() => handleUpdateStatus(o.id, o.payment_status, 'Anulado')}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                              padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,59,48,0.2)', cursor: 'pointer',
                              background: 'rgba(255,59,48,0.08)', color: '#ff3b30', fontWeight: '700', fontSize: '0.78rem'
                            }}
                          >
                            <X size={13} /> Anular
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(222,184,65,0.15)', border: '1px solid rgba(222,184,65,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlusCircle size={18} color="#DEB841" />
            </div>
            <div>
              <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: '800' }}>Crear Nuevo Evento</h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Completa los datos de la producción</p>
            </div>
          </div>
          
          <form onSubmit={handleCreateEvent}>
            <label>Nombre del Evento *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: El Misterio de la Calle 5" required />

            <label>Descripción</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Sinopsis del show..." rows="2" />

            <label>Lugar / Sala *</label>
            <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Ej: Teatro Principal" required />

            {/* --- SECCIÓN NUEVA: SUBIDA DIRECTA DE BANNER CON PREVIEW Y COMPRESIÓN --- */}
            <div style={{ marginBottom: '15px' }}>
              <label>Imagen del Afiche / Banner (Horizontal 16:9) *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--glass-border)', padding: '20px', borderRadius: '12px' }}>
                {bannerUrl ? (
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={getImageUrl(bannerUrl)} alt="Banner Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      type="button" 
                      onClick={() => { setBannerUrl(''); setBannerCompressInfo(''); }} 
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,59,48,0.9)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '8px', color: 'var(--text-muted)' }}>
                    <Upload size={32} color="var(--accent)" />
                    <span style={{ fontSize: '0.8rem' }}>Subir Imagen de Afiche</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageFileChange(e, 'banner')} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                )}
                {bannerUrl && bannerCompressInfo && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: '700', background: 'rgba(52,199,89,0.08)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(52,199,89,0.2)' }}>
                    {bannerCompressInfo}
                  </div>
                )}
              </div>
            </div>

            {/* --- SECCIÓN NUEVA: SUBIDA DIRECTA DE TICKET TEMPLATE CON PREVIEW Y COMPRESIÓN --- */}
            <div style={{ marginBottom: '15px' }}>
              <label>Imagen Fondo de Boleto (Vertical 3:4) (Opcional)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--glass-border)', padding: '20px', borderRadius: '12px' }}>
                {ticketTemplateUrl ? (
                  <div style={{ position: 'relative', width: '150px', height: '200px', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={getImageUrl(ticketTemplateUrl)} alt="Ticket Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      type="button" 
                      onClick={() => { setTicketTemplateUrl(''); setTicketCompressInfo(''); }} 
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,59,48,0.9)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '8px', color: 'var(--text-muted)' }}>
                    <Upload size={32} color="var(--accent)" />
                    <span style={{ fontSize: '0.8rem' }}>Subir Fondo del Boleto</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageFileChange(e, 'ticket')} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                )}
                {ticketTemplateUrl && ticketCompressInfo && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: '700', background: 'rgba(52,199,89,0.08)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(52,199,89,0.2)' }}>
                    {ticketCompressInfo}
                  </div>
                )}
              </div>
            </div>

            {/* Checkbox Asientos Asignados */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: '1px solid var(--glass-border)', marginBottom: '15px' }}>
              <input 
                type="checkbox" 
                id="assignedSeats" 
                checked={hasAssignedSeats} 
                onChange={(e) => setHasAssignedSeats(e.target.checked)} 
                style={{ width: '18px', height: '18px', marginBottom: '0', cursor: 'pointer' }}
              />
              <label htmlFor="assignedSeats" style={{ marginBottom: '0', cursor: 'pointer', color: 'var(--accent)' }}>
                🪑 Evento Numerado (Con Asientos Asignados)
              </label>
            </div>

            {hasAssignedSeats ? (
              <div className="fade-in" style={{ background: 'rgba(222,184,65,0.02)', border: '1px solid var(--accent-glow)', padding: '18px', borderRadius: '16px', marginBottom: '15px' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '15px', letterSpacing: '0.5px', fontWeight: 'bold' }}>
                  Configuración del Mapa de Asientos
                </h4>
                
                {/* Generador Rápido por Rangos */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                  <div style={{ flex: '1', minWidth: '80px' }}>
                    <label style={{ fontSize: '0.65rem' }}>Fila Inicial</label>
                    <input 
                      type="text" 
                      value={startRow} 
                      onChange={(e) => setStartRow(e.target.value.toUpperCase().slice(0, 1))} 
                      maxLength={1}
                      style={{ marginBottom: '0', padding: '10px', textAlign: 'center' }}
                    />
                  </div>
                  <div style={{ flex: '1', minWidth: '80px' }}>
                    <label style={{ fontSize: '0.65rem' }}>Fila Final</label>
                    <input 
                      type="text" 
                      value={endRow} 
                      onChange={(e) => setEndRow(e.target.value.toUpperCase().slice(0, 1))} 
                      maxLength={1}
                      style={{ marginBottom: '0', padding: '10px', textAlign: 'center' }}
                    />
                  </div>
                  <div style={{ flex: '1.5', minWidth: '100px' }}>
                    <label style={{ fontSize: '0.65rem' }}>Asientos por Fila</label>
                    <input 
                      type="number" 
                      value={seatsPerRow} 
                      onChange={(e) => setSeatsPerRow(Math.max(1, parseInt(e.target.value) || 1))} 
                      min={1}
                      style={{ marginBottom: '0', padding: '10px', textAlign: 'center' }}
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={generateGrid}
                    className="btn-secondary" 
                    style={{ flex: '2', height: '42px', marginTop: '22px', fontSize: '0.8rem', padding: '0 10px', background: 'rgba(222,184,65,0.1)', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                  >
                    Generar Plano
                  </button>
                </div>

                {/* Subir plano para procesar con IA */}
                <div style={{ 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px dashed rgba(255,255,255,0.1)', 
                  borderRadius: '12px', 
                  padding: '12px', 
                  marginBottom: '20px', 
                  textAlign: 'center' 
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', marginBottom: '0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    <Sparkles size={14} color="var(--accent)" />
                    <span>¿Tienes una foto del plano? Escanear con IA</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleAIScanLayout} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                </div>

                {/* Cuadrícula interactiva de butacas */}
                <label style={{ color: 'var(--accent)' }}>Mapa Visual de Asientos (Haz clic para desactivar pasillos)</label>
                {renderInteractiveGrid()}

                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '-10px' }}>
                  <Info size={14} style={{ marginTop: '2px', flexShrink: '0' }} />
                  <span>El aforo total de este show numerado será de <b>{ensure2DLayout(seatingLayoutList).flat().filter(s => s && s.trim() !== "").length}</b> butacas activas.</span>
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
              <label htmlFor="singleRate" style={{ marginBottom: '0', cursor: 'pointer', color: 'var(--accent)' }}>
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
              <div className="fade-in" style={{ background: 'rgba(222,184,65,0.03)', border: '1px solid var(--accent-glow)', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
                {promoType === 'Preventa' && (
                  <>
                    <label>Precio Promocional ($)</label>
                    <input type="number" step="0.01" value={pricePromo} onChange={(e) => setPricePromo(parseFloat(e.target.value) || 0)} />
                  </>
                )}
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem' }}>Fecha Límite de Promoción (Opcional)</label>
                <input
                  type="datetime-local"
                  value={promoDeadline}
                  onChange={(e) => setPromoDeadline(e.target.value)}
                  onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                  onFocus={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                  style={{
                    marginBottom: '10px',
                    padding: '11px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    width: '100%',
                    boxSizing: 'border-box',
                    colorScheme: 'dark',
                    cursor: 'pointer'
                  }}
                />
              </div>
            )}

            {/* --- SECCIÓN NUEVA: SELECTOR DINÁMICO DE FECHAS/HORAS (CALENDARIO) --- */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
              <label style={{ color: 'var(--accent)', fontWeight: 'bold' }}>📅 Fechas / Horarios de Funciones *</label>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', marginTop: '5px', flexWrap: 'wrap' }}>
                <div style={{ flex: '2', minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fecha</span>
                  <input 
                    type="date" 
                    value={tempDate} 
                    onChange={(e) => setTempDate(e.target.value)}
                    onClick={(e) => {
                      try { e.target.showPicker(); } catch(err) { console.warn(err); }
                    }}
                    onFocus={(e) => {
                      try { e.target.showPicker(); } catch(err) { console.warn(err); }
                    }}
                    style={{
                      marginBottom: '0',
                      padding: '11px 12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      width: '100%',
                      boxSizing: 'border-box',
                      colorScheme: 'dark',
                      cursor: 'pointer'
                    }}
                  />
                </div>
                <div style={{ flex: '1', minWidth: '100px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hora</span>
                  <input 
                    type="time" 
                    value={tempTime} 
                    onChange={(e) => setTempTime(e.target.value)}
                    onClick={(e) => {
                      try { e.target.showPicker(); } catch(err) { console.warn(err); }
                    }}
                    onFocus={(e) => {
                      try { e.target.showPicker(); } catch(err) { console.warn(err); }
                    }}
                    style={{
                      marginBottom: '0',
                      padding: '11px 12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      width: '100%',
                      boxSizing: 'border-box',
                      colorScheme: 'dark',
                      cursor: 'pointer'
                    }}
                  />
                </div>
                <button 
                  type="button" 
                  onClick={addScheduleItem}
                  className="btn-primary" 
                  style={{ width: 'auto', padding: '10px 15px', background: 'var(--accent-secondary)', height: '42px', alignSelf: 'flex-end' }}
                >
                  <Plus size={16} /> Agregar
                </button>
              </div>

              {/* Listado de fechas añadidas (Chips premium) */}
              {schedulesList.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>No has agregado ninguna función todavía.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {schedulesList.map((sch, idx) => {
                    const formatted = new Date(sch).toLocaleString('es-EC', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    });
                    
                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '6px', 
                          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
                          padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', color: '#fff'
                        }}
                      >
                        <Calendar size={12} color="var(--accent)" />
                        <span>{formatted}</span>
                        <button 
                          type="button" 
                          onClick={() => removeScheduleItem(idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                          title="Eliminar función"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Facturación */}
            <div className="glass-card" style={{ marginTop: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px' }}>
              <Receipt size={20} color="var(--accent)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>Recopilación de Datos de Facturación</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Activa para pedir cédula/RUC y razón social durante la compra (ideal para eventos con facturación requerida).</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '26px', marginBottom: 0 }}>
                <input type="checkbox" checked={requireBilling} onChange={e => setRequireBilling(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                  background: requireBilling ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
                  borderRadius: '26px', transition: 'background 0.3s'
                }}>
                  <span style={{
                    position: 'absolute', content: '', height: '20px', width: '20px',
                    left: requireBilling ? '22px' : '3px', bottom: '3px',
                    background: '#fff', borderRadius: '50%', transition: 'left 0.3s'
                  }} />
                </span>
              </label>
            </div>

            <button type="submit" className="btn-primary" disabled={isSubmitting || schedulesList.length === 0}>
              <Save size={18} /> {isSubmitting ? 'GUARDANDO...' : editingEvent ? 'ACTUALIZAR EVENTO' : 'PUBLICAR EVENTO'}
            </button>
          </form>
        </div>
      )}
      {/* PESTAÑA: MIS EVENTOS (para editar) */}
      {activeTab === 'eventos' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>Gestión de Eventos</h3>
            <button onClick={() => { resetEventForm(); setActiveTab('crear'); }} className="btn-primary" style={{ width: 'auto', padding: '10px 16px', fontSize: '0.82rem' }}>
              <PlusCircle size={16} /> Nuevo
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {events.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>No hay eventos creados aún.</p>
            ) : events.map(evt => (
              <div key={evt.id} className="glass-card" style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px 18px' }}>
                {evt.banner_url && <img src={getImageUrl(evt.banner_url)} alt="" style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{evt.venue} · {(evt.schedules || []).length} funciones</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '20px', background: evt.status === 'active' ? 'rgba(52,199,89,0.1)' : 'rgba(255,59,48,0.1)', color: evt.status === 'active' ? '#34c759' : '#ff3b30', border: `1px solid ${evt.status === 'active' ? 'rgba(52,199,89,0.2)' : 'rgba(255,59,48,0.2)'}` }}>{evt.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                    {evt.require_billing && <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '20px', background: 'rgba(222,184,65,0.1)', color: 'var(--accent)', border: '1px solid rgba(222,184,65,0.2)' }}>🧾 Facturación</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => loadEventForEditing(evt)} style={{ background: 'rgba(222,184,65,0.1)', border: '1px solid rgba(222,184,65,0.3)', color: 'var(--accent)', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    <Edit2 size={14} /> Editar
                  </button>
                  <button onClick={() => handleDeleteEvent(evt.id, evt.title)} style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)', color: '#ff3b30', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    <Trash2 size={14} /> Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA: BANNERS Y PROMOCIONES */}
      {activeTab === 'banners' && (
        <div className="fade-in">
          <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', marginBottom: '16px' }}>🖼️ Gestión de Banners y Promociones</h3>

          {/* Formulario de Banner */}
          <form onSubmit={handleSaveBanner} className="glass-panel" style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '1px' }}>{editingBannerId ? '✏️ Editando Banner' : '+ Nuevo Banner'}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: '2' }}>
                  <label style={{ fontSize: '0.65rem' }}>Texto Principal (Ej: Temporada 2026) *</label>
                  <input type="text" value={bannerForm.title} onChange={e => setBannerForm(p => ({...p, title: e.target.value}))} placeholder="Ej: Temporada 2026" style={{ marginBottom: 0 }} required />
                </div>
                <div style={{ flex: '1' }}>
                  <label style={{ fontSize: '0.65rem' }}>Subtítulo / Título H1</label>
                  <input type="text" value={bannerForm.subtitle} onChange={e => setBannerForm(p => ({...p, subtitle: e.target.value}))} placeholder="Ej: Cartelera" style={{ marginBottom: 0 }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.65rem' }}>Imagen del Banner</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label style={{ flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'rgba(222,184,65,0.07)', border: '1px dashed rgba(222,184,65,0.4)', borderRadius: '10px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--accent)' }}>
                    <Upload size={16} /> Subir imagen
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerImageUpload} />
                  </label>
                  {bannerForm.image_url && <img src={getImageUrl(bannerForm.image_url)} alt="preview" style={{ width: '56px', height: '40px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: '2' }}>
                  <label style={{ fontSize: '0.65rem' }}>URL de Destino al hacer clic (opcional)</label>
                  <input type="url" value={bannerForm.link_url} onChange={e => setBannerForm(p => ({...p, link_url: e.target.value}))} placeholder="https://..." style={{ marginBottom: 0 }} />
                </div>
                <div style={{ flex: '1' }}>
                  <label style={{ fontSize: '0.65rem', display: 'block', marginBottom: '4px' }}>Desde</label>
                  <input
                    type="date"
                    value={bannerForm.start_date}
                    onChange={e => setBannerForm(p => ({...p, start_date: e.target.value}))}
                    onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                    onFocus={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                    style={{
                      marginBottom: 0,
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      width: '100%',
                      boxSizing: 'border-box',
                      colorScheme: 'dark',
                      cursor: 'pointer'
                    }}
                  />
                </div>
                <div style={{ flex: '1' }}>
                  <label style={{ fontSize: '0.65rem', display: 'block', marginBottom: '4px' }}>Hasta</label>
                  <input
                    type="date"
                    value={bannerForm.end_date}
                    onChange={e => setBannerForm(p => ({...p, end_date: e.target.value}))}
                    onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                    onFocus={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                    style={{
                      marginBottom: 0,
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      width: '100%',
                      boxSizing: 'border-box',
                      colorScheme: 'dark',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-primary" disabled={isSavingBanner} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px' }}>
                  <Save size={16} /> {isSavingBanner ? 'Guardando...' : editingBannerId ? 'Actualizar Banner' : 'Crear Banner'}
                </button>
                {editingBannerId && (
                  <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '11px 16px' }} onClick={() => { setBannerForm({ title: '', subtitle: '', image_url: '', link_url: '', active: false, start_date: '', end_date: '' }); setEditingBannerId(null); }}>
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Lista de banners */}
          {loadingBanners ? <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Cargando banners...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {banners.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>No hay banners creados aún. ¡Crea el primero!</p>
              ) : banners.map(b => (
                <div key={b.id} className="glass-card" style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px 18px' }}>
                  {b.image_url ? <img src={getImageUrl(b.image_url)} alt={b.title} style={{ width: '70px', height: '44px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} /> : <div style={{ width: '70px', height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Image size={18} color="var(--text-muted)" /></div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{b.title}</div>
                    {b.subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.subtitle}</div>}
                    {b.start_date && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>Vigente: {b.start_date?.slice(0,10)} → {b.end_date?.slice(0,10) || 'sin fecha límite'}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    <button onClick={() => handleToggleBanner(b.id)} style={{ background: b.active ? 'rgba(52,199,89,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${b.active ? 'rgba(52,199,89,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', color: b.active ? '#34c759' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {b.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />} {b.active ? 'Activo' : 'Off'}
                    </button>
                    <button onClick={() => { setEditingBannerId(b.id); setBannerForm({ title: b.title, subtitle: b.subtitle || '', image_url: b.image_url || '', link_url: b.link_url || '', active: b.active, start_date: b.start_date?.slice(0,10) || '', end_date: b.end_date?.slice(0,10) || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ background: 'rgba(222,184,65,0.1)', border: '1px solid rgba(222,184,65,0.3)', color: 'var(--accent)', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDeleteBanner(b.id)} style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.2)', color: 'var(--error)', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA: USUARIOS */}
      {activeTab === 'usuarios' && (
        <div className="glass-panel fade-in">
          <AdminUsers />
        </div>
      )}

      {/* PESTAÑA: VALIDAR TRANSFERENCIAS */}
      {activeTab === 'transferencias' && (
        <div className="fade-in">
          {/* Barra de Búsqueda */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '16px 20px', marginBottom: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: '800' }}>Validación de Transferencias</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {filteredPendingTransfers.length} reservas pendientes de aprobación
                </p>
              </div>
              <button onClick={fetchData} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem'
              }}>
                <RefreshCw size={13} /> Actualizar
              </button>
            </div>
            
            <div style={{ position: 'relative' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cliente, whatsapp o número de orden..." 
                style={{ paddingLeft: '38px', marginBottom: '0', padding: '10px 10px 10px 38px' }}
              />
            </div>
          </div>

          {/* Listado de Transferencias */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loadingOrders ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <div className="spinner" />
              </div>
            ) : filteredPendingTransfers.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Users size={32} color="var(--text-muted)" style={{ marginBottom: '10px', opacity: 0.4 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay transferencias pendientes que coincidan con la búsqueda.</p>
              </div>
            ) : (
              filteredPendingTransfers.map((o) => {
                const dateFormatted = o.schedule_time
                  ? new Date(o.schedule_time).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : 'Sin fecha';
                const totalT = parseInt(o.ticket_count_adult || 0) + parseInt(o.ticket_count_child || 0);

                return (
                  <div key={o.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--accent)', letterSpacing: '0.5px', display: 'block', marginBottom: '3px' }}>#{o.order_num}</span>
                        <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '800' }}>{o.customer_name}</h3>
                      </div>
                      
                      <span style={{
                        fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px',
                        padding: '4px 10px', borderRadius: '6px',
                        background: 'rgba(255,204,0,0.1)', color: '#ffcc00',
                        border: '1px solid rgba(255,204,0,0.2)'
                      }}>
                        {o.payment_status}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <p style={{ margin: 0 }}>🎬 <b>Evento:</b> <span style={{ color: '#fff' }}>{o.event_title}</span></p>
                        <p style={{ margin: 0 }}>📅 <b>Función:</b> <span style={{ color: '#fff' }}>{dateFormatted}</span></p>
                        <p style={{ margin: 0 }}>🎟️ <b>Cantidad:</b> <span style={{ color: '#fff' }}>{totalT} entradas ({o.desglose || `${o.ticket_count_adult} Ad / ${o.ticket_count_child} Ni`})</span></p>
                        <p style={{ margin: 0 }}>📞 <b>Whatsapp:</b> <span style={{ color: '#fff' }}>{o.customer_whatsapp || 'N/A'}</span></p>
                        <p style={{ margin: 0 }}>📧 <b>Email:</b> <span style={{ color: '#fff' }}>{o.customer_email || 'N/A'}</span></p>
                        <p style={{ margin: 0, fontSize: '1rem', color: 'var(--accent)', fontWeight: '800', marginTop: '6px' }}>💰 Monto: ${parseFloat(o.amount_total || 0).toFixed(2)}</p>
                      </div>

                      {/* Sección Comprobante */}
                      {o.comprobante_url ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Comprobante Cargado:</label>
                          {o.comprobante_url.toLowerCase().endsWith('.pdf') ? (
                            <button 
                              type="button" 
                              onClick={() => setSelectedReceiptUrl(o.comprobante_url)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.03)', color: '#fff', cursor: 'pointer',
                                fontSize: '0.8rem', fontWeight: 'bold'
                              }}
                            >
                              📄 Abrir Comprobante PDF
                            </button>
                          ) : (
                            <div 
                              onClick={() => setSelectedReceiptUrl(o.comprobante_url)}
                              style={{ 
                                width: '120px', height: '120px', borderRadius: '10px', 
                                border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', 
                                cursor: 'pointer', position: 'relative', background: '#000'
                              }}
                              title="Haz clic para agrandar"
                            >
                              <img 
                                src={getImageUrl(o.comprobante_url)} 
                                alt="Comprobante" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              />
                              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '9px', textAlign: 'center', padding: '3px 0' }}>
                                Agrandar 🔍
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ⚠️ Sin comprobante cargado (Reserva de Staff/POS)
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '15px', marginTop: '5px' }}>
                      <button
                        onClick={() => handleUpdateStatus(o.id, o.payment_status, 'Pagado')}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          padding: '10px', borderRadius: '10px', border: '1px solid rgba(52,199,89,0.25)', cursor: 'pointer',
                          background: 'rgba(52,199,89,0.15)', color: '#34c759', fontWeight: '700', fontSize: '0.82rem',
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        <Check size={14} /> Aprobar Pago y Generar QRs
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(o.id, o.payment_status, 'Anulado')}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,59,48,0.25)', cursor: 'pointer',
                          background: 'rgba(255,59,48,0.1)', color: '#ff3b30', fontWeight: '700', fontSize: '0.82rem',
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        <X size={14} /> Rechazar / Anular Reserva
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA: CONFIGURACIÓN CUENTAS BANCARIAS */}
      {activeTab === 'bancos' && (
        <div className="fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
            {/* Formulario Crear/Editar */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '800', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editingBank ? '✏️ Editar Cuenta Bancaria' : '➕ Agregar Cuenta Bancaria'}
              </h3>
              
              <form onSubmit={handleSaveBankAccount} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label>Nombre del Banco *</label>
                    <input 
                      type="text" 
                      value={bankForm.bank_name} 
                      onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })} 
                      placeholder="Ej: Banco Pichincha"
                      required
                    />
                  </div>
                  <div>
                    <label>Tipo de Cuenta *</label>
                    <select 
                      value={bankForm.account_type} 
                      onChange={(e) => setBankForm({ ...bankForm, account_type: e.target.value })}
                      style={{ padding: '14px 16px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '12px' }}
                    >
                      <option value="Ahorros">Ahorros</option>
                      <option value="Corriente">Corriente</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label>Número de Cuenta *</label>
                    <input 
                      type="text" 
                      value={bankForm.account_number} 
                      onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })} 
                      placeholder="Ej: 2200888333"
                      required
                    />
                  </div>
                  <div>
                    <label>Nombre Titular *</label>
                    <input 
                      type="text" 
                      value={bankForm.owner_name} 
                      onChange={(e) => setBankForm({ ...bankForm, owner_name: e.target.value })} 
                      placeholder="Ej: Studio 5 Film"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label>Identificación Titular (Cédula/RUC) *</label>
                    <input 
                      type="text" 
                      value={bankForm.owner_id} 
                      onChange={(e) => setBankForm({ ...bankForm, owner_id: e.target.value })} 
                      placeholder="Ej: 1722883344"
                      required
                    />
                  </div>
                  <div>
                    <label>Correo Notificaciones (Opcional)</label>
                    <input 
                      type="email" 
                      value={bankForm.owner_email} 
                      onChange={(e) => setBankForm({ ...bankForm, owner_email: e.target.value })} 
                      placeholder="Ej: tesoreria@studio5.com"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0 20px 0' }}>
                  <button 
                    type="button" 
                    onClick={() => setBankForm({ ...bankForm, is_active: !bankForm.is_active })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: bankForm.is_active ? 'var(--success)' : 'var(--text-muted)' }}
                  >
                    {bankForm.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                  <span style={{ fontSize: '0.85rem', color: '#ccc', fontWeight: '500' }}>
                    {bankForm.is_active ? 'Cuenta Activa (Visible al público)' : 'Cuenta Inactiva (Oculta al público)'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" disabled={isSavingBank} className="btn-primary" style={{ flex: 2 }}>
                    <Save size={16} /> {editingBank ? 'Actualizar Cuenta' : 'Guardar Cuenta'}
                  </button>
                  {editingBank && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingBank(null);
                        setBankForm({ bank_name: '', account_type: 'Ahorros', account_number: '', owner_name: '', owner_id: '', owner_email: '', is_active: true });
                      }}
                      className="btn-secondary" 
                      style={{ flex: 1 }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Listado de Cuentas */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '800', marginBottom: '18px' }}>Cuentas Configuradas</h3>
              
              {loadingBanks ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
                  <div className="spinner" />
                </div>
              ) : bankAccounts.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>No hay cuentas bancarias registradas.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                  {bankAccounts.map((acc) => (
                    <div key={acc.id} className="glass-card" style={{ 
                      background: 'rgba(255,255,255,0.01)', 
                      borderColor: acc.is_active ? 'rgba(52,199,89,0.2)' : 'var(--glass-border)',
                      padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '800', color: '#fff', fontSize: '0.92rem' }}>{acc.bank_name}</span>
                        <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{acc.account_type}</span>
                      </div>
                      
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <p style={{ margin: 0 }}>🔢 <b>Número:</b> <span style={{ color: '#fff' }}>{acc.account_number}</span></p>
                        <p style={{ margin: 0 }}>👤 <b>Titular:</b> <span style={{ color: '#fff' }}>{acc.owner_name}</span></p>
                        <p style={{ margin: 0 }}>🆔 <b>Cédula/RUC:</b> <span style={{ color: '#fff' }}>{acc.owner_id}</span></p>
                        {acc.owner_email && <p style={{ margin: 0 }}>📧 <b>Correo:</b> <span style={{ color: '#fff' }}>{acc.owner_email}</span></p>}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '5px' }}>
                        <button 
                          onClick={() => handleToggleBankActive(acc)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            color: acc.is_active ? 'var(--success)' : 'var(--text-muted)', fontSize: '0.72rem', fontWeight: '700'
                          }}
                        >
                          {acc.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />} {acc.is_active ? 'Activa' : 'Oculta'}
                        </button>
                        
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            onClick={() => handleStartEditBank(acc)} 
                            style={{ background: 'rgba(222,184,65,0.1)', border: '1px solid rgba(222,184,65,0.3)', color: 'var(--accent)', borderRadius: '6px', padding: '5px 9px', cursor: 'pointer', display: 'flex' }}
                            title="Editar"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={() => handleDeleteBankAccount(acc.id, acc.bank_name)} 
                            style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.2)', color: 'var(--error)', borderRadius: '6px', padding: '5px 9px', cursor: 'pointer', display: 'flex' }}
                            title="Eliminar"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Visor de Comprobante */}
      {selectedReceiptUrl && (
        <div 
          onClick={() => setSelectedReceiptUrl(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 20000,
            padding: '20px'
          }}
          className="fade-in"
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative', width: '100%', maxWidth: '700px', maxHeight: '90vh',
              background: '#151515', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px', padding: '15px', display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.95rem' }}>Comprobante de Pago</span>
              <button 
                onClick={() => setSelectedReceiptUrl(null)}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', cursor: 'pointer', fontWeight: 'bold'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#080808', borderRadius: '12px', padding: '10px' }}>
              {selectedReceiptUrl.toLowerCase().endsWith('.pdf') ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <p style={{ color: '#ccc', marginBottom: '15px' }}>El comprobante es un archivo PDF.</p>
                  <a 
                    href={getImageUrl(selectedReceiptUrl)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ display: 'inline-flex', padding: '10px 20px', width: 'auto' }}
                  >
                    Abrir PDF en Nueva Pestaña <ExternalLink size={16} />
                  </a>
                </div>
              ) : (
                <img 
                  src={getImageUrl(selectedReceiptUrl)} 
                  alt="Comprobante" 
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }} 
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
