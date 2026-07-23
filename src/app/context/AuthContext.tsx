'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchGraphQL } from '@/lib/graphql-client';
import { apiOrigin } from '@/lib/api-host';

interface OrderMeta {
  key: string;
  value: string;
}

interface Order {
  id: string;
  /** ID numérico del pedido en WooCommerce (para la URL de pago) */
  databaseId?: number;
  /** Llave del pedido que exige la página order-pay de WooCommerce */
  orderKey?: string;
  /** true cuando el pedido está pendiente de pago (o el pago falló) */
  needsPayment?: boolean;
  orderNumber: string;
  status: string;
  total: string;
  /** Moneda con la que se creó el pedido (MXN/USD) */
  currency?: string;
  date: string;
  enviaTrackingCode?: string;
  enviaCarrier?: string;
  metaData: OrderMeta[];
  lineItems: {
    nodes: {
      product: {
        node: {
          name: string;
        };
      };
      quantity: number;
    }[];
  };
}

interface Customer {
  id: string;
  databaseId: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Teléfono de facturación de WooCommerce (autollenado del cotizador) */
  billingPhone?: string;
  role: string;
  orders: {
    nodes: Order[];
  };
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

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface AuthContextType {
  user: Customer | null;
  authToken: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  /** Crea una cuenta de cliente en WooCommerce y luego inicia sesión con ella. */
  register: (input: RegisterInput) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  /** Vuelve a consultar viewer/pedidos con el token vigente (p. ej. al entrar a Mi Cuenta). */
  refreshUser: () => void;
  isLoading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Autorización basada en rol de WordPress (viewer.roles). En WP el rol de
  // administrador es 'administrator'. Solo controla la UI (botón al escritorio de WP).
  const isAdmin = user?.role === 'administrator' || user?.role === 'admin';

  const logout = React.useCallback(() => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('wp-jwt');
  }, []);

