'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

// Pre-calculated static values for floating symbols to keep rendering pure and idempotent
const FLOATING_SYMBOLS_DASHBOARD = [
  { sym: 'ゴ', speed: 1.1, left: '12%', top: '15%', fontSize: '50px', opacity: 0.06 },
  { sym: 'ゴ', speed: 0.9, left: '82%', top: '35%', fontSize: '65px', opacity: 0.04 },
  { sym: 'ドン', speed: 1.8, left: '35%', top: '75%', fontSize: '110px', opacity: 0.08 },
  { sym: '!!', speed: 1.3, left: '78%', top: '25%', fontSize: '85px', opacity: 0.05 },
  { sym: '海', speed: 1.0, left: '8%', top: '55%', fontSize: '60px', opacity: 0.03 },
  { sym: '賊', speed: 1.5, left: '62%', top: '65%', fontSize: '70px', opacity: 0.07 },
];

const FLOATING_SYMBOLS_LOGIN = [
  { sym: 'ゴ', speed: 1.5, left: '15%', top: '20%', fontSize: '70px', opacity: 0.07 },
  { sym: 'ゴ', speed: 1.1, left: '75%', top: '40%', fontSize: '80px', opacity: 0.05 },
  { sym: 'ドン', speed: 2.2, left: '42%', top: '82%', fontSize: '120px', opacity: 0.09 },
  { sym: '!!', speed: 1.7, left: '80%', top: '18%', fontSize: '95px', opacity: 0.06 },
  { sym: '海', speed: 1.2, left: '10%', top: '60%', fontSize: '65px', opacity: 0.04 },
  { sym: '賊', speed: 1.9, left: '58%', top: '72%', fontSize: '85px', opacity: 0.08 },
];

