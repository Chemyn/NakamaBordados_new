import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MiCuentaPage from './page';

interface TestOrder {
  id: string;
  databaseId?: number;
  orderKey?: string;
  needsPayment?: boolean;
  orderNumber: string;
  status: string;
  total: string;
  currency?: string;
  date: string;
  enviaTrackingCode?: string;
  enviaCarrier?: string;
  metaData: Array<{ key: string; value: string }>;
  lineItems: { nodes: Array<{ product: { node: { name: string } }; quantity: number }> };
}

interface TestUser {
  id: string;
  databaseId: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  orders: { nodes: TestOrder[] };
  shipping: {
    address1: string;
    address2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  comisiones?: string[];
}

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as TestUser | null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    isLoading: false,
    isAdmin: false,
  },
  cart: {
    addQuoteToCart: vi.fn(),
    isQuoteInCart: vi.fn(() => false),
  },
  router: {
    replace: vi.fn(),
  },
  fetchProductionAccess: vi.fn(),
  fetchWarehouseAccess: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('../context/CartContext', () => ({ useCart: () => mocks.cart }));
vi.mock('../context/CurrencyContext', () => ({
  useCurrency: () => ({
    formatPrice: (price: number) => `$${price} MXN`,
    currencyInfo: { currency: 'MXN' },
  }),
}));
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => ({
      'account.login.title': 'Iniciar sesión',
      'account.register.title': 'Crear cuenta',
      'account.login.user': 'Usuario',
      'account.login.pass': 'Contraseña',
      'account.login.btn': 'Ingresar',
      'account.register.first': 'Nombre',
      'account.register.last': 'Apellido',
      'account.register.email': 'Correo',
      'account.register.phone': 'Teléfono',
      'account.register.pass': 'Contraseña',
      'account.register.btn': 'Crear cuenta',
      'nav.home': 'Inicio',
      'store.loading': 'Cargando',
    })[key] || key,
  }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: ComponentProps<'a'>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: ComponentProps<'img'>) => (
    // eslint-disable-next-line @next/next/no-img-element -- deterministic test double for next/image.
    <img src={String(src)} alt={alt} {...props} />
  ),
}));
vi.mock('../components/MaintenanceToggle', () => ({ default: () => <button type="button">Mantenimiento</button> }));
vi.mock('@/lib/wp-sso', () => ({
  openWpAdmin: vi.fn(),
  seedWpSession: vi.fn(),
  WP_ADMIN_URL: 'https://example.test/wp-admin',
}));
vi.mock('@/lib/api-host', () => ({ apiOrigin: () => 'https://api.example.test' }));
vi.mock('@/lib/production-api', () => ({
  fetchProductionAccess: () => mocks.fetchProductionAccess(),
}));
vi.mock('@/lib/warehouse-api', () => ({
  fetchWarehouseAccess: () => mocks.fetchWarehouseAccess(),
}));

function createUser(orders: TestOrder[] = []): TestUser {
  return {
    id: 'customer-1',
    databaseId: 1,
    username: 'luffy',
    firstName: 'Monkey D.',
    lastName: 'Luffy',
    email: 'captain@example.test',
    role: 'customer',
    orders: { nodes: orders },
    shipping: {
      address1: '',
      address2: '',
      city: '',
      state: '',
      postcode: '',
      country: '',
    },
  };
}

function createOrder(overrides: Partial<TestOrder> = {}): TestOrder {
  return {
    id: 'order-1',
    orderNumber: '1001',
    status: 'processing',
    total: '1200',
    currency: 'MXN',
    date: '2026-08-17T00:00:00Z',
    metaData: [],
    lineItems: { nodes: [] },
    ...overrides,
  };
}

function trackingResponse(code: string): Response {
  return {
    ok: true,
    json: async () => ({
      success: true,
      source: '17track',
      number: code,
      carrier_name: 'Estafeta',
      status: 'InTransit',
      sub_status: '',
      status_es: 'En tránsito',
      delivered_time: null,
      events: [],
    }),
  } as Response;
}

beforeEach(() => {
  vi.unstubAllGlobals();
  mocks.auth.user = null;
  mocks.auth.isLoading = false;
  mocks.auth.isAdmin = false;
  mocks.auth.login.mockReset();
  mocks.auth.register.mockReset();
  mocks.auth.logout.mockReset();
  mocks.auth.refreshUser.mockReset();
  mocks.cart.addQuoteToCart.mockReset();
  mocks.cart.isQuoteInCart.mockReset().mockReturnValue(false);
  mocks.router.replace.mockReset();
  mocks.fetchProductionAccess.mockReset().mockResolvedValue({ can: false });
  mocks.fetchWarehouseAccess.mockReset().mockResolvedValue(false);
  window.history.replaceState(null, '', '/mi-cuenta/');
});

