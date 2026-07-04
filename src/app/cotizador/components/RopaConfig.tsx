"use client";

import React, { useEffect } from 'react';
import type { GarmentCustomization } from '../types';

const getGarmentPreviewPath = (model: string, color: string): string => {
  if (!model || !color) return '';
  const normColor = color.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // "Salmón" -> "Salmon"
  
  if (model === 'Oversize') {
    let fileColor = normColor;
    if (normColor.toLowerCase() === 'acero (plomo)') {
      fileColor = 'acero (plomo)';
    }
    return `/Oversize/Oversize Con Colores_${fileColor}.png`;
  }
  
  if (model === 'T-shirt 100% Algodón Peinado') {
    return `/Oversize/Oversize Con Colores_${normColor}.png`;
  }
  
  if (model === 'T-shirt 100% Algodón (Regular)') {
    let fileColor = normColor;
    if (normColor === 'Azul Marino') {
      fileColor = 'Marino';
    }
    return `/T-shirt/T-shirt Nuevo modelo_${fileColor}.png`;
  }
  
  if (model === 'Tank Top') {
    let fileColor = normColor;
    if (normColor === 'Azul Marino') {
      fileColor = 'Marino';
    }
    return `/Tank top/Tank Top_${fileColor}.png`;
  }
  
  if (model === 'Hoodie') {
    return `/Hoodie/Hoodie_${normColor}.png`;
  }
  
  if (model === 'Sudadera Cuello Redondo') {
    let fileColor = normColor;
    if (normColor === 'Azul Marino') {
      fileColor = 'Marino';
    }
    return `/Sudadera/Sudadera_${fileColor}.png`;
  }
  
  return '';
};

interface RopaConfigProps {
  config: GarmentCustomization;
  onChange: (newConfig: GarmentCustomization) => void;
}

// Data from PDF and assets folder filenames
const modelsData = [
  {
    name: 'Oversize',
    colors: ['Negro', 'Blanco', 'Verde', 'Café Chocolate', 'Arena', 'Acero (plomo)', 'Azul Marino', 'Rojo', 'Azul Celeste', 'Hueso', 'Rosa']
  },
  {
    name: 'T-shirt 100% Algodón Peinado',
    colors: ['Blanco', 'Negro']
  },
  {
    name: 'T-shirt 100% Algodón (Regular)',
    colors: ['Azul Marino', 'Azul Rey', 'Rojo', 'Cherry', 'Kaki', 'Verde Botella', 'Morado Intenso', 'Salmón', 'Café Tabaco', 'Jaspe', 'Hueso']
  },
  {
    name: 'Tank Top',
    colors: ['Blanco', 'Negro', 'Jaspe', 'Azul Marino', 'Azul Rey', 'Rojo']
  },
  {
    name: 'Hoodie',
    colors: ['Jaspe', 'Blanco', 'Kaki', 'Azul Marino', 'Negro', 'Azul Rey', 'Rojo']
  },
  {
    name: 'Sudadera Cuello Redondo',
    colors: ['Jaspe', 'Blanco', 'Kaki', 'Azul Marino', 'Negro', 'Azul Rey', 'Rojo']
  }
];

export const RopaConfig: React.FC<RopaConfigProps> = ({ config, onChange }) => {
  // Auto-select first color when model changes
  useEffect(() => {
    const selectedModelData = modelsData.find(m => m.name === config.model);
    if (selectedModelData && !selectedModelData.colors.includes(config.color)) {
      onChange({
        ...config,
        color: selectedModelData.colors[0]
      });
    }
  }, [config.model]);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...config,
      model: e.target.value
    });
  };

  const handleColorSelect = (color: string) => {
    onChange({
      ...config,
      color
    });
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const qty = parseInt(e.target.value) || 1;
    onChange({
      ...config,
      quantity: Math.max(1, qty)
    });
  };

  const selectedModelColors = modelsData.find(m => m.name === config.model)?.colors || [];

  return (
    <div className="custom-card bg-white border border-light-subtle mb-4">
      <h3 className="font-display text-primary-brand mb-4">
        <i className="bi bi-person-fill-gear me-2"></i>
        Configurar Ropa Personalizada
      </h3>

      {/* 1. Seleccionar Modelo */}
      <div className="mb-4">
        <label className="form-label text-muted small uppercase fw-bold">Modelo de Prenda:</label>
        <select 
          className="form-select"
          value={config.model}
          onChange={handleModelChange}
        >
          {modelsData.map(m => (
            <option key={m.name} value={m.name}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* 2. Seleccionar Color */}
      <div className="mb-4">
        <label className="form-label text-muted small uppercase fw-bold d-block">Color de Prenda:</label>
        <div className="d-flex flex-wrap gap-2 mt-1 mb-3">
          {selectedModelColors.map(color => (
            <button
              key={color}
              type="button"
              className={`btn btn-sm btn-outline-secondary ${config.color === color ? 'bg-primary text-white border-primary' : 'text-dark'}`}
              onClick={() => handleColorSelect(color)}
            >
              {color}
            </button>
          ))}
        </div>

        {/* Vista previa de la prenda */}
        {getGarmentPreviewPath(config.model, config.color) && (
          <div className="text-center p-3 rounded border border-light-subtle bg-light mt-2" style={{ position: 'relative', overflow: 'hidden' }}>
            <span className="text-muted small uppercase fw-bold d-block mb-2">Vista Previa de Prenda ({config.color}):</span>
            <div style={{ maxWidth: '200px', margin: '0 auto', position: 'relative', aspectRatio: '1/1' }}>
              <img 
                src={getGarmentPreviewPath(config.model, config.color)} 
                alt={`Prenda ${config.model} en color ${config.color}`}
                className="img-fluid rounded"
                style={{ maxHeight: '180px', objectFit: 'contain', transition: 'all 0.3s ease' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Cantidad */}
      <div className="mb-4">
        <label className="form-label text-muted small uppercase fw-bold">Cantidad de prendas (Mínimo 1pz):</label>
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

      {/* 4. Detalles Adicionales */}
      <div className="mb-2">
        <label className="form-label text-muted small uppercase fw-bold">Detalles adicionales para tu personalizado:</label>
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
