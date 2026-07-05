import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const PayphoneRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // 'checking', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [txId, setTxId] = useState('');

  useEffect(() => {
    const processPayment = async () => {
      const id = searchParams.get('id');
      const clientTransactionId = searchParams.get('clientTransactionId');
      
      if (!id || !clientTransactionId) {
        setStatus('error');
        setErrorMessage('Faltan parámetros de transacción en la URL de retorno.');
        return;
      }

      setTxId(id);

      // Obtener los datos de la orden guardados antes de pagar
      const pendingStr = localStorage.getItem('pending_order');
      if (!pendingStr) {
        setStatus('error');
        setErrorMessage('No se encontraron los datos locales de tu compra. Si el cobro se realizó, por favor contacta a soporte indicando tu ID de pago.');
        return;
      }

      try {
        const pendingOrder = JSON.parse(pendingStr);

        // Enviar al servidor para verificar y crear
        const res = await api.post('/orders', {
          ...pendingOrder,
          numTransaccion: id, // ID de Payphone
          clientTxId: clientTransactionId
        });

        if (res.data.status === 'OK') {
          // Limpiar local storage
          localStorage.removeItem('pending_order');
          setStatus('success');
          
          Swal.fire({
            title: '¡Pago Confirmado!',
            text: 'Tu entrada ha sido generada exitosamente.',
            icon: 'success',
            confirmButtonText: 'Ver mis Boletos',
            confirmButtonColor: '#DEB841'
          }).then(() => {
            const firstTicket = res.data.tickets && res.data.tickets[0];
            if (firstTicket) {
              navigate(`/boleto/${firstTicket.ticket_code}`);
            } else {
              navigate('/');
            }
          });
        } else {
          throw new Error(res.data.message || 'Error al procesar la compra.');
        }
      } catch (err) {
        console.error('Error al procesar redirección de pago:', err);
        setStatus('error');
        setErrorMessage(err.response?.data?.message || err.message || 'Error de comunicación con el servidor.');
      }
    };

    processPayment();
  }, [searchParams, navigate]);

  return (
    <div className="glass-panel text-center" style={{ maxWidth: '500px', margin: '40px auto', padding: '40px 30px' }}>
      {status === 'checking' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <Loader2 className="spinner" size={48} style={{ color: 'var(--accent)', animation: 'spin 1.2s linear infinite' }} />
          <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>Procesando tu Pago</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Estamos confirmando la transacción con Payphone y generando tus boletos de acceso. Por favor no cierres esta ventana.
          </p>
        </div>
      )}

      {status === 'success' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <CheckCircle2 size={54} style={{ color: 'var(--success)' }} />
          <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 'bold' }}>¡Compra Exitosa!</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Tu pago ha sido validado correctamente. Redirigiéndote a tus boletos de ingreso...
          </p>
        </div>
      )}

      {status === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <AlertCircle size={54} style={{ color: 'var(--error)' }} />
          <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 'bold' }}>Inconveniente en tu Compra</h3>
          <p style={{ color: '#ff7b76', fontSize: '0.88rem', fontWeight: '500' }}>
            {errorMessage}
          </p>
          {txId && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--glass-border)', width: '100%', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>ID de Pago de Payphone:</span>
              <code style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{txId}</code>
            </div>
          )}
          <button onClick={() => navigate('/')} className="btn-primary" style={{ marginTop: '10px' }}>
            Volver a la Cartelera
          </button>
        </div>
      )}
    </div>
  );
};

export default PayphoneRedirect;