  const fetchCustomerData = React.useCallback(async (token: string) => {
    // Check if token is obviously expired before fetching
    try {
      const payloadBase64 = token.split('.')[1];
      if (payloadBase64) {
        const payload = JSON.parse(atob(payloadBase64));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.warn("AuthProvider: Token expirado detectado localmente.");
          logout();
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error("AuthProvider: Error validando formato de token:", e);
    }

    // Consulta WPGraphQL: viewer (WP) + customer (WooCommerce). Directo a WP.
    const query = `
      query GetUserData {
        viewer {
          id
          databaseId
          username
          firstName
          lastName
          email
          roles { nodes { name } }
        }
        customer {
          billing { phone }
          shipping { address1 address2 city state postcode country }
          orders(first: 20, where: { orderby: { field: DATE, order: DESC } }) {
            nodes {
              id databaseId orderKey needsPayment orderNumber status total currency date
              lineItems { nodes { product { node { name } } quantity } }
            }
          }
        }
      }
    `;

    try {
      const { data, errors } = await fetchGraphQL(query, {}, { Authorization: `Bearer ${token}` });

      if (data?.viewer) {
        const v = data.viewer;
        const c = data.customer || {};

        const customer: Customer = {
          id: v.id,
          databaseId: v.databaseId,
          username: v.username || '',
          firstName: v.firstName || '',
          lastName: v.lastName || '',
          email: v.email,
          billingPhone: c.billing?.phone || '',
          role: v.roles?.nodes?.[0]?.name || 'customer',
          orders: c.orders || { nodes: [] },
          shipping: c.shipping || {
            address1: '', address2: '', city: '',
            state: '', postcode: '', country: ''
          }
        };

        // Rastreo Envia (plugin nakama-envia-tracking): query SEPARADA y
        // tolerante. Si estos campos fueran parte del query principal y el
        // plugin estuviera inactivo en WP, el schema los rechazaría, viewer
        // llegaría null y se cerraría la sesión de TODOS los usuarios.
        try {
          const trackingQuery = `
            query GetOrdersTracking {
              customer {
                orders(first: 20, where: { orderby: { field: DATE, order: DESC } }) {
                  nodes { id enviaTrackingCode enviaCarrier }
                }
              }
            }
          `;
          const trackingRes = await fetchGraphQL(trackingQuery, {}, { Authorization: `Bearer ${token}` });
          const trackingNodes: { id: string; enviaTrackingCode?: string; enviaCarrier?: string }[] =
            trackingRes?.data?.customer?.orders?.nodes || [];
          if (trackingNodes.length > 0) {
            const byId = new Map(trackingNodes.map(n => [n.id, n]));
            customer.orders.nodes.forEach((order) => {
              const t = byId.get(order.id);
              if (t) {
                order.enviaTrackingCode = t.enviaTrackingCode || undefined;
                order.enviaCarrier = t.enviaCarrier || undefined;
              }
            });
          }
        } catch (trackErr) {
          console.warn('AuthProvider: rastreo Envia no disponible (¿plugin activo en WP?)', trackErr);
        }

        setUser(customer);
      } else {
        // NO cerrar sesión por fallas transitorias (deploy/build en curso,
        // purga de LiteSpeed, timeout, 500 momentáneo de WP): antes cualquier
        // respuesta sin viewer borraba el JWT y todos los usuarios quedaban
        // deslogueados tras cada build. Solo se cierra la sesión cuando WP
        // rechaza el token (la expiración real ya se detecta arriba con
        // payload.exp). Un token rechazado llega como respuesta GraphQL
        // ESTRUCTURADA (HTTP 200) con error en el path "viewer" — WPGraphQL
        // enmascara la causa como "Internal server error" (se comprobó tras
        // el restore de BD: los JWT viejos daban exactamente eso y la sesión
        // zombie dejaba fallar todo lo autenticado, p. ej. el toggle de
        // mantenimiento). Las fallas de red/deploy NO traen ese shape.
        const errList = Array.isArray(errors) ? errors : [];
        const isJwtInvalid = errList.some((e: unknown) => {
          const err = e as { message?: string; path?: unknown[] };
          const msg = typeof err?.message === 'string' ? err.message : '';
          if (/jwt|expired|expirad|invalid.*token|token.*invalid|not.*logged|no.*autenticado/i.test(msg)) {
            return true;
          }
          // Error enmascarado de WPGraphQL sobre viewer = token rechazado.
          return /internal server error/i.test(msg) && Array.isArray(err.path) && err.path.includes('viewer');
        });
        if (isJwtInvalid) {
          console.warn('AuthProvider: WP marcó el token como inválido; cerrando sesión.');
          logout();
        } else {
          console.warn('AuthProvider: viewer vacío por error transitorio; se conserva la sesión.');
        }
      }
    } catch (err) {
      console.error('AuthProvider: Error al cargar datos', err);
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    // El login social (Google/Facebook) regresa del bridge de WordPress con el
    // token en el fragment (#nk_jwt=...), que no viaja al servidor. Se guarda
    // igual que un login normal y se borra del historial antes de seguir.
    let token: string | null = null;
    try {
      const hash = window.location.hash;
      if (hash.startsWith('#nk_jwt=')) {
        const fromHash = decodeURIComponent(hash.slice('#nk_jwt='.length));
        if (fromHash && fromHash.split('.').length === 3) {
          token = fromHash;
          localStorage.setItem('wp-jwt', fromHash);
        }
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch {
      // Hash malformado: se ignora y se sigue con la sesión guardada.
    }

    // Check local storage for token on mount
    if (!token) {
      token = localStorage.getItem('wp-jwt');
    }
    if (token) {
      const stored = token;
      queueMicrotask(() => {
        setAuthToken(stored);
        fetchCustomerData(stored);
      });
    } else {
      queueMicrotask(() => {
        setIsLoading(false);
      });
    }
  }, [fetchCustomerData]);

  const login = async (username: string, password: string) => {
    // Autenticación vía WPGraphQL (plugin JWT Authentication) directo a WordPress.
    const mutation = `
      mutation LoginUser($username: String!, $password: String!) {
        login(input: { clientMutationId: "nk", username: $username, password: $password }) {
          authToken
          user { id databaseId name }
        }
      }
    `;

    try {
      const { data } = await fetchGraphQL(mutation, { username, password });

      if (data?.login?.authToken) {
        const token = data.login.authToken;
        setAuthToken(token);
        localStorage.setItem('wp-jwt', token);
        await fetchCustomerData(token);
        return { success: true };
      }
      return { success: false, error: 'Credenciales inválidas' };
    } catch (err) {
      console.error('Login error', err);
      return { success: false, error: 'Error al iniciar sesión' };
    }
  };

  const register = async (input: RegisterInput) => {
    // El registro no pasa por WPGraphQL: usa el endpoint REST del plugin
    // nakama-checkout-tools (wc_create_new_customer). Al crear la cuenta se
    // inicia sesión de inmediato reutilizando el flujo de login (que ya
    // guarda el JWT y carga los datos del cliente). El login acepta el email
    // como usuario (wp_authenticate lo resuelve).
    try {
      const res = await fetch(
        `${apiOrigin()}/?rest_route=/nakama/v1/register&nkcb=${Date.now()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }
      );

      let data: { success?: boolean; error?: string; message?: string } = {};
      try {
        data = await res.json();
      } catch {
        // respuesta sin cuerpo JSON (p. ej. 500 de PHP)
      }

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || data.message || 'No se pudo crear la cuenta',
        };
      }

      // Cuenta creada: iniciar sesión con el email y la contraseña recién dados.
      return await login(input.email, input.password);
    } catch (err) {
      console.error('Register error', err);
      return { success: false, error: 'Error de red al crear la cuenta' };
    }
  };

  const refreshUser = React.useCallback(() => {
    const token = localStorage.getItem('wp-jwt');
    if (token) {
      fetchCustomerData(token);
    }
  }, [fetchCustomerData]);

  return (
    <AuthContext.Provider value={{ user, authToken, login, register, logout, refreshUser, isLoading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
