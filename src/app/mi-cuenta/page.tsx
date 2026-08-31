'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import MaintenanceToggle from '../components/MaintenanceToggle';
import SocialLoginButtons from '../components/SocialLoginButtons';
import { openWpAdmin, seedWpSession, WP_ADMIN_URL, WP_PASSWORD_RESET_URL } from '@/lib/wp-sso';
import { apiOrigin } from '@/lib/api-host';
import { fetchProductionAccess } from '@/lib/production-api';
import { fetchWarehouseAccess } from '@/lib/warehouse-api';
import AccountProgress from './AccountProgress';
import AccountSectionNav, { type AccountSectionId } from './AccountSectionNav';
import AuthModeTabs from './AuthModeTabs';
import TrackingFeedback from './TrackingFeedback';
import QuotePaymentDialog from './QuotePaymentDialog';
import { canShowQuotePaymentActions } from '@/lib/quote-payment';
import styles from './account.module.css';

/* Estados de pedido de WooCommerce en español. GraphQL los entrega como enum
   (ON_HOLD) y REST como slug (on-hold); se canonicaliza a slug antes de mapear. */
const ORDER_STATUS_ES: Record<string, string> = {
  'pending': 'Pendiente de pago',
  'processing': 'En espera de fabricación',
  'fabricando': 'Fabricando',
  'pendiente-guia': 'Preparando envío',
  'on-hold': 'En espera',
  'completed': 'Completado',
  'cancelled': 'Cancelado',
  'refunded': 'Reembolsado',
  'failed': 'Fallido',
  'checkout-draft': 'Borrador',
};

/* Etapas del ciclo del pedido que ve el cliente (barra de progreso). El envío
   en detalle lo cubre el stepper de paquetería (TRACK_STEPS) más abajo. */
const ORDER_STEPS = [
  { key: 'processing', label: 'En espera de fabricación', icon: 'schedule' },
  { key: 'fabricando', label: 'Fabricando', icon: 'content_cut' },
  { key: 'pendiente-guia', label: 'Preparando envío', icon: 'inventory_2' },
  { key: 'completed', label: 'Enviado', icon: 'local_shipping' },
] as const;

/* Índice de etapa alcanzada; -1 para estatus fuera del ciclo (pendiente de
   pago, en espera/cotización, cancelado…), donde no se muestra la barra. */
const orderStepIndex = (status: unknown): number => {
  const slug = orderStatusSlug(status);
  switch (slug) {
    case 'processing': return 0;
    case 'fabricando': return 1;
    case 'pendiente-guia': return 2;
    case 'completed': return 3;
    default: return -1;
  }
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
  { key: 'Generated', label: 'Guía generada', icon: 'inventory_2' },
  { key: 'InfoReceived', label: 'Información recibida', icon: 'receipt_long' },
  { key: 'InTransit', label: 'En tránsito', icon: 'local_shipping' },
  { key: 'OutForDelivery', label: 'En reparto', icon: 'markunread_mailbox' },
  { key: 'Delivered', label: 'Entregado', icon: 'task_alt' },
] as const;

/** Índice del paso del stepper que corresponde al estado de 17TRACK. El paso 0
   ("Guía generada, en espera de recolección") está siempre alcanzado: la
   tarjeta solo existe cuando ya hay una guía creada en Envia. */
