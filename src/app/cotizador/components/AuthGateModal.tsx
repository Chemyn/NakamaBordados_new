"use client";

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface AuthGateModalProps {
  /** Cierra el modal sin autenticarse (botón X / clic en el backdrop). */
  onClose: () => void;
  /** Se llama tras iniciar sesión o registrarse con éxito. */
  onSuccess: () => void;
}

/**
 * Modal de login/registro para el cotizador. Estilizado con Bootstrap (el
 * cotizador usa Bootstrap, no el tema manga del resto del sitio) y con su
 * propio backdrop controlado por React — no depende del JS de Bootstrap, que
 * no se carga en el export estático. Consume el mismo AuthContext global
 * (login/register) que /mi-cuenta, así que la sesión resultante es idéntica.
 */
export const AuthGateModal: React.FC<AuthGateModalProps> = ({ onClose, onSuccess }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });

  const switchMode = (next: 'login' | 'register') => {
    setError('');
    setMode(next);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(loginData.username.trim(), loginData.password);
    setSubmitting(false);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Credenciales inválidas');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await register({
      email: registerData.email.trim(),
      password: registerData.password,
      firstName: registerData.firstName.trim(),
      lastName: registerData.lastName.trim(),
      phone: registerData.phone.trim(),
    });
    setSubmitting(false);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'No se pudo crear la cuenta');
    }
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1080 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-3 shadow-lg w-100"
        style={{ maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
          <h5 className="m-0 font-display fw-bold">
            {mode === 'login' ? 'Inicia sesión para enviar' : 'Crea tu cuenta'}
          </h5>
          <button
            type="button"
            className="btn-close"
            aria-label="Cerrar"
            onClick={onClose}
          ></button>
        </div>

        <div className="p-4">
          <p className="text-muted small mb-3">
            {mode === 'login'
              ? 'Necesitas una cuenta para enviar tu cotización. Tu avance no se pierde.'
              : 'Regístrate para enviar tu cotización. Tus datos se llenarán automáticamente.'}
          </p>

          {mode === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label small fw-bold text-uppercase">Usuario o Email</label>
                <input
                  type="text"
                  className="form-control"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-bold text-uppercase">Contraseña</label>
                <input
                  type="password"
                  className="form-control"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && <p className="text-danger small mb-3">{error}</p>}

              <button type="submit" className="btn btn-dark w-100 py-2 font-display" disabled={submitting}>
                {submitting ? 'Entrando...' : 'Iniciar sesión'}
              </button>

              <button
                type="button"
                className="btn btn-link w-100 mt-2 text-decoration-none small"
                onClick={() => switchMode('register')}
              >
                ¿No tienes cuenta? Crear una
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-bold text-uppercase">Nombre</label>
                  <input
                    type="text"
                    className="form-control"
                    value={registerData.firstName}
                    onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold text-uppercase">Apellido</label>
                  <input
                    type="text"
                    className="form-control"
                    value={registerData.lastName}
                    onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-bold text-uppercase">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="email"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-bold text-uppercase">Teléfono (WhatsApp)</label>
                <input
                  type="tel"
                  className="form-control"
                  value={registerData.phone}
                  onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                  autoComplete="tel"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-bold text-uppercase">Contraseña (mínimo 6)</label>
                <input
                  type="password"
                  className="form-control"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              {error && <p className="text-danger small mb-3">{error}</p>}

              <button type="submit" className="btn btn-dark w-100 py-2 font-display" disabled={submitting}>
                {submitting ? 'Creando...' : 'Crear mi cuenta'}
              </button>

              <button
                type="button"
                className="btn btn-link w-100 mt-2 text-decoration-none small"
                onClick={() => switchMode('login')}
              >
                ¿Ya tienes cuenta? Inicia sesión
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthGateModal;