export default function MiCuentaPage() {
  const { user, login, logout, authToken, isLoading } = useAuth();
  const { formatPrice } = useCurrency();
  
  const isLoggedIn = !!authToken && !!user;

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'lostpw'>('login');
  const [dashboardSection, setDashboardSection] = useState('dashboard');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register form (Mock for now, requires WP GraphQL WooCommerce Registration extension)
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);

  // Lost password
  const [lostPwEmail, setLostPwEmail] = useState('');
  const [lostPwSent, setLostPwSent] = useState(false);

  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const floaters = document.querySelectorAll('.op-floating-text-mi');
      const x = (window.innerWidth - e.pageX * 5) / 100;
      const y = (window.innerHeight - e.pageY * 5) / 100;
      floaters.forEach((el) => {
        const speed = parseFloat(el.getAttribute('data-speed') || '1');
        (el as HTMLElement).style.transform = `translateX(${x * speed}px) translateY(${y * speed}px)`;
      });
    };

    if (!isLoggedIn) {
      document.addEventListener('mousemove', handleMouseMove);
    }
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setIsLoggingIn(true);
    setLoginError('');
    const res = await login(loginEmail, loginPassword);
    if (!res.success) {
      setLoginError(res.error || 'Credenciales incorrectas');
    }
    setIsLoggingIn(false);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    alert("El registro desde esta página requiere una extensión premium de GraphQL. Por favor, crea tu cuenta durante el Checkout.");
  };

  const handleLostPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostPwEmail) return;
    setLostPwSent(true);
  };

  if (isLoading) {
    return (
      <div className="nk-container text-center" style={{ padding: '120px 24px' }}>
        <h2>Cargando...</h2>
      </div>
    );
  }

  // ============================================
  // LOGGED-IN DASHBOARD
  // ============================================
  if (isLoggedIn) {
    return (
      <div className="nk-dashboard-page">
        {/* Floating Background Symbols (subtle) */}
        <div className="nk-dashboard-fx-container">
          {FLOATING_SYMBOLS_DASHBOARD.map((item, i) => (
            <div
              key={i}
              className="op-floating-text-mi"
              data-speed={item.speed}
              style={{ left: item.left, top: item.top, fontSize: item.fontSize, opacity: item.opacity }}
            >
              {item.sym}
            </div>
          ))}
        </div>

        <div className="nk-dashboard-layout">
          {/* Sidebar Navigation */}
          <nav className="nk-dashboard-nav">
            <div className="nk-dashboard-nav-header">
              <div className="nk-dashboard-avatar">
                <span className="material-icons-outlined" style={{ fontSize: '32px' }}>person</span>
              </div>
              <div>
                <p className="nk-dashboard-user-name">{user?.firstName} {user?.lastName}</p>
                <p className="nk-dashboard-user-email">{user?.email}</p>
              </div>
            </div>

            <ul className="nk-dashboard-nav-list">
              {[
                { key: 'dashboard', icon: 'dashboard', label: 'Escritorio' },
                { key: 'orders', icon: 'receipt_long', label: 'Pedidos' },
                { key: 'account', icon: 'settings', label: 'Editar Cuenta' },
              ].map((item) => (
                <li key={item.key}>
                  <button
                    className={`nk-dashboard-nav-link ${dashboardSection === item.key ? 'active' : ''}`}
                    onClick={() => setDashboardSection(item.key)}
                  >
                    <span className="material-icons-outlined">{item.icon}</span>
                    {item.label}
                  </button>
                </li>
              ))}
              <li className="nk-dashboard-nav-divider"></li>
              <li>
                <button className="nk-dashboard-nav-link nk-dashboard-nav-logout" onClick={logout}>
                  <span className="material-icons-outlined">logout</span>
                  Cerrar Sesión
                </button>
              </li>
            </ul>
          </nav>

          {/* Content Area */}
          <main className="nk-dashboard-content">
            {/* Dashboard Home */}
            {dashboardSection === 'dashboard' && (
              <div className="nk-dash-section nk-dash-animate">
                <h2 className="nk-dash-title">¡Bienvenido a Bordo, {user?.firstName}!</h2>
                <p className="nk-dash-subtitle">Desde aquí puedes ver tus pedidos recientes y administrar tu cuenta.</p>

                <div className="nk-dash-cards-grid">
                  <div className="nk-dash-stat-card" onClick={() => setDashboardSection('orders')}>
                    <span className="material-icons-outlined nk-dash-stat-icon">local_shipping</span>
                    <div>
                      <p className="nk-dash-stat-number">{user?.orders?.nodes?.length || 0}</p>
                      <p className="nk-dash-stat-label">Pedidos Totales</p>
                    </div>
                  </div>
                </div>

                {/* Quick orders */}
                <h3 className="nk-dash-section-title" style={{ marginTop: '40px' }}>Últimos Pedidos</h3>
                <div className="nk-orders-table-wrapper">
                  <table className="nk-orders-table">
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Fecha</th>
                        <th>Estado</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {user?.orders?.nodes?.slice(0, 5).map((order: any) => (
                        <tr key={order.id}>
                          <td className="nk-order-id">#{order.orderNumber}</td>
                          <td>{new Date(order.date).toLocaleDateString()}</td>
                          <td>
                            <span className={`nk-order-status nk-status-${order.status.toLowerCase()}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="nk-order-total">{order.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Orders Section */}
            {dashboardSection === 'orders' && (
              <div className="nk-dash-section nk-dash-animate">
                <h2 className="nk-dash-title">Mis Pedidos</h2>
                <p className="nk-dash-subtitle">Historial completo de tus compras en Nakama Bordados.</p>
                <div className="nk-orders-table-wrapper">
                  <table className="nk-orders-table">
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Fecha</th>
                        <th>Estado</th>
                        <th>Artículos</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {user?.orders?.nodes?.map((order: any) => (
                        <tr key={order.id}>
                          <td className="nk-order-id">#{order.orderNumber}</td>
                          <td>{new Date(order.date).toLocaleDateString()}</td>
                          <td>
                            <span className={`nk-order-status nk-status-${order.status.toLowerCase()}`}>
                              {order.status}
                            </span>
                          </td>
                          <td>{order.lineItems?.nodes?.reduce((sum: number, item: any) => sum + item.quantity, 0)} pz</td>
                          <td className="nk-order-total">{order.total}</td>
                        </tr>
                      ))}
                      {user?.orders?.nodes?.length === 0 && (
                        <tr><td colSpan={5} style={{textAlign: 'center', padding: '20px'}}>No tienes pedidos recientes.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Edit Account Section */}
            {dashboardSection === 'account' && (
              <div className="nk-dash-section nk-dash-animate">
                <h2 className="nk-dash-title">Detalles de Cuenta</h2>
                <p className="nk-dash-subtitle">Para cambiar datos complejos o contraseñas, usa el checkout de WordPress nativo.</p>

                <form className="nk-account-form" onSubmit={(e) => { e.preventDefault(); alert('Modificación no disponible por API, ve al checkout.'); }}>
                  <div className="nk-form-row">
                    <div className="nk-form-group">
                      <label>Nombre</label>
                      <input type="text" readOnly defaultValue={user?.firstName} className="nk-input-base" style={{ opacity: 0.7 }} />
                    </div>
                    <div className="nk-form-group">
                      <label>Apellidos</label>
                      <input type="text" readOnly defaultValue={user?.lastName} className="nk-input-base" style={{ opacity: 0.7 }} />
                    </div>
                  </div>
                  <div className="nk-form-group">
                    <label>Email</label>
                    <input type="email" readOnly defaultValue={user?.email} className="nk-input-base" style={{ opacity: 0.7 }} />
                  </div>
                </form>
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  // ============================================
  // NOT LOGGED IN - LOGIN / REGISTER PORTAL
  // ============================================
  return (
    <div className="nk-login-page">
      <div className="nk-login-bg" ref={bgRef}>
        <div className="nk-login-bg-pattern"></div>
        <div className="nk-login-bg-gradient"></div>
        {FLOATING_SYMBOLS_LOGIN.map((item, i) => (
          <div
            key={i}
            className="op-floating-text-mi"
            data-speed={item.speed}
            style={{ left: item.left, top: item.top, fontSize: item.fontSize, opacity: item.opacity }}
          >
            {item.sym}
          </div>
        ))}
      </div>

      <div className="nk-login-wrapper">
        <div className="nk-login-header">
          <img src="https://nakamabordados.com/wp-content/uploads/2025/11/LOGO-NAKAMA-scaled-2048x926.png" alt="Nakama Bordados" className="nk-login-logo" />
          <h2 className="nk-login-title">Portal de la Tripulación</h2>
        </div>

        {activeTab !== 'lostpw' && (
          <div className="nk-login-tabs">
            <button className={`nk-tab-btn ${activeTab === 'login' ? 'active' : ''}`} onClick={() => setActiveTab('login')}>
              Pirata (Login)
            </button>
            <button className={`nk-tab-btn ${activeTab === 'register' ? 'active' : ''}`} onClick={() => setActiveTab('register')}>
              Recluta (Registro)
            </button>
          </div>
        )}

        <div className="nk-login-card">
          <div className="nk-login-card-accent"></div>

          {activeTab === 'login' && (
            <div className="nk-login-form-content nk-dash-animate">
              <div className="nk-login-form-header">
                <h3>Bienvenido a Bordo</h3>
                <p>Ingresa tus credenciales para zarpar.</p>
              </div>
              <form onSubmit={handleLogin}>
                <div className="nk-form-group">
                  <label>Correo electrónico o Usuario</label>
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="nk-input-base"
                    placeholder="usuario o email"
                    required
                  />
                </div>
                <div className="nk-form-group nk-password-group">
                  <label>Contraseña</label>
                  <div className="nk-password-wrapper">
                    <input
                      type={showLoginPw ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="nk-input-base"
                      placeholder="••••••••"
                      required
                    />
                    <button type="button" className="nk-pw-toggle" onClick={() => setShowLoginPw(!showLoginPw)}>
                      <span className="material-icons-outlined">{showLoginPw ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
                {loginError && <p style={{ color: 'red', fontSize: '0.9rem', marginBottom: '10px' }}>{loginError}</p>}
                <div className="nk-login-extras">
                  <label className="nk-remember-me"><input type="checkbox" /> Recuérdame</label>
                  <button type="button" className="nk-lost-pw-link" onClick={() => setActiveTab('lostpw')}>¿Olvidaste tu contraseña?</button>
                </div>
                <button type="submit" className="nk-btn nk-btn-login" disabled={isLoggingIn}>
                  {isLoggingIn ? 'Verificando...' : 'Iniciar Sesión'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'register' && (
            <div className="nk-login-form-content nk-dash-animate">
              <div className="nk-login-form-header">
                <h3>Únete a la Flota</h3>
                <p>Crea tu cuenta de tripulante hoy.</p>
              </div>
              <form onSubmit={handleRegister}>
                <div className="nk-form-group">
                  <label>Correo electrónico</label>
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="nk-input-base" placeholder="tu@email.com" required />
                </div>
                <div className="nk-form-group nk-password-group">
                  <label>Contraseña</label>
                  <div className="nk-password-wrapper">
                    <input type={showRegPw ? 'text' : 'password'} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="nk-input-base" placeholder="Mínimo 8 caracteres" required />
                    <button type="button" className="nk-pw-toggle" onClick={() => setShowRegPw(!showRegPw)}>
                      <span className="material-icons-outlined">{showRegPw ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
                <div className="nk-form-group">
                  <label>Confirmar Contraseña</label>
                  <input type="password" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} className="nk-input-base" placeholder="Repite tu contraseña" required />
                </div>
                <div className="nk-login-extras">
                  <label className="nk-remember-me" style={{ fontSize: '0.8rem', color: 'var(--nk-text-sec)' }}>
                    El registro nativo en este portal requiere configuración adicional. Por favor, realiza tu registro en el Checkout de tu próxima compra.
                  </label>
                </div>
                <button type="button" className="nk-btn nk-btn-login" onClick={() => setActiveTab('login')}>
                  Ir al Login
                </button>
              </form>
            </div>
          )}

          {activeTab === 'lostpw' && (
            <div className="nk-login-form-content nk-dash-animate">
              {!lostPwSent ? (
                <>
                  <div className="nk-login-form-header">
                    <h3>Recuperar Rumbo</h3>
                    <p>Ingresa tu correo o usuario para restablecer tu contraseña.</p>
                  </div>
                  <form onSubmit={handleLostPassword}>
                    <div className="nk-form-group">
                      <label>Correo electrónico</label>
                      <input type="email" value={lostPwEmail} onChange={(e) => setLostPwEmail(e.target.value)} className="nk-input-base" placeholder="tu@email.com" required />
                    </div>
                    <button type="submit" className="nk-btn nk-btn-login">Enviar Enlace</button>
                  </form>
                  <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <button className="nk-lost-pw-link" onClick={() => { setActiveTab('login'); setLostPwSent(false); }}>← Volver al Login</button>
                  </div>
                </>
              ) : (
                <div className="nk-lostpw-sent nk-dash-animate">
                  <span className="material-icons-outlined" style={{ fontSize: '3rem', color: 'var(--nk-primary)', marginBottom: '16px' }}>mark_email_read</span>
                  <h3>Mensaje Enviado</h3>
                  <p>Revisa tu bandeja de entrada o carpeta de spam para encontrar el enlace de recuperación.</p>
                  <button className="nk-btn nk-btn-login" style={{ marginTop: '20px' }} onClick={() => { setActiveTab('login'); setLostPwSent(false); }}>Volver al Login</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="nk-login-protocol">NAKAMA SECURITY PROTOCOL // GRAND LINE</div>
      </div>
    </div>
  );
}
