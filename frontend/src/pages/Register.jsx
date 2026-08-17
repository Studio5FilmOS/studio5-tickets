import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { ShieldCheck, Mail, Lock, User, Phone, Sparkles, Building2, Ticket, CheckCircle2, RefreshCw, KeyRound, ArrowRight } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('buyer'); // 'buyer', 'organizer', 'staff'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados del Modal OTP
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  const otpInputsRef = useRef([]);
  const { register, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  // Temporizador para reenvío de código
  useEffect(() => {
    let timer;
    if (showOtpModal && resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [showOtpModal, resendCooldown]);

  // Manejar envío de formulario de registro
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      Swal.fire('Campos requeridos', 'Por favor completa todos los campos obligatorios.', 'warning');
      return;
    }

    setIsSubmitting(true);
    const result = await register({
      name,
      email,
      phone,
      password,
      role
    });
    setIsSubmitting(false);

    if (result.success && result.pendingVerification) {
      setShowOtpModal(true);
      setResendCooldown(60);
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 300);
    } else {
      Swal.fire('Error en Registro', result.message, 'error');
    }
  };

  // Manejo de entrada de dígitos en el modal OTP
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...otpCode];
    newCode[index] = value.slice(-1);
    setOtpCode(newCode);

    // Auto-avance al siguiente input
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
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
      const digits = pastedData.split('');
      setOtpCode(digits);
      otpInputsRef.current[5]?.focus();
    }
  };

  // Verificar código OTP
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    const fullCode = otpCode.join('');
    if (fullCode.length !== 6) {
      Swal.fire('Código Incompleto', 'Por favor ingresa los 6 dígitos del código de verificación.', 'warning');
      return;
    }

    setIsVerifying(true);
    const result = await verifyOtp(email, fullCode);
    setIsVerifying(false);

    if (result.success) {
      setShowOtpModal(false);
      Swal.fire({
        title: '¡Cuenta Verificada!',
        text: 'Tu correo ha sido confirmado exitosamente.',
        icon: 'success',
        timer: 1800,
        showConfirmButton: false
      });

      // Redirigir según el rol
      const userRole = result.user?.role || role;
      if (userRole === 'admin' || userRole === 'organizer') {
        navigate('/admin');
      } else if (userRole === 'staff') {
        navigate('/staff/scan');
      } else {
        navigate('/mis-tickets');
      }
    } else {
      Swal.fire('Error de Verificación', result.message, 'error');
    }
  };

  // Reenviar código OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    const result = await resendOtp(email);
    setIsResending(false);

    if (result.success) {
      setResendCooldown(60);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Nuevo código enviado a tu correo',
        showConfirmButton: false,
        timer: 3000
      });
    } else {
      Swal.fire('Error', result.message, 'error');
    }
  };

  return (
    <div style={{ maxWidth: '520px', margin: '30px auto', padding: '0 15px' }}>
      <div className="glass-panel fade-in" style={{ padding: '32px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(222,184,65,0.12)', padding: '14px', borderRadius: '50%', marginBottom: '12px' }}>
            <Sparkles size={32} color="var(--accent)" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>CREAR CUENTA</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>Únete a la plataforma oficial de Studio 5 Tickets</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Selector de Rol */}
          <label style={{ fontSize: '0.78rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Selecciona tu tipo de cuenta *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
            {[
              { id: 'buyer', label: 'Espectador', desc: 'Comprar y guardar tickets QR', icon: Ticket },
              { id: 'organizer', label: 'Organizador', desc: 'Publicar shows y marca blanca', icon: Building2 },
              { id: 'staff', label: 'Staff / Control', desc: 'Escaneo y control de accesos', icon: ShieldCheck }
            ].map(r => {
              const isSelected = role === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  style={{
                    border: `1.5px solid ${isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                    background: isSelected ? 'rgba(222,184,65,0.12)' : 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    padding: '12px 8px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)',
                    boxShadow: isSelected ? '0 0 12px rgba(222,184,65,0.2)' : 'none'
                  }}
                >
                  <r.icon size={20} color={isSelected ? 'var(--accent)' : 'var(--text-muted)'} style={{ margin: '0 auto 6px auto', display: 'block' }} />
                  <strong style={{ fontSize: '0.78rem', color: isSelected ? '#fff' : 'var(--text-primary)', display: 'block' }}>{r.label}</strong>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px', lineHeight: '1.2' }}>{r.desc}</span>
                </div>
              );
            })}
          </div>

          <label>Nombre Completo *</label>
          <div style={{ position: 'relative' }}>
            <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '16px' }} />
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Ej: Juan Pérez" 
              style={{ paddingLeft: '45px' }}
              required 
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: '1.2' }}>
              <label>Correo Electrónico *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '16px' }} />
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="correo@ejemplo.com" 
                  style={{ paddingLeft: '45px' }}
                  required 
                />
              </div>
            </div>
            <div style={{ flex: '0.9' }}>
              <label>WhatsApp / Celular</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '16px' }} />
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="0991234567" 
                  style={{ paddingLeft: '45px' }}
                />
              </div>
            </div>
          </div>

          <label>Contraseña *</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '16px' }} />
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Mínimo 6 caracteres" 
              minLength={6}
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
            {isSubmitting ? 'REGISTRANDO...' : 'CREAR MI CUENTA'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <span>¿Ya tienes una cuenta registrada? </span>
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 'bold', textDecoration: 'none' }}>
            Iniciar Sesión
          </Link>
        </div>
      </div>

      {/* MODAL DE VERIFICACIÓN OTP */}
      {showOtpModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel fade-in" style={{ maxWidth: '420px', width: '100%', padding: '32px 24px', textAlign: 'center', borderColor: 'var(--accent-glow)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(222,184,65,0.15)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <KeyRound size={22} color="var(--accent)" />
            </div>

            <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px 0' }}>Verificación de Correo</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Hemos enviado un código de 6 dígitos a <br />
              <strong style={{ color: 'var(--accent)' }}>{email}</strong>
            </p>

            <form onSubmit={handleVerifyOtp}>
              {/* Cajas de dígitos OTP */}
              <div 
                onPaste={handleOtpPaste}
                style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '22px' }}
              >
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
                      width: '44px',
                      height: '52px',
                      fontSize: '1.4rem',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      borderRadius: '10px',
                      border: `1.5px solid ${digit ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`,
                      background: 'rgba(255,255,255,0.04)',
                      color: '#fff',
                      marginBottom: 0,
                      padding: 0
                    }}
                  />
                ))}
              </div>

              <button 
                type="submit" 
                className="btn-primary"
                disabled={isVerifying || otpCode.join('').length !== 6}
                style={{ marginBottom: '14px' }}
              >
                {isVerifying ? 'VERIFICANDO...' : 'VERIFICAR Y ENTRAR'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isResending}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--accent)',
                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    padding: 0
                  }}
                >
                  {isResending ? 'Reenviando...' : (resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : '¿No llegó? Reenviar código')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                >
                  Cambiar correo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
