import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Package, Plus, Printer, Users, Palette, Settings } from 'lucide-react';

// URL base de la API (Ajustado al estándar que usa Vite)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const LogisticsAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tenant } = useParams();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    total_items: 2000,
    theme: 'belen',
    primaryColor: '#DEB841',
  });

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${API_URL}/api/logistics/campaigns`);
      const data = await res.json();
      if (data.status === 'OK') {
        setCampaigns(data.data);
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
    // Navegar a la pantalla oculta de impresión A4
    navigate(`/${tenant || 'studio5'}/logistica/admin/print/${campaign.id}`);
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/logistics/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCampaign.name,
          total_items: newCampaign.total_items,
          theme_config: { primaryColor: newCampaign.primaryColor, theme: newCampaign.theme }
        })
      });
      const data = await res.json();
      if (data.status === 'OK') {
        setShowCreateModal(false);
        fetchCampaigns(); // Recargar lista
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      alert('Error de red al crear la campaña');
    }
  };

  if (loading) return <div className="spinner" style={{ margin: '100px auto' }}></div>;

  return (
    <div className="admin-container" style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Package size={28} style={{ color: 'var(--accent)' }} /> Logística e Inventario</h2>
          <p style={{ color: 'var(--text-muted)' }}>Gestiona campañas, canastas, marca blanca y asignaciones.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Nueva Campaña
        </button>
      </div>

      {showCreateModal && (
        <div className="glass-panel" style={{ marginBottom: '30px', border: '2px solid var(--accent)' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><Settings size={20} /> Crear Campaña (Marca Blanca)</h3>
          <form onSubmit={handleCreateCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '5px' }}>Nombre de la Campaña</label>
                <input type="text" value={newCampaign.name} onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '5px' }}>Total de Artículos</label>
                <input type="number" value={newCampaign.total_items} onChange={(e) => setNewCampaign({...newCampaign, total_items: parseInt(e.target.value)})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff' }} required />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '5px' }}><Palette size={14} style={{ display: 'inline' }}/> Color Principal (App)</label>
                <input type="color" value={newCampaign.primaryColor} onChange={(e) => setNewCampaign({...newCampaign, primaryColor: e.target.value})} style={{ width: '100%', height: '40px', padding: '2px', border: 'none', background: 'transparent', cursor: 'pointer' }} />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '5px' }}>Tema Animado (Dashboard Público)</label>
                <select value={newCampaign.theme} onChange={(e) => setNewCampaign({...newCampaign, theme: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: '#1e1b4b', color: '#fff' }}>
                  <option value="belen">Noche de Estrellas (Belén)</option>
                  <option value="garden">Jardín (Rosas)</option>
                  <option value="bar">Barra de Progreso Clásica</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff' }}>Cancelar</button>
              <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>Guardar Campaña</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel">
        <h3 style={{ marginBottom: '20px' }}>Campañas Activas</h3>
        {campaigns.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No hay campañas de logística creadas.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {campaigns.map(camp => (
              <div key={camp.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h4 style={{ fontSize: '1.2rem', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: camp.theme_config?.primaryColor || 'var(--accent)' }}></span> {camp.name}
                  </h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total: {camp.total_items} | Tema Visual: {camp.theme_config?.theme || 'belen'}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => alert('Abrir modal asignar lote')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 15px', borderRadius: '8px', color: '#fff' }}><Users size={16} /> Asignar Lotes</button>
                  <button onClick={() => handlePrintStickers(camp)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Printer size={16} /> Imprimir A4</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogisticsAdmin;
