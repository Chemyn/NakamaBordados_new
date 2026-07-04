'use client';

import React from 'react';
import { App } from './App';
import './cotizador.css';

export default function CotizadorPage() {
  return (
    <div className="nk-cotizador-scope" style={{ minHeight: '100vh', background: '#F8FAFC', paddingBottom: '80px' }}>
      <App />
    </div>
  );
}
