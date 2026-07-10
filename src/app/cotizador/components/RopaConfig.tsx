"use client";

import React, { useEffect } from 'react';
import type { GarmentCustomization, GarmentListItem } from '../types';

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
  /** Lista de combinaciones prenda+color+talla agregadas a la cotización */
  garmentList: GarmentListItem[];
  onAddToList: () => void;
  onRemoveFromList: (id: number) => void;
}

// Data from PDF and assets folder filenames.
// sizes: tallas disponibles por modelo (gorras y parches no manejan tallas).
const modelsData = [
  {
    name: 'Oversize',
    colors: ['Negro', 'Blanco', 'Verde', 'Café Chocolate', 'Arena', 'Acero (plomo)', 'Azul Marino', 'Rojo', 'Azul Celeste', 'Hueso', 'Rosa'],
    sizes: ['S', 'M', 'L', 'XL']
  },
  {
    name: 'T-shirt 100% Algodón Peinado',
    colors: ['Blanco', 'Negro'],
    sizes: ['S', 'M', 'L', 'XL', '2XL']
  },
  {
    name: 'T-shirt 100% Algodón (Regular)',
    colors: ['Azul Marino', 'Azul Rey', 'Rojo', 'Cherry', 'Kaki', 'Verde Botella', 'Morado Intenso', 'Salmón', 'Café Tabaco', 'Jaspe', 'Hueso'],
    sizes: ['S', 'M', 'L', 'XL', '2XL']
  },
  {
    name: 'Tank Top',
    colors: ['Blanco', 'Negro', 'Jaspe', 'Azul Marino', 'Azul Rey', 'Rojo'],
    sizes: ['S', 'M', 'L', 'XL', '2XL']
  },
  {
    name: 'Hoodie',
    colors: ['Jaspe', 'Blanco', 'Kaki', 'Azul Marino', 'Negro', 'Azul Rey', 'Rojo'],
    sizes: ['S', 'M', 'L', 'XL', '2XL']
  },
  {
    name: 'Sudadera Cuello Redondo',
    colors: ['Jaspe', 'Blanco', 'Kaki', 'Azul Marino', 'Negro', 'Azul Rey', 'Rojo'],
    sizes: ['S', 'M', 'L', 'XL', '2XL']
  }
];

/**
 * Tallas válidas para un modelo (fallback estándar si el modelo no existe).
 * En Oversize la disponibilidad depende del COLOR: solo Negro, Blanco y
 * Hueso se surten hasta 3XL; los demás colores llegan hasta XL.
 */
export const getModelSizes = (model: string, color?: string): string[] => {
  const base = modelsData.find(m => m.name === model)?.sizes || ['S', 'M', 'L', 'XL'];
  if (model === 'Oversize' && color && ['negro', 'blanco', 'hueso'].includes(color.trim().toLowerCase())) {
    return [...base, '2XL', '3XL'];
  }
  return base;
};

export const RopaConfig: React.FC<RopaConfigProps> = ({ config, onChange, garmentList, onAddToList, onRemoveFromList }) => {
  // Auto-corrige color y talla al cambiar modelo o color: en Oversize las
  // tallas 2XL/3XL solo existen en Negro/Blanco/Hueso, así que al pasar a
  // otro color la talla seleccionada puede dejar de estar disponible.
  useEffect(() => {
    const selectedModelData = modelsData.find(m => m.name === config.model);
    if (!selectedModelData) return;
    const next = { ...config };
    let changed = false;
    if (!selectedModelData.colors.includes(config.color)) {
      next.color = selectedModelData.colors[0];
      changed = true;
    }
    const validSizes = getModelSizes(config.model, next.color);
    if (!validSizes.includes(config.talla)) {
      // 'M' como preferencia si el modelo la maneja
      next.talla = validSizes.includes('M') ? 'M' : validSizes[0];
      changed = true;
    }
    if (changed) onChange(next);
  }, [config.model, config.color]);

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
  const selectedModelSizes = getModelSizes(config.model, config.color);
  const totalListPieces = garmentList.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="custom-card bg-white border border-light-subtle mb-4">
      <h3 className="font-display text-primary-brand mb-4">
        <i className="bi bi-person-fill-gear me-2"></i>
        Configurar Ropa Personalizada
      </h3>

      {/* 1. Seleccionar Modelo */}
      <div className="mb-4">
        <label className="form-label nk-step-label small uppercase fw-bold">Modelo de Prenda:</label>
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
        <label className="form-label nk-step-label small uppercase fw-bold d-block">Color de Prenda:</label>
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
            <span className="nk-step-label small uppercase fw-bold d-block mb-2">Vista Previa de Prenda ({config.color}):</span>
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

      {/* 3. Talla (las opciones dependen del modelo; gorras y parches no llevan) */}
      <div className="mb-4">
        <label className="form-label nk-step-label small uppercase fw-bold d-block">Talla:</label>
        <div className="d-flex flex-wrap gap-2 mt-1">
          {selectedModelSizes.map(size => (
            <button
              key={size}
              type="button"
              className={`btn btn-sm btn-outline-secondary px-3 ${config.talla === size ? 'bg-primary text-white border-primary' : 'text-dark'}`}
              onClick={() => onChange({ ...config, talla: size })}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Cantidad */}
      <div className="mb-4">
        <label className="form-label nk-step-label small uppercase fw-bold">Cantidad de prendas (Mínimo 1pz):</label>
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

      {/* 5. Lista de combinaciones: permite cotizar varias prendas/colores/
             tallas en un mismo folio. Los diseños aplican a toda la lista. */}
      <div className="mb-4 p-3 rounded border border-light-subtle bg-light">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <span className="nk-step-label small uppercase fw-bold">
            <i className="bi bi-list-check me-1"></i>
            Lista de prendas de tu cotización
          </span>
          <button
            type="button"
            className="btn btn-sm btn-dark"
            onClick={onAddToList}
          >
            <i className="bi bi-plus-circle-fill me-1"></i>
            Agregar a la lista
          </button>
        </div>

        {garmentList.length === 0 ? (
          <p className="text-muted small m-0">
            ¿Quieres combinar prendas, colores o tallas distintas? Configura arriba la combinación y presiona
            {' '}<strong>&ldquo;Agregar a la lista&rdquo;</strong>; repite por cada variante que necesites.
          </p>
        ) : (
          <>
            <ul className="list-group list-group-flush mb-2">
              {garmentList.map(item => (
                <li key={item.id} className="list-group-item bg-transparent d-flex justify-content-between align-items-center px-0 py-2">
                  <span className="small">
                    <strong>{item.model}</strong>
                    {' '}&middot; {item.color} &middot; Talla {item.talla} &middot;{' '}
                    <span className="text-primary-brand fw-bold">{item.quantity} pz</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-link text-danger p-0 m-0 text-decoration-none small"
                    onClick={() => onRemoveFromList(item.id)}
                    aria-label={`Eliminar ${item.model} ${item.color} talla ${item.talla}`}
                  >
                    <i className="bi bi-x-circle-fill"></i>
                  </button>
                </li>
              ))}
            </ul>
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-muted small">Los diseños configurados aplican a todas las prendas.</span>
              <span className="badge bg-dark">{totalListPieces} pz en total</span>
            </div>
          </>
        )}
      </div>

      {/* 6. Detalles Adicionales */}
      <div className="mb-2">
        <label className="form-label nk-step-label small uppercase fw-bold">Detalles adicionales para tu personalizado:</label>
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
