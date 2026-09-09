'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiOrigin } from '@/lib/api-host';
import { fetchUsdRate, type StoredUsdRate } from '@/lib/currency-rate';

type CurrencyData = {
  currency: string;
  rate: number;
  country: string;
  symbol: string;
  /** true solo cuando el usuario eligió la moneda en el selector */
  manual?: boolean;
  rateUpdatedAt?: number;
};

type CurrencyRateStatus = 'idle' | 'loading' | 'fresh' | 'cached' | 'unavailable';

interface CurrencyContextProps {
  currencyInfo: CurrencyData;
  currencySelection: 'MXN' | 'USD';
  rateStatus: CurrencyRateStatus;
  currencyMessage: string | null;
  formatPrice: (price: number) => string;
  formatQuotePrice: (mxn: number) => string;
  setCurrencyManual: (currency: string) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextProps | undefined>(undefined);

const USD_RATE_STORAGE_KEY = 'nakama-usd-rate-v1';
const CURRENCY_SELECTION_KEY = 'user-currency-selection';

function readStoredUsdRate(): StoredUsdRate | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(USD_RATE_STORAGE_KEY) || 'null');
    if (
      typeof parsed?.rate === 'number'
      && Number.isFinite(parsed.rate)
      && parsed.rate > 0
      && typeof parsed?.updatedAt === 'number'
    ) {
      return parsed;
    }
  } catch {
    // Un valor corrupto no debe bloquear el selector.
  }
  return null;
}

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyData>({
    currency: 'MXN',
    rate: 1,
    country: 'MX',
    symbol: '$'
  });
  const [currencySelection, setCurrencySelection] = useState<'MXN' | 'USD'>('MXN');
  const [rateStatus, setRateStatus] = useState<CurrencyRateStatus>('idle');

  const currencyMessage = rateStatus === 'cached'
    ? 'Mostrando el último tipo de cambio disponible.'
    : rateStatus === 'unavailable'
      ? 'El tipo de cambio no está disponible. Los precios siguen en MXN.'
      : null;

  useEffect(() => {
    const initializeCurrency = window.setTimeout(() => {
    // La moneda por defecto es SIEMPRE MXN. Antes se geo-detectaba por IP
    // (ipapi.co) y a los visitantes de países con dólar se les activaba USD
    // sin haberlo seleccionado — el checkout llegaba convertido "solo".
    // USD únicamente cuando el usuario lo elige en el selector (persistido
    // en localStorage como elección manual).
    const saved = localStorage.getItem('user-currency');
    const savedSelection = localStorage.getItem(CURRENCY_SELECTION_KEY);
    if (savedSelection === 'USD') setCurrencySelection('USD');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // manual: los guardados de la época de geo-detección no llevan el
        // flag y se descartan — solo sobrevive el USD elegido por el usuario.
        if (parsed.currency === 'USD' && parsed.manual === true) {
          setCurrencySelection('USD');
          setCurrencyInfo(parsed);
          // Refrescar el tipo de cambio en segundo plano: el rate guardado en
          // localStorage se desactualiza (WP lo renueva cada 6 horas).
          const legacyRate: StoredUsdRate | null = typeof parsed.rate === 'number' && parsed.rate > 0
            ? { rate: parsed.rate, updatedAt: parsed.rateUpdatedAt || Date.now() }
            : null;
          const cachedRate = readStoredUsdRate() || legacyRate;
          setRateStatus('loading');
          fetchUsdRate({ apiBaseUrl: apiOrigin(), cachedRate }).then(result => {
            if (result) {
              const refreshed = { ...parsed, rate: result.rate, rateUpdatedAt: result.updatedAt };
              setCurrencyInfo(refreshed);
              localStorage.setItem('user-currency', JSON.stringify(refreshed));
              localStorage.setItem(USD_RATE_STORAGE_KEY, JSON.stringify({
                rate: result.rate,
                updatedAt: result.updatedAt,
              }));
              setRateStatus(result.stale ? 'cached' : 'fresh');
            } else {
              setRateStatus('unavailable');
            }
          });
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    // Sin elección manual previa (o guardado corrupto): MXN, sin red.
      setCurrencyInfo({ currency: 'MXN', rate: 1, country: 'MX', symbol: '$' });
    }, 0);
    return () => window.clearTimeout(initializeCurrency);
  }, []);

  const setCurrencyManual = async (targetCurrency: string) => {
    const cleanCurrency = targetCurrency === 'USD' ? 'USD' : 'MXN';
    setCurrencySelection(cleanCurrency);
    localStorage.setItem(CURRENCY_SELECTION_KEY, cleanCurrency);

    if (cleanCurrency === 'MXN') {
      const newInfo: CurrencyData = { currency: 'MXN', rate: 1, country: 'MX', symbol: '$', manual: true };
      setCurrencyInfo(newInfo);
      setRateStatus('idle');
      localStorage.setItem('user-currency', JSON.stringify(newInfo));
      return;
    }

    setRateStatus('loading');
    try {
      const result = await fetchUsdRate({ apiBaseUrl: apiOrigin(), cachedRate: readStoredUsdRate() });
      if (!result) {
        setRateStatus('unavailable');
        return;
      }
      const newInfo: CurrencyData = {
        ...currencyInfo,
        currency: 'USD',
        rate: result.rate,
        symbol: '$',
        manual: true,
        rateUpdatedAt: result.updatedAt,
      };
      setCurrencyInfo(newInfo);
      localStorage.setItem('user-currency', JSON.stringify(newInfo));
      localStorage.setItem(USD_RATE_STORAGE_KEY, JSON.stringify({
        rate: result.rate,
        updatedAt: result.updatedAt,
      }));
      setRateStatus(result.stale ? 'cached' : 'fresh');
    } catch (e) {
      console.error(e);
      setRateStatus('unavailable');
    }
  };

  const formatPrice = (price: number) => {
    const converted = price * currencyInfo.rate;
    // USD con 2 decimales (igual que el checkout de WooCommerce); MXN en enteros.
    const decimals = currencyInfo.currency === 'USD' ? 2 : 0;
    return `${currencyInfo.symbol}${converted.toLocaleString('es-MX', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })} ${currencyInfo.currency}`;
  };

  /**
   * Precio de una COTIZACIÓN (siempre en MXN). Las cotizaciones están exentas
   * del margen de -2 pesos de los productos: el checkout las convierte con el
   * tipo de cambio real (pesos_reales = 1/rate + 2, hook del plugin de
   * checkout). Usar formatPrice aquí mostraría un USD más caro del que se
   * cobra. En MXN no hay conversión y delega al formato normal.
   */
  const formatQuotePrice = (mxn: number) => {
    if (currencyInfo.currency !== 'USD' || currencyInfo.rate <= 0) {
      return formatPrice(mxn);
    }
    const pesosReales = 1 / currencyInfo.rate + 2;
    const usd = mxn / pesosReales;
    return `${currencyInfo.symbol}${usd.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USD`;
  };

  return (
    <CurrencyContext.Provider value={{
      currencyInfo,
      currencySelection,
      rateStatus,
      currencyMessage,
      formatPrice,
      formatQuotePrice,
      setCurrencyManual,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within a CurrencyProvider');
  return context;
};
