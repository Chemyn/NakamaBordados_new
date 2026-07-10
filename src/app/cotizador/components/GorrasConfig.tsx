"use client";

import React, { useEffect } from 'react';
import type { CapCustomization } from '../types';

interface GorrasConfigProps {
  config: CapCustomization;
  onChange: (newConfig: CapCustomization) => void;
}

const capModels = [
  'Kamel 804 (Tela)',
  'Kamel 804 (Tela Gamuza)',
  'Kamel 804 (Gamuza)',
  'Kamel 804 (Pana)',
  'Kamel 804 (Gamuza Perforada)',
  'Kamel 804 (Gamuza Vinipiel)',
  'Snapback (Visera plana - Genérico)',
  'Trucker (Malla - Genérico)',
  'Dad Hat (Visera curva - Genérico)',
  'Otro (Especificar en detalles)'
];

const capModelColors: Record<string, string[]> = {
  'Kamel 804 (Tela)': [
    'Black (Negro)', 'White (Blanco)', 'Navy (Azul Marino)', 'Olive (Olivo)', 
    'Royal (Azul Rey)', 'Melange Heather (Gris Jaspe)', 'Charcoal (Carbono)', 
    'Khaki (Kaki)', 'Burgundy (Burgundi)', 'Silver (Plata)', 'Red (Rojo)',
    'Natural / Burgundy', 'Natural / Black', 'Natural / Red', 'Natural / Charcoal',
    'Natural / Navy', 'Brown / Black', 'Charcoal / Red', 'Charcoal / Black',
    'Black / Red', 'Khaki / Black', 'Olive / Black', 'Aqua / Black', 
    'Melange Grey / Black', 'Red / Black', 'D.Green / Black', 'Burgundy / Black',
    'Black / Purple', 'Caramel / Black', 'Pink / Black', 'Royal / Black'
  ],
  'Kamel 804 (Tela Gamuza)': [
    'Natural / Burgundy', 'Natural / Red', 'Charcoal / Black', 'Khaki / Black', 
    'Natural / Grey', 'Brown / Black', 'Khaki / D.Green', 'Natural / D.Green', 
    'Khaki / Olive', 'Natural / Royal'
  ],
  'Kamel 804 (Gamuza)': [
    'Black (Negro)', 'Khaki / Black (Visera Roja)'
  ],
  'Kamel 804 (Pana)': [
    'Black (Negro)', 'Brown (Café)', 'Khaki / D.Green', 'Caramel / Khaki', 
    'Khaki / Black', 'Caramel / D.Green', 'Black / Brown', 'Caramel / Black', 
    'Khaki / Burgundy', 'Khaki / Brown'
  ],
  'Kamel 804 (Gamuza Perforada)': [
    'Black (Negro)', 'Khaki (Kaki)', 'Khaki / Navy', 'Natural / Black', 
    'Khaki / Black', 'Natural / Navy', 'Charcoal / Black', 'Natural / D.Green', 
    'Khaki / Caramel (Visera Roja)', 'Red / Black', 'Black / Khaki (Visera Roja)'
  ],
  'Kamel 804 (Gamuza Vinipiel)': [
    'Black (Negro)', 'Charcoal / Black'
  ],
  'Snapback (Visera plana - Genérico)': [
    'Negro', 'Blanco', 'Azul Marino', 'Rojo', 'Azul Rey', 'Gris', 'Verde', 'Kaki', 'Otro'
  ],
  'Trucker (Malla - Genérico)': [
    'Negro', 'Blanco', 'Azul Marino', 'Rojo', 'Azul Rey', 'Gris', 'Verde', 'Kaki', 'Otro'
  ],
  'Dad Hat (Visera curva - Genérico)': [
    'Negro', 'Blanco', 'Azul Marino', 'Rojo', 'Azul Rey', 'Gris', 'Verde', 'Kaki', 'Otro'
  ],
  'Otro (Especificar en detalles)': [
    'Especificar en detalles del pedido'
  ]
};

