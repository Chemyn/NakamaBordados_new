"use client";

import React from 'react';
import type { ProductType } from '../types';

interface VisualizerProps {
  productType: ProductType;
  selectedPositions: string[];
  onPositionToggle: (position: string) => void;
  onPositionRemove: (position: string) => void;
  selectedEditingPosition: string | null;
  onSelectPositionForEditing: (position: string) => void;
  patchShape?: 'Rectangular' | 'Cuadrado' | 'Circular' | 'Forma del diseño';
  garmentModel?: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({
  productType,
  selectedPositions,
  onPositionToggle,
  onPositionRemove,
  selectedEditingPosition,
  onSelectPositionForEditing,
  patchShape = 'Rectangular',
  garmentModel
}) => {
  const [pendingZone, setPendingZone] = React.useState<string | null>(null);
  // Zona ya activa sobre la que se hizo clic: abre el mini-menú Editar/Quitar
  // para poder deseleccionarla in-situ (sin bajar al panel de áreas activas).
  const [managingZone, setManagingZone] = React.useState<string | null>(null);

  // Reset popups if product type changes
  React.useEffect(() => {
    setPendingZone(null);
    setManagingZone(null);
  }, [productType]);

  const isPositionActive = (pos: string) => selectedPositions.includes(pos);
  const isPositionEditing = (pos: string) => selectedEditingPosition === pos;

  const handleZoneClick = (pos: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPositionActive(pos)) {
      // Zona ya seleccionada: ofrecer Editar o Quitar directamente aquí.
      setManagingZone(pos);
      setPendingZone(null);
    } else {
      setManagingZone(null);
      setPendingZone(pos);
    }
  };

  const getZoneStyles = (pos: string) => {
    const active = isPositionActive(pos);
    const editing = isPositionEditing(pos);
    
    if (editing) {
      return {
        fill: 'rgba(255, 51, 51, 0.22)',
        stroke: '#FF3333',
        strokeWidth: 2,
        strokeDasharray: '3 2',
        cursor: 'pointer'
      };
    } else if (active) {
      return {
        fill: 'rgba(255, 51, 51, 0.08)',
        stroke: 'rgba(255, 51, 51, 0.5)',
        strokeWidth: 1.5,
        cursor: 'pointer'
      };
    } else {
      return {
        fill: 'transparent',
        stroke: 'rgba(0, 0, 0, 0.12)',
        strokeWidth: 0.8,
        strokeDasharray: '3 3',
        cursor: 'pointer'
      };
    }
  };

