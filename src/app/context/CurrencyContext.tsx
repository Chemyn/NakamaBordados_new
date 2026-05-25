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

const defaultCurrency: CurrencyData = {
  currency: 'MXN', // Default to MXN based on Nakama rules
  rate: 1,
  country: 'MX'
};

const CurrencyContext = createContext<CurrencyContextProps>({
  currencyInfo: defaultCurrency,
  formatPrice: (price: number) => `$${price.toFixed(2)}`
});

export const useCurrency = () => useContext(CurrencyContext);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyData>(defaultCurrency);

  useEffect(() => {
    // Only run once on mount
    const initCurrency = async () => {
      try {
        // 1. Get user country using free IP API
        const geoRes = await fetch('https://ipapi.co/json/');
        const geoData = await geoRes.json();
        const countryCode = geoData.country_code || 'US';
        
        // Map country to currency based on 100111_Exchange.php logic
        const currencyMap: Record<string, string> = {
          'MX': 'MXN', 'ES': 'EUR', 'CA': 'CAD', 
          'AR': 'ARS', 'CL': 'CLP', 'CO': 'COP', 'PE': 'PEN'
        };
        
        let targetCurrency = 'USD'; // Default fallback
        if (countryCode === 'MX') {
          targetCurrency = 'MXN';
        } else if (currencyMap[countryCode]) {
          targetCurrency = currencyMap[countryCode];
        }

        // 2. If not MXN, fetch exchange rate
        let rate = 1;
        if (targetCurrency !== 'MXN') {
          // Nakama API key used in the snippet
          const apiKey = '0f6af8daed019b3b06c10383';
          const rateRes = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/MXN/${targetCurrency}`);
          const rateData = await rateRes.json();
          if (rateData.conversion_rate) {
            rate = rateData.conversion_rate;
          }
        }

        setCurrencyInfo({
          currency: targetCurrency,
          rate: rate,
          country: countryCode
        });

      } catch (error) {
        console.error('Failed to init currency:', error);
      }
    };

    initCurrency();
  }, []);

  const formatPrice = (price: number) => {
    const converted = price * currencyInfo.rate;
    
    // Formatting options
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currencyInfo.currency
    }).format(converted);
  };

  return (
    <CurrencyContext.Provider value={{ currencyInfo, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};
