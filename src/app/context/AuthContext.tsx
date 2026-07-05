'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchGraphQL } from '@/lib/graphql-client';

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

interface AuthContextType {
  user: Customer | null;
  authToken: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
      const { data } = await fetchGraphQL(query, {}, { Authorization: `Bearer ${token}` });

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
        console.warn("AuthProvider: viewer vacío; el token podría ser inválido/expirado.");
        logout();
      }
    } catch (err) {
      console.error('AuthProvider: Error al cargar datos', err);
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    // Check local storage for token on mount
    const token = localStorage.getItem('wp-jwt');
    if (token) {
      queueMicrotask(() => {
        setAuthToken(token);
        fetchCustomerData(token);
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

  const refreshUser = React.useCallback(() => {
    const token = localStorage.getItem('wp-jwt');
    if (token) {
      fetchCustomerData(token);
    }
  }, [fetchCustomerData]);

  return (
    <AuthContext.Provider value={{ user, authToken, login, logout, refreshUser, isLoading, isAdmin }}>
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