  const renderRopaVisualizer = () => {
    const shirtFrontPath = "M 40 16 Q 50 23 60 16 L 74 21 L 88 36 L 80 46 L 71 38 L 71 88 Q 50 92 29 88 L 29 38 L 20 46 L 12 36 L 26 21 Z";
    const shirtBackPath = "M 40 16 Q 50 19 60 16 L 74 21 L 88 36 L 80 46 L 71 38 L 71 88 Q 50 92 29 88 L 29 38 L 20 46 L 12 36 L 26 21 Z";

    return (
      <div className="row g-4 justify-content-center text-center">
        {/* VISTA FRONTAL */}
        <div className="col-12 col-md-6">
          <h5 className="text-muted mb-2 font-display fs-6">VISTA FRONTAL (Haz clic en una zona para configurar)</h5>
          <div className="position-relative d-inline-block mx-auto bg-white border border-light-subtle p-3 rounded" style={{ maxWidth: '280px', width: '100%' }}>
            <svg viewBox="0 0 100 100" className="w-100" style={{ height: '240px' }}>
              {/* Shirt Outline */}
              <path d={shirtFrontPath} fill="#F8FAFC" stroke="#64748B" strokeWidth="1.5" />
              {/* Collar Line */}
              <path d="M 40 16 Q 50 24 60 16" fill="none" stroke="#475569" strokeWidth="1.2" />
              {/* Sleeve stitch guidelines */}
              <path d="M 29 38 L 20 46" fill="none" stroke="#94A3B8" strokeWidth="0.8" strokeDasharray="1 1" />
              <path d="M 71 38 L 80 46" fill="none" stroke="#94A3B8" strokeWidth="0.8" strokeDasharray="1 1" />

              {/* Hit-areas táctiles ampliadas (~44px en móvil): los rects
                  visibles de pecho miden ~26px renderizados y son difíciles
                  de tocar. Van ANTES para que las zonas visibles conserven
                  prioridad de clic donde se traslapan. */}
              {/* Vista espejo (se ve a la persona de frente): su pecho DERECHO
                  cae a la IZQUIERDA de la imagen y viceversa. Por eso el rect de
                  la izquierda se etiqueta 'Pecho Derecho' y el de la derecha
                  'Pecho Izquierdo'. */}
              <rect x="29.5" y="23.5" width="18" height="18" fill="transparent" style={{ cursor: 'pointer' }} onClick={(e) => handleZoneClick('Pecho Derecho', e)} />
              <rect x="52.5" y="23.5" width="18" height="18" fill="transparent" style={{ cursor: 'pointer' }} onClick={(e) => handleZoneClick('Pecho Izquierdo', e)} />
              <rect x="41" y="24.5" width="18" height="18" fill="transparent" style={{ cursor: 'pointer' }} onClick={(e) => handleZoneClick('Pecho en Medio', e)} />

              {/* Clickable Overlay Zones */}
              {/* Pecho Derecho (lado izquierdo de la imagen, vista espejo) */}
              <rect x="33" y="27" width="11" height="11" rx="2" {...getZoneStyles('Pecho Derecho')} onClick={(e) => handleZoneClick('Pecho Derecho', e)} />

              {/* Pecho Izquierdo (lado derecho de la imagen, vista espejo) */}
              <rect x="56" y="27" width="11" height="11" rx="2" {...getZoneStyles('Pecho Izquierdo')} onClick={(e) => handleZoneClick('Pecho Izquierdo', e)} />

              {/* Pecho en Medio */}
              <rect x="45" y="29" width="10" height="9" rx="2" {...getZoneStyles('Pecho en Medio')} onClick={(e) => handleZoneClick('Pecho en Medio', e)} />
              
              {/* Frente Completo */}
              <rect x="31" y="44" width="38" height="34" rx="3" {...getZoneStyles('Enfrente')} onClick={(e) => handleZoneClick('Enfrente', e)} />
              
              {/* Manga Derecha (lado izquierdo de la imagen, vista espejo) */}
              {garmentModel !== 'Tank Top' && (
                <path d="M 26 21 L 12 36 L 20 46 L 29 38 Z" {...getZoneStyles('Manga Derecha')} onClick={(e) => handleZoneClick('Manga Derecha', e)} />
              )}

              {/* Manga Izquierda (lado derecho de la imagen, vista espejo) */}
              {garmentModel !== 'Tank Top' && (
                <path d="M 74 21 L 88 36 L 80 46 L 71 38 Z" {...getZoneStyles('Manga Izquierda')} onClick={(e) => handleZoneClick('Manga Izquierda', e)} />
              )}
            </svg>
          </div>
        </div>

        {/* VISTA TRASERA */}
        <div className="col-12 col-md-6">
          <h5 className="text-muted mb-2 font-display fs-6">VISTA POSTERIOR (Haz clic en una zona para configurar)</h5>
          <div className="position-relative d-inline-block mx-auto bg-white border border-light-subtle p-3 rounded" style={{ maxWidth: '280px', width: '100%' }}>
            <svg viewBox="0 0 100 100" className="w-100" style={{ height: '240px' }}>
              {/* Shirt Outline Back */}
              <path d={shirtBackPath} fill="#F8FAFC" stroke="#64748B" strokeWidth="1.5" />
              {/* Collar Line Back */}
              <path d="M 40 16 Q 50 19 60 16" fill="none" stroke="#475569" strokeWidth="1.2" />
              {/* Sleeve stitching */}
              <path d="M 29 38 L 20 46" fill="none" stroke="#94A3B8" strokeWidth="0.8" strokeDasharray="1 1" />
              <path d="M 71 38 L 80 46" fill="none" stroke="#94A3B8" strokeWidth="0.8" strokeDasharray="1 1" />

              {/* Clickable Zone Espalda */}
              <rect x="28" y="28" width="44" height="50" rx="3" {...getZoneStyles('Espalda')} onClick={(e) => handleZoneClick('Espalda', e)} />
            </svg>
          </div>
        </div>
      </div>
    );
  };

