import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { Flame, Sparkles, RefreshCw, Radio, Eye, EyeOff, QrCode, Download, Plus, Trash2 } from 'lucide-react';

const MomentoWow = () => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Estados para el Hub de Interactividad
  const [polls, setPolls] = useState([]);
  const [clues, setClues] = useState([]);
  const [loadingHub, setLoadingHub] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // 1. Cargar Eventos al montar
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get('/events?manage=true');
        if (res.data.status === 'OK') {
          setEvents(res.data.events);
          if (res.data.events.length > 0) {
            setSelectedEventId(res.data.events[0].id);
          }
        }
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'No se pudieron cargar los eventos.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const activeEvent = events.find(e => e.id === selectedEventId);

  // Seleccionar la primera función al cambiar de evento
  useEffect(() => {
    if (activeEvent && activeEvent.schedules.length > 0) {
      setScheduleId(activeEvent.schedules[0].id);
    } else {
      setScheduleId('');
    }
  }, [selectedEventId, activeEvent]);

  // 2. Jalar encuestas y pistas (Hub de Control)
  const fetchHubData = async () => {
    if (!selectedEventId || !scheduleId) return;
    setLoadingHub(true);
    try {
      const res = await api.get(`/tickets/interaction/admin/hub/${selectedEventId}/${scheduleId}`);
      if (res.data.status === 'OK') {
        setPolls(res.data.polls || []);
        setClues(res.data.clues || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHub(false);
    }
  };

  useEffect(() => {
    fetchHubData();
  }, [selectedEventId, scheduleId]);

  // Polling automático de los resultados de votaciones
  useEffect(() => {
    if (!selectedEventId || !scheduleId) return;
    
    const activePollExists = polls.some(p => p.is_active);
    if (!activePollExists) return;

    const interval = setInterval(() => {
      api.get(`/tickets/interaction/admin/hub/${selectedEventId}/${scheduleId}`)
        .then(res => {
          if (res.data.status === 'OK') {
            setPolls(res.data.polls || []);
          }
        }).catch(err => console.warn('Error en polling de votos:', err));
    }, 3000);

    return () => clearInterval(interval);
  }, [polls, selectedEventId, scheduleId]);

  // 3. Activar / Desactivar Encuesta
  const handleTogglePoll = async (pollId, currentStatus) => {
    setIsProcessingAction(true);
    const newStatus = !currentStatus;

    try {
      const res = await api.post('/tickets/interaction/admin/poll/toggle', {
        eventId: selectedEventId,
        pollId,
        isActive: newStatus
      });

      if (res.data.status === 'OK') {
        Swal.fire({
          title: newStatus ? 'Encuesta Activa' : 'Encuesta Cerrada',
          text: newStatus ? 'Los espectadores ya pueden votar desde sus celulares.' : 'Votación pausada.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        fetchHubData();
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo alternar el estado de la encuesta.', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Crear Nueva Encuesta
  const handleCreatePoll = async () => {
    const { value: formValues } = await Swal.fire({
      title: '🗳️ Nueva Pregunta / Encuesta',
      html: `
        <div style="text-align: left; font-size: 0.82rem; color: #ccc;">
          <label style="display:block; margin-bottom:4px; font-weight:bold; color:#DEB841;">PREGUNTA EN VIVO</label>
          <input id="swal-poll-q" class="swal2-input" placeholder="Ej: ¿Quién es el culpable?" style="width:100%; margin:0 0 12px 0; font-size:0.85rem; height:38px;">
          
          <label style="display:block; margin-bottom:4px; font-weight:bold; color:#fff;">OPCIÓN A</label>
          <input id="swal-poll-op1" class="swal2-input" placeholder="Opción 1" style="width:100%; margin:0 0 8px 0; font-size:0.85rem; height:36px;">
          
          <label style="display:block; margin-bottom:4px; font-weight:bold; color:#fff;">OPCIÓN B</label>
          <input id="swal-poll-op2" class="swal2-input" placeholder="Opción 2" style="width:100%; margin:0 0 8px 0; font-size:0.85rem; height:36px;">

          <label style="display:block; margin-bottom:4px; font-weight:bold; color:#fff;">OPCIÓN C (Opcional)</label>
          <input id="swal-poll-op3" class="swal2-input" placeholder="Opción 3 (opcional)" style="width:100%; margin:0 0 8px 0; font-size:0.85rem; height:36px;">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Crear Pregunta',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#DEB841',
      background: '#16171f',
      color: '#fff',
      preConfirm: () => {
        const q = document.getElementById('swal-poll-q').value.trim();
        const op1 = document.getElementById('swal-poll-op1').value.trim();
        const op2 = document.getElementById('swal-poll-op2').value.trim();
        const op3 = document.getElementById('swal-poll-op3').value.trim();

        if (!q) {
          Swal.showValidationMessage('Ingresa la pregunta para la audiencia.');
          return false;
        }
        if (!op1 || !op2) {
          Swal.showValidationMessage('Debes ingresar al menos 2 opciones de respuesta.');
          return false;
        }
        const options = [op1, op2];
        if (op3) options.push(op3);
        return { question: q, options };
      }
    });

    if (formValues) {
      try {
        const res = await api.post('/tickets/interaction/admin/poll', {
          eventId: selectedEventId,
          question: formValues.question,
          options: formValues.options
        });
        if (res.data.status === 'OK') {
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Pregunta creada', showConfirmButton: false, timer: 2000 });
          fetchHubData();
        }
      } catch (err) {
        Swal.fire('Error', 'No se pudo crear la pregunta.', 'error');
      }
    }
  };

  // Eliminar Encuesta
  const handleDeletePoll = async (pollId) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar encuesta?',
      text: 'Se borrarán los votos asociados a esta pregunta.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff3b30',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      background: '#16171f',
      color: '#fff'
    });
    if (confirm.isConfirmed) {
      try {
        await api.delete(`/tickets/interaction/admin/poll/${pollId}`);
        fetchHubData();
      } catch (err) {
        Swal.fire('Error', 'No se pudo eliminar la encuesta.', 'error');
      }
    }
  };

  // 4. Revelar / Ocultar Pista
  const handleToggleClue = async (clueId, currentStatus) => {
    setIsProcessingAction(true);
    const newStatus = !currentStatus;

    try {
      const res = await api.post('/tickets/interaction/admin/clue/reveal', {
        clueId,
        isRevealed: newStatus
      });

      if (res.data.status === 'OK') {
        Swal.fire({
          title: newStatus ? 'Pista Revelada' : 'Pista Ocultada',
          text: newStatus ? 'Visible ahora en el celular de toda la audiencia.' : 'Pista retirada de las pantallas.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        fetchHubData();
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo cambiar el estado de la pista.', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Crear Nueva Pista
  const handleCreateClue = async () => {
    const { value: formValues } = await Swal.fire({
      title: '🔍 Nueva Pista Secreta',
      html: `
        <div style="text-align: left; font-size: 0.82rem; color: #ccc;">
          <label style="display:block; margin-bottom:4px; font-weight:bold; color:#DEB841;">TÍTULO DE LA PISTA</label>
          <input id="swal-clue-title" class="swal2-input" placeholder="Ej: Pista 1: El objeto sospechoso" style="width:100%; margin:0 0 12px 0; font-size:0.85rem; height:38px;">
          
          <label style="display:block; margin-bottom:4px; font-weight:bold; color:#fff;">CONTENIDO / DESCRIPCIÓN</label>
          <textarea id="swal-clue-content" class="swal2-textarea" placeholder="Describe la pista que se mostrará en el celular del público..." style="width:100%; margin:0; font-size:0.85rem; height:70px;"></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar Pista',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#DEB841',
      background: '#16171f',
      color: '#fff',
      preConfirm: () => {
        const title = document.getElementById('swal-clue-title').value.trim();
        const content = document.getElementById('swal-clue-content').value.trim();

        if (!title) {
          Swal.showValidationMessage('Ingresa el título de la pista.');
          return false;
        }
        if (!content) {
          Swal.showValidationMessage('Ingresa el contenido de la pista.');
          return false;
        }
        return { title, content };
      }
    });

    if (formValues) {
      try {
        const res = await api.post('/tickets/interaction/admin/clue', {
          eventId: selectedEventId,
          title: formValues.title,
          content: formValues.content
        });
        if (res.data.status === 'OK') {
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Pista guardada', showConfirmButton: false, timer: 2000 });
          fetchHubData();
        }
      } catch (err) {
        Swal.fire('Error', 'No se pudo crear la pista.', 'error');
      }
    }
  };

  // Eliminar Pista
  const handleDeleteClue = async (clueId) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar pista?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff3b30',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      background: '#16171f',
      color: '#fff'
    });
    if (confirm.isConfirmed) {
      try {
        await api.delete(`/tickets/interaction/admin/clue/${clueId}`);
        fetchHubData();
      } catch (err) {
        Swal.fire('Error', 'No se pudo eliminar la pista.', 'error');
      }
    }
  };

  // Enlaces de la Sala Pública
  const publicUrl = scheduleId ? `${window.location.origin}/interaccion/${scheduleId}` : '';
  const publicQrUrl = publicUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}&color=000000&bgcolor=ffffff` : '';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px 0' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="glass-panel fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
        <Flame size={24} color="var(--accent)" />
        <h2 style={{ fontSize: '1.25rem', color: 'var(--accent)', fontWeight: '900', letterSpacing: '0.5px' }}>MOMENTOS INTERACTIVOS (WOW)</h2>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '20px' }}>
        Controla encuestas y revela pistas en tiempo real en los celulares de los espectadores.
      </p>

      {/* Selectores */}
      <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: '1' }}>
            <label style={{ fontSize: '0.65rem' }}>Selecciona Obra</label>
            <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} style={{ marginBottom: '0', padding: '10px' }}>
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1' }}>
            <label style={{ fontSize: '0.65rem' }}>Selecciona Función</label>
            <select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} style={{ marginBottom: '0', padding: '10px' }}>
              {activeEvent?.schedules.map((sch) => {
                const dateFormatted = new Date(sch.schedule_time).toLocaleDateString('es-EC', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                });
                return (
                  <option key={sch.id} value={sch.id}>{dateFormatted}</option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* --- SECCIÓN NUEVA: QR GENERADO PARA AFICHES DE LA SALA --- */}
      {scheduleId && (
        <div className="glass-card" style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '25px', background: 'rgba(3, 169, 244, 0.05)', borderColor: 'rgba(3,169,244,0.2)' }}>
          <div style={{ width: '100px', height: '100px', background: '#fff', padding: '5px', borderRadius: '8px', flexShrink: 0 }}>
            <img src={publicQrUrl} alt="Public QR" style={{ width: '100%', height: '100%' }} />
          </div>
          <div style={{ flex: 1, fontSize: '0.8rem' }}>
            <strong style={{ color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <QrCode size={16} /> QR GENERAL DE LA SALA
            </strong>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.3', marginBottom: '8px' }}>
              Coloca este QR en afiches, folletos o proyéctalo en pantalla para que los espectadores participen sin crear cuentas.
            </p>
            <a 
              href={publicQrUrl} 
              target="_blank" 
              rel="noreferrer"
              className="btn-outline" 
              style={{ width: 'auto', display: 'inline-flex', padding: '6px 12px', fontSize: '0.7rem', textTransform: 'none', letterSpacing: '0.5px' }}
            >
              <Download size={12} /> Descargar Imagen QR
            </a>
          </div>
        </div>
      )}

      {loadingHub ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="fade-in">
          {/* SECCIÓN 1: CONTROL DE ENCUESTAS */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🗳️ Encuestas de la Audiencia ({polls.length})
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleCreatePoll} className="btn-primary" style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Plus size={14} /> Nueva Pregunta
                </button>
                <button onClick={fetchHubData} className="btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.75rem' }}>
                  <RefreshCw size={12} /> Refrescar
                </button>
              </div>
            </div>

            {polls.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '24px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 12px 0' }}>No hay preguntas configuradas para este evento.</p>
                <button onClick={handleCreatePoll} className="btn-primary" style={{ width: 'auto', padding: '7px 14px', fontSize: '0.76rem', margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={14} /> Crear Primera Pregunta
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {polls.map((poll) => {
                  const totalVotes = poll.votes ? poll.votes.reduce((acc, v) => acc + v.votes_count, 0) : 0;
                  
                  return (
                    <div 
                      key={poll.id} 
                      className="glass-card" 
                      style={{ 
                        borderLeft: `4px solid ${poll.is_active ? 'var(--accent)' : 'var(--glass-border)'}`,
                        background: poll.is_active ? 'rgba(241,165,28,0.03)' : 'rgba(255,255,255,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#fff' }}>{poll.question}</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {poll.is_active && (
                            <span className="badge badge-promo" style={{ animation: 'pulse 1.5s infinite', fontSize: '0.6rem' }}>
                              <Radio size={10} style={{ marginRight: '4px' }} /> En Vivo
                            </span>
                          )}
                          <button
                            onClick={() => handleDeletePoll(poll.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                            title="Eliminar pregunta"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '15px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px' }}>
                        {poll.options.map((opt, idx) => {
                          const voteData = poll.votes ? poll.votes.find(v => v.selected_option === opt) : null;
                          const votes = voteData ? voteData.votes_count : 0;
                          const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

                          return (
                            <div key={idx} style={{ fontSize: '0.75rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ccc', marginBottom: '2px' }}>
                                <span>{opt}</span>
                                <span><b>{votes} votos</b> ({percent}%)</span>
                              </div>
                              <div style={{ width: '100%', height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${percent}%`, height: '100%', background: poll.is_active ? 'var(--accent)' : '#555', borderRadius: '3px', transition: 'width 0.5s ease-out' }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handleTogglePoll(poll.id, poll.is_active)}
                        disabled={isProcessingAction}
                        className={poll.is_active ? 'btn-secondary' : 'btn-primary'}
                        style={{ padding: '8px 12px', fontSize: '0.75rem', color: poll.is_active ? 'var(--error)' : '#000' }}
                      >
                        {poll.is_active ? <>Pausar Votación</> : <>Lanzar Pregunta a la Audiencia</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECCIÓN 2: CONTROL DE PISTAS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🔍 Pistas del Misterio ({clues.length})
              </h3>
              <button onClick={handleCreateClue} className="btn-primary" style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Plus size={14} /> Nueva Pista
              </button>
            </div>

            {clues.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '24px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 12px 0' }}>No hay pistas configuradas para este evento.</p>
                <button onClick={handleCreateClue} className="btn-primary" style={{ width: 'auto', padding: '7px 14px', fontSize: '0.76rem', margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={14} /> Crear Primera Pista
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {clues.map((clue) => (
                  <div 
                    key={clue.id} 
                    className="glass-card" 
                    style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px',
                      borderLeft: `4px solid ${clue.is_revealed ? 'var(--success)' : 'var(--glass-border)'}`
                    }}
                  >
                    <div style={{ flex: '1' }}>
                      <strong style={{ fontSize: '0.8rem', color: '#fff', display: 'block', marginBottom: '2px' }}>{clue.title}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }}>
                        {clue.content}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => handleToggleClue(clue.id, clue.is_revealed)}
                        disabled={isProcessingAction}
                        className={clue.is_revealed ? 'btn-secondary' : 'btn-primary'}
                        style={{ 
                          width: 'auto', padding: '8px 12px', fontSize: '0.75rem',
                          background: clue.is_revealed ? 'rgba(255, 59, 48, 0.1)' : 'var(--success)',
                          color: clue.is_revealed ? 'var(--error)' : '#000',
                          borderColor: clue.is_revealed ? 'rgba(255, 59, 48, 0.2)' : 'none',
                          boxShadow: 'none'
                        }}
                      >
                        {clue.is_revealed ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><EyeOff size={14} /> Ocultar</div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={14} /> Revelar</div>
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteClue(clue.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                        title="Eliminar pista"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(241, 165, 28, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(241, 165, 28, 0); }
          100% { box-shadow: 0 0 0 0 rgba(241, 165, 28, 0); }
        }
      `}</style>
    </div>
  );
};

export default MomentoWow;
