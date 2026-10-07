import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { 
  Package, Plus, Printer, Users, Palette, Settings, 
  Trash2, CheckCircle2, Clock, Check, ExternalLink,
  ChevronDown, ChevronUp, Layers, Hash, Calendar, ArrowRight
} from 'lucide-react';

const LogisticsAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tenant } = useParams();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedCampaignId, setExpandedCampaignId] = useState(null);

  // Estado para asignar staff & lotes
  const [assigningCampaign, setAssigningCampaign] = useState(null);
  const [staffUsers, setStaffUsers] = useState([]);
  const [staffAssignments, setStaffAssignments] = useState({}); // { [staff_id]: { assigned: bool, start: '', end: '', qty: 0 } }
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);

  // Estado de nueva campaña
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    total_items: 200,
    items_breakdown: [
      { name: 'Canasta Navideña Completa', qty: 1 }
    ],
    theme: 'belen',
    primaryColor: '#DEB841'
  });

  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);

  const fetchCampaigns = async () => {
    try {
      const res = await api.get('/logistics/campaigns');
      if (res.data.status === 'OK') {
        setCampaigns(res.data.data);
        if (res.data.data.length > 0 && !expandedCampaignId) {
          setExpandedCampaignId(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handlePrintStickers = (campaign) => {
    navigate(`/${tenant || 'studio5'}/logistica/admin/print/${campaign.id}`);
  };

  const handleAddItemToBreakdown = () => {
    if (!newItemName.trim()) return;
    setNewCampaign(prev => ({
      ...prev,
      items_breakdown: [...prev.items_breakdown, { name: newItemName.trim(), qty: parseInt(newItemQty, 10) || 1 }]
    }));
    setNewItemName('');
    setNewItemQty(1);
  };

  const handleRemoveItemFromBreakdown = (index) => {
    setNewCampaign(prev => ({
      ...prev,
      items_breakdown: prev.items_breakdown.filter((_, i) => i !== index)
    }));
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!newCampaign.name.trim()) {
      Swal.fire('Nombre Requerido', 'Ingresa el nombre de la campaña.', 'warning');
      return;
    }

    try {
      const res = await api.post('/logistics/campaigns', {
        name: newCampaign.name,
        description: newCampaign.description,
        total_items: newCampaign.total_items,
        items_breakdown: newCampaign.items_breakdown,
        theme_config: { primaryColor: newCampaign.primaryColor, theme: newCampaign.theme }
      });
      if (res.data.status === 'OK') {
        setShowCreateModal(false);
        setNewCampaign({
          name: '',
          description: '',
          total_items: 200,
          items_breakdown: [{ name: 'Canasta Navideña Completa', qty: 1 }],
          theme: 'belen',
          primaryColor: '#DEB841'
        });
        Swal.fire({
          icon: 'success',
          title: '¡Campaña Creada!',
          text: 'La campaña y sus códigos de tickets se generaron exitosamente.',
          background: '#16171f',
          color: '#fff',
          confirmButtonColor: '#DEB841'
        });
        fetchCampaigns();
      }
    } catch (err) {
      Swal.fire('Error', err?.response?.data?.message || 'Error al crear la campaña', 'error');
    }
  };

  const handleDeleteCampaign = (id, name) => {
    Swal.fire({
      title: `¿Eliminar "${name}"?`,
      text: 'Se eliminarán todos los códigos y registros de entrega de esta campaña. Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#16171f',
      color: '#fff'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/logistics/campaigns/${id}`);
          Swal.fire('Eliminada', 'La campaña fue eliminada con éxito.', 'success');
          fetchCampaigns();
        } catch (err) {
          Swal.fire('Error', 'No se pudo eliminar la campaña.', 'error');
        }
      }
    });
  };

  // Abrir modal de asignación de staff
  const openAssignStaffModal = async (campaign) => {
    setAssigningCampaign(campaign);
    setLoadingStaff(true);
    try {
      // 1. Obtener lista de staff
      const staffRes = await api.get('/users/my-staff');
      const staffList = staffRes.data?.staff || [];
      setStaffUsers(staffList);

      // 2. Obtener asignaciones actuales de la campaña
      const campRes = await api.get(`/logistics/campaigns/${campaign.id}`);
      const currentAssigned = campRes.data?.data?.assigned_staff || [];

      // Mapear al estado
      const mapping = {};
      staffList.forEach(st => {
        const found = currentAssigned.find(a => a.id === st.id);
        mapping[st.id] = {
          assigned: !!found,
          start: found?.batch_start_code || '',
          end: found?.batch_end_code || '',
          qty: found?.quantity_assigned || 0
        };
      });
      setStaffAssignments(mapping);
    } catch (err) {
      console.error('Error cargando staff:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Guardar asignaciones con lotes
  const handleSaveStaffAssignments = async () => {
    if (!assigningCampaign) return;
    setIsSavingAssignments(true);

    try {
      const assignments = Object.keys(staffAssignments)
        .filter(sid => staffAssignments[sid]?.assigned)
        .map(sid => ({
          staff_id: sid,
          batch_start_code: staffAssignments[sid].start || null,
          batch_end_code: staffAssignments[sid].end || null,
          quantity_assigned: parseInt(staffAssignments[sid].qty, 10) || 0
        }));

      await api.post(`/logistics/campaigns/${assigningCampaign.id}/assign-staff`, {
        assignments
      });

      Swal.fire({
        icon: 'success',
        title: '¡Personal y Lotes Guardados!',
        text: 'Los miembros de staff y sus rangos asignados han sido actualizados.',
        background: '#16171f',
        color: '#fff',
        confirmButtonColor: '#DEB841'
      });
      setAssigningCampaign(null);
      fetchCampaigns();
    } catch (err) {
      Swal.fire('Error', err?.response?.data?.message || 'Error al guardar asignaciones.', 'error');
    } finally {
      setIsSavingAssignments(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>
            Módulo de Logística
          </p>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#fff', margin: 0 }}>
            Campañas de Entrega & Lotes
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Gestiona kits, canastas, genera stickers de corte único y asigna personal por lotes.
          </p>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)} 
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', fontWeight: 800 }}
        >
          <Plus size={18} /> Nueva Campaña
        </button>
      </div>

      {/* Contenido / Listado Compacto de Campañas */}
      {loading ? (
        <div className="spinner" style={{ margin: '80px auto' }}></div>
      ) : campaigns.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Package size={52} opacity={0.25} style={{ margin: '0 auto 16px' }} />
          <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '8px' }}>No hay campañas creadas</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 20px' }}>
            Crea tu primera campaña de logística para generar códigos QR secuenciales e iniciar entregas.
          </p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            Crear Primera Campaña
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {campaigns.map(camp => {
            const isExpanded = expandedCampaignId === camp.id;
            const total = parseInt(camp.total_items_count || camp.total_items, 10) || 1;
            const received = parseInt(camp.received_count || 0, 10);
            const dispatched = parseInt(camp.dispatched_count || 0, 10);
            const available = parseInt(camp.available_count || 0, 10);
            const pct = Math.min(100, ((received / total) * 100)).toFixed(1);

            return (
              <div 
                key={camp.id} 
                className="glass-panel"
                style={{ 
                  borderRadius: '16px', 
                  border: isExpanded ? '1px solid rgba(222,184,65,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Cabecera Compacta / Fila de Acordeón */}
                <div 
                  onClick={() => setExpandedCampaignId(isExpanded ? null : camp.id)}
                  style={{ 
                    padding: '16px 20px', cursor: 'pointer', display: 'flex', 
                    alignItems: 'center', justifyContent: 'space-between', gap: '14px',
                    background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                    <div style={{ 
                      width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0,
                      background: camp.theme_config?.primaryColor || 'var(--accent)',
                      boxShadow: `0 0 10px ${camp.theme_config?.primaryColor || 'var(--accent)'}`
                    }} />
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {camp.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <span><strong>{total}</strong> tickets</span>
                        <span>·</span>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>{received} entregados ({pct}%)</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Barra de progreso mini */}
                    <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', display: 'none', '@media (minWidth: 480px)': { display: 'block' } }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#10b981' }} />
                    </div>

                    <div style={{ color: isExpanded ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Contenido Expandido del Acordeón */}
                {isExpanded && (
                  <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                    
                    {/* Artículos de la canasta */}
                    {camp.items_breakdown && Array.isArray(camp.items_breakdown) && camp.items_breakdown.length > 0 && (
                      <div style={{ marginBottom: '14px', fontSize: '0.8rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '10px' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Artículos por kit: </span>
                        {camp.items_breakdown.map(i => `${i.qty}x ${i.name}`).join(' · ')}
                      </div>
                    )}

                    {/* Tarjetas de Métricas Rápidas */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Disponibles</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#94a3b8' }}>{available}</div>
                      </div>
                      <div style={{ background: 'rgba(59,130,246,0.1)', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <span style={{ fontSize: '0.7rem', color: '#93c5fd', textTransform: 'uppercase' }}>Asignados</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b82f6' }}>{dispatched}</div>
                      </div>
                      <div style={{ background: 'rgba(16,185,129,0.1)', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <span style={{ fontSize: '0.7rem', color: '#6ee7b7', textTransform: 'uppercase' }}>Canjeados</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{received}</div>
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => handlePrintStickers(camp)} 
                        className="btn-primary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '9px', fontSize: '0.82rem', fontWeight: 700 }}
                      >
                        <Printer size={16} /> Imprimir Stickers (A4)
                      </button>

                      <button 
                        onClick={() => openAssignStaffModal(camp)} 
                        className="btn-secondary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '9px', fontSize: '0.82rem', color: '#fff', background: 'rgba(255,255,255,0.06)' }}
                      >
                        <Users size={16} /> Asignar Staff & Lotes
                      </button>

                      <Link 
                        to={`/${tenant || 'studio5'}/metas?cid=${camp.id}`}
                        className="btn-secondary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '9px', fontSize: '0.82rem', background: 'rgba(222,184,65,0.1)', border: '1px solid rgba(222,184,65,0.3)', color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}
                      >
                        <ExternalLink size={16} /> Pantalla de Metas
                      </Link>

                      <button 
                        onClick={() => handleDeleteCampaign(camp.id, camp.name)} 
                        style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '9px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title="Eliminar campaña"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL ASIGNAR STAFF Y LOTES ─────────────────────────────────────── */}
      {assigningCampaign && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', padding: '24px', maxHeight: '88vh', overflowY: 'auto' }}>
            <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>
              👥 Asignar Personal & Lotes
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '18px' }}>
              Campaña: <strong>{assigningCampaign.name}</strong>. Asigna a cada operador su rol y rango de tickets autorizados.
            </p>

            {loadingStaff ? (
              <div className="spinner" style={{ margin: '30px auto' }}></div>
            ) : staffUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                <p>No tienes usuarios de Staff registrados en tu equipo.</p>
                <p style={{ fontSize: '0.8rem' }}>Ve a la sección "Mi Marca & Staff" para crear los operadores primero.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
                {staffUsers.map(st => {
                  const state = staffAssignments[st.id] || { assigned: false, start: '', end: '', qty: 0 };

                  return (
                    <div 
                      key={st.id}
                      style={{ 
                        background: state.assigned ? 'rgba(222,184,65,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${state.assigned ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '12px', padding: '14px'
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: state.assigned ? '12px' : '0' }}>
                        <input 
                          type="checkbox"
                          checked={state.assigned}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setStaffAssignments(prev => ({
                              ...prev,
                              [st.id]: { ...state, assigned: isChecked }
                            }));
                          }}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                        />
                        <div>
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>{st.name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{st.email}</div>
                        </div>
                      </label>

                      {/* Rango de Lotes si está asignado */}
                      {state.assigned && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <div>
                            <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                              Código Inicio:
                            </label>
                            <input 
                              type="text"
                              value={state.start}
                              onChange={(e) => setStaffAssignments(prev => ({
                                ...prev,
                                [st.id]: { ...state, start: e.target.value }
                              }))}
                              placeholder="0001"
                              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 8px', borderRadius: '6px', fontSize: '0.8rem', textAlign: 'center' }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                              Código Fin:
                            </label>
                            <input 
                              type="text"
                              value={state.end}
                              onChange={(e) => setStaffAssignments(prev => ({
                                ...prev,
                                [st.id]: { ...state, end: e.target.value }
                              }))}
                              placeholder="0050"
                              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 8px', borderRadius: '6px', fontSize: '0.8rem', textAlign: 'center' }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                              Cant. Asignada:
                            </label>
                            <input 
                              type="number"
                              value={state.qty || ''}
                              onChange={(e) => setStaffAssignments(prev => ({
                                ...prev,
                                [st.id]: { ...state, qty: parseInt(e.target.value, 10) || 0 }
                              }))}
                              placeholder="50"
                              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 8px', borderRadius: '6px', fontSize: '0.8rem', textAlign: 'center' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => setAssigningCampaign(null)} 
                className="btn-secondary" 
                style={{ flex: 1, padding: '12px', borderRadius: '10px' }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleSaveStaffAssignments}
                className="btn-primary" 
                disabled={isSavingAssignments}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', fontWeight: 800 }}
              >
                {isSavingAssignments ? 'Guardando...' : 'Guardar Asignaciones'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL CREAR NUEVA CAMPAÑA ───────────────────────────────────────── */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>
              ✨ Crear Nueva Campaña de Logística
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '18px' }}>
              Define el nombre y la cantidad de códigos de ticket secuenciales a generar automáticamente.
            </p>

            <form onSubmit={handleCreateCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Nombre de la Campaña:
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newCampaign.name} 
                  onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })} 
                  placeholder="Ej. Campaña Navideña Belén 2026" 
                  required 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Cantidad Total de Tickets / Códigos a Generar:
                </label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={newCampaign.total_items} 
                  onChange={e => setNewCampaign({ ...newCampaign, total_items: parseInt(e.target.value, 10) || 1 })} 
                  min="1" 
                  max="5000"
                  required 
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Se crearán códigos secuenciales del #0001 al #{String(newCampaign.total_items).padStart(4, '0')}.
                </span>
              </div>

              {/* Artículos de la Canasta */}
              <div>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  Contenido de cada Canasta / Kit:
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Ej. Arroz 5kg, Aceite, Panetón" 
                    value={newItemName} 
                    onChange={e => setNewItemName(e.target.value)} 
                    className="input-field" 
                    style={{ flex: 1 }} 
                  />
                  <input 
                    type="number" 
                    value={newItemQty} 
                    onChange={e => setNewItemQty(e.target.value)} 
                    className="input-field" 
                    style={{ width: '70px', textAlign: 'center' }} 
                    min="1" 
                  />
                  <button 
                    type="button" 
                    onClick={handleAddItemToBreakdown} 
                    className="btn-secondary" 
                    style={{ padding: '0 12px' }}
                  >
                    +
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {newCampaign.items_breakdown.map((item, idx) => (
                    <span 
                      key={idx} 
                      style={{ 
                        fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', 
                        padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' 
                      }}
                    >
                      {item.qty}x {item.name}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveItemFromBreakdown(idx)} 
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Tema de Pantalla en Vivo */}
              <div>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  Animación por Defecto para Pantalla en Vivo:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'belen', label: '⭐ Belén', desc: 'Estrellas doradas' },
                    { id: 'garden', label: '🌹 Jardín', desc: 'Rosas florecidas' },
                    { id: 'bar', label: '📊 Barra', desc: 'Métrica en vivo' }
                  ].map(t => (
                    <div 
                      key={t.id}
                      onClick={() => setNewCampaign({ ...newCampaign, theme: t.id })}
                      style={{
                        padding: '10px 8px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer',
                        background: newCampaign.theme === t.id ? 'rgba(222,184,65,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${newCampaign.theme === t.id ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}`
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fff' }}>{t.label}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '12px', borderRadius: '10px' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', fontWeight: 800 }}
                >
                  Generar Campaña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LogisticsAdmin;
