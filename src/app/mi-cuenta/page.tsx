'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

export default function MiCuentaPage() {
  const { user, login, logout, isLoading, isAdmin } = useAuth();
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'profile' | 'addresses' | 'tracking' | 'commissions'>('dashboard');
  const [userCredentials, setUserCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Tracking state - indexed by tracking code to avoid conflicts
  const [trackingLoading, setTrackingLoading] = useState<string | null>(null);
  const [trackingResults, setTrackingResults] = useState<Record<string, any>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserCredentials({ ...userCredentials, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    const result = await login(userCredentials.username, userCredentials.password);
    if (!result.success) {
      setError(result.error || t('account.login.error'));
    }
    setIsLoggingIn(false);
  };

  const fetchTracking = async (code: string, carrier: string) => {
    if (!code) return;
    setTrackingLoading(code);
    try {
      const res = await fetch(`/api/tracking?tracking=${code}&carrier=${carrier.toLowerCase()}`);
      if (res.ok) {
        const data = await res.json();
        setTrackingResults(prev => ({
          ...prev,
          [code]: data.data?.[0] || { status: 'desconocido', description: 'No se encontraron datos.' }
        }));
      } else {
        setTrackingResults(prev => ({
          ...prev,
          [code]: { status: 'error', description: 'Error al consultar la paquetería.' }
        }));
      }
    } catch (e) {
      console.error("Error fetching tracking:", e);
    } finally {
      setTrackingLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="nk-loading-container" style={{ padding: '150px', textAlign: 'center' }}>
        <div className="nk-spinner" style={{ margin: '0 auto 20px' }}></div>
        <p style={{ fontFamily: 'Teko', fontSize: '1.5rem' }}>{t('store.loading')}</p>
      </div>
    );
  }

  return (
    <div className="nk-account-page">
      <div className="nk-container">
        <div className="nk-account-card nk-manga-border">
          {user ? (
            <div className="nk-user-dashboard">
              <div className="nk-dashboard-grid">
                {/* Sidebar Navigation */}
                <aside className="nk-dashboard-sidebar">
                  <div className="nk-sidebar-header">
                    <div className="nk-user-avatar">
                      <span className="material-icons-outlined">person</span>
                    </div>
                    <div className="nk-user-meta">
                      <h3>{user.firstName || user.username}</h3>
                      <p>{user.role || 'Nakama'}</p>
                    </div>
                  </div>

                  <nav className="nk-dashboard-nav">
                    <ul>
                      <li>
                        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'active' : ''}>
                          <span className="material-icons-outlined">dashboard</span>
                          Dashboard
                        </button>
                      </li>
                      <li>
                        <button onClick={() => setActiveTab('orders')} className={activeTab === 'orders' ? 'active' : ''}>
                          <span className="material-icons-outlined">shopping_bag</span>
                          Mis Pedidos
                        </button>
                      </li>
                      <li>
                        <button onClick={() => setActiveTab('tracking')} className={activeTab === 'tracking' ? 'active' : ''}>
                          <span className="material-icons-outlined">local_shipping</span>
                          Rastreo
                        </button>
                      </li>
                      
                      {user.comisiones && (
                        <li>
                          <button onClick={() => setActiveTab('commissions')} className={activeTab === 'commissions' ? 'active' : ''}>
                            <span className="material-icons-outlined">payments</span>
                            Comisiones
                          </button>
                        </li>
                      )}

                      <li>
                        <button onClick={() => setActiveTab('addresses')} className={activeTab === 'addresses' ? 'active' : ''}>
                          <span className="material-icons-outlined">location_on</span>
                          Direcciones
                        </button>
                      </li>
                      <li>
                        <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'active' : ''}>
                          <span className="material-icons-outlined">manage_accounts</span>
                          Cuenta
                        </button>
                      </li>

                      {/* HERRAMIENTAS DE ADMINISTRADOR */}
                      {isAdmin && (
                        <>
                          <li className="nk-nav-divider">ADMIN TOOLS</li>
                          <li>
                            <Link href="/admin" className="nk-admin-btn-link">
                              <button className="nk-admin-btn gold">
                                <span className="material-icons-outlined">query_stats</span>
                                Nakama Admin
                              </button>
                            </Link>
                          </li>
                          <li>
                            <Link href="/admin/suite" className="nk-admin-btn-link">
                              <button className="nk-admin-btn dark">
                                <span className="material-icons-outlined">rocket_launch</span>
                                Nakama Suite
                              </button>
                            </Link>
                          </li>
                        </>
                      )}

                      <li className="nk-logout-li">
                        <button onClick={logout} className="nk-logout-btn">
                          <span className="material-icons-outlined">logout</span>
                          Cerrar Sesión
                        </button>
                      </li>
                    </ul>
                  </nav>
                </aside>

                {/* Main Content Area */}
                <main className="nk-dashboard-content">
                  {activeTab === 'dashboard' && (
                    <div className="nk-tab-pane nk-dash-animate">
                      <h2 className="nk-section-title">Hola, {user.firstName || user.username}</h2>
                      <p className="nk-tab-intro">
                        Desde el centro de mando puedes gestionar tus tesoros y tu configuración pirata.
                      </p>
                      
                      <div className="nk-dash-shortcuts">
                        <div className="nk-manga-border nk-shortcut-card" onClick={() => setActiveTab('orders')}>
                           <span className="material-icons-outlined">receipt_long</span>
                           <h4>Pedidos</h4>
                        </div>
                        <div className="nk-manga-border nk-shortcut-card" onClick={() => setActiveTab('tracking')}>
                           <span className="material-icons-outlined">local_shipping</span>
                           <h4>Rastreo</h4>
                        </div>
                        <div className="nk-manga-border nk-shortcut-card" onClick={() => setActiveTab('addresses')}>
                           <span className="material-icons-outlined">home</span>
                           <h4>Direcciones</h4>
                        </div>
                        <div className="nk-manga-border nk-shortcut-card" onClick={() => setActiveTab('profile')}>
                           <span className="material-icons-outlined">settings</span>
                           <h4>Ajustes</h4>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'orders' && (
                    <div className="nk-tab-pane nk-dash-animate">
                      <h2 className="nk-section-title">Historial de Botín</h2>
                      {user.orders && user.orders.nodes.length > 0 ? (
                        <div className="nk-orders-list">
                          {user.orders.nodes.map((order: any) => (
                            <div key={order.id} className="nk-order-item nk-manga-border">
                              <div className="nk-order-header">
                                <div>
                                  <p className="nk-order-number">PEDIDO #{order.orderNumber}</p>
                                  <p className="nk-order-date">{new Date(order.date).toLocaleDateString()}</p>
                                </div>
                                <div className="nk-order-status">
                                  <span>{order.status}</span>
                                </div>
                              </div>
                              
                              <div className="nk-order-details">
                                <ul>
                                  {order.lineItems?.nodes.map((item: any, i: number) => (
                                    <li key={i}>
                                      <span>{item.quantity}x {item.product?.node?.name || 'Producto'}</span>
                                    </li>
                                  ))}
                                </ul>
                                <div className="nk-order-total">
                                  TOTAL: {formatPrice(parseFloat(order.total))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="nk-empty-state">
                          <span className="material-icons-outlined">inventory_2</span>
                          <p>Aún no has capturado ningún tesoro.</p>
                          <Link href="/store" className="nk-btn">Ir a la Tienda</Link>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'tracking' && (
                    <div className="nk-tab-pane nk-dash-animate">
                      <h2 className="nk-section-title">Rastreo de Botín</h2>
                      
                      {user.orders && user.orders.nodes.some((o: any) => o.enviaTrackingCode) ? (
                        <div className="nk-tracking-list">
                          {user.orders.nodes.filter((o: any) => o.enviaTrackingCode).map((order: any) => {
                            const code = order.enviaTrackingCode;
                            const res = trackingResults[code];
                            return (
                              <div key={`track-${order.id}`} className="nk-tracking-card nk-manga-border">
                                <div className="nk-tracking-header">
                                  <span className="nk-track-order">PEDIDO #{order.orderNumber}</span>
                                  <span className="nk-track-carrier">{order.enviaCarrier || 'Envío'}</span>
                                </div>
                                <div className="nk-tracking-body">
                                  <div className="nk-manga-border nk-track-input-area">
                                    <div>
                                      <p className="nk-label">Guía de Rastreo</p>
                                      <p className="nk-track-code">{code}</p>
                                    </div>
                                    <button 
                                      className="nk-btn" 
                                      onClick={() => fetchTracking(code, order.enviaCarrier || 'estafeta')} 
                                      disabled={trackingLoading === code}
                                    >
                                      {trackingLoading === code ? '...' : 'Ver Estado'}
                                    </button>
                                  </div>

                                  {res && (
                                    <div className="nk-tracking-details nk-dash-animate">
                                      <p className="nk-track-status">
                                        ESTADO: {res.status || 'En camino'}
                                      </p>
                                      <p className="nk-track-desc">{res.description || 'El paquete está siendo procesado por la tripulación logística.'}</p>
                                      {res.checkpoint && (
                                        <p className="nk-track-checkpoint">Último avistamiento: {res.checkpoint}</p>
                                      )}
                                      <div style={{ marginTop: '20px' }}>
                                        <a 
                                          href={
                                            order.enviaCarrier?.toLowerCase().includes('estafeta') ? `https://www.estafeta.com/Herramientas/Rastreo?waybill=${code}` :
                                            order.enviaCarrier?.toLowerCase().includes('dhl') ? `https://www.dhl.com/mx-es/home/rastreo.html?tracking-id=${code}` :
                                            order.enviaCarrier?.toLowerCase().includes('fedex') ? `https://www.fedex.com/fedextrack/?trknbr=${code}` :
                                            `https://envia.com/rastreo?tracking_number=${code}`
                                          } 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="nk-btn-sec"
                                          style={{ fontSize: '0.8rem', padding: '8px 15px' }}
                                        >
                                          Ver en sitio oficial <span className="material-icons-outlined" style={{ fontSize: '12px' }}>open_in_new</span>
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="nk-tracking-empty">
                          <span className="material-icons-outlined">local_shipping</span>
                          <p>Tus pedidos aún están en el astillero. Te avisaremos cuando zarpen.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'commissions' && (
                    <div className="nk-tab-pane nk-dash-animate">
                      <h2 className="nk-section-title">Tus Ganancias</h2>
                      <div className="nk-commission-card nk-manga-border">
                        <div className="nk-commission-icon">
                          <span className="material-icons-outlined">account_balance_wallet</span>
                        </div>
                        <div className="nk-commission-info">
                          <p className="nk-label">Saldo por Reclamar</p>
                          <p className="nk-commission-amount">{formatPrice(1250.50)}</p>
                          <p className="nk-commission-meta">Corte de mes: 30 de Junio</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'addresses' && (
                    <div className="nk-tab-pane nk-dash-animate">
                      <h2 className="nk-section-title">Direcciones</h2>
                      <div className="nk-manga-border nk-address-box">
                        <p className="nk-address-title">Dirección de Envío Principal</p>
                        <p className="nk-address-text">
                          {user.shipping?.address1 ? (
                            <>
                              {user.shipping.address1}<br />
                              {user.shipping.city}, {user.shipping.state}<br />
                              CP: {user.shipping.postcode}<br />
                              {user.shipping.country}
                            </>
                          ) : 'No has configurado una dirección de envío aún.'}
                        </p>
                        <button className="nk-btn">{user.shipping?.address1 ? 'Editar Dirección' : 'Añadir Nueva'}</button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'profile' && (
                    <div className="nk-tab-pane nk-dash-animate">
                      <h2 className="nk-section-title">Detalles de la Cuenta</h2>
                      <div className="nk-info-box nk-manga-border">
                        <div className="nk-profile-grid">
                          <div className="nk-profile-item">
                            <label>Nombre Completo</label>
                            <p>{user.firstName} {user.lastName || ''}</p>
                          </div>
                          <div className="nk-profile-item">
                            <label>Email</label>
                            <p>{user.email}</p>
                          </div>
                          <div className="nk-profile-item">
                            <label>Usuario</label>
                            <p>{user.username}</p>
                          </div>
                          <div className="nk-profile-item">
                            <label>Rol</label>
                            <p className="nk-role-tag">{user.role?.toUpperCase() || 'NAKAMA'}</p>
                          </div>
                        </div>
                        <div className="nk-profile-actions">
                           <button className="nk-btn">Editar Perfil</button>
                           <button className="nk-btn-sec">Cambiar Contraseña</button>
                        </div>
                      </div>
                    </div>
                  )}
                </main>
              </div>
            </div>
          ) : (
            <div className="nk-login-form-wrapper">
              <div className="nk-login-header">
                <Image src="https://nakamabordados.com/wp-content/uploads/2025/11/LOGO-NAKAMA-scaled-2048x926.png" alt="Nakama" width={150} height={70} style={{ objectFit: 'contain' }} className="nk-logo-img" />
                <h2 className="nk-section-title">{t('account.login.title')}</h2>
              </div>

              <form onSubmit={handleLogin} className="nk-login-form">
                <div className="nk-form-group">
                  <label>{t('account.login.user')}</label>
                  <input type="text" name="username" value={userCredentials.username} onChange={handleInputChange} required className="nk-manga-input" />
                </div>
                <div className="nk-form-group">
                  <label>{t('account.login.pass')}</label>
                  <input type="password" name="password" value={userCredentials.password} onChange={handleInputChange} required className="nk-manga-input" />
                </div>

                {error && <p className="nk-error-msg">{error}</p>}

                <button type="submit" disabled={isLoggingIn} className="nk-btn nk-btn-block">
                  {isLoggingIn ? '...' : t('account.login.btn')}
                </button>
              </form>
              
              <div className="nk-login-footer">
                <Link href="/" className="nk-btn-sec">{t('nav.home')}</Link>
              </div>
            </div>
          )}
        </div>

        <div className="nk-login-protocol">NAKAMA SECURITY PROTOCOL // GRAND LINE</div>
      </div>

      <style jsx>{`
        .nk-account-page {
          padding: 60px 15px;
          background: var(--nk-bg-body);
          min-height: 90vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nk-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }

        .nk-account-card {
          background: var(--nk-bg-card);
          padding: 20px;
          width: 100%;
          box-sizing: border-box;
          box-shadow: var(--nk-manga-shadow-lg);
          border: var(--nk-manga-border);
          position: relative;
        }

        .nk-dashboard-grid {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        /* Desktop Sidebar */
        @media (min-width: 992px) {
          .nk-dashboard-grid {
            display: grid;
            grid-template-columns: 280px 1fr;
            gap: 40px;
          }
          
          .nk-account-card {
            padding: 40px;
          }
          
          .nk-account-page {
            padding: 100px 20px;
          }
        }

        .nk-sidebar-header {
          text-align: center;
          margin-bottom: 25px;
          padding-bottom: 20px;
          border-bottom: 2px solid var(--nk-border);
        }

        .nk-user-avatar {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          border: 3px solid var(--nk-border);
          margin: 0 auto 15px;
          background: var(--nk-bg-wrapper);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nk-user-avatar span {
          font-size: 2.5rem;
        }

        .nk-user-meta h3 {
          margin: 0;
          font-size: 1.3rem;
          font-family: 'Teko', sans-serif;
        }

        .nk-user-meta p {
          font-size: 0.75rem;
          opacity: 0.6;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .nk-dashboard-nav ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 10px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .nk-dashboard-nav ul::-webkit-scrollbar {
          display: none;
        }

        @media (min-width: 992px) {
          .nk-dashboard-nav ul {
            flex-direction: column;
            overflow-x: visible;
          }
        }

        .nk-dashboard-nav button {
          white-space: nowrap;
          padding: 10px 20px;
          border: 2px solid transparent;
          background: var(--nk-bg-wrapper);
          color: var(--nk-text-main);
          font-family: 'Teko', sans-serif;
          font-size: 1.2rem;
          text-transform: uppercase;
          cursor: pointer;
          transition: 0.3s;
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 4px;
        }

        @media (min-width: 992px) {
          .nk-dashboard-nav button {
            width: 100%;
            background: transparent;
            border: none;
            border-radius: 0;
            padding: 12px 15px;
            font-size: 1.4rem;
          }
        }

        .nk-dashboard-nav button.active {
          background: var(--nk-primary);
          color: #fff;
          border-color: var(--nk-primary);
        }

        .nk-nav-divider {
          display: none;
        }

        @media (min-width: 992px) {
          .nk-nav-divider {
            display: block;
            margin-top: 20px;
            padding: 10px 0 5px;
            font-size: 0.7rem;
            font-weight: 800;
            color: var(--nk-primary);
            letter-spacing: 2px;
            border-top: 1px solid var(--nk-border);
          }
        }

        .nk-admin-btn {
          padding: 10px 15px;
          font-family: 'Teko', sans-serif;
          font-size: 1.1rem;
          font-weight: 900;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 3px 3px 0px #000;
          border: 2px solid #000;
        }

        @media (min-width: 992px) {
          .nk-admin-btn {
            width: 100%;
            font-size: 1.3rem;
            padding: 12px 15px;
          }
        }

        .nk-admin-btn.gold { background: #FFD700; color: #000; }
        .nk-admin-btn.dark { background: #1d2327; color: #fff; }

        .nk-logout-li {
          margin-left: auto;
        }

        @media (min-width: 992px) {
          .nk-logout-li {
            margin-left: 0;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid var(--nk-border);
          }
        }

        .nk-logout-btn {
          color: #ff4444 !important;
          font-weight: 800;
        }

        /* Content Area */
        .nk-dashboard-content {
          width: 100%;
          min-width: 0; /* Prevents grid overflow */
        }

        .nk-tab-intro {
          line-height: 1.6;
          margin-bottom: 25px;
          opacity: 0.8;
        }

        .nk-dash-shortcuts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        @media (min-width: 480px) {
          .nk-dash-shortcuts {
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 20px;
          }
        }

        .nk-shortcut-card {
          padding: 20px 10px;
          text-align: center;
          cursor: pointer;
          background: var(--nk-bg-wrapper);
          transition: 0.2s;
        }

        .nk-shortcut-card span {
          font-size: 2rem;
          color: var(--nk-primary);
          margin-bottom: 8px;
          display: block;
        }

        .nk-shortcut-card h4 {
          font-size: 1.1rem;
          margin: 0;
        }

        /* Forms */
        .nk-login-form-wrapper {
          max-width: 450px;
          width: 100%;
          margin: 0 auto;
        }

        .nk-form-group {
          margin-bottom: 20px;
        }

        .nk-form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.85rem;
        }

        .nk-manga-input {
          width: 100%;
          padding: 12px;
          border: 2px solid var(--nk-border);
          background: var(--nk-bg-body);
          color: var(--nk-text-main);
          font-size: 1rem;
        }

        .nk-btn-block {
          width: 100%;
          padding: 15px;
          font-size: 1.4rem;
        }

        /* Orders */
        .nk-order-item {
          padding: 15px;
          margin-bottom: 20px;
          background: var(--nk-bg-wrapper);
        }

        @media (min-width: 768px) {
          .nk-order-item { padding: 25px; }
        }

        .nk-order-header {
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-bottom: 1px solid var(--nk-border);
          padding-bottom: 15px;
          margin-bottom: 15px;
        }

        @media (min-width: 600px) {
          .nk-order-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }

        .nk-order-number {
          font-weight: 900;
          font-size: 1.3rem;
          color: var(--nk-primary);
        }

        /* Tracking */
        .nk-track-input-area {
          display: flex;
          flex-direction: column;
          gap: 15px;
          padding: 15px;
          background: var(--nk-bg-wrapper);
          margin-bottom: 20px;
        }

        @media (min-width: 600px) {
          .nk-track-input-area {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }

        .nk-tracking-details {
          padding: 15px;
          border-left: 4px solid var(--nk-primary);
          background: var(--nk-bg-wrapper);
        }

        /* Commissions & Profile */
        .nk-commission-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 20px;
        }

        @media (min-width: 600px) {
          .nk-commission-card {
            flex-direction: row;
            text-align: left;
            padding: 30px;
          }
        }

        .nk-commission-amount {
          font-size: 2.5rem;
          color: var(--nk-primary);
          font-family: 'Teko', sans-serif;
          line-height: 1;
        }

        @media (min-width: 768px) {
          .nk-commission-amount { font-size: 3.5rem; }
        }

        .nk-profile-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        @media (min-width: 600px) {
          .nk-profile-grid {
            grid-template-columns: 1fr 1fr;
            gap: 30px;
          }
        }

        .nk-profile-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid var(--nk-border);
        }

        @media (min-width: 600px) {
          .nk-profile-actions {
            flex-direction: row;
          }
        }

        .nk-login-protocol {
          text-align: center;
          margin-top: 30px;
          font-size: 0.65rem;
          opacity: 0.3;
          letter-spacing: 2px;
          padding: 0 10px;
        }

        @media (min-width: 768px) {
          .nk-login-protocol {
            margin-top: 50px;
            font-size: 0.8rem;
            letter-spacing: 4px;
          }
        }
      `}</style>
    </div>
  );
}