export const GorrasConfig: React.FC<GorrasConfigProps> = ({ config, onChange }) => {
  // Auto-select first color when cap model changes
  useEffect(() => {
    const colors = capModelColors[config.model] || [];
    if (colors.length > 0 && !colors.includes(config.color)) {
      onChange({
        ...config,
        color: colors[0]
      });
    }
  }, [config.model]);
  
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...config,
      model: e.target.value
    });
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const qty = parseInt(e.target.value) || 1;
    onChange({
      ...config,
      quantity: Math.max(1, qty)
    });
  };

  return (
    <div className="custom-card bg-white border border-light-subtle mb-4">
      <h3 className="font-display text-primary-brand mb-4">
        <i className="bi bi-capslock-fill me-2"></i>
        Configurar Gorras Personalizadas
      </h3>

      {/* 1. Modelo de Gorra */}
      <div className="mb-4">
        <label className="form-label nk-step-label small uppercase fw-bold">Modelo de Gorra:</label>
        <select 
          className="form-select"
          value={config.model}
          onChange={handleModelChange}
        >
          {capModels.map(model => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
        
        {/* Botón para ver catálogo PDF */}
        <div className="mt-2">
          <a 
            href="/KAMEL%20Nakama%20.pdf" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-sm btn-outline-danger font-display tracking-wide uppercase px-3 py-2"
            style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="bi bi-file-earmark-pdf-fill"></i> Ver catálogo de modelos y colores (PDF)
          </a>
        </div>
      </div>

      {/* 2. Seleccionar Color de Gorra */}
      <div className="mb-4">
        <label className="form-label nk-step-label small uppercase fw-bold d-block">Color de Gorra:</label>
        <div className="d-flex flex-wrap gap-2 mt-1">
          {(capModelColors[config.model] || []).map(color => (
            <button
              key={color}
              type="button"
              className={`btn btn-sm btn-outline-secondary ${config.color === color ? 'bg-primary text-white border-primary' : 'text-dark'}`}
              onClick={() => onChange({ ...config, color })}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Bordado 3D */}
      <div className="mb-4">
        <label className="form-label nk-step-label small uppercase fw-bold d-block">¿Agregar 3D (Bordado en Relieve)?:</label>
        <p className="text-muted small mb-2">Añade relieve tridimensional a las letras o trazos gruesos (si es factible).</p>
        <div className="btn-group" role="group" aria-label="Bordado 3D Toggle">
          <button 
            type="button" 
            className={`btn btn-sm ${config.add3D ? 'btn-danger text-white' : 'btn-outline-secondary text-dark'}`}
            onClick={() => onChange({ ...config, add3D: true })}
          >
            Sí, agregar 3D
          </button>
          <button 
            type="button" 
            className={`btn btn-sm ${!config.add3D ? 'btn-danger text-white' : 'btn-outline-secondary text-dark'}`}
            onClick={() => onChange({ ...config, add3D: false })}
          >
            No, bordado plano
          </button>
        </div>
      </div>

      {/* 4. Cantidad */}
      <div className="mb-4">
        <label className="form-label nk-step-label small uppercase fw-bold">Cantidad de piezas (Mínimo 1pz):</label>
        <div className="input-group" style={{ maxWidth: '180px' }}>
          <button 
            type="button" 
            className="btn btn-outline-secondary" 
            onClick={() => handleQuantityChange({ target: { value: String(config.quantity - 1) } } as any)}
          >
            -
          </button>
          <input 
            type="number" 
            className="form-control text-center" 
            value={config.quantity} 
            onChange={handleQuantityChange}
            min="1"
          />
          <button 
            type="button" 
            className="btn btn-outline-secondary" 
            onClick={() => handleQuantityChange({ target: { value: String(config.quantity + 1) } } as any)}
          >
            +
          </button>
        </div>
      </div>

      {/* 5. Detalles Adicionales */}
      <div className="mb-2">
        <label className="form-label nk-step-label small uppercase fw-bold">Detalles adicionales para tu gorra:</label>
        <textarea
          className="form-control"
          rows={3}
          value={config.additionalDetails}
          onChange={(e) => onChange({ ...config, additionalDetails: e.target.value })}
          placeholder="Instrucciones adicionales para la producción de tu personalizado..."
        />
      </div>
    </div>
  );
};
