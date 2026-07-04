"use client";

import React, { useEffect } from 'react';
import type { CapCustomization } from '../types';

interface GorrasConfigProps {
  config: CapCustomization;
  onChange: (newConfig: CapCustomization) => void;
}

const capModels = ['Snapback (Visera plana)', 'Trucker (Malla)', 'Dad Hat (Visera curva)', 'Otro (Especificar en detalles)'];

export const GorrasConfig: React.FC<GorrasConfigProps> = ({ config, onChange }) => {
  
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

      {/* 2. Modelo de Gorra */}
      <div className="mb-4">
        <label className="form-label text-muted small uppercase fw-bold">Modelo de Gorra:</label>
        <select 
          className="form-select"
          value={config.model}
          onChange={handleModelChange}
        >
          {capModels.map(model => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
      </div>

      {/* 3. Bordado 3D */}
      <div className="mb-4">
        <label className="form-label text-muted small uppercase fw-bold d-block">¿Agregar 3D (Bordado en Relieve)?:</label>
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
        <label className="form-label text-muted small uppercase fw-bold">Cantidad de piezas (Mínimo 1pz):</label>
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
        <label className="form-label text-muted small uppercase fw-bold">Detalles adicionales para tu gorra:</label>
        <textarea
          className="form-control"
          rows={3}
          value={config.additionalDetails}
          onChange={(e) => onChange({ ...config, additionalDetails: e.target.value })}
          placeholder="Especifica el color de la gorra, color de la visera, broche metálico o plástico, y detalles sobre la combinación de hilos..."
        />
      </div>
    </div>
  );
};