describe('MiCuentaPage accessibility and account navigation', () => {
  it('keeps every account tab panel mounted and moves focus for internal navigation', () => {
    mocks.auth.user = createUser();
    render(<MiCuentaPage />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    for (const tab of tabs) {
      const panelId = tab.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;
      expect(panel).not.toBeNull();
      expect(panel).toHaveAttribute('role', 'tabpanel');
      expect(panel).toHaveAttribute('aria-labelledby', tab.id);
    }

    fireEvent.click(screen.getByRole('button', { name: 'Pedidos' }));
    const ordersTab = screen.getByRole('tab', { name: 'Pedidos' });
    expect(ordersTab).toHaveFocus();
    expect(ordersTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Rastreo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver mis pedidos' }));
    expect(ordersTab).toHaveFocus();
  });

  it('keeps both authentication tab panels mounted with valid ARIA relationships', () => {
    render(<MiCuentaPage />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    for (const tab of tabs) {
      const panelId = tab.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;
      expect(panel).not.toBeNull();
      expect(panel).toHaveAttribute('role', 'tabpanel');
      expect(panel).toHaveAttribute('aria-labelledby', tab.id);
    }

    const loginPanel = document.getElementById('auth-panel-login');
    const registerPanel = document.getElementById('auth-panel-register');
    expect(loginPanel).not.toHaveAttribute('hidden');
    expect(registerPanel).toHaveAttribute('hidden');

    fireEvent.click(screen.getByRole('tab', { name: 'Crear cuenta' }));
    expect(loginPanel).toHaveAttribute('hidden');
    expect(registerPanel).not.toHaveAttribute('hidden');
  });

  it('keeps overlapping tracking requests busy independently until each one finishes', async () => {
    let resolveFirst!: (response: Response) => void;
    let resolveSecond!: (response: Response) => void;
    const firstRequest = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    const secondRequest = new Promise<Response>((resolve) => { resolveSecond = resolve; });
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input);
      return url.includes('tracking=TRACK-A') ? firstRequest : secondRequest;
    });
    vi.stubGlobal('fetch', fetchMock);
    mocks.auth.user = createUser([
      createOrder({ id: 'order-a', orderNumber: '1001', enviaTrackingCode: 'TRACK-A', enviaCarrier: 'estafeta' }),
      createOrder({ id: 'order-b', orderNumber: '1002', enviaTrackingCode: 'TRACK-B', enviaCarrier: 'estafeta' }),
    ]);
    render(<MiCuentaPage />);

    fireEvent.click(screen.getByRole('tab', { name: 'Rastreo' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 1500 });

    const firstCard = screen.getByText('TRACK-A').closest('.nk-tracking-card');
    const secondCard = screen.getByText('TRACK-B').closest('.nk-tracking-card');
    expect(firstCard).not.toBeNull();
    expect(secondCard).not.toBeNull();
    expect(within(firstCard as HTMLElement).getByRole('button', { name: 'Actualizando…' })).toBeDisabled();
    expect(within(secondCard as HTMLElement).getByRole('button', { name: 'Actualizando…' })).toBeDisabled();

    await act(async () => { resolveFirst(trackingResponse('TRACK-A')); });

    await waitFor(() => {
      expect(within(firstCard as HTMLElement).getByRole('button', { name: 'Actualizar estado' })).toBeEnabled();
    });
    expect(within(secondCard as HTMLElement).getByRole('button', { name: 'Actualizando…' })).toBeDisabled();
    expect(within(secondCard as HTMLElement).getByRole('status')).toHaveTextContent('Actualizando rastreo');

    await act(async () => { resolveSecond(trackingResponse('TRACK-B')); });
  });

  it('distinguishes payable quotes from ordinary payable orders without changing eligibility', () => {
    mocks.auth.user = createUser([
      createOrder({
        id: 'quote-order',
        orderNumber: 'NK-2048',
        needsPayment: true,
        databaseId: 2048,
        orderKey: 'wc_order_quote',
      }),
      createOrder({
        id: 'ordinary-order',
        orderNumber: '2049',
        needsPayment: true,
        databaseId: 2049,
        orderKey: 'wc_order_ordinary',
      }),
    ]);
    render(<MiCuentaPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Pedidos' }));

    const quoteCard = screen.getByText('PEDIDO #NK-2048').closest('.nk-order-item');
    const ordinaryCard = screen.getByText('PEDIDO #2049').closest('.nk-order-item');
    expect(quoteCard).not.toBeNull();
    expect(ordinaryCard).not.toBeNull();
    expect(within(quoteCard as HTMLElement).getByText(/tu cotización ya tiene precio/i)).toBeVisible();
    expect(within(quoteCard as HTMLElement).getByRole('button', { name: /agregar al carrito/i })).toBeVisible();
    expect(within(ordinaryCard as HTMLElement).getByText(/este pedido está pendiente de pago/i)).toBeVisible();
    expect(within(ordinaryCard as HTMLElement).queryByText(/cotización|carrito/i)).not.toBeInTheDocument();
    expect(within(ordinaryCard as HTMLElement).getByRole('button', { name: /pagar ahora/i })).toBeVisible();
  });

  it('preserves return navigation and exposes one associated login error', async () => {
    window.history.replaceState(null, '', '/mi-cuenta/?return=/cart/');
    mocks.auth.login.mockResolvedValue({ success: false, error: 'Credenciales incorrectas' });
    const { rerender } = render(<MiCuentaPage />);

    expect(await screen.findByRole('status')).toHaveTextContent('completar tu compra');
    const googleLink = screen.getByRole('link', { name: 'Continuar con Google' });
    const socialBridge = new URL(new URL(googleLink.getAttribute('href') || '').searchParams.get('redirect') || '');
    expect(socialBridge.searchParams.get('back')).toBe('/mi-cuenta/?return=%2Fcart%2F');

    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: '  luffy  ' } });
    fireEvent.change(screen.getByLabelText('Contraseña', { selector: '#account-login-password' }), { target: { value: 'gum-gum' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(mocks.auth.login).toHaveBeenCalledWith('luffy', 'gum-gum'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales incorrectas');
    expect(document.querySelectorAll('#account-login-error')).toHaveLength(1);
    expect(screen.getByLabelText('Usuario')).toHaveAttribute('aria-describedby', 'account-login-error');

    mocks.auth.user = createUser();
    rerender(<MiCuentaPage />);
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith('/cart/'));
  });

  it('submits trimmed registration data and associates a recoverable error', async () => {
    mocks.auth.register.mockResolvedValue({ success: false, error: 'El correo ya está registrado' });
    render(<MiCuentaPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Crear cuenta' }));

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: '  Nico  ' } });
    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: '  Robin  ' } });
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: '  robin@example.test  ' } });
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '  6621234567  ' } });
    fireEvent.change(screen.getByLabelText('Contraseña', { selector: '#account-register-password' }), { target: { value: 'pone-glyph' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(mocks.auth.register).toHaveBeenCalledWith({
      firstName: 'Nico',
      lastName: 'Robin',
      email: 'robin@example.test',
      phone: '6621234567',
      password: 'pone-glyph',
    }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El correo ya está registrado');
    expect(document.querySelectorAll('#account-register-error')).toHaveLength(1);
    expect(screen.getByLabelText('Correo')).toHaveAttribute('aria-describedby', 'account-register-error');
  });

  it('prefills social signup data and keeps both social providers available', async () => {
    window.history.replaceState(null, '', '/mi-cuenta/?social_signup=1&first_name=Uta&last_name=Red&email=uta%40example.test');
    render(<MiCuentaPage />);

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Crear cuenta' })).toHaveAttribute('aria-selected', 'true'));
    await waitFor(() => expect(screen.getByLabelText('Nombre')).toHaveValue('Uta'));
    expect(screen.getByLabelText('Apellido')).toHaveValue('Red');
    expect(screen.getByLabelText('Correo')).toHaveValue('uta@example.test');
    expect(screen.getByRole('status')).toHaveTextContent('Completa tus datos');
    expect(screen.getByRole('link', { name: 'Continuar con Google' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Continuar con Facebook' })).toBeVisible();
    expect(window.location.search).toBe('');
  });

  it('offers retry feedback for HTTP and network tracking failures', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);
    mocks.auth.user = createUser([
      createOrder({ enviaTrackingCode: 'TRACK-FAIL', enviaCarrier: 'estafeta' }),
    ]);
    render(<MiCuentaPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Rastreo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos consultar la paquetería');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar rastreo' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión con la paquetería');
    consoleError.mockRestore();
  });

  it('keeps long account content wrapped and includes reduced-motion safeguards', () => {
    const longProductName = 'Sudadera de la tripulación con un nombre extraordinariamente largo para pantallas pequeñas';
    const longUser = createUser([
      createOrder({
        orderNumber: 'NK-UN-FOLIO-MUY-LARGO-2048',
        lineItems: { nodes: [{ product: { node: { name: longProductName } }, quantity: 2 }] },
      }),
    ]);
    longUser.email = 'capitana-de-la-tripulacion-con-correo-muy-largo@example.test';
    mocks.auth.user = longUser;
    render(<MiCuentaPage />);

    expect(screen.getAllByText(longUser.email)).toHaveLength(2);
    expect(screen.getByText(longProductName, { exact: false })).toBeInTheDocument();
    const styles = Array.from(document.querySelectorAll('style')).map((style) => style.textContent).join('\n');
    expect(styles).toContain('overflow-wrap: anywhere');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).toMatch(/\.nk-logout-btn\s*{[^}]*font-size:\s*1rem/);
    expect(styles).toMatch(/\.nk-return-notice\s*{[^}]*font-size:\s*1rem/);
    expect(styles).toMatch(/\.nk-social-notice\s*{[^}]*font-size:\s*1rem/);
  });
});
