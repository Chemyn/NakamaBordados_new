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
        
        // Fetch rates based on MXN
        const rateRes = await fetch('https://open.er-api.com/v6/latest/MXN');
        const rateData = await rateRes.json();
        
        let rate = 1;
        let symbol = '$';
        
        if (targetCurrency === 'USD' && rateData.rates.USD) {
          rate = rateData.rates.USD;
        } else {
          targetCurrency = 'MXN';
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
      const rateRes = await fetch('https://open.er-api.com/v6/latest/MXN');
      const rateData = await rateRes.json();
      let rate = 1;
      let symbol = '$';
      let cleanCurrency = targetCurrency;
      if (cleanCurrency !== 'USD') {
        cleanCurrency = 'MXN';
      }
      if (cleanCurrency === 'USD' && rateData.rates.USD) {
         rate = rateData.rates.USD;
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
    return `${currencyInfo.symbol}${converted.toLocaleString('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
