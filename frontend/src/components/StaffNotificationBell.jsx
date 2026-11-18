import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, X, Users, Package, Ticket } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';

const StaffNotificationBell = ({ compact = false }) => {
  const { isAuthenticated, refreshUser } = useAuth();
  const { switchTeam } = useWorkspace();
  const [invitations, setInvitations] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const fetchInvitations = useCallback(async () => {
    if (!isAuthenticated) {
      setInvitations([]);
      return;
    }
    try {
      const res = await api.get('/users/my-invitations');
      if (res.data.status === 'OK') {
        setInvitations(res.data.invitations || []);
      }
    } catch {
      // Silencioso en polling de notificaciones
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchInvitations();
    if (!isAuthenticated) return;
    const timer = setInterval(fetchInvitations, 30000);
    return () => clearInterval(timer);
  }, [fetchInvitations, isAuthenticated]);

  if (!isAuthenticated) return null;

  const handleRespond = async (inv, action) => {
    setProcessingId(inv.id);
    try {
      const res = await api.post(`/users/my-invitations/${inv.id}/respond`, { action });
      if (res.data.status === 'OK') {
        setInvitations(prev => prev.filter(item => item.id !== inv.id));
        if (action === 'accept') {
          await refreshUser();
          setOpenModal(false);
          const result = await Swal.fire({
            icon: 'success',
            title: '¡Te uniste al equipo!',
            text: `Ahora eres parte del Staff de ${inv.organizer_name}. ¿Deseas cambiar a su espacio de trabajo ahora?`,
            showCancelButton: true,
            confirmButtonText: 'Ir al espacio del equipo',
            cancelButtonText: 'Seguir aquí',
            background: '#141418',
            color: '#fff',
            confirmButtonColor: '#DEB841'
          });
          if (result.isConfirmed) {
            await switchTeam(inv.organizer_id);
          }
        } else {
          Swal.fire({
            icon: 'info',
            title: 'Invitación rechazada',
            timer: 1600,
            showConfirmButton: false,
            background: '#141418',
            color: '#fff'
          });
        }
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'No se pudo procesar la invitación.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { fetchInvitations(); setOpenModal(true); }}
        title={invitations.length > 0 ? `Tienes ${invitations.length} invitación(es) de Staff` : 'Notificaciones'}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: compact ? '8px' : '8px 12px',
          borderRadius: '10px',
          background: invitations.length > 0 ? 'rgba(222, 184, 65, 0.14)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${invitations.length > 0 ? 'rgba(222, 184, 65, 0.4)' : 'rgba(255,255,255,0.1)'}`,
          color: invitations.length > 0 ? '#DEB841' : 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 700
        }}
      >
        <Bell size={16} />
        {!compact && <span>Notificaciones</span>}
        {invitations.length > 0 && (
          <span style={{
            position: compact ? 'absolute' : 'static',
            top: compact ? '-4px' : undefined,
            right: compact ? '-4px' : undefined,
            minWidth: '18px',
            height: '18px',
            padding: '0 5px',
            borderRadius: '999px',
            background: '#ef4444',
            color: '#fff',
            fontSize: '0.7rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {invitations.length}
          </span>
        )}
      </button>

      {openModal && (
        <div
          onClick={() => setOpenModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '460px',
              background: '#16161c',
              border: '1px solid rgba(222, 184, 65, 0.35)',
              borderRadius: '16px',
              padding: '22px',
              color: '#fff',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(222,184,65,0.15)', color: '#DEB841',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Users size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Invitaciones de Equipo</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Solicitudes para unirte como Staff
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: 'none', color: '#aaa',
                  borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {invitations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No tienes invitaciones pendientes en este momento.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {invitations.map(inv => (
                  <div
                    key={inv.id}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '4px' }}>
                      {inv.organizer_name}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      {inv.organizer_email} te invitó a colaborar en su equipo de Staff.
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {inv.module_cartelera && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
                          background: 'rgba(222,184,65,0.15)', color: '#DEB841'
                        }}>
                          <Ticket size={12} /> Cartelera / Escáner
                        </span>
                      )}
                      {inv.module_logistics && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
                          background: 'rgba(56,189,248,0.15)', color: '#38bdf8'
                        }}>
                          <Package size={12} /> Logística
                        </span>
                      )}
                    </div>

                    {inv.message && (
                      <div style={{
                        fontSize: '0.8rem', fontStyle: 'italic', color: '#ddd',
                        background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '8px', marginBottom: '12px'
                      }}>
                        “{inv.message}”
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        disabled={processingId === inv.id}
                        onClick={() => handleRespond(inv, 'accept')}
                        style={{
                          flex: 1, padding: '9px 12px', borderRadius: '8px', border: 'none',
                          background: '#10b981', color: '#fff', fontWeight: 700, fontSize: '0.82rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                      >
                        <Check size={15} /> Aceptar
                      </button>
                      <button
                        type="button"
                        disabled={processingId === inv.id}
                        onClick={() => handleRespond(inv, 'reject')}
                        style={{
                          flex: 1, padding: '9px 12px', borderRadius: '8px',
                          border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.12)',
                          color: '#f87171', fontWeight: 700, fontSize: '0.82rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                      >
                        <X size={15} /> Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default StaffNotificationBell;
