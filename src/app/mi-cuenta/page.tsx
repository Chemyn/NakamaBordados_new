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
    const success = await login(userCredentials.username, userCredentials.password);
    if (!success) {
      setError(t('account.login.error'));
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
    <div className="nk-account-page" style={{ padding: '100px 0', background: 'var(--nk-bg-body)', minHeight: '80vh' }}>
      <div className="nk-container">
        <div className="nk-account-card nk-manga-border" style={{ background: 'var(--nk-bg-card)', padding: '40px', maxWidth: '1200px', margin: '0 auto', boxShadow: 'var(--nk-manga-shadow-lg)' }}>
          {user ? (
            <div className="nk-user-dashboard">
              <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '50px' }}>
                {/* Sidebar Navigation */}
                <aside className="nk-dashboard-sidebar">
                  <div style={{ textAlign: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid var(--nk-border)' }}>
                    <div className="nk-user-avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid var(--nk-border)', margin: '0 auto 15px', overflow: 'hidden', background: 'var(--nk-bg-wrapper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-icons-outlined" style={{ fontSize: '3rem' }}>person</span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'Teko', letterSpacing: '1px' }}>{user.firstName || user.username}</h3>
                    <p style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase' }}>{user.role || 'Nakama'}</p>
                  </div>

                  <nav className="nk-dashboard-nav">
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <li>
                        <button onClick={() => setActiveTab('dashboard')} className={`nk-dashboard-link ${activeTab === 'dashboard' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', padding: '12px 15px', border: 'none', background: activeTab === 'dashboard' ? 'var(--nk-primary)' : 'transparent', color: activeTab === 'dashboard' ? '#fff' : 'var(--nk-text-main)', fontFamily: 'Teko', fontSize: '1.3rem', textTransform: 'uppercase', cursor: 'pointer', transition: '0.2s' }}>
                          <span className="material-icons-outlined" style={{ verticalAlign: 'middle', marginRight: '10px', fontSize: '1.2rem' }}>dashboard</span>
                          Dashboard
                        </button>
                      </li>
                      <li>
                        <button onClick={() => setActiveTab('orders')} className={`nk-dashboard-link ${activeTab === 'orders' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', padding: '12px 15px', border: 'none', background: activeTab === 'orders' ? 'var(--nk-primary)' : 'transparent', color: activeTab === 'orders' ? '#fff' : 'var(--nk-text-main)', fontFamily: 'Teko', fontSize: '1.3rem', textTransform: 'uppercase', cursor: 'pointer', transition: '0.2s' }}>
                          <span className="material-icons-outlined" style={{ verticalAlign: 'middle', marginRight: '10px', fontSize: '1.2rem' }}>shopping_bag</span>
                          Mis Pedidos
                        </button>
                      </li>
                      <li>
                        <button onClick={() => setActiveTab('tracking')} className={`nk-dashboard-link ${activeTab === 'tracking' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', padding: '12px 15px', border: 'none', background: activeTab === 'tracking' ? 'var(--nk-primary)' : 'transparent', color: activeTab === 'tracking' ? '#fff' : 'var(--nk-text-main)', fontFamily: 'Teko', fontSize: '1.3rem', textTransform: 'uppercase', cursor: 'pointer', transition: '0.2s' }}>
                          <span className="material-icons-outlined" style={{ verticalAlign: 'middle', marginRight: '10px', fontSize: '1.2rem' }}>local_shipping</span>
                          Rastreo
                        </button>
                      </li>
                      
                      {user.comisiones && (
                        <li>
                          <button onClick={() => setActiveTab('commissions')} className={`nk-dashboard-link ${activeTab === 'commissions' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', padding: '12px 15px', border: 'none', background: activeTab === 'commissions' ? 'var(--nk-primary)' : 'transparent', color: activeTab === 'commissions' ? '#fff' : 'var(--nk-text-main)', fontFamily: 'Teko', fontSize: '1.3rem', textTransform: 'uppercase', cursor: 'pointer', transition: '0.2s' }}>
                            <span className="material-icons-outlined" style={{ verticalAlign: 'middle', marginRight: '10px', fontSize: '1.2rem' }}>payments</span>
                            Comisiones
                          </button>
                        </li>
                      )}

                      <li>
                        <button onClick={() => setActiveTab('addresses')} className={`nk-dashboard-link ${activeTab === 'addresses' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', padding: '12px 15px', border: 'none', background: activeTab === 'addresses' ? 'var(--nk-primary)' : 'transparent', color: activeTab === 'addresses' ? '#fff' : 'var(--nk-text-main)', fontFamily: 'Teko', fontSize: '1.3rem', textTransform: 'uppercase', cursor: 'pointer', transition: '0.2s' }}>
                          <span className="material-icons-outlined" style={{ verticalAlign: 'middle', marginRight: '10px', fontSize: '1.2rem' }}>location_on</span>
                          Direcciones
                        </button>
                      </li>
                      <li>
                        <button onClick={() => setActiveTab('profile')} className={`nk-dashboard-link ${activeTab === 'profile' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', padding: '12px 15px', border: 'none', background: activeTab === 'profile' ? 'var(--nk-primary)' : 'transparent', color: activeTab === 'profile' ? '#fff' : 'var(--nk-text-main)', fontFamily: 'Teko', fontSize: '1.3rem', textTransform: 'uppercase', cursor: 'pointer', transition: '0.2s' }}>
                          <span className="material-icons-outlined" style={{ verticalAlign: 'middle', marginRight: '10px', fontSize: '1.2rem' }}>manage_accounts</span>
                          Cuenta
                        </button>
                      </li>

                      {/* HERRAMIENTAS DE ADMINISTRADOR */}
                      {isAdmin && (
                        <>
                          <li style={{ marginTop: '20px', padding: '10px 0 5px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--nk-primary)', letterSpacing: '2px', borderTop: '1px solid var(--nk-border)' }}>
                            ADMIN TOOLS
                          </li>
                          <li>
                            <Link href="/admin/suite" style={{ textDecoration: 'none' }}>
                              <button style={{ 
                                width: '100%', textAlign: 'left', padding: '12px 15px', border: '2px solid #000', 
                                background: '#FFD700', color: '#000', fontFamily: 'Teko', fontSize: '1.3rem', 
                                textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', 
                                gap: '10px', fontWeight: 900, boxShadow: '4px 4px 0px #000', transition: 'all 0.2s'
                              }}>
                                <span className="material-icons-outlined">rocket_launch</span>
                                Nakama Suite
                              </button>
                            </Link>
                          </li>
                          <li style={{ marginTop: '10px' }}>
                            <a href="https://nakamabordados.com/wp-admin" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                              <button style={{ 
                                width: '100%', textAlign: 'left', padding: '12px 15px', border: '2px solid var(--nk-border)', 
                                background: '#1d2327', color: '#fff', fontFamily: 'Teko', fontSize: '1.3rem', 
                                textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', 
                                gap: '10px', fontWeight: 700, boxShadow: '4px 4px 0px var(--nk-border)'
                              }}>
                                <span className="material-icons-outlined">settings</span>
                                WP Admin Panel
                              </button>
                            </a>
                          </li>
                        </>
                      )}

                      <li style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--nk-border)' }}>
                        <button onClick={logout} style={{ width: '100%', textAlign: 'left', padding: '12px 15px', border: 'none', background: 'transparent', color: '#ff4444', fontFamily: 'Teko', fontSize: '1.3rem', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 800 }}>
                          <span className="material-icons-outlined" style={{ verticalAlign: 'middle', marginRight: '10px', fontSize: '1.2rem' }}>logout</span>
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
                      <h2 className="nk-section-title" style={{ marginBottom: '20px' }}>Hola, {user.firstName || user.username}</h2>
                      <p style={{ lineHeight: 1.6, color: 'var(--nk-text-sec)' }}>
                        Desde el centro de mando puedes gestionar tus tesoros y tu configuración pirata.
                      </p>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginTop: '40px' }}>
                        <div className="nk-manga-border" style={{ padding: '20px', textAlign: 'center', cursor: 'pointer', background: 'var(--nk-bg-wrapper)' }} onClick={() => setActiveTab('orders')}>
                           <span className="material-icons-outlined" style={{ fontSize: '2.5rem', color: 'var(--nk-primary)', marginBottom: '10px' }}>receipt_long</span>
                           <h4 style={{ margin: 0, fontFamily: 'Teko', fontSize: '1.4rem' }}>Pedidos</h4>
                        </div>
                        <div className="nk-manga-border" style={{ padding: '20px', textAlign: 'center', cursor: 'pointer', background: 'var(--nk-bg-wrapper)' }} onClick={() => setActiveTab('tracking')}>
                           <span className="material-icons-outlined" style={{ fontSize: '2.5rem', color: 'var(--nk-primary)', marginBottom: '10px' }}>local_shipping</span>
                           <h4 style={{ margin: 0, fontFamily: 'Teko', fontSize: '1.4rem' }}>Rastreo</h4>
                        </div>
                        <div className="nk-manga-border" style={{ padding: '20px', textAlign: 'center', cursor: 'pointer', background: 'var(--nk-bg-wrapper)' }} onClick={() => setActiveTab('addresses')}>
                           <span className="material-icons-outlined" style={{ fontSize: '2.5rem', color: 'var(--nk-primary)', marginBottom: '10px' }}>home</span>
                           <h4 style={{ margin: 0, fontFamily: 'Teko', fontSize: '1.4rem' }}>Direcciones</h4>
                        </div>
                        <div className="nk-manga-border" style={{ padding: '20px', textAlign: 'center', cursor: 'pointer', background: 'var(--nk-bg-wrapper)' }} onClick={() => setActiveTab('profile')}>
                           <span className="material-icons-outlined" style={{ fontSize: '2.5rem', color: 'var(--nk-primary)', marginBottom: '10px' }}>settings</span>
                           <h4 style={{ margin: 0, fontFamily: 'Teko', fontSize: '1.4rem' }}>Ajustes</h4>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'orders' && (
                    <div className="nk-tab-pane nk-dash-animate">
                      <h2 className="nk-section-title" style={{ marginBottom: '30px' }}>Historial de Botín</h2>
                      {user.orders && user.orders.nodes.length > 0 ? (
                        <div className="nk-orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          {user.orders.nodes.map((order: any) => (
                            <div key={order.id} className="nk-order-item nk-manga-border" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--nk-border)', paddingBottom: '15px' }}>
                                <div>
                                  <p style={{ fontWeight: 900, fontSize: '1.4rem', fontFamily: 'Teko', color: 'var(--nk-primary)' }}>PEDIDO #{order.orderNumber}</p>
                                  <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>{new Date(order.date).toLocaleDateString()}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ fontSize: '0.7rem', padding: '4px 12px', background: 'var(--nk-border)', color: 'var(--nk-bg-body)', borderRadius: '20px', fontWeight: 800, textTransform: 'uppercase' }}>{order.status}</span>
                                </div>
                              </div>
                              
                              <div className="nk-order-details">
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                  {order.lineItems?.nodes.map((item: any, i: number) => (
                                    <li key={i} style={{ fontSize: '0.9rem', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                                      <span>{item.quantity}x {item.product.node.name}</span>
                                    </li>
                                  ))}
                                </ul>
                                <div style={{ marginTop: '15px', textAlign: 'right', fontWeight: 900, fontSize: '1.2rem', fontFamily: 'Teko' }}>
                                  TOTAL: {formatPrice(parseFloat(order.total))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--nk-bg-wrapper)', border: '2px dashed var(--nk-border)' }}>
                          <span className="material-icons-outlined" style={{ fontSize: '4rem', opacity: 0.2 }}>inventory_2</span>
                          <p style={{ marginTop: '15px', fontWeight: 700 }}>Aún no has capturado ningún tesoro.</p>
                          <Link href="/store" className="nk-btn" style={{ marginTop: '20px', fontSize: '1rem' }}>Ir a la Tienda</Link>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'tracking' && (
                    <div className="nk-tab-pane nk-dash-animate">
                      <h2 className="nk-section-title" style={{ marginBottom: '30px' }}>Rastreo de Botín</h2>
                      
                      {user.orders && user.orders.nodes.some((o: any) => o.enviaTrackingCode) ? (
                        <div className="nk-tracking-list" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                          {user.orders.nodes.filter((o: any) => o.enviaTrackingCode).map((order: any) => {
                            const code = order.enviaTrackingCode;
                            const res = trackingResults[code];
                            return (
                              <div key={`track-${order.id}`} className="nk-tracking-card nk-manga-border" style={{ padding: '0', overflow: 'hidden' }}>
                                <div style={{ background: 'var(--nk-border)', color: 'var(--nk-bg-body)', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontFamily: 'Teko', fontSize: '1.4rem', fontWeight: 800 }}>PEDIDO #{order.orderNumber}</span>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>{order.enviaCarrier || 'Envío'}</span>
                                </div>
                                <div style={{ padding: '25px' }}>
                                  <div className="nk-manga-border" style={{ background: 'var(--nk-bg-wrapper)', padding: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, opacity: 0.6 }}>Guía de Rastreo</p>
                                      <p style={{ fontFamily: 'Courier New', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--nk-primary)' }}>{code}</p>
                                    </div>
                                    <button 
                                      className="nk-btn" 
                                      style={{ padding: '10px 20px', fontSize: '1rem' }} 
                                      onClick={() => fetchTracking(code, order.enviaCarrier || 'estafeta')} 
                                      disabled={trackingLoading === code}
                                    >
                                      {trackingLoading === code ? 'Consultando...' : 'Ver Estado'}
                                    </button>
                                  </div>

                                  {res && (
                                    <div className="nk-tracking-details nk-dash-animate" style={{ padding: '15px', background: 'var(--nk-bg-wrapper)', borderLeft: '5px solid var(--nk-primary)' }}>
                                      <p style={{ fontWeight: 900, color: 'var(--nk-primary)', marginBottom: '8px', fontFamily: 'Teko', fontSize: '1.3rem', textTransform: 'uppercase' }}>
                                        ESTADO: {res.status || 'En camino'}
                                      </p>
                                      <p style={{ fontSize: '0.95rem', lineHeight: 1.4 }}>{res.description || 'El paquete está siendo procesado por la tripulación logística.'}</p>
                                      {res.checkpoint && (
                                        <p style={{ fontSize: '0.8rem', marginTop: '10px', opacity: 0.6, fontStyle: 'italic' }}>Último avistamiento: {res.checkpoint}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="nk-tracking-pending" style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
                          <span className="material-icons-outlined" style={{ fontSize: '4rem' }}>local_shipping</span>
                          <p style={{ marginTop: '15px', fontWeight: 700 }}>Tus pedidos aún están en el astillero. Te avisaremos cuando zarpen.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'commissions' && (
                    <div className="nk-tab-pane nk-dash-animate">
                      <h2 className="nk-section-title" style={{ marginBottom: '30px' }}>Tus Ganancias</h2>
                      <div className="nk-commission-current nk-manga-border" style={{ background: 'var(--nk-bg-wrapper)', padding: '30px', display: 'flex', alignItems: 'center', gap: '30px' }}>
                        <div className="nk-commission-current-icon" style={{ background: 'var(--nk-primary)', color: '#fff', width: '70px', height: '70px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-icons-outlined" style={{ fontSize: '2.5rem' }}>account_balance_wallet</span>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 800, opacity: 0.6 }}>Saldo por Reclamar</p>
                          <p style={{ fontFamily: 'Teko', fontSize: '3.5rem', fontWeight: 800, color: 'var(--nk-primary)', lineHeight: 1 }}>{formatPrice(1250.50)}</p>
                          <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Corte de mes: 30 de Junio</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'addresses' && (
                    <div className="nk-tab-pane nk-dash-animate">
                      <h2 className="nk-section-title" style={{ marginBottom: '30px' }}>Direcciones</h2>
                      <div className="nk-manga-border" style={{ padding: '30px', background: 'var(--nk-bg-wrapper)' }}>
                        <p style={{ fontWeight: 800, marginBottom: '10px', textTransform: 'uppercase', fontSize: '0.9rem' }}>Dirección de Envío Principal</p>
                        <p style={{ opacity: 0.7, fontSize: '1rem', lineHeight: 1.5 }}>
                          {user.shipping?.address1 ? (
                            <>
                              {user.shipping.address1}<br />
                              {user.shipping.city}, {user.shipping.state}<br />
                              CP: {user.shipping.postcode}<br />
                              {user.shipping.country}
                            </>
                          ) : 'No has configurado una dirección de envío aún.'}
                        </p>
                        <button className="nk-btn" style={{ marginTop: '25px', fontSize: '1rem', padding: '10px 25px' }}>{user.shipping?.address1 ? 'Editar Dirección' : 'Añadir Nueva'}</button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'profile' && (
                    <div className="nk-tab-pane nk-dash-animate">
                      <h2 className="nk-section-title" style={{ marginBottom: '30px' }}>Detalles de la Cuenta</h2>
                      <div className="nk-info-box nk-manga-border" style={{ padding: '30px', background: 'var(--nk-bg-wrapper)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.5, marginBottom: '8px' }}>Nombre Completo</label>
                            <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{user.firstName} {user.lastName || ''}</p>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.5, marginBottom: '8px' }}>Email</label>
                            <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{user.email}</p>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.5, marginBottom: '8px' }}>Usuario</label>
                            <p style={{ fontWeight: 700 }}>{user.username}</p>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.5, marginBottom: '8px' }}>Rol</label>
                            <p style={{ fontWeight: 700, color: 'var(--nk-primary)' }}>{user.role?.toUpperCase() || 'NAKAMA'}</p>
                          </div>
                        </div>
                        <div style={{ paddingTop: '20px', borderTop: '1px solid var(--nk-border)' }}>
                           <button className="nk-btn" style={{ fontSize: '1.1rem', padding: '10px 30px' }}>Editar Perfil</button>
                           <button className="nk-btn-sec" style={{ fontSize: '1.1rem', padding: '10px 30px', marginLeft: '15px', background: 'transparent', border: 'none' }}>Cambiar Contraseña</button>
                        </div>
                      </div>
                    </div>
                  )}
                </main>
              </div>
            </div>
          ) : (
            <div className="nk-login-form-wrapper" style={{ maxWidth: '400px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <Image src="https://nakamabordados.com/wp-content/uploads/2025/11/LOGO-NAKAMA-scaled-2048x926.png" alt="Nakama" width={150} height={70} style={{ objectFit: 'contain' }} className="nk-logo-img" />
                <h2 className="nk-section-title" style={{ marginTop: '20px' }}>{t('account.login.title')}</h2>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="nk-form-group">
                  <label>{t('account.login.user')}</label>
                  <input type="text" name="username" value={userCredentials.username} onChange={handleInputChange} required className="nk-manga-input" />
                </div>
                <div className="nk-form-group">
                  <label>{t('account.login.pass')}</label>
                  <input type="password" name="password" value={userCredentials.password} onChange={handleInputChange} required className="nk-manga-input" />
                </div>

                {error && <p style={{ color: 'var(--nk-primary)', fontWeight: 700, textAlign: 'center', fontSize: '0.9rem' }}>{error}</p>}

                <button type="submit" disabled={isLoggingIn} className="nk-btn nk-btn-block" style={{ padding: '15px', fontSize: '1.4rem' }}>
                  {isLoggingIn ? '...' : t('account.login.btn')}
                </button>
              </form>
              
              <div style={{ marginTop: '30px', textAlign: 'center' }}>
                <Link href="/" className="nk-btn-sec" style={{ fontSize: '0.9rem', opacity: 0.7, textDecoration: 'none' }}>{t('nav.home')}</Link>
              </div>
            </div>
          )}
        </div>

        <div className="nk-login-protocol" style={{ textAlign: 'center', marginTop: '40px', fontSize: '0.7rem', opacity: 0.3, letterSpacing: '4px' }}>NAKAMA SECURITY PROTOCOL // GRAND LINE</div>
      </div>
    </div>
  );
}
