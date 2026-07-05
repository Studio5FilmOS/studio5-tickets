import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { ShieldCheck, Mail, Lock } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      Swal.fire({
        title: '¡Bienvenido!',
        text: 'Sesión iniciada con éxito.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });

      // Redireccionar según el rol del usuario
      const savedUser = JSON.parse(localStorage.getItem('studio5_user'));
      if (savedUser?.role === 'admin') {
        navigate('/admin');
      } else if (savedUser?.role === 'staff') {
        navigate('/staff/scan');
      } else {
        navigate('/');
      }
    } else {
      Swal.fire('Error de Acceso', result.message, 'error');
    }
  };

  return (
    <div className="glass-panel fade-in" style={{ maxWidth: '400px', margin: '40px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '25px' }}>
        <div style={{ display: 'inline-flex', background: 'rgba(241,165,28,0.1)', padding: '15px', borderRadius: '50%', marginBottom: '15px' }}>
          <ShieldCheck size={36} color="var(--accent)" />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>INGRESO UNIFICADO</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Personal administrativo y de portería</p>
      </div>

      <form onSubmit={handleSubmit}>
        <label>Correo Electrónico</label>
        <div style={{ position: 'relative' }}>
          <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '16px' }} />
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="ejemplo@studio5.com" 
            style={{ paddingLeft: '45px' }}
            required 
          />
        </div>

        <label>Contraseña</label>
        <div style={{ position: 'relative' }}>
          <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '16px' }} />
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="••••••••" 
            style={{ paddingLeft: '45px' }}
            required 
          />
        </div>

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={isSubmitting}
          style={{ marginTop: '10px' }}
        >
          {isSubmitting ? 'VERIFICANDO...' : 'INICIAR SESIÓN'}
        </button>
      </form>

      <div style={{ marginTop: '25px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <p>¿No eres personal de Studio 5?</p>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' }}>
          Volver a la cartelera pública
        </button>
      </div>
    </div>
  );
};

export default Login;