  const renderGorrasVisualizer = () => {
    return (
      <div className="row g-3 justify-content-center text-center">
        {/* VISTA FRONTAL */}
        <div className="col-6 col-md-3">
          <h5 className="text-muted mb-2 font-display fs-6">VISTA FRONTAL</h5>
          <div className="position-relative d-inline-block w-100 bg-white border border-light-subtle p-2 rounded">
            <svg viewBox="0 0 100 100" className="w-100" style={{ height: '140px' }}>
              {/* Crown */}
              <path d="M 20 70 C 15 35, 30 22, 50 22 C 70 22, 85 35, 80 70 Z" fill="#F8FAFC" stroke="#64748B" strokeWidth="1.5" />
              {/* Panels Stitching lines */}
              <path d="M 50 22 L 50 70" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 2" />
              <path d="M 50 22 C 38 30, 24 50, 20 70" fill="none" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 2" />
              <path d="M 50 22 C 62 30, 76 50, 80 70" fill="none" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 2" />
              {/* Visor */}
              <path d="M 16 71 C 25 82, 75 82, 84 71 C 86 69, 81 67, 80 67 C 70 68, 30 68, 20 67 C 19 67, 14 69, 16 71 Z" fill="#E2E8F0" stroke="#64748B" strokeWidth="1.5" />
              {/* Visor stitching lines */}
              <path d="M 22 71 C 32 80, 68 80, 78 71" fill="none" stroke="#94A3B8" strokeWidth="1" strokeDasharray="1 1" />
              {/* Button */}
              <circle cx="50" cy="22" r="3.5" fill="#475569" stroke="#334155" strokeWidth="1" />
              {/* Active zone: Frontal */}
              <path d="M 32 32 C 32 32, 50 28, 68 32 C 74 44, 74 58, 68 64 C 50 66, 32 66, 32 64 C 26 58, 26 44, 32 32 Z" {...getZoneStyles('Frontal')} onClick={(e) => handleZoneClick('Frontal', e)} />
            </svg>
          </div>
        </div>

        {/* VISTA LATERAL IZQUIERDA */}
        <div className="col-6 col-md-3">
          <h5 className="text-muted mb-2 font-display fs-6">LADO IZQUIERDO</h5>
          <div className="position-relative d-inline-block w-100 bg-white border border-light-subtle p-2 rounded">
            <svg viewBox="0 0 100 100" className="w-100" style={{ height: '140px' }}>
              {/* Crown */}
              <path d="M 82 70 C 80 32, 55 24, 35 34 C 28 38, 26 48, 25 70 Z" fill="#F8FAFC" stroke="#64748B" strokeWidth="1.5" />
              {/* Visor pointing left (straighter) */}
              <path d="M 26 68 C 16 68, 6 72, 4 75 C 10 79, 22 76, 26 71 Z" fill="#E2E8F0" stroke="#64748B" strokeWidth="1.5" />
              {/* Adjuster strap on the right (back of head) */}
              <path d="M 80 68 Q 85 70 88 74 L 86 78 Q 83 75 80 72 Z" fill="#475569" stroke="#334155" strokeWidth="1" />
              {/* Button */}
              <circle cx="58" cy="26" r="3" fill="#475569" stroke="#334155" strokeWidth="1" />
              {/* Active zone: Lateral izquierdo */}
              <path d="M 38 42 C 45 40, 68 40, 74 45 C 76 56, 74 64, 70 67 C 62 68, 40 68, 36 64 C 34 58, 34 46, 38 42 Z" {...getZoneStyles('Lateral izquierdo')} onClick={(e) => handleZoneClick('Lateral izquierdo', e)} />
            </svg>
          </div>
        </div>

        {/* VISTA LATERAL DERECHA */}
        <div className="col-6 col-md-3">
          <h5 className="text-muted mb-2 font-display fs-6">LADO DERECHO</h5>
          <div className="position-relative d-inline-block w-100 bg-white border border-light-subtle p-2 rounded">
            <svg viewBox="0 0 100 100" className="w-100" style={{ height: '140px' }}>
              {/* Crown */}
              <path d="M 18 70 C 20 32, 45 24, 65 34 C 72 38, 74 48, 75 70 Z" fill="#F8FAFC" stroke="#64748B" strokeWidth="1.5" />
              {/* Visor pointing right (straighter) */}
              <path d="M 74 68 C 84 68, 94 72, 96 75 C 90 79, 78 76, 74 71 Z" fill="#E2E8F0" stroke="#64748B" strokeWidth="1.5" />
              {/* Adjuster strap on the left (back of head) */}
              <path d="M 20 68 Q 15 70 12 74 L 14 78 Q 17 75 20 72 Z" fill="#475569" stroke="#334155" strokeWidth="1" />
              {/* Button */}
              <circle cx="42" cy="26" r="3" fill="#475569" stroke="#334155" strokeWidth="1" />
              {/* Active zone: Lateral derecho */}
              <path d="M 62 42 C 55 40, 32 40, 26 45 C 24 56, 26 64, 30 67 C 38 68, 60 68, 64 64 C 66 58, 66 46, 62 42 Z" {...getZoneStyles('Lateral derecho')} onClick={(e) => handleZoneClick('Lateral derecho', e)} />
            </svg>
          </div>
        </div>

        {/* VISTA TRASERA */}
        <div className="col-6 col-md-3">
          <h5 className="text-muted mb-2 font-display fs-6">PARTE TRASERA</h5>
          <div className="position-relative d-inline-block w-100 bg-white border border-light-subtle p-2 rounded">
            <svg viewBox="0 0 100 100" className="w-100" style={{ height: '140px' }}>
              {/* Crown */}
              <path d="M 20 70 C 15 35, 30 22, 50 22 C 70 22, 85 35, 80 70 Z" fill="#F8FAFC" stroke="#64748B" strokeWidth="1.5" />
              {/* Cap opening arch for closure */}
              <path d="M 32 70 C 32 55, 68 55, 68 70 Z" fill="#FFFFFF" stroke="#64748B" strokeWidth="1.5" />
              {/* Snapback closure strap */}
              <path d="M 30 66 C 40 68, 60 68, 70 66 L 70 69 C 60 71, 40 71, 30 69 Z" fill="#1E293B" stroke="#0F172A" strokeWidth="0.8" />
              {/* Stitching lines */}
              <path d="M 50 22 L 50 55" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 2" />
              {/* Button */}
              <circle cx="50" cy="22" r="3.5" fill="#475569" stroke="#334155" strokeWidth="1" />
              {/* Active zone: Parte trasera */}
              <path d="M 32 28 C 32 28, 50 24, 68 28 C 74 38, 74 48, 68 53 C 50 55, 32 55, 32 53 C 26 48, 26 38, 32 28 Z" {...getZoneStyles('Parte trasera')} onClick={(e) => handleZoneClick('Parte trasera', e)} />
            </svg>
          </div>
        </div>
      </div>
    );
  };

