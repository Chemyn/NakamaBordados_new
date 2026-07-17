'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import MaintenanceToggle from '../components/MaintenanceToggle';
import { openWpAdmin, seedWpSession, WP_ADMIN_URL } from '@/lib/wp-sso';
import { apiOrigin } from '@/lib/api-host';

/* Estados de pedido de WooCommerce en español. GraphQL los entrega como enum
   (ON_HOLD) y REST como slug (on-hold); se canonicaliza a slug antes de mapear. */
const ORDER_STATUS_ES: Record<string, string> = {
  'pending': 'Pendiente de pago',
  'processing': 'Procesando',
  'on-hold': 'En espera',
  'completed': 'Completado',
  'cancelled': 'Cancelado',
  'refunded': 'Reembolsado',
  'failed': 'Fallido',
  'checkout-draft': 'Borrador',
};

const orderStatusSlug = (status: unknown): string =>
  String(status ?? '').toLowerCase().replace(/[_\s]+/g, '-');

const orderStatusLabel = (status: unknown): string =>
  ORDER_STATUS_ES[orderStatusSlug(status)] || String(status ?? '');

/* Seguimiento gráfico: la respuesta de /nakama/v1/track-timeline (17TRACK con
   fallback a Envia) trae el enum de estado + el historial de eventos. */
interface TrackTimelineEvent {
  time: string;
  status: string;
  description: string;
  location: string;
}

interface TrackTimeline {
  success: boolean;
  source: string;
  number: string;
  carrier_name: string;
  status: string;
  sub_status: string;
  status_es: string;
  delivered_time: string | null;
  events: TrackTimelineEvent[];
}

const TRACK_STEPS = [
  { key: 'InfoReceived', label: 'Información recibida', icon: 'receipt_long' },
  { key: 'InTransit', label: 'En tránsito', icon: 'local_shipping' },
  { key: 'OutForDelivery', label: 'En reparto', icon: 'markunread_mailbox' },
  { key: 'Delivered', label: 'Entregado', icon: 'task_alt' },
] as const;

/** Índice del paso del stepper que corresponde al estado de 17TRACK. */
const trackStepIndex = (status: string): number => {
  switch (status) {
    case 'InfoReceived': return 0;
    case 'InTransit':
    case 'Expired':
    case 'Exception': return 1;
    case 'OutForDelivery':
    case 'AvailableForPickup':
    case 'DeliveryFailure': return 2;
    case 'Delivered': return 3;
    default: return -1; // NotFound / sin datos
  }
};

const isTrackProblem = (status: string): boolean =>
  status === 'Exception' || status === 'DeliveryFailure';

