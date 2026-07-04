"use client";

import React from 'react';
import type { PatchCustomization } from '../types';

interface ParchesConfigProps {
  config: PatchCustomization;
  onChange: (newConfig: PatchCustomization) => void;
}

export const ParchesConfig: React.FC<ParchesConfigProps> = ({ config, onChange }) => {
  
  const handleShapeChange = (shape: PatchCustomization['shape']) => {
    onChange({
      ...config,
      shape
    });
  };

  const handleDimensionChange = (field: 'width' | 'height', val: string) => {
    // Only allow positive numbers or decimals/empty
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      onChange({
        ...config,
        [field]: val
      });
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const qty = parseInt(e.target.value) || 1;
    onChange({
      ...config,
      quantity: Math.max(1, qty)
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`El archivo es demasiado grande. El límite es de 10 MB. Tu archivo pesa ${(file.size / (1024 * 1024)).toFixed(2)} MB.`);
      e.target.value = '';
      return;
    }

    // Check file format
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Solo se permiten archivos de imagen en formato JPEG, JPG o PNG.');
      e.target.value = '';
      return;
    }

    // Convert file to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange({
        ...config,
        file,
        filePreview: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    onChange({
      ...config,
      file: null,
      filePreview: ''
    });
  };

  const shapesList: PatchCustomization['shape'][] = ['Rectangular', 'Cuadrado', 'Circular', 'Forma del diseño'];

  return (
    <div className="custom-card bg-black border border-primary-subtle-10">
      <h3 className="font-display text-primary-brand mb-4">
        <i className="bi bi-patch-check-fill me-2"></i>
        Configurar Parches Personalizados
      </h3>

      {/* 1. Forma del Parche */}
      <div className="mb-4">
        <label className="form-label text-muted small uppercase fw-bold">Forma del Parche:</label>
        <div className="row g-2">
          {shapesList.map(s => (
            <div key={s} className="col-6 col-sm-3">
              <div 
                className={`p-2 p-sm-3 border rounded text-center cursor-pointer h-100 d-flex flex-column align-items-center justify-content-center ${config.shape === s ? 'border-danger bg-danger bg-opacity-10 text-white' : 'border-secondary bg-dark text-muted'}`}
                onClick={() => handleShapeChange(s)}
              >
                {s === 'Rectangular' && <i className="bi bi-aspect-ratio fs-3 mb-2"></i>}
                {s === 'Cuadrado' && <i className="bi bi-square fs-3 mb-2"></i>}
                {s === 'Circular' && <i className="bi bi-circle fs-3 mb-2"></i>}
                {s === 'Forma del diseño' && <i className="bi bi-star fs-3 mb-2"></i>}
                <div className="small fw-semibold">{s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Medidas (Ancho y Alto) */}
      <div className="mb-4">
        <label className="form-label text-muted small uppercase fw-bold">Medidas del Parche (en CM):</label>
        <div className="row g-3">
          <div className="col-6">
            <label className="form-label text-muted small mb-1">Ancho (cm):</label>
            <input
              type="text"
              className="form-control"
              value={config.width}
              onChange={(e) => handleDimensionChange('width', e.target.value)}
              placeholder="Ej. 8.5"
            />
          </div>
          <div className="col-6">
            <label className="form-label text-muted small mb-1">Alto (cm):</label>
            <input
              type="text"
              className="form-control"
              value={config.height}
              onChange={(e) => handleDimensionChange('height', e.target.value)}
              placeholder="Ej. 5.0"
            />
          </div>
        </div>
      </div>

      {/* 3. Cantidad */}
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

      {/* 4. Subida del Diseño */}
      <div className="mb-4">
        <label className="form-label text-muted small uppercase fw-bold">Subir Diseño del Parche:</label>
        <p className="text-muted small mb-2">Sube la imagen para bordar o estampar en tu parche (JPEG/PNG, máx. 10MB):</p>
        
        {!config.filePreview ? (
          <div className="border border-secondary border-dashed p-4 rounded text-center">
            <input
              type="file"
              id="patch-design-file"
              className="d-none"
              accept=".jpeg,.jpg,.png"
              onChange={handleFileUpload}
            />
            <label htmlFor="patch-design-file" className="m-0 cursor-pointer text-primary-brand font-display fs-4">
              <i className="bi bi-cloud-arrow-up-fill me-2"></i>
              Seleccionar Imagen
            </label>
            <p className="text-muted small m-0 mt-1">El archivo se guardará como parche-{config.shape.toLowerCase().replace(/\s+/g, '-')}.jpg/png</p>
          </div>
        ) : (
          <div className="d-flex align-items-center gap-3 p-3 bg-dark rounded border border-secondary">
            <img 
              src={config.filePreview} 
              alt="preview" 
              className="object-fit-cover rounded border border-secondary"
              style={{ width: '80px', height: '80px' }}
            />
            <div className="flex-grow-1 overflow-hidden">
              <p className="small m-0 text-truncate text-light fw-semibold">{config.file?.name}</p>
              <p className="small m-0 text-muted">{(config.file!.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            <button 
              type="button" 
              className="btn btn-outline-danger"
              onClick={removeFile}
            >
              <i className="bi bi-trash"></i> Quitar
            </button>
          </div>
        )}
      </div>

      {/* 5. Detalles Adicionales */}
      <div className="mb-2">
        <label className="form-label text-muted small uppercase fw-bold">Detalles adicionales para tu parche:</label>
        <textarea
          className="form-control"
          rows={3}
          value={config.additionalDetails}
          onChange={(e) => onChange({ ...config, additionalDetails: e.target.value })}
          placeholder="Especifica el tipo de contorno, colores de hilo preferidos, si requiere velcro en la parte posterior, o cualquier otro detalle..."
        />
      </div>
    </div>
  );
};