const trackStepIndex = (status: string): number => {
  switch (status) {
    case 'InfoReceived': return 1;
    case 'InTransit':
    case 'Expired':
    case 'Exception': return 2;
    case 'OutForDelivery':
    case 'AvailableForPickup':
    case 'DeliveryFailure': return 3;
    case 'Delivered': return 4;
    default: return 0; // NotFound / sin datos aún: guía generada, esperando recolección
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
  const { addQuoteToCart, isQuoteInCart } = useCart();
  const { formatPrice, currencyInfo } = useCurrency();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<AccountSectionId>('dashboard');
  const [userCredentials, setUserCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  // Aviso informativo (no es un fallo): hoy solo el de "completa tu registro"
  // al volver de Google/Facebook con un correo que aún no tiene cuenta.
  const [notice, setNotice] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  // Alterna el formulario desconectado entre iniciar sesión y crear cuenta.
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [registerData, setRegisterData] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const router = useRouter();

  const selectedQuote = user?.orders?.nodes.find(
    order => order.id === selectedQuoteId && canShowQuotePaymentActions(order),
  ) || null;
  const closeQuotePaymentDialog = React.useCallback(() => setSelectedQuoteId(null), []);

  // ?return=/cart/ — el gate de compra manda aquí a autenticarse y al terminar
  // se regresa a esa ruta. Se lee de window.location (useSearchParams exigiría
  // un límite de Suspense en el export estático) y solo se aceptan rutas internas.
  const [returnTo, setReturnTo] = useState<string | null>(null);
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('return');
    if (r && r.startsWith('/') && !r.startsWith('//')) {
      // This state intentionally consumes a browser-only URL after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReturnTo(r);
    }
  }, []);

  useEffect(() => {
    if (user && returnTo) {
      router.replace(returnTo);
    }
  }, [user, returnTo, router]);

  // Vueltas del login social. Dos casos, ambos limpian la URL al terminar:
  //
  //  ?social_error=1   el bridge no pudo emitir el token (sesión perdida o
  //                    plugin JWT inactivo).
  //  ?social_signup=1  el correo de Google/Facebook no tiene cuenta todavía.
  //                    El plugin cancela el alta automática y manda aquí con
  //                    los datos del proveedor para terminar el registro.
  /* eslint-disable react-hooks/set-state-in-effect -- OAuth parameters initialize the client-only auth form after hydration. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hadError = params.get('social_error') === '1';
    const needsSignup = params.get('social_signup') === '1';
    if (!hadError && !needsSignup) return;

    if (hadError) {
      setError('No se pudo completar el inicio de sesión con Google o Facebook. Inténtalo de nuevo o usa tu correo y contraseña.');
    } else {
      const socialFirstName = params.get('first_name');
      const socialLastName = params.get('last_name');
      const socialEmail = params.get('email');
      setAuthMode('register');
      setRegisterData(prev => ({
        ...prev,
        firstName: socialFirstName || prev.firstName,
        lastName: socialLastName || prev.lastName,
        email: socialEmail || prev.email,
      }));
      setNotice('Aún no tienes cuenta con ese correo. Completa tus datos y elige una contraseña para crearla.');
    }

    ['social_error', 'social_signup', 'first_name', 'last_name', 'email', 'nsl-notice'].forEach(k => params.delete(k));
    const qs = params.toString();
    history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  
  // Tracking state - indexed by tracking code to avoid conflicts
  const [trackingLoading, setTrackingLoading] = useState<Record<string, number>>({});
  const [trackingResults, setTrackingResults] = useState<Record<string, TrackTimeline>>({});
  const [trackingErrors, setTrackingErrors] = useState<Record<string, string>>({});

  // ¿El usuario tiene permiso para el Panel de Producción? (admin o capability
  // access_production_dashboard). Decide si se muestra el botón de acceso.
  const [productionAccess, setProductionAccess] = useState({ userId: '', can: false });
  const canProduction = Boolean(user && productionAccess.userId === user.id && productionAccess.can);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const userId = user.id;
    fetchProductionAccess().then(access => {
      if (alive) setProductionAccess({ userId, can: access.can });
    });
    return () => { alive = false; };
  }, [user]);

  // ¿El usuario tiene permiso para el Panel de Almacén? (capability
  // access_warehouse). Decide si se muestra el botón de acceso.
  const [warehouseAccess, setWarehouseAccess] = useState({ userId: '', can: false });
  const canWarehouse = Boolean(user && warehouseAccess.userId === user.id && warehouseAccess.can);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const userId = user.id;
    fetchWarehouseAccess().then(can => {
      if (alive) setWarehouseAccess({ userId, can });
    });
    return () => { alive = false; };
  }, [user]);

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
    setNotice('');
    setAuthMode(mode);
  };

  const activateAccountTab = (tab: AccountSectionId) => {
    setActiveTab(tab);
    document.getElementById(`account-tab-${tab}`)?.focus();
  };


  const fetchTracking = async (code: string, carrier: string) => {
    if (!code) return;
    setTrackingLoading(prev => ({ ...prev, [code]: (prev[code] || 0) + 1 }));
    setTrackingErrors(prev => ({ ...prev, [code]: '' }));
    try {
      // nkcb: LiteSpeed cachea las respuestas de ?rest_route= y serviría un
      // estado de rastreo viejo. El servidor tiene su propio caché (transient).
      const res = await fetch(`${apiOrigin()}/?rest_route=/nakama/v1/track-timeline&tracking=${encodeURIComponent(code)}&carrier=${encodeURIComponent(carrier.toLowerCase())}&nkcb=${Date.now()}`);
      if (res.ok) {
        const data: TrackTimeline = await res.json();
        if (data && data.status) {
          setTrackingResults(prev => ({ ...prev, [code]: data }));
        } else {
          setTrackingErrors(prev => ({
            ...prev,
            [code]: 'No pudimos interpretar la respuesta de la paquetería. Intenta de nuevo.',
          }));
        }
      } else {
        setTrackingErrors(prev => ({
          ...prev,
          [code]: 'No pudimos consultar la paquetería. Conservamos el último estado disponible.',
        }));
      }
    } catch {
      console.error('Error fetching tracking timeline.');
      setTrackingErrors(prev => ({
        ...prev,
        [code]: 'No hay conexión con la paquetería. Conservamos el último estado disponible.',
      }));
    } finally {
      setTrackingLoading(prev => ({ ...prev, [code]: Math.max(0, (prev[code] || 1) - 1) }));
    }
  };

  // Auto-carga del seguimiento al abrir el tab (el transient del servidor hace
  // baratas las consultas repetidas). Escalonado para no rebasar el límite de
  // peticiones del proxy cuando hay varios envíos.
  useEffect(() => {
    if (activeTab !== 'tracking' || !user?.orders?.nodes) return;
    const pending = user.orders.nodes.filter(
      order => order.enviaTrackingCode
        && !trackingResults[order.enviaTrackingCode]
        && !trackingLoading[order.enviaTrackingCode]
    );
    const timers = pending.map((order, index) =>
      setTimeout(() => fetchTracking(order.enviaTrackingCode!, order.enviaCarrier || 'estafeta'), index * 400)
    );
    return () => timers.forEach(clearTimeout);
    // trackingResults/fetchTracking intencionalmente fuera de deps: solo debe
    // dispararse al entrar al tab o al cambiar los pedidos, no en cada resultado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

  if (isLoading) {
    return (
      <>
        <div className="nk-account-loading" role="status" aria-live="polite">
          <div className="nk-spinner" aria-hidden="true" />
          <p>{t('store.loading')}</p>
        </div>
        <style jsx>{`
          .nk-account-loading {
            min-height: 60vh;
            padding: calc(var(--header-padding) + 32px) 16px 48px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            background: var(--nk-bg-body);
            color: var(--nk-text-main);
            text-align: center;
          }

          .nk-account-loading p {
            font-family: 'Teko', sans-serif;
            font-size: 1.5rem;
            font-weight: 700;
            text-transform: uppercase;
          }

          @media (prefers-reduced-motion: reduce) {
            .nk-account-loading :global(.nk-spinner) { animation: none; }
          }
        `}</style>
      </>
    );
  }

  return (
    <div className={`${styles.accountPage} nk-account-page`}>
      <div className="nk-container">
        <div className="nk-account-card nk-manga-border">
          {user ? (
            <div className="nk-user-dashboard">
              <div className="nk-dashboard-grid">
                {/* Sidebar Navigation */}
                <aside className="nk-dashboard-sidebar">
                  <div className="nk-sidebar-header">
                    <div className="nk-user-avatar">
                      <span className="material-icons-outlined" aria-hidden="true">person</span>
                    </div>
                    <div className="nk-user-meta">
                      <h3>{user.firstName || user.username}</h3>
                      <p>{user.email}</p>
                    </div>
                    <button type="button" onClick={logout} className="nk-logout-btn">
                      <span className="material-icons-outlined" aria-hidden="true">logout</span>
                      <span>Cerrar sesión</span>
                    </button>
                  </div>

                  <AccountSectionNav
                    activeTab={activeTab}
                    hasCommissions={Boolean(user.comisiones)}
                    onTabChange={setActiveTab}
                  />

                  {(canProduction || canWarehouse || isAdmin) && (
                    <section className="nk-work-access" aria-labelledby="work-access-title">
                      <h4 id="work-access-title">Accesos de trabajo</h4>
                      <ul>
                        {canProduction && (
                          <li>
                            <Link href="/produccion/" className="nk-work-link">
                              <span className="material-icons-outlined" aria-hidden="true">precision_manufacturing</span>
                              Panel de Producción
                            </Link>
                          </li>
                        )}
                        {canWarehouse && (
                          <li>
                            <Link href="/almacen/" className="nk-work-link">
                              <span className="material-icons-outlined" aria-hidden="true">inventory_2</span>
                              Panel de Almacén
                            </Link>
                          </li>
                        )}
                        {isAdmin && (
                          <>
                            <li>
                              <a
                                href={WP_ADMIN_URL}
                                onClick={(event) => { event.preventDefault(); openWpAdmin(); }}
                                className="nk-work-link nk-work-link-admin"
                                aria-label="Escritorio WordPress (se abre en una nueva ventana)"
                              >
                                <span className="material-icons-outlined" aria-hidden="true">dashboard</span>
                                Escritorio WordPress
                              </a>
                            </li>
                            <li className="nk-maintenance-control">
                              <MaintenanceToggle />
                            </li>
                          </>
                        )}
                      </ul>
                    </section>
                  )}
                </aside>

                {/* Main Content Area */}
                <main className="nk-dashboard-content">
                  <section
                    id="account-panel-dashboard"
                    role="tabpanel"
                    aria-labelledby="account-tab-dashboard"
                    tabIndex={activeTab === 'dashboard' ? 0 : undefined}
                    hidden={activeTab !== 'dashboard'}
                    className="nk-account-panel"
                  >
                    <div className="nk-tab-pane nk-dash-animate">
                      <div className="nk-account-welcome">
                        <span className="nk-account-eyebrow">Tu espacio Nakama</span>
                        <h2 className="nk-section-title">Hola, {user.firstName || user.username}</h2>
                        <p className="nk-tab-intro">
                          Revisa tus pedidos, sigue tus envíos y consulta los datos de tu cuenta desde un solo lugar.
                        </p>
                      </div>

                      <div className="nk-account-overview" role="group" aria-label="Resumen de tu cuenta">
                        <div className="nk-overview-item">
                          <span className="material-icons-outlined" aria-hidden="true">shopping_bag</span>
                          <strong>{user.orders?.nodes.length || 0}</strong>
                          <span>Pedidos</span>
                        </div>
                        <div className="nk-overview-item">
                          <span className="material-icons-outlined" aria-hidden="true">local_shipping</span>
                          <strong>{user.orders?.nodes.filter((order) => order.enviaTrackingCode).length || 0}</strong>
                          <span>Envíos con guía</span>
                        </div>
                        <div className="nk-overview-item">
                          <span className="material-icons-outlined" aria-hidden="true">verified_user</span>
                          <strong>Activa</strong>
                          <span>Sesión protegida</span>
                        </div>
                      </div>
                      
                      <div className="nk-dash-shortcuts">
                        <button type="button" className="nk-manga-border nk-shortcut-card" onClick={() => activateAccountTab('orders')}>
                           <span className="material-icons-outlined" aria-hidden="true">receipt_long</span>
                           <span>Pedidos</span>
                        </button>
                        <button type="button" className="nk-manga-border nk-shortcut-card" onClick={() => activateAccountTab('tracking')}>
                           <span className="material-icons-outlined" aria-hidden="true">local_shipping</span>
                           <span>Rastreo</span>
                        </button>
                        <button type="button" className="nk-manga-border nk-shortcut-card" onClick={() => activateAccountTab('addresses')}>
                           <span className="material-icons-outlined" aria-hidden="true">home</span>
                           <span>Dirección</span>
                        </button>
                        <button type="button" className="nk-manga-border nk-shortcut-card" onClick={() => activateAccountTab('profile')}>
                           <span className="material-icons-outlined" aria-hidden="true">settings</span>
                           <span>Cuenta</span>
                        </button>
                      </div>
                    </div>
                  </section>

                  <section
                    id="account-panel-orders"
                    role="tabpanel"
                    aria-labelledby="account-tab-orders"
                    tabIndex={activeTab === 'orders' ? 0 : undefined}
                    hidden={activeTab !== 'orders'}
                    className="nk-account-panel"
                  >
                    <div className="nk-tab-pane nk-dash-animate">
                      <h2 className="nk-section-title">Historial de Botín</h2>
                      {user.orders && user.orders.nodes.length > 0 ? (
                        <div className="nk-orders-list">
                          {user.orders.nodes.map((order) => (
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

                              {/* Barra de progreso del ciclo del pedido. Solo para
                                  estatus del flujo (pago→fabricación→envío); los
                                  demás (pendiente de pago, cotización, cancelado)
                                  se quedan con el badge de arriba. */}
                              {orderStepIndex(order.status) >= 0 && (
                                <AccountProgress
                                  steps={ORDER_STEPS}
                                  currentIndex={orderStepIndex(order.status)}
                                  label={`Progreso del pedido ${order.orderNumber}`}
                                />
                              )}

                              <div className="nk-order-details">
                                <ul>
                                  {order.lineItems?.nodes.map((item, index) => (
                                    <li key={index}>
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

                              {/* La decisión server-side distingue una solicitud de
                                  cotización original de un pedido ordinario pendiente
                                  (p. ej. transferencia) o de uno ya convertido/pagado. */}
                              {canShowQuotePaymentActions(order) && (
                                <div className="nk-order-payment">
                                  <p className="nk-order-payment-copy">
                                    Tu cotización ya tiene precio. Elige cómo quieres completar el pago.
                                  </p>
                                  <button
                                    className="nk-btn nk-order-payment-action"
                                    type="button"
                                    aria-haspopup="dialog"
                                    onClick={() => setSelectedQuoteId(order.id)}
                                  >
                                    <span className="material-icons-outlined" aria-hidden="true">payments</span>
                                    PAGAR COTIZACIÓN
                                  </button>
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
                  </section>

                  <section
                    id="account-panel-tracking"
                    role="tabpanel"
                    aria-labelledby="account-tab-tracking"
                    tabIndex={activeTab === 'tracking' ? 0 : undefined}
                    hidden={activeTab !== 'tracking'}
                    className="nk-account-panel"
                  >
                    <div className="nk-tab-pane nk-dash-animate">
                      <h2 className="nk-section-title">Rastreo de Botín</h2>
                      
                      {user.orders && user.orders.nodes.some((order) => order.enviaTrackingCode) ? (
                        <div className="nk-tracking-list">
                          {user.orders.nodes.filter((order) => order.enviaTrackingCode).map((order) => {
                            const code = order.enviaTrackingCode!;
                            const res: TrackTimeline | undefined = trackingResults[code];
                            const stepIndex = res ? trackStepIndex(res.status) : -1;
                            const hasProblem = res ? isTrackProblem(res.status) : false;
                            const trackingSteps = TRACK_STEPS.map((step, index) => ({
                              ...step,
                              label: res?.status === 'AvailableForPickup' && index === 3
                                ? 'Listo para recoger'
                                : step.label,
                            }));
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
                                      className="nk-btn nk-tracking-refresh"
                                      onClick={() => fetchTracking(code, order.enviaCarrier || 'estafeta')}
                                      disabled={Boolean(trackingLoading[code])}
                                      aria-busy={Boolean(trackingLoading[code])}
                                    >
                                      {trackingLoading[code] ? 'Actualizando…' : res ? 'Actualizar estado' : 'Ver estado'}
                                    </button>
                                  </div>

                                  <TrackingFeedback
                                    error={trackingErrors[code] || ''}
                                    loading={Boolean(trackingLoading[code])}
                                    onRetry={() => fetchTracking(code, order.enviaCarrier || 'estafeta')}
                                  >
                                  {res && (
                                    <div className="nk-tracking-details nk-dash-animate">
                                      <p className={`nk-track-status ${hasProblem ? 'nk-track-status-problem' : ''}`} role="status">
                                        {res.status_es || 'En camino'}
                                      </p>

                                      <AccountProgress
                                        steps={trackingSteps}
                                        currentIndex={stepIndex}
                                        label={`Estado del envío ${order.orderNumber}`}
                                        hasProblem={hasProblem}
                                      />

                                      {/* Línea de tiempo de eventos (más reciente primero) */}
                                      {res.events && res.events.length > 0 ? (
                                        <ol className="nk-track-timeline" aria-label="Eventos del envío">
                                          {res.events.map((ev, i) => (
                                            <li key={`${code}-ev-${i}`} className={`nk-track-event${i === 0 ? ' nk-track-event-latest' : ''}`}>
                                              <span className="nk-track-event-dot" aria-hidden="true" />
                                              <div>
                                                <p className="nk-track-event-desc">{ev.description || ev.status}</p>
                                                {(ev.time || ev.location) && (
                                                  <p className="nk-track-event-meta">
                                                    {[formatEventTime(ev.time), ev.location].filter(Boolean).join(' · ')}
                                                  </p>
                                                )}
                                              </div>
                                            </li>
                                          ))}
                                        </ol>
                                      ) : (
                                        <p className="nk-track-desc">La paquetería aún no reporta movimientos. Intenta más tarde.</p>
                                      )}
                                      <div className="nk-official-tracking">
                                        <a 
                                          href={
                                            order.enviaCarrier?.toLowerCase().includes('estafeta') ? `https://www.estafeta.com/Herramientas/Rastreo?waybill=${code}` :
                                            order.enviaCarrier?.toLowerCase().includes('dhl') ? `https://www.dhl.com/mx-es/home/rastreo.html?tracking-id=${code}` :
                                            order.enviaCarrier?.toLowerCase().includes('fedex') ? `https://www.fedex.com/fedextrack/?trknbr=${code}` :
                                            `https://envia.com/rastreo?tracking_number=${code}`
                                          } 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="nk-account-secondary-action nk-official-tracking-link"
                                          aria-label="Ver rastreo en el sitio oficial (se abre en una nueva pestaña)"
                                        >
                                          Ver en sitio oficial <span className="material-icons-outlined" aria-hidden="true">open_in_new</span>
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                  </TrackingFeedback>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="nk-tracking-empty">
                          <span className="material-icons-outlined" aria-hidden="true">local_shipping</span>
                          <h3>Aún sin guía</h3>
                          <p>Tus pedidos aún están en el astillero. Te avisaremos cuando zarpen.</p>
                          <button type="button" className="nk-account-secondary-action" onClick={() => activateAccountTab('orders')}>
                            Ver mis pedidos
                          </button>
                        </div>
                      )}
                    </div>
                  </section>

                  {Boolean(user.comisiones) && (
                  <section
                    id="account-panel-commissions"
                    role="tabpanel"
                    aria-labelledby="account-tab-commissions"
                    tabIndex={activeTab === 'commissions' ? 0 : undefined}
                    hidden={activeTab !== 'commissions'}
                    className="nk-account-panel"
                  >
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
                  </section>
                  )}

                  <section
                    id="account-panel-addresses"
                    role="tabpanel"
                    aria-labelledby="account-tab-addresses"
                    tabIndex={activeTab === 'addresses' ? 0 : undefined}
                    hidden={activeTab !== 'addresses'}
                    className="nk-account-panel"
                  >
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
                        <p className="nk-readonly-note">
                          <span className="material-icons-outlined" aria-hidden="true">lock</span>
                          Tus datos se muestran en modo de solo lectura.
                        </p>
                      </div>
                    </div>
                  </section>

                  <section
                    id="account-panel-profile"
                    role="tabpanel"
                    aria-labelledby="account-tab-profile"
                    tabIndex={activeTab === 'profile' ? 0 : undefined}
                    hidden={activeTab !== 'profile'}
                    className="nk-account-panel"
                  >
                    <div className="nk-tab-pane nk-dash-animate">
                      <h2 className="nk-section-title">Detalles de la Cuenta</h2>
                      <div className="nk-info-box nk-manga-border">
                        <dl className="nk-profile-grid">
                          <div className="nk-profile-item">
                            <dt>Nombre Completo</dt>
                            <dd>{user.firstName} {user.lastName || ''}</dd>
                          </div>
                          <div className="nk-profile-item">
                            <dt>Email</dt>
                            <dd>{user.email}</dd>
                          </div>
                          <div className="nk-profile-item">
                            <dt>Usuario</dt>
                            <dd>{user.username}</dd>
                          </div>
                          <div className="nk-profile-item">
                            <dt>Rol</dt>
                            <dd className="nk-role-tag">{user.role?.toUpperCase() || 'NAKAMA'}</dd>
                          </div>
                        </dl>
                        <p className="nk-readonly-note">
                          <span className="material-icons-outlined" aria-hidden="true">lock</span>
                          Tus datos se muestran en modo de solo lectura.
                        </p>
                      </div>
                    </div>
                  </section>
                </main>
              </div>
            </div>
          ) : (
            <div className="nk-login-shell">
              <section className="nk-login-story" aria-labelledby="account-story-title">
                <div className="nk-login-story-brand">
                  <Image src="https://nakamabordados.com/wp-content/uploads/2025/11/LOGO-NAKAMA-scaled-2048x926.png" alt="Nakama" width={180} height={82} className="nk-logo-img" />
                  <span>Mi cuenta</span>
                </div>
                <div>
                  <span className="nk-account-eyebrow">Todo en un solo lugar</span>
                  <h1 id="account-story-title">Tu cuenta,<br />sin complicaciones.</h1>
                  <p>Consulta el avance de tus bordados, organiza tus compras y retoma tus pedidos cuando quieras.</p>
                </div>
                <ul className="nk-login-benefits" aria-label="Beneficios de tu cuenta">
                  <li><span className="material-icons-outlined" aria-hidden="true">local_shipping</span> Rastreo claro de cada envío</li>
                  <li><span className="material-icons-outlined" aria-hidden="true">receipt_long</span> Pedidos y cotizaciones reunidos</li>
                  <li><span className="material-icons-outlined" aria-hidden="true">lock</span> Acceso seguro a tus datos</li>
                </ul>
              </section>

              <section className="nk-login-form-wrapper" aria-label="Acceso a tu cuenta">
                <div className="nk-login-header">
                  <span className="nk-login-mobile-mark" aria-hidden="true">N</span>
                  <span className="nk-account-eyebrow">Bienvenido de nuevo</span>
                  <h2 className="nk-section-title">
                    {authMode === 'login' ? t('account.login.title') : t('account.register.title')}
                  </h2>
                  <p>{authMode === 'login' ? 'Ingresa para continuar donde te quedaste.' : 'Crea tu cuenta y mantén todo organizado.'}</p>
                </div>

              <AuthModeTabs mode={authMode} onChange={switchAuthMode} />

              {returnTo && (
                <p className="nk-return-notice" role="status">
                  Inicia sesión o crea tu cuenta para completar tu compra. Al crear tu cuenta obtienes descuentos y beneficios exclusivos, y al terminar te regresamos a donde estabas.
                </p>
              )}

              {notice && <p className="nk-social-notice" role="status">{notice}</p>}

              <div
                id="auth-panel-login"
                role="tabpanel"
                aria-labelledby="auth-tab-login"
                tabIndex={authMode === 'login' ? 0 : undefined}
                hidden={authMode !== 'login'}
              >
                  <form onSubmit={handleLogin} className="nk-login-form">
                    <div className="nk-form-group">
                      <label htmlFor="account-login-username">{t('account.login.user')}</label>
                      {/* autoCapitalize/autoCorrect off: los teclados móviles capitalizan
                          la primera letra o autocorrigen el usuario y el login falla. */}
                      <input
                        id="account-login-username"
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
                        aria-describedby={error && authMode === 'login' ? 'account-login-error' : undefined}
                      />
                    </div>
                    <div className="nk-form-group">
                      <label htmlFor="account-login-password">{t('account.login.pass')}</label>
                      <input
                        id="account-login-password"
                        type="password"
                        name="password"
                        value={userCredentials.password}
                        onChange={handleInputChange}
                        required
                        className="nk-manga-input"
                        autoComplete="current-password"
                        aria-describedby={error && authMode === 'login' ? 'account-login-error' : undefined}
                      />
                    </div>

                    {error && authMode === 'login' && <p id="account-login-error" className="nk-error-msg" role="alert">{error}</p>}

                    <button type="submit" disabled={isLoggingIn} aria-busy={isLoggingIn} className="nk-btn nk-btn-block">
                      {isLoggingIn ? 'Iniciando sesión…' : t('account.login.btn')}
                    </button>
                    <a href={WP_PASSWORD_RESET_URL} className="nk-password-reset-link">
                      <span className="material-icons-outlined" aria-hidden="true">lock_reset</span>
                      {t('account.login.reset')}
                    </a>
                  </form>
              </div>

              <div
                id="auth-panel-register"
                role="tabpanel"
                aria-labelledby="auth-tab-register"
                tabIndex={authMode === 'register' ? 0 : undefined}
                hidden={authMode !== 'register'}
              >
                  <form onSubmit={handleRegister} className="nk-login-form">
                    <div className="nk-form-group">
                      <label htmlFor="account-register-first-name">{t('account.register.first')}</label>
                      <input
                        id="account-register-first-name"
                        type="text"
                        name="firstName"
                        value={registerData.firstName}
                        onChange={handleRegisterChange}
                        required
                        className="nk-manga-input"
                        autoComplete="given-name"
                        aria-describedby={error && authMode === 'register' ? 'account-register-error' : undefined}
                      />
                    </div>
                    <div className="nk-form-group">
                      <label htmlFor="account-register-last-name">{t('account.register.last')}</label>
                      <input
                        id="account-register-last-name"
                        type="text"
                        name="lastName"
                        value={registerData.lastName}
                        onChange={handleRegisterChange}
                        className="nk-manga-input"
                        autoComplete="family-name"
                        aria-describedby={error && authMode === 'register' ? 'account-register-error' : undefined}
                      />
                    </div>
                    <div className="nk-form-group">
                      <label htmlFor="account-register-email">{t('account.register.email')}</label>
                      <input
                        id="account-register-email"
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
                        aria-describedby={error && authMode === 'register' ? 'account-register-error' : undefined}
                      />
                    </div>
                    <div className="nk-form-group">
                      <label htmlFor="account-register-phone">{t('account.register.phone')}</label>
                      <input
                        id="account-register-phone"
                        type="tel"
                        name="phone"
                        value={registerData.phone}
                        onChange={handleRegisterChange}
                        className="nk-manga-input"
                        autoComplete="tel"
                        aria-describedby={error && authMode === 'register' ? 'account-register-error' : undefined}
                      />
                    </div>
                    <div className="nk-form-group">
                      <label htmlFor="account-register-password">{t('account.register.pass')}</label>
                      <input
                        id="account-register-password"
                        type="password"
                        name="password"
                        value={registerData.password}
                        onChange={handleRegisterChange}
                        required
                        minLength={6}
                        className="nk-manga-input"
                        autoComplete="new-password"
                        aria-describedby={error && authMode === 'register' ? 'account-register-error' : undefined}
                      />
                    </div>

                    {error && authMode === 'register' && <p id="account-register-error" className="nk-error-msg" role="alert">{error}</p>}

                    <button type="submit" disabled={isRegistering} aria-busy={isRegistering} className="nk-btn nk-btn-block">
                      {isRegistering ? 'Creando cuenta…' : t('account.register.btn')}
                    </button>
                  </form>
              </div>

              {/* Aplica a iniciar sesión y a crear cuenta: Nextend vincula por
                  correo, así que el mismo botón sirve para ambos casos. */}
              <SocialLoginButtons
                backPath={returnTo ? `/mi-cuenta/?return=${encodeURIComponent(returnTo)}` : '/mi-cuenta/'}
              />

                <div className="nk-login-footer">
                  <Link href="/" className="nk-home-link">
                    <span className="material-icons-outlined" aria-hidden="true">arrow_back</span>
                    {t('nav.home')}
                  </Link>
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="nk-login-protocol">NAKAMA SECURITY PROTOCOL // GRAND LINE</div>

        {selectedQuote && (
          <QuotePaymentDialog
            folio={String(selectedQuote.orderNumber)}
            total={parseFloat(String(selectedQuote.total || '0').replace(/[^0-9.-]/g, '')) || 0}
            currency={selectedQuote.currency || 'MXN'}
            isInCart={isQuoteInCart(selectedQuote.databaseId!)}
            onClose={closeQuotePaymentDialog}
            onPayNow={async () => {
              // pay-quote usa el checkout normal (envío, paquetería y cupones),
              // pero necesita primero la cookie de sesión de WordPress.
              const seeded = await seedWpSession();
              if (!seeded) throw new Error('No se pudo sembrar la sesión de WordPress.');
              window.location.href = `https://nakamabordados.com/index.php?nk_bridge=pay-quote&order=${selectedQuote.databaseId}&key=${selectedQuote.orderKey}&currency=${currencyInfo.currency}`;
            }}
            onAddToCart={() => addQuoteToCart({
              orderId: selectedQuote.databaseId!,
              orderKey: selectedQuote.orderKey!,
              folio: String(selectedQuote.orderNumber),
              totalMXN: parseFloat(String(selectedQuote.total || '0').replace(/[^0-9.-]/g, '')) || 0,
            })}
          />
        )}
      </div>

      <style jsx>{`
        .nk-account-page {
          /* El navbar es fixed: hay que despejar --header-padding (80px).
             El 60px fijo anterior metía la tarjeta bajo el header en móvil,
             y el centrado vertical (align-items:center con 90vh) la subía
             aún más en pantallas cortas; en móvil se alinea arriba. */
          padding: calc(var(--header-padding) + 16px) 12px 48px;
          background: var(--nk-bg-body);
          min-height: 90vh;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          font-size: 1rem;
        }

        .nk-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }

        .nk-account-card {
          background: var(--nk-bg-card);
          padding: 12px;
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
          gap: 24px;
        }

        @media (min-width: 375px) {
          .nk-account-page { padding-inline: 16px; }
          .nk-account-card { padding: 16px; }
        }

        @media (min-width: 768px) and (max-width: 991px) {
          .nk-account-card { padding: 24px; }
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
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding: 4px 0 16px;
          border-bottom: 3px dashed var(--nk-primary);
        }

        .nk-user-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 3px solid var(--nk-border);
          background: var(--nk-bg-wrapper);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nk-user-avatar span { font-size: 1.75rem; }
        .nk-user-meta { min-width: 0; }

        .nk-user-meta h3 {
          margin: 0;
          font-family: 'Teko', sans-serif;
          font-size: 1.35rem;
          line-height: 1;
          overflow-wrap: anywhere;
        }

        .nk-user-meta p {
          margin-top: 3px;
          color: var(--nk-text-sec);
          font-size: 0.875rem;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }

        .nk-logout-btn {
          min-width: 44px;
          min-height: 44px;
          padding: 6px 10px;
          border: 2px solid var(--nk-danger);
          background: transparent;
          color: var(--nk-danger);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 1rem;
          font-weight: 800;
          cursor: pointer;
        }

        .nk-logout-btn > span:last-child { display: none; }

        .nk-work-access {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 2px solid var(--nk-border);
        }

        .nk-work-access h4 {
          margin: 0 0 10px;
          color: var(--nk-primary);
          font-size: 1.15rem;
          letter-spacing: 0.04em;
        }

        .nk-work-access ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 8px;
        }

        .nk-work-access :global(.nk-work-link) {
          min-height: 44px;
          padding: 8px 12px;
          border: 2px solid var(--nk-border);
          background: var(--nk-bg-wrapper);
          color: var(--nk-text-main);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
          font-weight: 800;
          line-height: 1.25;
          text-decoration: none;
        }

        .nk-work-access :global(.nk-work-link:hover) {
          border-color: var(--nk-primary);
          color: var(--nk-primary);
        }

        .nk-work-access :global(.nk-work-link-admin) { border-color: var(--nk-primary); }

        .nk-maintenance-control :global(.nk-admin-btn) {
          min-height: 44px;
          width: 100%;
        }

        @media (min-width: 600px) and (max-width: 991px) {
          .nk-work-access ul { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (min-width: 992px) {
          .nk-sidebar-header {
            grid-template-columns: minmax(0, 1fr);
            justify-items: center;
            text-align: center;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom-color: var(--nk-border);
          }

          .nk-user-avatar { width: 70px; height: 70px; }
          .nk-user-avatar span { font-size: 2.5rem; }
          .nk-logout-btn { width: 100%; }
          .nk-logout-btn > span:last-child { display: inline; }
          .nk-work-access ul { display: flex; flex-direction: column; }
        }

        /* Content Area */
        .nk-dashboard-content {
          width: 100%;
          min-width: 0; /* Prevents grid overflow */
          border-left: 3px dashed var(--nk-primary);
          padding-left: 12px;
        }

        .nk-account-panel:focus-visible {
          outline: 3px solid var(--nk-primary);
          outline-offset: 4px;
        }

        .nk-tab-intro {
          line-height: 1.6;
          margin-bottom: 25px;
          opacity: 0.8;
        }

        .nk-dash-shortcuts {
          display: none;
        }

        @media (min-width: 992px) {
          .nk-dash-shortcuts {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 20px;
          }
        }

        .nk-shortcut-card {
          min-height: 88px;
          padding: 14px 8px;
          text-align: center;
          cursor: pointer;
          background: var(--nk-bg-wrapper);
          color: var(--nk-text-main);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
        }

        .nk-shortcut-card > .material-icons-outlined {
          font-size: 2rem;
          color: var(--nk-primary);
        }

        .nk-shortcut-card > span:last-child {
          font-family: 'Teko', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          line-height: 1;
          text-transform: uppercase;
          margin: 0;
          overflow-wrap: anywhere;
        }

        .nk-shortcut-card:hover {
          border-color: var(--nk-primary);
          color: var(--nk-primary);
        }

        @media (min-width: 480px) {
          .nk-shortcut-card > span:last-child { font-size: 1.1rem; }
        }

        /* Forms */
        .nk-login-form-wrapper {
          max-width: 450px;
          width: 100%;
          margin: 0 auto;
        }

        .nk-login-header {
          text-align: center;
        }

        .nk-login-header :global(.nk-logo-img) {
          width: 150px;
          height: 70px;
          object-fit: contain;
        }


        .nk-form-group {
          margin-bottom: 20px;
        }

        .nk-form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.875rem;
        }

        .nk-manga-input {
          width: 100%;
          padding: 12px;
          border: 2px solid var(--nk-border);
          background: var(--nk-bg-body);
          color: var(--nk-text-main);
          font-size: 1rem;
          min-height: 48px;
          border-radius: 0;
        }

        .nk-btn-block {
          width: 100%;
          padding: 15px;
          font-size: 1.4rem;
          min-height: 48px;
        }

        .nk-password-reset-link {
          width: 100%;
          min-height: 44px;
          margin-top: 12px;
          padding: 10px 16px;
          box-sizing: border-box;
          border: 2px solid var(--nk-border);
          background: var(--nk-bg-card);
          color: var(--nk-text-main);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: 'Teko', sans-serif;
          font-size: 1.15rem;
          font-weight: 700;
          line-height: 1.2;
          text-transform: uppercase;
          text-decoration: none;
          transition: border-color 160ms ease, color 160ms ease, background-color 160ms ease;
        }

        .nk-password-reset-link .material-icons-outlined {
          color: var(--nk-primary);
          font-size: 20px;
        }

        .nk-password-reset-link:hover {
          border-color: var(--nk-primary);
          background: var(--nk-bg-wrapper);
          color: var(--nk-primary);
        }

        .nk-error-msg {
          margin: 0 0 16px;
          padding: 12px;
          border: 2px solid var(--nk-danger);
          color: var(--nk-text-main);
          background: var(--nk-bg-wrapper);
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.5;
        }

        .nk-return-notice {
          background: var(--nk-bg-wrapper);
          border: 2px dashed var(--nk-primary, #e11d2a);
          padding: 10px 14px;
          margin-bottom: 20px;
          font-weight: 700;
          font-size: 1rem;
          text-align: center;
        }

        /* Informativo, no un error: el borde sólido lo distingue del aviso de
           compra pendiente (punteado) y del mensaje de error (rojo). */
        .nk-social-notice {
          background: var(--nk-bg-wrapper);
          border-left: 4px solid var(--nk-primary, #e11d2a);
          padding: 10px 14px;
          margin-bottom: 20px;
          font-weight: 600;
          font-size: 1rem;
          line-height: 1.45;
        }

        /* Volver al inicio: acción outline separada del acceso social. */
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

        .nk-order-date,
        .nk-order-status {
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .nk-order-details,
        .nk-order-payment-copy {
          font-size: 1rem;
          line-height: 1.5;
        }

        .nk-order-details li {
          font-size: 1rem;
          line-height: 1.5;
        }

        .nk-order-payment {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 2px dashed var(--nk-border);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .nk-order-payment-copy {
          color: var(--nk-text-sec);
          font-weight: 700;
        }

        .nk-order-payment-action {
          width: 100%;
          min-height: 48px;
          padding: 10px 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 1.1rem;
          line-height: 1.1;
        }

        .nk-order-payment-action .material-icons-outlined { font-size: 18px; }

        .nk-account-secondary-action {
          min-height: 44px;
          padding: 9px 16px;
          border: 2px solid var(--nk-border);
          background: var(--nk-bg-card);
          color: var(--nk-text-main);
          font-family: 'Teko', sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          text-transform: uppercase;
          text-decoration: none;
          cursor: pointer;
        }

        .nk-account-secondary-action:hover:not(:disabled) {
          border-color: var(--nk-primary);
          color: var(--nk-primary);
        }

        .nk-account-secondary-action:disabled {
          opacity: 0.62;
          cursor: not-allowed;
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

        .nk-track-input-area > div { min-width: 0; }

        .nk-track-code,
        .nk-track-carrier,
        .nk-track-order {
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .nk-tracking-refresh {
          width: 100%;
          min-height: 48px;
          white-space: normal;
        }

        @media (min-width: 600px) {
          .nk-track-input-area {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }

          .nk-tracking-refresh { width: auto; min-width: 160px; }
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
          color: var(--nk-danger);
        }

        /* Línea de tiempo vertical de eventos */
        .nk-track-timeline {
          list-style: none;
          margin: 8px 0 0 6px;
          border-left: 3px dashed var(--nk-primary);
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
          font-size: 1rem;
          line-height: 1.5;
        }

        .nk-track-event-latest .nk-track-event-desc {
          font-weight: 700;
        }

        .nk-track-event-meta {
          font-size: 0.875rem;
          color: var(--nk-text-sec);
          margin-top: 2px;
        }

        .nk-official-tracking {
          margin-top: 20px;
        }

        .nk-official-tracking-link {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          line-height: 1.2;
        }

        .nk-official-tracking-link .material-icons-outlined { font-size: 18px; }

        .nk-empty-state,
        .nk-tracking-empty {
          min-height: 220px;
          padding: 24px 12px;
          border-left: 3px dashed var(--nk-primary);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 12px;
          text-align: left;
        }

        .nk-empty-state > .material-icons-outlined,
        .nk-tracking-empty > .material-icons-outlined {
          color: var(--nk-primary);
          font-size: 2.5rem;
        }

        .nk-empty-state p,
        .nk-tracking-empty p {
          font-size: 1rem;
          line-height: 1.55;
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
          margin: 0;
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
        .nk-profile-item dd,
        .nk-track-code,
        .nk-order-number {
          overflow-wrap: anywhere;
        }

        .nk-profile-item dt {
          margin-bottom: 5px;
          color: var(--nk-text-sec);
          font-size: 0.875rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .nk-profile-item dd {
          margin: 0;
          font-size: 1rem;
          line-height: 1.55;
        }

        .nk-order-details ul {
          padding-left: 18px;
          margin: 0 0 10px;
        }

        .nk-readonly-note {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px dashed var(--nk-border);
          color: var(--nk-text-sec);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          font-weight: 700;
          line-height: 1.5;
        }

        .nk-login-protocol {
          text-align: center;
          margin-top: 30px;
          font-size: 0.875rem;
          color: var(--nk-text-sec);
          letter-spacing: 2px;
          padding: 0 10px;
        }

        @media (min-width: 768px) {
          .nk-login-protocol {
            margin-top: 50px;
            font-size: 0.875rem;
            letter-spacing: 4px;
          }
        }

        .nk-account-page button:focus-visible,
        .nk-account-page input:focus-visible,
        .nk-account-page :global(a:focus-visible) {
          outline: 3px solid var(--nk-primary);
          outline-offset: 3px;
        }

        @media (prefers-reduced-motion: reduce) {
          .nk-account-page *,
          .nk-account-page *::before,
          .nk-account-page *::after {
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }

          .nk-dash-animate,
          .nk-login-footer :global(.nk-home-link:hover) {
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