  const renderParchesVisualizer = () => {
    const getShapeSVG = () => {
      switch (patchShape) {
        case 'Circular':
          return <circle cx="50" cy="50" r="40" fill="none" stroke="#FF3333" strokeWidth="1.5" strokeDasharray="4 4" />;
        case 'Cuadrado':
          return <rect x="15" y="15" width="70" height="70" rx="4" fill="none" stroke="#FF3333" strokeWidth="1.5" strokeDasharray="4 4" />;
        case 'Forma del diseño':
          return (
            <path 
              d="M30 20 C 35 15, 65 15, 70 20 C 85 30, 85 70, 70 80 C 65 85, 35 85, 30 80 C 15 70, 15 30, 30 20 Z" 
              fill="none" 
              stroke="#FF3333" 
              strokeWidth="1.5" 
              strokeDasharray="4 4" 
            />
          );
        case 'Rectangular':
        default:
          return <rect x="10" y="25" width="80" height="50" rx="4" fill="none" stroke="#FF3333" strokeWidth="1.5" strokeDasharray="4 4" />;
      }
    };

    return (
      <div className="text-center">
        <h5 className="text-muted mb-2 font-display">SILUETA DEL PARCHE</h5>
        <div className="position-relative d-inline-block mx-auto bg-white border border-light-subtle p-4 rounded" style={{ maxWidth: '350px', width: '100%' }}>
          <svg viewBox="0 0 100 100" className="w-100" style={{ height: '220px' }}>
            {getShapeSVG()}
            <text x="50" y="52" fill="#64748B" fontSize="6" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">
              DISEÑO & CONTORNO
            </text>
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="custom-card mb-4 bg-white border border-light-subtle position-relative">
      <h3 className="font-display text-primary-brand mb-3">
        <i className="bi bi-eye-fill me-2"></i>
        Visualizador Interactivo
      </h3>
      <p className="text-muted small mb-4">
        {productType === 'parches' 
          ? 'Visualiza la forma y proporción del contorno para tu parche bordado.' 
          : 'Haz clic directamente sobre la prenda para seleccionar y cambiar las posiciones de personalización.'}
      </p>

      {productType === 'ropa' && renderRopaVisualizer()}
      {productType === 'gorras' && renderGorrasVisualizer()}
      {productType === 'parches' && renderParchesVisualizer()}

      {pendingZone && (
        <div 
          className="position-absolute top-50 start-50 translate-middle p-3 bg-white border border-light-subtle shadow-lg rounded-3 text-center"
          style={{ zIndex: 100, width: '90%', maxWidth: '260px' }}
        >
          <div className="mb-3">
            <i className="bi bi-question-circle-fill text-danger fs-3"></i>
            <h6 className="text-dark mt-2 mb-1 fw-bold font-display uppercase tracking-wider small">
              ¿Personalizar esta zona?
            </h6>
            <p className="text-muted small m-0 uppercase tracking-widest fw-semibold" style={{ fontSize: '10px' }}>
              {pendingZone}
            </p>
          </div>
          <div className="d-flex justify-content-center gap-2">
            <button 
              type="button" 
              className="btn btn-danger btn-sm font-display px-3 py-1.5 shadow-sm"
              onClick={() => {
                onPositionToggle(pendingZone);
                setPendingZone(null);
              }}
            >
              Sí, Añadir
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm font-display px-3 py-1.5"
              onClick={() => setPendingZone(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {managingZone && (
        <div
          className="position-absolute top-50 start-50 translate-middle p-3 bg-white border border-light-subtle shadow-lg rounded-3 text-center"
          style={{ zIndex: 100, width: '90%', maxWidth: '260px' }}
        >
          <div className="mb-3">
            <i className="bi bi-check-circle-fill text-danger fs-3"></i>
            <h6 className="text-dark mt-2 mb-1 fw-bold font-display uppercase tracking-wider small">
              Zona seleccionada
            </h6>
            <p className="text-muted small m-0 uppercase tracking-widest fw-semibold" style={{ fontSize: '10px' }}>
              {managingZone}
            </p>
          </div>
          <div className="d-flex justify-content-center gap-2">
            <button
              type="button"
              className="btn btn-danger btn-sm font-display px-3 py-1.5"
              onClick={() => {
                onPositionRemove(managingZone);
                setManagingZone(null);
              }}
            >
              <i className="bi bi-x-circle me-1"></i> Quitar
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm font-display px-3 py-1.5"
              onClick={() => {
                onSelectPositionForEditing(managingZone);
                setManagingZone(null);
              }}
            >
              Editar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
