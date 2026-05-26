'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type CurrencyData = {
  currency: string;
  rate: number;
  country: string;
};

interface CurrencyContextProps {
  currencyInfo: CurrencyData;
  formatPrice: (price: number) => string;
}

const CurrencyContext = createContext<CurrencyContextProps | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyData>({
    currency: 'MXN',
    rate: 1,
    country: 'MX'
  });

  useEffect(() => {
    // Basic geo-detection or preference loading can go here
    const saved = localStorage.getItem('user-currency');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        queueMicrotask(() => {
          setCurrencyInfo(parsed);
        });
      } catch (e) {
        console.error("Error parsing currency info", e);
      }
    }
  }, []);

  const formatPrice = (price: number) => {
    const converted = price * currencyInfo.rate;
    
    // We use the 'Berri' symbol ฿ for One Piece theme, but standard $ works too.
    // Given the user wants "regresar colores" but "mantener temática", 
    // I will use a clean $ but styled.
    const symbol = currencyInfo.currency === 'MXN' ? '$' : '$';
    
    return `${symbol}${converted.toLocaleString('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })} ${currencyInfo.currency}`;
  };

  return (
    <CurrencyContext.Provider value={{ currencyInfo, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within a CurrencyProvider');
  return context;
};
