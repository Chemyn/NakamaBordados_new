'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// Mock user data
interface MockOrder {
  id: string;
  date: string;
  status: string;
  statusLabel: string;
  total: number;
  items: number;
}

interface MockUser {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  colonia: string;
  commissions: { month: string; amount: number }[];
  orders: MockOrder[];
}

const MOCK_USER: MockUser = {
  firstName: 'Monkey D.',
  lastName: 'Luffy',
  email: 'luffy@nakamabordados.com',
  phone: '6621234567',
  address: 'Thousand Sunny, Dock 7',
  city: 'Hermosillo',
  state: 'Sonora',
  colonia: 'Grand Line',
  commissions: [
    { month: 'Mayo 2026', amount: 3450 },
    { month: 'Abril 2026', amount: 2100 },
    { month: 'Marzo 2026', amount: 1875 },
    { month: 'Febrero 2026', amount: 4200 },
    { month: 'Enero 2026', amount: 990 },
    { month: 'Diciembre 2025', amount: 6780 },
  ],
  orders: [
    { id: '#NK-10423', date: '22 Mayo 2026', status: 'completed', statusLabel: 'Completado', total: 1497, items: 4 },
    { id: '#NK-10399', date: '15 Mayo 2026', status: 'processing', statusLabel: 'Procesando', total: 598, items: 2 },
    { id: '#NK-10312', date: '02 Mayo 2026', status: 'shipped', statusLabel: 'Enviado', total: 899, items: 3 },
    { id: '#NK-10201', date: '18 Abril 2026', status: 'completed', statusLabel: 'Completado', total: 349, items: 1 },
    { id: '#NK-10098', date: '03 Abril 2026', status: 'completed', statusLabel: 'Completado', total: 2150, items: 6 },
  ],
};

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'lostpw'>('login');
  const [dashboardSection, setDashboardSection] = useState('dashboard');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Register form
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);

  // Lost password
  const [lostPwEmail, setLostPwEmail] = useState('');
  const [lostPwSent, setLostPwSent] = useState(false);

  // Floating symbols parallax
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check mock login state
    const loggedIn = localStorage.getItem('nakama_logged_in');
    if (loggedIn === 'true') {
      setTimeout(() => setIsLoggedIn(true), 0);
    }
  }, []);

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    localStorage.setItem('nakama_logged_in', 'true');
    setIsLoggedIn(true);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword || regPassword !== regConfirm) return;
    localStorage.setItem('nakama_logged_in', 'true');
    setIsLoggedIn(true);
  };

  const handleLostPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostPwEmail) return;
    setLostPwSent(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('nakama_logged_in');
    setIsLoggedIn(false);
  };

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
              style={{
                left: item.left,
                top: item.top,
                fontSize: item.fontSize,
                opacity: item.opacity,
              }}
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
                <p className="nk-dashboard-user-name">{MOCK_USER.firstName} {MOCK_USER.lastName}</p>
                <p className="nk-dashboard-user-email">{MOCK_USER.email}</p>
              </div>
            </div>

            <ul className="nk-dashboard-nav-list">
              {[
                { key: 'dashboard', icon: 'dashboard', label: 'Escritorio' },
                { key: 'orders', icon: 'receipt_long', label: 'Pedidos' },
                { key: 'addresses', icon: 'location_on', label: 'Direcciones' },
                { key: 'commissions', icon: 'payments', label: 'Mis Comisiones' },
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
                <button className="nk-dashboard-nav-link nk-dashboard-nav-logout" onClick={handleLogout}>
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
                <h2 className="nk-dash-title">¡Bienvenido a Bordo, {MOCK_USER.firstName}!</h2>
                <p className="nk-dash-subtitle">Desde aquí puedes ver tus pedidos recientes, administrar tus direcciones de envío y editar tu cuenta.</p>

                <div className="nk-dash-cards-grid">
                  <div className="nk-dash-stat-card" onClick={() => setDashboardSection('orders')}>
                    <span className="material-icons-outlined nk-dash-stat-icon">local_shipping</span>
                    <div>
                      <p className="nk-dash-stat-number">{MOCK_USER.orders.length}</p>
                      <p className="nk-dash-stat-label">Pedidos Totales</p>
                    </div>
                  </div>
                  <div className="nk-dash-stat-card" onClick={() => setDashboardSection('commissions')}>
                    <span className="material-icons-outlined nk-dash-stat-icon" style={{ color: '#10b981' }}>trending_up</span>
                    <div>
                      <p className="nk-dash-stat-number">${MOCK_USER.commissions[0]?.amount.toLocaleString()}</p>
                      <p className="nk-dash-stat-label">Comisión del Mes</p>
                    </div>
                  </div>
                  <div className="nk-dash-stat-card" onClick={() => setDashboardSection('addresses')}>
                    <span className="material-icons-outlined nk-dash-stat-icon" style={{ color: '#6366f1' }}>home</span>
                    <div>
                      <p className="nk-dash-stat-number">1</p>
                      <p className="nk-dash-stat-label">Dirección Guardada</p>
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
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_USER.orders.slice(0, 3).map((order) => (
                        <tr key={order.id}>
                          <td className="nk-order-id">{order.id}</td>
                          <td>{order.date}</td>
                          <td>
                            <span className={`nk-order-status nk-status-${order.status}`}>
                              {order.statusLabel}
                            </span>
                          </td>
                          <td className="nk-order-total">${order.total.toLocaleString()} MXN</td>
                          <td>
                            <button className="nk-btn-view-order">Ver</button>
                          </td>
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
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_USER.orders.map((order) => (
                        <tr key={order.id}>
                          <td className="nk-order-id">{order.id}</td>
                          <td>{order.date}</td>
                          <td>
                            <span className={`nk-order-status nk-status-${order.status}`}>
                              {order.statusLabel}
                            </span>
                          </td>
                          <td>{order.items} pz</td>
                          <td className="nk-order-total">${order.total.toLocaleString()} MXN</td>
                          <td>
                            <button className="nk-btn-view-order">Ver</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Addresses Section */}
            {dashboardSection === 'addresses' && (
              <div className="nk-dash-section nk-dash-animate">
                <h2 className="nk-dash-title">Mis Direcciones</h2>
                <p className="nk-dash-subtitle">Administra tus direcciones de facturación y envío.</p>
                <div className="nk-addresses-grid">
                  <div className="nk-address-card">
                    <div className="nk-address-card-header">
                      <h4>Dirección de Envío</h4>
                      <button className="nk-address-edit-btn">
                        <span className="material-icons-outlined">edit</span> Editar
                      </button>
                    </div>
                    <div className="nk-address-card-body">
                      <p><strong>{MOCK_USER.firstName} {MOCK_USER.lastName}</strong></p>
                      <p>{MOCK_USER.address}</p>
                      <p>Col. {MOCK_USER.colonia}</p>
                      <p>{MOCK_USER.city}, {MOCK_USER.state}</p>
                      <p>Tel: {MOCK_USER.phone}</p>
                    </div>
                  </div>
                  <div className="nk-address-card">
                    <div className="nk-address-card-header">
                      <h4>Dirección de Facturación</h4>
                      <button className="nk-address-edit-btn">
                        <span className="material-icons-outlined">edit</span> Editar
                      </button>
                    </div>
                    <div className="nk-address-card-body">
                      <p><strong>{MOCK_USER.firstName} {MOCK_USER.lastName}</strong></p>
                      <p>{MOCK_USER.address}</p>
                      <p>Col. {MOCK_USER.colonia}</p>
                      <p>{MOCK_USER.city}, {MOCK_USER.state}</p>
                      <p>Tel: {MOCK_USER.phone}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Commissions Section */}
            {dashboardSection === 'commissions' && (
              <div className="nk-dash-section nk-dash-animate">
                <h2 className="nk-dash-title">Mis Comisiones</h2>
                <p className="nk-dash-subtitle">Panel de comisiones del programa de creadores Nakama.</p>

                <div className="nk-commission-current">
                  <div className="nk-commission-current-icon">
                    <span className="material-icons-outlined">account_balance_wallet</span>
                  </div>
                  <div>
                    <p className="nk-commission-label">Comisión del Mes Actual</p>
                    <p className="nk-commission-amount">${MOCK_USER.commissions[0]?.amount.toLocaleString()} MXN</p>
                    <p className="nk-commission-period">{MOCK_USER.commissions[0]?.month}</p>
                  </div>
                </div>

                <h3 className="nk-dash-section-title" style={{ marginTop: '30px' }}>Historial de Comisiones</h3>
                <div className="nk-orders-table-wrapper">
                  <table className="nk-orders-table">
                    <thead>
                      <tr>
                        <th>Periodo</th>
                        <th>Monto</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_USER.commissions.map((c, i) => (
                        <tr key={i}>
                          <td>{c.month}</td>
                          <td className="nk-order-total">${c.amount.toLocaleString()} MXN</td>
                          <td>
                            <span className={`nk-order-status ${i === 0 ? 'nk-status-processing' : 'nk-status-completed'}`}>
                              {i === 0 ? 'Pendiente' : 'Pagado'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Edit Account Section */}
            {dashboardSection === 'account' && (
              <div className="nk-dash-section nk-dash-animate">
                <h2 className="nk-dash-title">Editar Cuenta</h2>
                <p className="nk-dash-subtitle">Actualiza tu información personal y contraseña.</p>

                <form className="nk-account-form" onSubmit={(e) => { e.preventDefault(); alert('Cambios guardados (mock)'); }}>
                  <div className="nk-form-row">
                    <div className="nk-form-group">
                      <label>Nombre</label>
                      <input type="text" defaultValue={MOCK_USER.firstName} className="nk-input-base" />
                    </div>
                    <div className="nk-form-group">
                      <label>Apellidos</label>
                      <input type="text" defaultValue={MOCK_USER.lastName} className="nk-input-base" />
                    </div>
                  </div>
                  <div className="nk-form-group">
                    <label>Email</label>
                    <input type="email" defaultValue={MOCK_USER.email} className="nk-input-base" />
                  </div>
                  <div className="nk-form-group">
                    <label>Teléfono</label>
                    <input type="tel" defaultValue={MOCK_USER.phone} className="nk-input-base" />
                  </div>

                  <h3 className="nk-dash-section-title" style={{ marginTop: '30px' }}>Cambiar Contraseña</h3>
                  <div className="nk-form-group">
                    <label>Contraseña Actual</label>
                    <input type="password" className="nk-input-base" placeholder="Contraseña actual" />
                  </div>
                  <div className="nk-form-row">
                    <div className="nk-form-group">
                      <label>Nueva Contraseña</label>
                      <input type="password" className="nk-input-base" placeholder="Nueva contraseña" />
                    </div>
                    <div className="nk-form-group">
                      <label>Confirmar</label>
                      <input type="password" className="nk-input-base" placeholder="Confirmar nueva" />
                    </div>
                  </div>
                  <button type="submit" className="nk-btn nk-btn-save-account">Guardar Cambios</button>
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
      {/* Background Pattern & Floating Symbols */}
      <div className="nk-login-bg" ref={bgRef}>
        <div className="nk-login-bg-pattern"></div>
        <div className="nk-login-bg-gradient"></div>
        {FLOATING_SYMBOLS_LOGIN.map((item, i) => (
          <div
            key={i}
            className="op-floating-text-mi"
            data-speed={item.speed}
            style={{
              left: item.left,
              top: item.top,
              fontSize: item.fontSize,
              opacity: item.opacity,
            }}
          >
            {item.sym}
          </div>
        ))}
      </div>

      <div className="nk-login-wrapper">
        {/* Logo & Title */}
        <div className="nk-login-header">
          <img
            src="https://nakamabordados.com/wp-content/uploads/2025/11/LOGO-NAKAMA-scaled-2048x926.png"
            alt="Nakama Bordados"
            className="nk-login-logo"
          />
          <h2 className="nk-login-title">Portal de la Tripulación</h2>
        </div>

        {/* Tab Buttons */}
        {activeTab !== 'lostpw' && (
          <div className="nk-login-tabs">
            <button
              className={`nk-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Pirata (Login)
            </button>
            <button
              className={`nk-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              Recluta (Registro)
            </button>
          </div>
        )}

        {/* Card Container */}
        <div className="nk-login-card">
          <div className="nk-login-card-accent"></div>

          {/* LOGIN FORM */}
          {activeTab === 'login' && (
            <div className="nk-login-form-content nk-dash-animate">
              <div className="nk-login-form-header">
                <h3>Bienvenido a Bordo</h3>
                <p>Ingresa tus credenciales para zarpar.</p>
              </div>
              <form onSubmit={handleLogin}>
                <div className="nk-form-group">
                  <label>Correo electrónico</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="nk-input-base"
                    placeholder="tu@email.com"
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
                    <button
                      type="button"
                      className="nk-pw-toggle"
                      onClick={() => setShowLoginPw(!showLoginPw)}
                    >
                      <span className="material-icons-outlined">{showLoginPw ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
                <div className="nk-login-extras">
                  <label className="nk-remember-me">
                    <input type="checkbox" /> Recuérdame
                  </label>
                  <button type="button" className="nk-lost-pw-link" onClick={() => setActiveTab('lostpw')}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <button type="submit" className="nk-btn nk-btn-login">
                  Iniciar Sesión
                </button>
              </form>
            </div>
          )}

          {/* REGISTER FORM */}
          {activeTab === 'register' && (
            <div className="nk-login-form-content nk-dash-animate">
              <div className="nk-login-form-header">
                <h3>Únete a la Flota</h3>
                <p>Crea tu cartel de búsqueda hoy mismo.</p>
              </div>
              <form onSubmit={handleRegister}>
                <div className="nk-form-group">
                  <label>Correo electrónico</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="nk-input-base"
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                <div className="nk-form-group nk-password-group">
                  <label>Contraseña</label>
                  <div className="nk-password-wrapper">
                    <input
                      type={showRegPw ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="nk-input-base"
                      placeholder="Mínimo 8 caracteres"
                      required
                    />
                    <button
                      type="button"
                      className="nk-pw-toggle"
                      onClick={() => setShowRegPw(!showRegPw)}
                    >
                      <span className="material-icons-outlined">{showRegPw ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
                <div className="nk-form-group">
                  <label>Confirmar Contraseña</label>
                  <input
                    type="password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    className="nk-input-base"
                    placeholder="Repite tu contraseña"
                    required
                  />
                </div>
                <div className="nk-login-extras">
                  <label className="nk-remember-me" style={{ fontSize: '0.8rem', color: 'var(--nk-text-sec)' }}>
                    Tus datos serán usados conforme a nuestra{' '}
                    <Link href="#" style={{ color: 'var(--nk-primary)' }}>política de privacidad</Link>.
                  </label>
                </div>
                <button type="submit" className="nk-btn nk-btn-login">
                  Registrarse
                </button>
              </form>
            </div>
          )}

          {/* LOST PASSWORD */}
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
                      <input
                        type="email"
                        value={lostPwEmail}
                        onChange={(e) => setLostPwEmail(e.target.value)}
                        className="nk-input-base"
                        placeholder="tu@email.com"
                        required
                      />
                    </div>
                    <button type="submit" className="nk-btn nk-btn-login">
                      Enviar Enlace de Recuperación
                    </button>
                  </form>
                  <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <button className="nk-lost-pw-link" onClick={() => { setActiveTab('login'); setLostPwSent(false); }}>
                      ← Volver al Login
                    </button>
                  </div>
                </>
              ) : (
                <div className="nk-lostpw-sent nk-dash-animate">
                  <span className="material-icons-outlined" style={{ fontSize: '3rem', color: 'var(--nk-primary)', marginBottom: '16px' }}>
                    mark_email_read
                  </span>
                  <h3>Mensaje Enviado</h3>
                  <p>Revisa tu bandeja de entrada o carpeta de spam para encontrar el enlace de recuperación.</p>
                  <button
                    className="nk-btn nk-btn-login"
                    style={{ marginTop: '20px' }}
                    onClick={() => { setActiveTab('login'); setLostPwSent(false); }}
                  >
                    Volver al Login
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Protocol Footer */}
        <div className="nk-login-protocol">
          NAKAMA SECURITY PROTOCOL // GRAND LINE
        </div>
      </div>
    </div>
  );
}
