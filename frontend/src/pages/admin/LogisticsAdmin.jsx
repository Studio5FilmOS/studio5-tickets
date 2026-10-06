import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { Package, Plus, Printer, Users, Palette, Settings, Trash2, CheckCircle2, Clock, Check, ExternalLink } from 'lucide-react';

const LogisticsAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tenant } = useParams();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Estado para asignar staff
  const [assigningCampaign, setAssigningCampaign] = useState(null);
  const [staffUsers, setStaffUsers] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

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
        Swal.fire('¡Campaña Creada!', 'La campaña y sus códigos de tickets se generaron exitosamente.', 'success');
        fetchCampaigns();
      }
    } catch (err) {
      Swal.fire('Error', err?.response?.data?.message || 'Error al crear la campaña', 'error');
    }
  };

  const handleDeleteCampaign = async (id, name) => {
    const confirm = await Swal.fire({
      title: `¿Eliminar "${name}"?`,
      text: 'Esta acción borrará la campaña y todos sus tickets asociados de forma permanente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff4444',
      cancelButtonColor: '#333',
      confirmButtonText: 'Sí, Eliminar'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await api.delete(`/logistics/campaigns/${id}`);
        if (res.data?.status === 'OK') {
          Swal.fire('Eliminada', 'La campaña fue eliminada.', 'success');
          fetchCampaigns();
        }
      } catch (err) {
        Swal.fire('Error', 'No se pudo eliminar la campaña.', 'error');
      }
    }
  };

  const openAssignStaffModal = async (campaign) => {
    setAssigningCampaign(campaign);
    setLoadingStaff(true);
    try {
      // Cargar lista de usuarios staff
      const usersRes = await api.get('/admin/users');
      const allStaff = (usersRes.data?.users || []).filter(u => u.role === 'staff' || u.role === 'admin');
      setStaffUsers(allStaff);

      // Cargar asignados actuales
      const campDetails = await api.get(`/logistics/campaigns/${campaign.id}`);
      const assignedIds = (campDetails.data?.data?.assigned_staff || []).map(s => s.id);
      setSelectedStaffIds(assignedIds);
    } catch (err) {
      console.error('Error cargando staff:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleSaveStaffAssignments = async () => {
    if (!assigningCampaign) return;
    try {
      const res = await api.post(`/logistics/campaigns/${assigningCampaign.id}/assign-staff`, {
        staff_ids: selectedStaffIds
      });
      if (res.data?.status === 'OK') {
        Swal.fire('Guardado', 'Personal asignado correctamente a la campaña.', 'success');
        setAssigningCampaign(null);
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo asignar el personal.', 'error');
    }
  };

  if (loading) return <div className="spinner" style={{ margin: '100px auto' }}></div>;

  return (
    <div className="admin-container" style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 6px 0', color: '#fff' }}>
            <Package size={28} style={{ color: 'var(--accent)' }} /> Espacio de Logística & Campañas
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Gestión independiente de campañas, canastas, lotes, stickers de impresión y personal de entrega.
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Nueva Campaña
        </button>
      </div>

      {/* Modal Crear Campaña */}
      {showCreateModal && (
        <div className="glass-panel" style={{ marginBottom: '30px', border: '1px solid var(--accent)', padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent)' }}>
            <Settings size={20} /> Crear Campaña de Logística (Canastas / Lotes)
          </h3>
          <form onSubmit={handleCreateCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <div style={{ flex: '2', minWidth: '260px' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '5px' }}>Nombre de la Campaña *</label>
                <input 
                  type="text" 
                  value={newCampaign.name} 
                  onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})} 
                  placeholder="Ej: Canasta Navideña 2024 / Kit Escolar"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff' }} 
                  required 
                />
              </div>
              <div style={{ flex: '1', minWidth: '160px' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '5px' }}>Total de Tickets / Canastas *</label>
                <input 
                  type="number" 
                  min="1"
                  max="10000"
                  value={newCampaign.total_items} 
                  onChange={(e) => setNewCampaign({...newCampaign, total_items: parseInt(e.target.value, 10) || 1})} 
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff' }} 
                  required 
                />
              </div>
            </div>

            {/* Configuración de Artículos que incluye cada canasta */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <label style={{ display: 'block', color: 'var(--accent)', fontWeight: 700, marginBottom: '10px', fontSize: '0.9rem' }}>
                📦 Artículos incluidos por Canasta / Ticket
              </label>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <input 
                  type="text"
                  placeholder="Ej: Panetón 800g, Arroz 2kg..."
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  style={{ flex: 3, minWidth: '200px', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                />
                <input 
                  type="number"
                  min="1"
                  placeholder="Cant."
                  value={newItemQty}
                  onChange={e => setNewItemQty(e.target.value)}
                  style={{ flex: 1, minWidth: '80px', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                />
                <button 
                  type="button" 
                  onClick={handleAddItemToBreakdown}
                  className="btn-secondary"
                  style={{ padding: '10px 18px', background: 'rgba(222,184,65,0.15)', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                  + Agregar Artículo
                </button>
              </div>

              {newCampaign.items_breakdown.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {newCampaign.items_breakdown.map((item, idx) => (
                    <span key={idx} style={{ background: 'rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                      <strong>{item.qty}x</strong> {item.name}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveItemFromBreakdown(idx)}
                        style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '5px' }}><Palette size={14} style={{ display: 'inline' }}/> Color de Campaña</label>
                <input type="color" value={newCampaign.primaryColor} onChange={(e) => setNewCampaign({...newCampaign, primaryColor: e.target.value})} style={{ width: '100%', height: '40px', padding: '2px', border: 'none', background: 'transparent', cursor: 'pointer' }} />
              </div>
              <div style={{ flex: 2, minWidth: '220px' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '5px' }}>Animación Pública</label>
                <select value={newCampaign.theme} onChange={(e) => setNewCampaign({...newCampaign, theme: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: '#1e1b4b', color: '#fff' }}>
                  <option value="belen">Noche de Estrellas (Belén)</option>
                  <option value="garden">Jardín de Donaciones</option>
                  <option value="bar">Barra de Progreso Clásica</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff' }}>Cancelar</button>
              <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>Crear y Generar Lote</button>
            </div>
          </form>
        </div>
      )}

      {/* Listado de Campañas */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '20px', color: '#fff' }}>Campañas en Curso</h3>
        {campaigns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <Package size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>No tienes campañas de logística creadas aún. Haz clic en "Nueva Campaña" para comenzar.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {campaigns.map(camp => {
              const total = parseInt(camp.total_items_count || camp.total_items, 10) || 1;
              const received = parseInt(camp.received_count || 0, 10);
              const dispatched = parseInt(camp.dispatched_count || 0, 10);
              const available = parseInt(camp.available_count || 0, 10);
              const pct = Math.min(100, ((received / total) * 100)).toFixed(1);

              return (
                <div 
                  key={camp.id} 
                  style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px', 
                    padding: '20px',
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '16px' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h4 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
                        <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: camp.theme_config?.primaryColor || 'var(--accent)' }}></span> 
                        {camp.name}
                      </h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                        {camp.items_breakdown && Array.isArray(camp.items_breakdown) && camp.items_breakdown.length > 0 ? (
                          <span>Artículos: {camp.items_breakdown.map(i => `${i.qty}x ${i.name}`).join(' · ')}</span>
                        ) : 'Canasta estándar'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => openAssignStaffModal(camp)} 
                        className="btn-secondary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                      >
                        <Users size={15} /> Asignar Staff
                      </button>

                      <a 
                        href={`/${tenant || 'studio5'}/belen`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', background: 'rgba(222,184,65,0.1)', border: '1px solid rgba(222,184,65,0.3)', color: 'var(--accent)', textDecoration: 'none' }}
                      >
                        <ExternalLink size={15} /> Pantalla en Vivo
                      </a>

                      <button 
                        onClick={() => handlePrintStickers(camp)} 
                        className="btn-primary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem' }}
                      >
                        <Printer size={15} /> Imprimir Stickers (A4)
                      </button>

                      <button 
                        onClick={() => handleDeleteCampaign(camp.id, camp.name)} 
                        style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.2)', color: '#ff4444', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title="Eliminar campaña"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Barra de Progreso y Métricas */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      <span>Progreso de Entregas: <strong>{pct}%</strong></span>
                      <span>Total: <strong>{total} tickets</strong></span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #10b981)', transition: 'width 0.5s' }} />
                    </div>
                  </div>

                  {/* Tarjetas de Métricas Rápidas */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '4px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Disponibles</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#94a3b8' }}>{available}</div>
                    </div>
                    <div style={{ background: 'rgba(59,130,246,0.1)', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(59,130,246,0.2)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#93c5fd', textTransform: 'uppercase' }}>Asignados</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3b82f6' }}>{dispatched}</div>
                    </div>
                    <div style={{ background: 'rgba(16,185,129,0.1)', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#6ee7b7', textTransform: 'uppercase' }}>Canjeados / Entregados</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>{received}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Asignar Personal Staff */}
      {assigningCampaign && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}>
            <h3 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '8px' }}>
              👥 Asignar Personal a la Campaña
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '20px' }}>
              {assigningCampaign.name}: Solo el personal seleccionado podrá operar y escanear en esta campaña.
            </p>

            {loadingStaff ? (
              <div className="spinner" style={{ margin: '30px auto' }}></div>
            ) : staffUsers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                No hay usuarios con rol Staff registrados en la plataforma.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {staffUsers.map(st => {
                  const isChecked = selectedStaffIds.includes(st.id);
                  return (
                    <label 
                      key={st.id} 
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '12px', 
                        background: isChecked ? 'rgba(222,184,65,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isChecked ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
                        padding: '12px 16px', borderRadius: '10px', cursor: 'pointer' 
                      }}
                    >
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStaffIds(prev => [...prev, st.id]);
                          } else {
                            setSelectedStaffIds(prev => prev.filter(id => id !== st.id));
                          }
                        }}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                      />
                      <div>
                        <strong style={{ color: '#fff', fontSize: '0.9rem', display: 'block' }}>{st.name}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{st.email} {st.phone && `· ${st.phone}`}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => setAssigningCampaign(null)} 
                className="btn-secondary" 
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff' }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleSaveStaffAssignments} 
                className="btn-primary" 
                style={{ flex: 1, padding: '12px' }}
              >
                Guardar Asignaciones
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsAdmin;
