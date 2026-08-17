import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { ShieldCheck, Mail, Lock, KeyRound, UserPlus, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados del Modal OTP para cuentas no verificadas
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  const otpInputsRef = useRef([]);
  const { login, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (showOtpModal && resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [showOtpModal, resendCooldown]);

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
      if (savedUser?.role === 'admin' || savedUser?.role === 'organizer') {
        navigate('/admin');
      } else if (savedUser?.role === 'staff') {
        navigate('/staff/scan');
      } else {
        navigate('/mis-tickets');
      }
    } else if (result.unverified) {
      setOtpEmail(result.email || email);
      setShowOtpModal(true);
      setResendCooldown(60);
      setTimeout(() => otpInputsRef.current[0]?.focus(), 300);
    } else {
      Swal.fire('Error de Acceso', result.message, 'error');
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...otpCode];
    newCode[index] = value.slice(-1);
    setOtpCode(newCode);
    if (value && index < 5) otpInputsRef.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      setOtpCode(pastedData.split(''));
      otpInputsRef.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    const fullCode = otpCode.join('');
    if (fullCode.length !== 6) {
      Swal.fire('Código Incompleto', 'Por favor ingresa los 6 dígitos.', 'warning');
      return;
    }

    setIsVerifying(true);
    const result = await verifyOtp(otpEmail, fullCode);
    setIsVerifying(false);

    if (result.success) {
      setShowOtpModal(false);
      Swal.fire({
        title: '¡Cuenta Verificada!',
        text: 'Tu sesión se ha iniciado con éxito.',
        icon: 'success',
        timer: 1800,
        showConfirmButton: false
      });

      const userRole = result.user?.role;
      if (userRole === 'admin' || userRole === 'organizer') {
        navigate('/admin');
      } else if (userRole === 'staff') {
        navigate('/staff/scan');
      } else {
        navigate('/mis-tickets');
      }
    } else {
      Swal.fire('Error', result.message, 'error');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    const result = await resendOtp(otpEmail);
    setIsResending(false);

    if (result.success) {
      setResendCooldown(60);
      Swal.fire({
        toast: true, position: 'top-end', icon: 'success',
        title: 'Nuevo código enviado', showConfirmButton: false, timer: 3000
      });
    } else {
      Swal.fire('Error', result.message, 'error');
    }
  };

  return (
    <div className="glass-panel fade-in" style={{ maxWidth: '420px', margin: '40px auto', padding: '32px 28px' }}>
      <div style={{ textAlign: 'center', marginBottom: '25px' }}>
        <div style={{ display: 'inline-flex', background: 'rgba(222,184,65,0.12)', padding: '15px', borderRadius: '50%', marginBottom: '12px' }}>
          <ShieldCheck size={36} color="var(--accent)" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>INICIAR SESIÓN</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>Accede a tus boletos y panel de control</p>
      </div>

      <form onSubmit={handleSubmit}>
        <label>Correo Electrónico</label>
        <div style={{ position: 'relative' }}>
          <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '16px' }} />
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="ejemplo@correo.com" 
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
          style={{ marginTop: '12px' }}
        >
          {isSubmitting ? 'VERIFICANDO...' : 'INGRESAR'}
        </button>
      </form>

      <div style={{ marginTop: '22px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        <span>¿No tienes una cuenta aún? </span>
        <Link to="/registro" style={{ color: 'var(--accent)', fontWeight: 'bold', textDecoration: 'none' }}>
          Registrarme gratis
        </Link>
      </div>

      <div style={{ marginTop: '15px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '15px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem' }}>
          ← Volver a la cartelera pública
        </button>
      </div>

      {/* MODAL OTP SI LA CUENTA ESTÁ PENDIENTE DE VERIFICACIÓN */}
      {showOtpModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-panel fade-in" style={{ maxWidth: '420px', width: '100%', padding: '32px 24px', textAlign: 'center', borderColor: 'var(--accent-glow)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(222,184,65,0.15)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <KeyRound size={22} color="var(--accent)" />
            </div>

            <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px 0' }}>Cuenta no Verificada</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Ingresa el código de 6 dígitos enviado a <br />
              <strong style={{ color: 'var(--accent)' }}>{otpEmail}</strong>
            </p>

            <form onSubmit={handleVerifyOtp}>
              <div onPaste={handleOtpPaste} style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '22px' }}>
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => otpInputsRef.current[idx] = el}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    style={{
                      width: '44px', height: '52px', fontSize: '1.4rem', fontWeight: 'bold',
                      textAlign: 'center', borderRadius: '10px',
                      border: `1.5px solid ${digit ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`,
                      background: 'rgba(255,255,255,0.04)', color: '#fff', marginBottom: 0, padding: 0
                    }}
                  />
                ))}
              </div>

              <button type="submit" className="btn-primary" disabled={isVerifying || otpCode.join('').length !== 6} style={{ marginBottom: '14px' }}>
                {isVerifying ? 'VERIFICANDO...' : 'VERIFICAR Y ENTRAR'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <button
                  type="button" onClick={handleResendOtp} disabled={resendCooldown > 0 || isResending}
                  style={{ background: 'none', border: 'none', color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--accent)', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', fontWeight: 600, padding: 0 }}
                >
                  {isResending ? 'Reenviando...' : (resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código')}
                </button>
                <button type="button" onClick={() => setShowOtpModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
