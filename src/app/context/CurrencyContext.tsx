'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type CurrencyData = {
  currency: string;
  rate: number;
  country: string;
  symbol: string;
};

interface CurrencyContextProps {
  currencyInfo: CurrencyData;
  formatPrice: (price: number) => string;
  setCurrencyManual: (currency: string) => void;
}

const CurrencyContext = createContext<CurrencyContextProps | undefined>(undefined);

/**
 * Tipo de cambio MXN->USD. Se intenta primero el de WordPress (endpoint
 * nakama/v1/currency, que expone el rate cacheado por el snippet de moneda
 * del checkout, con su margen incluido) para que los montos del sitio
 * coincidan EXACTO con los del checkout de WooCommerce. Fallback: API pública.
 */
async function fetchUsdRate(): Promise<number | null> {
  try {
    const wpRes = await fetch(`https://nakamabordados.com/?rest_route=/nakama/v1/currency&nkcb=${Date.now()}`);
    if (wpRes.ok) {
      const wpData = await wpRes.json();
      if (typeof wpData?.usdRate === 'number' && wpData.usdRate > 0) {
        return wpData.usdRate;
      }
    }
  } catch {
    // WP no disponible: caer al fallback público.
  }
  try {
    const rateRes = await fetch('https://open.er-api.com/v6/latest/MXN');
    const rateData = await rateRes.json();
    if (rateData?.rates?.USD) return rateData.rates.USD;
  } catch (e) {
    console.warn('No se pudo obtener tipo de cambio USD:', e);
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

  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const geoRes = await fetch('https://ipapi.co/json/');
        const geoData = await geoRes.json();
        const country = geoData.country_code || 'MX';
        let targetCurrency = geoData.currency || 'MXN';
        if (targetCurrency !== 'USD') {
          targetCurrency = 'MXN';
        }

        let rate = 1;
        const symbol = '$';

        if (targetCurrency === 'USD') {
          const usdRate = await fetchUsdRate();
          if (usdRate) {
            rate = usdRate;
          } else {
            targetCurrency = 'MXN';
          }
        }
        
        const newInfo = { currency: targetCurrency, rate, country, symbol };
        setCurrencyInfo(newInfo);
        localStorage.setItem('user-currency', JSON.stringify(newInfo));
      } catch (e) {
        console.error("Error fetching currency info", e);
      }
    };

    const saved = localStorage.getItem('user-currency');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.currency !== 'MXN' && parsed.currency !== 'USD') {
          fetchCurrency();
        } else {
          setCurrencyInfo(parsed);
          // Refrescar el tipo de cambio en segundo plano: el rate guardado en
          // localStorage se desactualiza (WP lo renueva cada 6 horas).
          if (parsed.currency === 'USD') {
            fetchUsdRate().then(usdRate => {
              if (usdRate && usdRate !== parsed.rate) {
                const refreshed = { ...parsed, rate: usdRate };
                setCurrencyInfo(refreshed);
                localStorage.setItem('user-currency', JSON.stringify(refreshed));
              }
            });
          }
        }
      } catch (e) {
        console.error(e);
        fetchCurrency();
      }
    } else {
      fetchCurrency();
    }
  }, []);

  const setCurrencyManual = async (targetCurrency: string) => {
    try {
      let rate = 1;
      const symbol = '$';
      let cleanCurrency = targetCurrency;
      if (cleanCurrency !== 'USD') {
        cleanCurrency = 'MXN';
      }
      if (cleanCurrency === 'USD') {
        const usdRate = await fetchUsdRate();
        if (usdRate) {
          rate = usdRate;
        } else {
          cleanCurrency = 'MXN';
        }
      }
      const newInfo = { ...currencyInfo, currency: cleanCurrency, rate, symbol };
      setCurrencyInfo(newInfo);
      localStorage.setItem('user-currency', JSON.stringify(newInfo));
    } catch (e) {
      console.error(e);
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

  return (
    <CurrencyContext.Provider value={{ currencyInfo, formatPrice, setCurrencyManual }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within a CurrencyProvider');
  return context;
};
