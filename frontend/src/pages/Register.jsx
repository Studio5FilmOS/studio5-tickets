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
  const { register, loginWithSocial, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  // Inicialización de Meta Facebook SDK
  useEffect(() => {
    if (!window.fbAsyncInit) {
      window.fbAsyncInit = function() {
        if (window.FB) {
          window.FB.init({
            appId: '1125016630240285',
            cookie: true,
            xfbml: true,
            version: 'v18.0'
          });
        }
      };
      if (window.FB) {
        window.FB.init({
          appId: '1125016630240285',
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
      }
    }
  }, []);

  const handleGoogleLogin = () => {
    try {
      if (!window.google?.accounts?.oauth2) {
        Swal.fire('Google en preparación', 'El servicio de Google aún está cargando. Intenta en 2 segundos.', 'info');
        return;
      }
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: '111698226037-uhikp5hbnbcov6v6jgl0uilev37k4m33.apps.googleusercontent.com',
        scope: 'openid email profile',
        callback: async (response) => {
          if (response.access_token) {
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` }
              });
              const googleUser = await res.json();
              if (googleUser && googleUser.email) {
                const result = await loginWithSocial({
                  provider: 'google',
                  name: googleUser.name,
                  email: googleUser.email,
                  avatar: googleUser.picture,
                  providerId: googleUser.sub,
                  accessToken: response.access_token
                });
                if (result.success) {
                  Swal.fire({
                    title: '¡Bienvenido!',
                    text: `Hola ${googleUser.name || ''}, tu cuenta ha sido vinculada con Google.`,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                  });
                  const targetRole = result.user?.role;
                  if (targetRole === 'admin' || targetRole === 'organizer') navigate('/admin');
                  else if (targetRole === 'staff') navigate('/staff/scan');
                  else navigate('/mis-tickets');
                } else {
                  Swal.fire('Error', result.message, 'error');
                }
              }
            } catch (err) {
              console.error('Error Google User Info:', err);
              Swal.fire('Error', 'No se pudo obtener la información de Google.', 'error');
            }
          }
        }
      });
      client.requestAccessToken();
    } catch (e) {
      console.error('Error Google OAuth:', e);
      Swal.fire('Error', 'Error al iniciar Google OAuth.', 'error');
    }
  };

  const handleFacebookLogin = () => {
    try {
      if (!window.FB) {
        Swal.fire('Facebook en preparación', 'El servicio de Facebook aún está cargando. Intenta en 2 segundos.', 'info');
        return;
      }
      window.FB.login((response) => {
        if (response.authResponse) {
          window.FB.api('/me', { fields: 'id,name,email,picture.type(large)' }, async (userInfo) => {
            if (userInfo && (userInfo.email || userInfo.id)) {
              const result = await loginWithSocial({
                provider: 'facebook',
                name: userInfo.name,
                email: userInfo.email || `${userInfo.id}@facebook.com`,
                avatar: userInfo.picture?.data?.url,
                providerId: userInfo.id,
                accessToken: response.authResponse.accessToken
              });
              if (result.success) {
                Swal.fire({
                  title: '¡Bienvenido!',
                  text: `Hola ${userInfo.name || ''}, tu cuenta ha sido vinculada con Facebook.`,
                  icon: 'success',
                  timer: 1500,
                  showConfirmButton: false
                });
                const targetRole = result.user?.role;
                if (targetRole === 'admin' || targetRole === 'organizer') navigate('/admin');
                else if (targetRole === 'staff') navigate('/staff/scan');
                else navigate('/mis-tickets');
              } else {
                Swal.fire('Error', result.message, 'error');
              }
            }
          });
        }
      }, { scope: 'public_profile,email' });
    } catch (e) {
      console.error('Error Facebook Login:', e);
      Swal.fire('Error', 'Error al conectar con Facebook.', 'error');
    }
  };

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
            {[
              { id: 'buyer', label: 'Espectador', desc: 'Comprar y guardar tickets QR', icon: Ticket },
              { id: 'organizer', label: 'Organizador', desc: 'Publicar shows y marca blanca', icon: Building2 }
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

          {role === 'buyer' && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '20px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>¿Deseas tener tu propia plataforma de boletaje o logistica con tu marca?</span>
              <a 
                href={`https://wa.me/593963162788?text=Hola,%20estoy%20interesado%20en%20tener%20mi%20propio%20sistema%20de%20boletaje%20Studio%205%20Tickets.`} 
                target="_blank" 
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#25D366', fontWeight: 'bold', fontSize: '0.8rem', marginTop: '6px', textDecoration: 'none' }}
              >
                <Phone size={14} /> Contáctanos por WhatsApp
              </a>
            </div>
          )}

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

        {/* Separador y Botones de Registro con Redes Sociales */}
        <div style={{ margin: '22px 0 16px 0', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: '50%', width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
          <span style={{ position: 'relative', background: '#0a0a0f', padding: '0 12px', fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            O REGÍSTRATE CON
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={handleGoogleLogin}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: '#fff',
              padding: '10px 14px',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Google
          </button>

          <button
            type="button"
            onClick={handleFacebookLogin}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'rgba(24,119,242,0.12)',
              border: '1px solid rgba(24,119,242,0.3)',
              borderRadius: '8px',
              color: '#1877F2',
              padding: '10px 14px',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(24,119,242,0.22)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(24,119,242,0.12)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </button>
        </div>

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