const formatEventTime = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function MiCuentaPage() {
  const { user, login, register, logout, refreshUser, isLoading, isAdmin } = useAuth();
  const { formatPrice, currencyInfo } = useCurrency();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'profile' | 'addresses' | 'tracking' | 'commissions'>('dashboard');
  const [userCredentials, setUserCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  // Alterna el formulario desconectado entre iniciar sesión y crear cuenta.
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [registerData, setRegisterData] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  // ?return=/cart/ — el gate de compra manda aquí a autenticarse y al terminar
  // se regresa a esa ruta. Se lee de window.location (useSearchParams exigiría
  // un límite de Suspense en el export estático) y solo se aceptan rutas internas.
  const [returnTo, setReturnTo] = useState<string | null>(null);
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('return');
    if (r && r.startsWith('/') && !r.startsWith('//')) {
      setReturnTo(r);
    }
  }, []);

  useEffect(() => {
    if (user && returnTo) {
      router.replace(returnTo);
    }
  }, [user, returnTo, router]);
  
  // Tracking state - indexed by tracking code to avoid conflicts
  const [trackingLoading, setTrackingLoading] = useState<string | null>(null);
  const [trackingResults, setTrackingResults] = useState<Record<string, any>>({});

  // Al entrar a Mi Cuenta, refrescar los pedidos: sin esto una cotización
  // recién creada no aparece hasta recargar toda la página (el contexto solo
  // consultaba pedidos al iniciar sesión/montar la app).
  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserCredentials({ ...userCredentials, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    // trim: el autocompletado móvil suele agregar un espacio final al usuario,
    // y para WordPress "usuario " es un usuario distinto (login rechazado).
    const result = await login(userCredentials.username.trim(), userCredentials.password);
    if (!result.success) {
      setError(result.error || t('account.login.error'));
    }
    setIsLoggingIn(false);
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsRegistering(true);
    const result = await register({
      email: registerData.email.trim(),
      password: registerData.password,
      firstName: registerData.firstName.trim(),
      lastName: registerData.lastName.trim(),
      phone: registerData.phone.trim(),
    });
    if (!result.success) {
      setError(result.error || t('account.register.error'));
    }
    // En éxito, `register` ya inició sesión: `user` deja de ser null y este
    // formulario se reemplaza por el dashboard.
    setIsRegistering(false);
  };

  const switchAuthMode = (mode: 'login' | 'register') => {
    setError('');
    setAuthMode(mode);
  };

  const fetchTracking = async (code: string, carrier: string) => {
    if (!code) return;
    setTrackingLoading(code);
    try {
      // nkcb: LiteSpeed cachea las respuestas de ?rest_route= y serviría un
      // estado de rastreo viejo. El servidor tiene su propio caché (transient).
      const res = await fetch(`${apiOrigin()}/?rest_route=/nakama/v1/track-timeline&tracking=${encodeURIComponent(code)}&carrier=${encodeURIComponent(carrier.toLowerCase())}&nkcb=${Date.now()}`);
      if (res.ok) {
        const data: TrackTimeline = await res.json();
        setTrackingResults(prev => ({
          ...prev,
          [code]: data && data.status
            ? data
            : { success: false, status: 'NotFound', status_es: 'No se encontraron datos.', events: [] }
        }));
      } else {
        setTrackingResults(prev => ({
          ...prev,
          [code]: { success: false, status: 'NotFound', status_es: 'Error al consultar la paquetería.', events: [] }
        }));
      }
    } catch (e) {
      console.error("Error fetching tracking:", e);
    } finally {
      setTrackingLoading(null);
    }
  };

  // Auto-carga del seguimiento al abrir el tab (el transient del servidor hace
  // baratas las consultas repetidas). Escalonado para no rebasar el límite de
  // peticiones del proxy cuando hay varios envíos.
  useEffect(() => {
    if (activeTab !== 'tracking' || !user?.orders?.nodes) return;
    const pending = user.orders.nodes.filter(
      (o: any) => o.enviaTrackingCode && !trackingResults[o.enviaTrackingCode]
    );
    const timers = pending.map((o: any, i: number) =>
      setTimeout(() => fetchTracking(o.enviaTrackingCode, o.enviaCarrier || 'estafeta'), i * 400)
    );
    return () => timers.forEach(clearTimeout);
    // trackingResults/fetchTracking intencionalmente fuera de deps: solo debe
    // dispararse al entrar al tab o al cambiar los pedidos, no en cada resultado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

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
                            <a
                              href={WP_ADMIN_URL}
                              onClick={(e) => { e.preventDefault(); openWpAdmin(); }}
                              className="nk-admin-btn-link"
                            >
                              <button className="nk-admin-btn gold">
                                <span className="material-icons-outlined">dashboard</span>
                                Escritorio WordPress
                              </button>
                            </a>
                          </li>
                          <li>
                            <MaintenanceToggle />
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
                                  <span className={`nk-status-${orderStatusSlug(order.status)}`}>
                                    {orderStatusLabel(order.status)}
                                  </span>
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
                                  {/* Total tal como se cobró el pedido, en SU moneda
                                      (formatPrice lo reconvertía con la tasa actual
                                      y mostraba la moneda seleccionada, no la real). */}
                                  TOTAL: ${(parseFloat(String(order.total || '0').replace(/[^0-9.-]/g, '')) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {order.currency || 'MXN'}
                                </div>
                              </div>

                              {/* Pedido pendiente de pago (p. ej. cotización con
                                  precio ya asignado): botón directo a la página
                                  de pago de WooCommerce (order-pay). */}
                              {order.needsPayment && order.databaseId && order.orderKey && (
                                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed var(--nk-border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                                  <button
                                    className="nk-btn"
                                    style={{ padding: '10px 24px', fontSize: '1.2rem' }}
                                    onClick={async () => {
                                      // Sembrar la sesión de WP para que el checkout
                                      // reconozca al cliente, y pagar por el CHECKOUT
                                      // NORMAL (pide envío, calcula paquetería y acepta
                                      // cupones; order-pay de Woo no lo hace).
                                      // currency: sin él, el snippet de moneda de WP
                                      // decide solo (geo-IP) y convertía a USD sin
                                      // que el cliente lo hubiera seleccionado.
                                      await seedWpSession();
                                      window.location.href = `https://nakamabordados.com/index.php?nk_bridge=pay-quote&order=${order.databaseId}&key=${order.orderKey}&currency=${currencyInfo.currency}`;
                                    }}
                                  >
                                    <span className="material-icons-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>payments</span>
                                    PAGAR AHORA
                                  </button>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--nk-text-sec)', fontWeight: 600 }}>
                                    Tu cotización ya tiene precio: completa el pago para iniciar la producción.
                                  </span>
                                </div>
                              )}
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
                            const res: TrackTimeline | undefined = trackingResults[code];
                            const stepIndex = res ? trackStepIndex(res.status) : -1;
                            const hasProblem = res ? isTrackProblem(res.status) : false;
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
                                      {trackingLoading === code ? '...' : res ? 'Actualizar' : 'Ver Estado'}
                                    </button>
                                  </div>

                                  {res && (
                                    <div className="nk-tracking-details nk-dash-animate">
                                      <p className={`nk-track-status ${hasProblem ? 'nk-track-status-problem' : ''}`}>
                                        {res.status_es || 'En camino'}
                                      </p>

                                      {/* Stepper de progreso: 4 etapas del envío */}
                                      <div className="nk-track-stepper">
                                        {TRACK_STEPS.map((step, i) => {
                                          const isDone = stepIndex >= 0 && i <= stepIndex;
                                          const isCurrent = i === stepIndex;
                                          const label = res.status === 'AvailableForPickup' && i === 2
                                            ? 'Listo para recoger'
                                            : step.label;
                                          return (
                                            <div
                                              key={step.key}
                                              className={`nk-track-step${isDone ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}${isCurrent && hasProblem ? ' is-problem' : ''}`}
                                            >
                                              <span className="nk-track-step-icon material-icons-outlined">{step.icon}</span>
                                              <span className="nk-track-step-label">{label}</span>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Línea de tiempo de eventos (más reciente primero) */}
                                      {res.events && res.events.length > 0 ? (
                                        <div className="nk-track-timeline">
                                          {res.events.map((ev, i) => (
                                            <div key={`${code}-ev-${i}`} className={`nk-track-event${i === 0 ? ' nk-track-event-latest' : ''}`}>
                                              <span className="nk-track-event-dot"></span>
                                              <div>
                                                <p className="nk-track-event-desc">{ev.description || ev.status}</p>
                                                {(ev.time || ev.location) && (
                                                  <p className="nk-track-event-meta">
                                                    {[formatEventTime(ev.time), ev.location].filter(Boolean).join(' · ')}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="nk-track-desc">La paquetería aún no reporta movimientos. Intenta más tarde.</p>
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
                <h2 className="nk-section-title">
                  {authMode === 'login' ? t('account.login.title') : t('account.register.title')}
                </h2>
              </div>

              {returnTo && (
                <p className="nk-return-notice">
                  Inicia sesión o crea tu cuenta para completar tu compra. Al crear tu cuenta obtienes descuentos y beneficios exclusivos, y al terminar te regresamos a donde estabas.
                </p>
              )}

              {authMode === 'login' ? (
                <>
                  <form onSubmit={handleLogin} className="nk-login-form">
                    <div className="nk-form-group">
                      <label>{t('account.login.user')}</label>
                      {/* autoCapitalize/autoCorrect off: los teclados móviles capitalizan
                          la primera letra o autocorrigen el usuario y el login falla. */}
                      <input
                        type="text"
                        name="username"
                        value={userCredentials.username}
                        onChange={handleInputChange}
                        required
                        className="nk-manga-input"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        autoComplete="username"
                      />
                    </div>
                    <div className="nk-form-group">
                      <label>{t('account.login.pass')}</label>
                      <input
                        type="password"
                        name="password"
                        value={userCredentials.password}
                        onChange={handleInputChange}
                        required
                        className="nk-manga-input"
                        autoComplete="current-password"
                      />
                    </div>

                    {error && <p className="nk-error-msg">{error}</p>}

                    <button type="submit" disabled={isLoggingIn} className="nk-btn nk-btn-block">
                      {isLoggingIn ? '...' : t('account.login.btn')}
                    </button>
                  </form>

                  <button type="button" className="nk-auth-switch" onClick={() => switchAuthMode('register')}>
                    {t('account.login.no_account')}
                  </button>
                </>
              ) : (
                <>
                  <form onSubmit={handleRegister} className="nk-login-form">
                    <div className="nk-form-group">
                      <label>{t('account.register.first')}</label>
                      <input
                        type="text"
                        name="firstName"
                        value={registerData.firstName}
                        onChange={handleRegisterChange}
                        required
                        className="nk-manga-input"
                        autoComplete="given-name"
                      />
                    </div>
                    <div className="nk-form-group">
                      <label>{t('account.register.last')}</label>
                      <input
                        type="text"
                        name="lastName"
                        value={registerData.lastName}
                        onChange={handleRegisterChange}
                        className="nk-manga-input"
                        autoComplete="family-name"
                      />
                    </div>
                    <div className="nk-form-group">
                      <label>{t('account.register.email')}</label>
                      <input
                        type="email"
                        name="email"
                        value={registerData.email}
                        onChange={handleRegisterChange}
                        required
                        className="nk-manga-input"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        autoComplete="email"
                      />
                    </div>
                    <div className="nk-form-group">
                      <label>{t('account.register.phone')}</label>
                      <input
                        type="tel"
                        name="phone"
                        value={registerData.phone}
                        onChange={handleRegisterChange}
                        className="nk-manga-input"
                        autoComplete="tel"
                      />
                    </div>
                    <div className="nk-form-group">
                      <label>{t('account.register.pass')}</label>
                      <input
                        type="password"
                        name="password"
                        value={registerData.password}
                        onChange={handleRegisterChange}
                        required
                        minLength={6}
                        className="nk-manga-input"
                        autoComplete="new-password"
                      />
                    </div>

                    {error && <p className="nk-error-msg">{error}</p>}

                    <button type="submit" disabled={isRegistering} className="nk-btn nk-btn-block">
                      {isRegistering ? '...' : t('account.register.btn')}
                    </button>
                  </form>

                  <button type="button" className="nk-auth-switch" onClick={() => switchAuthMode('login')}>
                    {t('account.register.have_account')}
                  </button>
                </>
              )}

              <div className="nk-login-footer">
                <Link href="/" className="nk-home-link">
                  <span className="material-icons-outlined">home</span>
                  {t('nav.home')}
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="nk-login-protocol">NAKAMA SECURITY PROTOCOL // GRAND LINE</div>
      </div>

      <style jsx>{`
        .nk-account-page {
          /* El navbar es fixed: hay que despejar --header-padding (80px).
             El 60px fijo anterior metía la tarjeta bajo el header en móvil,
             y el centrado vertical (align-items:center con 90vh) la subía
             aún más en pantallas cortas; en móvil se alinea arriba. */
          padding: calc(var(--header-padding) + 20px) 15px 60px;
          background: var(--nk-bg-body);
          min-height: 90vh;
          display: flex;
          align-items: flex-start;
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
          /* Ningún contenido interno debe provocar scroll horizontal en móvil */
          overflow-x: clip;
        }

        /* Títulos del dashboard: el global fija 3rem !important y en pantallas
           de ~360px desborda; aquí se escala al ancho disponible. */
        .nk-account-card :global(.nk-section-title) {
          font-size: clamp(1.9rem, 7vw, 3rem) !important;
          overflow-wrap: anywhere;
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
            /* En desktop 100px ya libra el header (80px) y se recupera el
               centrado vertical original. */
            padding: 100px 20px;
            align-items: center;
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

        /* En móvil la nav es una fila deslizable: los items no deben encogerse */
        .nk-dashboard-nav li {
          flex-shrink: 0;
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

        /* :not(.nk-admin-btn): los botones de ADMIN TOOLS se visten SOLO con
           .nk-admin-btn (globals.css). Este selector con hash de styled-jsx
           tiene más especificidad y pisaba el fondo/tipografía del botón
           "Escritorio WordPress" (el MaintenanceToggle, al ser otro componente,
           no lleva el hash — quedaban dos botones vecinos con diseños distintos). */
        .nk-dashboard-nav button:not(.nk-admin-btn) {
          white-space: nowrap;
          padding: 8px 14px;
          border: 2px solid transparent;
          background: var(--nk-bg-wrapper);
          color: var(--nk-text-main);
          font-family: 'Teko', sans-serif;
          font-size: 1.1rem;
          text-transform: uppercase;
          cursor: pointer;
          transition: 0.3s;
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 4px;
          min-height: 44px; /* alto táctil mínimo recomendado */
        }

        @media (min-width: 992px) {
          .nk-dashboard-nav button:not(.nk-admin-btn) {
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

        /* Los estilos de .nk-admin-btn viven en globals.css: los usan
           componentes distintos (esta página y MaintenanceToggle) y el scope
           por hash de styled-jsx dejaba al toggle sin estilos. */

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
          /* minmax(0,1fr): con 1fr a secas las columnas no pueden encogerse
             por debajo del texto ("DIRECCIONES") y el grid desborda el card
             en pantallas angostas. */
          grid-template-columns: repeat(2, minmax(0, 1fr));
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
          font-size: 1rem;
          margin: 0;
          overflow-wrap: anywhere;
        }

        @media (min-width: 480px) {
          .nk-shortcut-card h4 { font-size: 1.1rem; }
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

        .nk-return-notice {
          background: var(--nk-bg-wrapper);
          border: 2px dashed var(--nk-primary, #e11d2a);
          padding: 10px 14px;
          margin-bottom: 20px;
          font-weight: 700;
          font-size: 0.9rem;
          text-align: center;
        }

        .nk-auth-switch {
          display: block;
          width: 100%;
          margin-top: 16px;
          padding: 6px;
          background: none;
          border: none;
          color: var(--nk-primary, #e11d2a);
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.9rem;
          letter-spacing: 0.03em;
          cursor: pointer;
          text-decoration: underline;
        }

        .nk-auth-switch:hover {
          opacity: 0.8;
        }

        /* Volver al inicio: centrado bajo el switch de login/registro y
           separado con línea punteada, como botón outline del sistema manga
           (la clase global nk-btn-sec no existe; el estilo vive aquí). */
        .nk-login-footer {
          margin-top: 25px;
          padding-top: 20px;
          border-top: 2px dashed var(--nk-border);
          text-align: center;
        }

        /* :global(): styled-jsx solo escopa elementos nativos y <Link> es un
           componente — sin esto el selector .nk-home-link.jsx-* nunca
           coincide con el <a> renderizado. Se ancla en .nk-login-footer. */
        .nk-login-footer :global(.nk-home-link) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 28px;
          background: var(--nk-bg-card);
          border: 2px solid var(--nk-border);
          box-shadow: var(--nk-manga-shadow);
          color: var(--nk-text-main);
          font-family: 'Teko', sans-serif;
          font-size: 1.2rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-decoration: none;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .nk-login-footer :global(.nk-home-link .material-icons-outlined) {
          font-size: 18px;
          color: var(--nk-primary);
        }

        .nk-login-footer :global(.nk-home-link:hover) {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0px var(--nk-border);
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

        .nk-track-status {
          font-weight: 900;
          font-size: 1.15rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--nk-primary);
        }

        .nk-track-status-problem {
          color: #e74c3c;
        }

        /* Stepper horizontal de 4 etapas */
        .nk-track-stepper {
          display: flex;
          margin: 20px 0 24px;
        }

        .nk-track-step {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          gap: 6px;
        }

        /* Conector entre pasos */
        .nk-track-step::before {
          content: '';
          position: absolute;
          top: 17px;
          right: 50%;
          width: 100%;
          height: 3px;
          background: var(--nk-border, rgba(128, 128, 128, 0.35));
          z-index: 0;
        }

        .nk-track-step:first-child::before {
          display: none;
        }

        .nk-track-step.is-done::before {
          background: var(--nk-primary);
        }

        .nk-track-step-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px !important;
          background: var(--nk-bg-card);
          border: 2px solid var(--nk-border, rgba(128, 128, 128, 0.45));
          color: var(--nk-text-sec);
          position: relative;
          z-index: 1;
        }

        .nk-track-step.is-done .nk-track-step-icon {
          background: var(--nk-primary);
          border-color: var(--nk-primary);
          color: #fff;
        }

        .nk-track-step.is-current .nk-track-step-icon {
          box-shadow: 0 0 0 4px rgba(230, 57, 70, 0.25);
        }

        .nk-track-step.is-problem .nk-track-step-icon {
          background: #e74c3c;
          border-color: #e74c3c;
          box-shadow: 0 0 0 4px rgba(231, 76, 60, 0.25);
        }

        .nk-track-step-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--nk-text-sec);
          max-width: 90px;
          line-height: 1.25;
        }

        .nk-track-step.is-done .nk-track-step-label {
          color: var(--nk-text);
        }

        /* Línea de tiempo vertical de eventos */
        .nk-track-timeline {
          margin: 6px 0 0 6px;
          border-left: 2px solid var(--nk-border, rgba(128, 128, 128, 0.35));
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .nk-track-event {
          position: relative;
        }

        .nk-track-event-dot {
          position: absolute;
          left: -26px;
          top: 5px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--nk-border, rgba(128, 128, 128, 0.6));
        }

        .nk-track-event-latest .nk-track-event-dot {
          background: var(--nk-primary);
          box-shadow: 0 0 0 4px rgba(230, 57, 70, 0.2);
        }

        .nk-track-event-desc {
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .nk-track-event-latest .nk-track-event-desc {
          font-weight: 700;
        }

        .nk-track-event-meta {
          font-size: 0.78rem;
          color: var(--nk-text-sec);
          margin-top: 2px;
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
          grid-template-columns: minmax(0, 1fr);
          gap: 20px;
        }

        @media (min-width: 600px) {
          .nk-profile-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 30px;
          }
        }

        /* Emails/usuarios/guías largos no deben desbordar en móvil */
        .nk-profile-item p,
        .nk-track-code,
        .nk-order-number {
          overflow-wrap: anywhere;
        }

        .nk-order-details ul {
          padding-left: 18px;
          margin: 0 0 10px;
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
