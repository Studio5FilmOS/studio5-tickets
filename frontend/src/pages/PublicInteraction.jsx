import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import { Sparkles, HelpCircle, AlertCircle, Compass } from 'lucide-react';

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const backendUrl = apiUrl.replace(/\/api$/, '');
  return `${backendUrl}${url}`;
};

const PublicInteraction = () => {
  const { scheduleId } = useParams();
  const [eventData, setEventData] = useState(null);
  const [activePoll, setActivePoll] = useState(null);
  const [revealedClues, setRevealedClues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voterId, setVoterId] = useState('');
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);

  // 1. Inicializar Identificador Anónimo en localStorage
  useEffect(() => {
    let id = localStorage.getItem('studio5_voter_id');
    if (!id) {
      // Generar token único anónimo de dispositivo
      const rand = Math.floor(1000 + Math.random() * 9000);
      id = `VOT-${Date.now()}-${rand}`;
      localStorage.setItem('studio5_voter_id', id);
    }
    setVoterId(id);
  }, []);

  // 2. Polling activo de datos de interacción (cada 4 segundos)
  useEffect(() => {
    if (!scheduleId || !voterId) return;

    const fetchLiveUpdates = async () => {
      try {
        const res = await api.get(`/tickets/interaction/public/${scheduleId}/${voterId}`);
        if (res.data.status === 'OK') {
          setEventData(res.data.event);
          setActivePoll(res.data.poll);
          setRevealedClues(res.data.clues);
          setError('');
        }
      } catch (err) {
        console.error(err);
        setError('Error al sincronizar con el servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchLiveUpdates();
    const interval = setInterval(fetchLiveUpdates, 4000);

    return () => clearInterval(interval);
  }, [scheduleId, voterId]);

  // 3. Registrar voto anónimo
  const handleVote = async (option) => {
    if (!activePoll || isSubmittingVote || !voterId) return;

    setIsSubmittingVote(true);

    const payload = {
      pollId: activePoll.id,
      scheduleId,
      voterId,
      option
    };

    try {
      const res = await api.post('/tickets/interaction/public/vote', payload);
      if (res.data.status === 'OK') {
        Swal.fire({
          title: '¡Voto Sumado!',
          text: `Elegiste: ${option}`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        
        setActivePoll({
          ...activePoll,
          user_vote: option
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'No se pudo enviar el voto.', 'error');
    } finally {
      setIsSubmittingVote(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px 0' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error && !eventData) {
    return (
      <div className="glass-panel text-center" style={{ borderColor: 'var(--error)' }}>
        <AlertCircle size={48} color="var(--error)" style={{ margin: '0 auto 15px' }} />
        <h3 style={{ color: 'var(--error)' }}>Error de Sincronización</h3>
        <p style={{ color: '#ccc' }}>No se pudo conectar al servidor del teatro.</p>
        <button onClick={() => window.location.reload()} className="btn-outline" style={{ marginTop: '15px' }}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Cabecera / Afiche de la Obra */}
      {eventData && (
        <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '0', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
            <img src={getImageUrl(eventData.banner_url)} alt={eventData.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', padding: '15px' }}>
              <span className="badge badge-promo" style={{ marginBottom: '5px' }}>En Vivo</span>
              <h2 style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 'bold', textTransform: 'uppercase' }}>{eventData.title}</h2>
            </div>
          </div>
          <div style={{ padding: '15px 20px', background: 'rgba(255,255,255,0.01)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Bienvenido al portal de la sala. Tu celular interactúa con el escenario. Por favor, mantén esta página abierta durante el show.
            </p>
          </div>
        </div>
      )}

      {/* Panel Interactivo */}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', borderLeft: '4px solid var(--accent)', padding: '1.25rem', marginBottom: '25px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
          <Sparkles size={20} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem', color: '#fff', fontWeight: '800' }}>PORTAL DE INTERACCIÓN</h3>
        </div>

        {/* Encuestas */}
        {activePoll ? (
          <div className="fade-in" style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '15px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--accent)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HelpCircle size={16} /> ¡VOTACIÓN EN VIVO!
            </h4>
            <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '15px', color: '#fff' }}>{activePoll.question}</p>

            {activePoll.user_vote ? (
              <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(52, 199, 89, 0.1)', borderRadius: '8px', border: '1px solid rgba(52, 199, 89, 0.2)', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                ✔️ Votaste por: <span style={{ textDecoration: 'underline' }}>{activePoll.user_vote}</span>
                <p style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)', marginTop: '4px' }}>Espera que el escenario te lo indique...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activePoll.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleVote(opt)}
                    disabled={isSubmittingVote}
                    className="btn-secondary"
                    style={{ padding: '10px 15px', fontSize: '0.8rem', textAlign: 'left', justifyContent: 'flex-start' }}
                  >
                    {idx + 1}. {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '25px 10px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px dashed var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '15px' }}>
            ⌛ Esperando a que empiece una votación en el escenario...
          </div>
        )}

        {/* Pistas */}
        {revealedClues.length > 0 ? (
          <div className="fade-in">
            <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
              📂 Pistas Recibidas ({revealedClues.length})
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {revealedClues.map((clue) => (
                <div 
                  key={clue.id} 
                  style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', padding: '12px 15px', borderRadius: '12px' }}
                >
                  <strong style={{ fontSize: '0.85rem', color: '#fff', display: 'block', marginBottom: '6px' }}>🔍 {clue.title}</strong>
                  <p style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: '1.4' }}>{clue.content}</p>
                  {clue.image_url && (
                    <img src={clue.image_url} alt={clue.title} style={{ width: '100%', borderRadius: '8px', marginTop: '10px', maxHeight: '150px', objectFit: 'cover' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ maxWidth: '420px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', paddingBottom: '30px' }}>
        <p>Portal público anónimo de Studio 5. Tu voto es único por dispositivo.</p>
        <Link to="/" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-block', marginTop: '12px', fontWeight: 'bold' }}>
          Volver a Cartelera
        </Link>
      </div>
    </div>
  );
};

export default PublicInteraction;
