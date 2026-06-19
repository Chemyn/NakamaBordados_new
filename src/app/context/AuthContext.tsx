'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchGraphQL } from '@/lib/graphql-client';

interface OrderMeta {
  key: string;
  value: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
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
  isLoading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.email === 'josemlopez2310@gmail.com' || false;

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

    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const body = await response.json();
        if (body.viewer) {
          const v = body.viewer;
          const c = body.customer || {};
          
          // Mapear datos a nuestra interfaz Customer
          const customer: Customer = {
            id: v.id,
            databaseId: v.databaseId,
            username: v.username || '',
            firstName: v.firstName || '',
            lastName: v.lastName || '',
            email: v.email,
            role: v.role || 'customer',
            orders: c.orders || { nodes: [] },
            shipping: c.shipping || {
              address1: '', address2: '', city: '',
              state: '', postcode: '', country: ''
            }
          };

          console.log("AuthProvider: Usuario cargado:", customer.email);

          // --- BYPASS TEMPORAL PARA PRUEBAS (Chemyn) ---
          const isChemyn = 
            (customer.email && customer.email.toLowerCase().includes('josemlopez2310@gmail.com')) || 
            (customer.firstName && customer.firstName.toLowerCase().includes('chemyn'));

          if (isChemyn) {
            console.log("AuthProvider: Aplicando bypass para Chemyn.");
            const testOrder = {
              id: 'test-100303',
              orderNumber: '100303',
              status: 'COMPLETED',
              total: '999.00',
              date: new Date().toISOString(),
              enviaTrackingCode: '1055910227610700042072',
              enviaCarrier: 'Estafeta',
              metaData: [],
              lineItems: { 
                nodes: [{ product: { node: { name: 'Hoodie Luffy Gear 5 (Test)' } }, quantity: 1 }] 
              }
            };
            
            if (!customer.orders.nodes.find((o: Order) => o.orderNumber === '100303')) {
              customer.orders.nodes = [testOrder, ...customer.orders.nodes];
            }
          }
          // ------------------------------------

          setUser(customer);
        } else {
          console.warn("AuthProvider: No se pudo obtener el usuario, el token podría ser inválido.");
          logout();
        }
      } else {
        console.warn("AuthProvider: Falló llamado a /api/auth/me.");
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
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success && data.authToken) {
        const token = data.authToken;
        setAuthToken(token);
        localStorage.setItem('wp-jwt', token);
        await fetchCustomerData(token);
        return { success: true };
      } else {
        const errorMsg = data.error || 'Credenciales inválidas';
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      console.error('Login error', err);
      return { success: false, error: 'Error al iniciar sesión' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, authToken, login, logout, isLoading, isAdmin }}>
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
