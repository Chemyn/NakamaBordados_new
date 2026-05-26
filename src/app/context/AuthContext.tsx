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
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
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

  const isAdmin = user?.roles?.includes('administrator') || false;

  const logout = React.useCallback(() => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('wp-jwt');
  }, []);

  const fetchCustomerData = React.useCallback(async (token: string) => {
    const query = `
      query GetCustomer {
        customer {
          id
          databaseId
          firstName
          lastName
          email
          roles
          shipping {
            address1
            address2
            city
            state
            postcode
            country
          }
          orders(first: 20) {
            nodes {
              id
              orderKey
              orderNumber
              status
              total
              date
              metaData {
                key
                value
              }
              lineItems {
                nodes {
                  product {
                    node {
                      name
                    }
                  }
                  quantity
                }
              }
            }
          }
          comisiones
        }
      }
    `;

    try {
      const { data } = await fetchGraphQL(query, {}, { Authorization: `Bearer ${token}` });
      if (data?.customer) {
        setUser(data.customer);
      } else {
        // Token might be expired or invalid
        logout();
      }
    } catch (err) {
      console.error('Failed to fetch customer data', err);
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
    const mutation = `
      mutation LoginUser($username: String!, $password: String!) {
        login(input: {
          clientMutationId: "uniqueId",
          username: $username,
          password: $password
        }) {
          authToken
          user {
            id
            databaseId
            name
          }
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
      } else {
        return { success: false, error: 'Credenciales inválidas' };
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
