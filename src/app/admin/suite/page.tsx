'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// =================================================================
// TYPES
// =================================================================
interface VariationItem {
  sku: string;
  price: number;
  attributes: Record<string, string>;
  image_id: string;
}

interface ProductCard {
  id: string;
  name: string;
  sku: string;
  description: string;
  categories: string[];
  tags: string[];
  type: 'variable' | 'simple';
  variations: VariationItem[];
  imageGroups: Record<string, { label: string; imageUrl: string; indices: VariationItem[] }>;
  displayPrice: string;
}

// =================================================================
// CONSTANTS
// =================================================================
const DEFAULT_CATEGORIES = [
  { id: 1, display: 'Anime' },
  { id: 2, display: 'Bordados' },
  { id: 3, display: 'Estampados' },
  { id: 4, display: 'Camisetas (Estampados)' },
  { id: 5, display: 'Oversize (Estampados)' },
  { id: 6, display: 'Camisetas (Bordados)' },
  { id: 7, display: 'Oversize (Bordados)' },
  { id: 8, display: 'Sudaderas' },
  { id: 9, display: 'Hoodies' },
  { id: 10, display: 'Acid Wash' },
  { id: 11, display: 'Tank Top' },
  { id: 12, display: 'One Piece' },
  { id: 13, display: 'Dragon Ball' },
  { id: 14, display: 'Naruto' },
  { id: 15, display: 'Jujutsu Kaisen' },
  { id: 16, display: 'Demon Slayer' },
];

const DEFAULT_TAGS = [
  'Nuevo', 'Bestseller', 'Limitado', 'Promoción', 'Hot Sale', 'Pre-venta', 'Exclusivo',
];

const ATTR_OPTIONS: Record<string, string[]> = {
  Color: ['Negro', 'Blanco', 'Hueso', 'Kaki', 'Gris', 'Azul Marino'],
  Estilo: ['T-shirt', 'Oversize', 'Acid Wash', 'Tank Top', 'Sudadera', 'Hoodie'],
  Talla: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
};

const TEMPLATES: Record<string, { label: string; colorGroup: string; config: { st: string; sz: string[]; pr: number; cols: string[] }[] }> = {
  semi: {
    label: 'Semitono (Negro)', colorGroup: 'gray',
    config: [
      { st: 'T-shirt', sz: ['S','M','L','XL'], pr: 299, cols: ['Negro'] },
      { st: 'T-shirt', sz: ['2XL'], pr: 330, cols: ['Negro'] },
      { st: 'Oversize', sz: ['S','M','L','XL'], pr: 399, cols: ['Negro'] },
      { st: 'Oversize', sz: ['2XL','3XL'], pr: 439, cols: ['Negro'] },
      { st: 'Sudadera', sz: ['S','M','L','XL'], pr: 399, cols: ['Negro','Kaki'] },
      { st: 'Sudadera', sz: ['2XL'], pr: 439, cols: ['Negro','Kaki'] },
    ],
  },
  full: {
    label: 'Full Colors', colorGroup: 'purple',
    config: [
      { st: 'T-shirt', sz: ['S','M','L','XL'], pr: 299, cols: ['Negro','Blanco','Hueso'] },
      { st: 'T-shirt', sz: ['2XL'], pr: 330, cols: ['Negro','Blanco','Hueso'] },
      { st: 'Oversize', sz: ['S','M','L','XL'], pr: 399, cols: ['Negro','Blanco','Hueso'] },
      { st: 'Oversize', sz: ['2XL','3XL'], pr: 439, cols: ['Negro','Blanco','Hueso'] },
      { st: 'Sudadera', sz: ['S','M','L','XL'], pr: 399, cols: ['Negro','Kaki'] },
      { st: 'Sudadera', sz: ['2XL'], pr: 439, cols: ['Negro','Kaki'] },
    ],
  },
  peq: {
    label: 'Bordados Pequeños', colorGroup: 'emerald',
    config: [
      { st: 'T-shirt', sz: ['S','M','L','XL'], pr: 299, cols: ['Negro','Blanco','Hueso'] },
      { st: 'T-shirt', sz: ['2XL'], pr: 319, cols: ['Negro','Blanco','Hueso'] },
      { st: 'Oversize', sz: ['S','M','L','XL'], pr: 449, cols: ['Negro','Blanco','Hueso'] },
      { st: 'Oversize', sz: ['2XL','3XL'], pr: 489, cols: ['Negro','Blanco','Hueso'] },
      { st: 'Hoodie', sz: ['S','M','L','XL'], pr: 539, cols: ['Negro','Kaki'] },
      { st: 'Hoodie', sz: ['2XL'], pr: 589, cols: ['Negro','Kaki'] },
    ],
  },
  comp: {
    label: 'Bordados Completos', colorGroup: 'emerald',
    config: [
      { st: 'T-shirt', sz: ['S','M','L','XL'], pr: 399, cols: ['Negro','Blanco','Hueso'] },
      { st: 'T-shirt', sz: ['2XL'], pr: 419, cols: ['Negro','Blanco','Hueso'] },
      { st: 'Oversize', sz: ['S','M','L','XL'], pr: 549, cols: ['Negro','Blanco','Hueso'] },
      { st: 'Oversize', sz: ['2XL','3XL'], pr: 589, cols: ['Negro','Blanco','Hueso'] },
      { st: 'Hoodie', sz: ['S','M','L','XL'], pr: 639, cols: ['Negro','Kaki'] },
      { st: 'Hoodie', sz: ['2XL'], pr: 689, cols: ['Negro','Kaki'] },
    ],
  },
};

const TEMPLATE_DESC = '✨ Fabricado con pasión en Nakama Bordados ✨\n\nCada uno de nuestros productos es elaborado cuidadosamente en nuestro taller, combinando bordado y estampado de alta calidad para ofrecerte piezas únicas, duraderas y llenas de estilo.';

// =================================================================
// COMPONENT
// =================================================================
export default function AdminSuitePage() {
  const router = useRouter();
  const [screen, setScreen] = useState<'start' | 'manual' | 'review'>('start');

  // Form state
  const [productName, setProductName] = useState('');
  const [productSku, setProductSku] = useState('');
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [catFilter, setCatFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  // Attribute inputs
  const [colorInput, setColorInput] = useState('');
  const [estiloInput, setEstiloInput] = useState('');
  const [tallaInput, setTallaInput] = useState('');
  const [batchPrice, setBatchPrice] = useState('');

  // Pending variations (staging table)
  const [pendingVariations, setPendingVariations] = useState<VariationItem[]>([]);

  // Products list (review)
  const [products, setProducts] = useState<ProductCard[]>([]);

  // Upload simulation
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLog, setUploadLog] = useState<string[]>([]);

  // Dropdown visibility
  const [showColorList, setShowColorList] = useState(false);
  const [showEstiloList, setShowEstiloList] = useState(false);
  const [showTallaList, setShowTallaList] = useState(false);

  // ---------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------
  const toggleCat = (id: number) => {
    setSelectedCats((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const appendToInput = (setter: React.Dispatch<React.SetStateAction<string>>, value: string, current: string) => {
    setter(current ? `${current}, ${value}` : value);
  };

  const fillSizes = (type: 'normal' | 'full') => {
    setTallaInput(type === 'normal' ? 'S, M, L, XL, 2XL' : 'S, M, L, XL, 2XL, 3XL');
  };

  // ---------------------------------------------------------------
  // ADD BATCH VARIATIONS
  // ---------------------------------------------------------------
  const addBatchVariations = useCallback(() => {
    if (!batchPrice) { alert('Precio requerido'); return; }

    const defs: { name: string; values: string[] }[] = [];
    const parseVals = (s: string) => s.split(',').map((v) => v.trim()).filter(Boolean);

    const v1 = parseVals(colorInput);
    const v2 = parseVals(estiloInput);
    const v3 = parseVals(tallaInput);

    if (v1.length) defs.push({ name: 'Color', values: v1 });
    if (v2.length) defs.push({ name: 'Estilo', values: v2 });
    if (v3.length) defs.push({ name: 'Talla', values: v3 });

    if (!defs.length) { alert('Llena al menos un atributo'); return; }

    // Generate cartesian product
    type Combo = { name: string; value: string };
    const combos: Combo[][] = defs.reduce<Combo[][]>(
      (acc, def) =>
        acc.flatMap((existing) =>
          def.values.map((val) => [...existing, { name: def.name, value: val }])
        ),
      [[]]
    );

    const newVars: VariationItem[] = combos.map((combo) => {
      const attrs: Record<string, string> = {};
      combo.forEach((c) => { attrs[c.name] = c.value; });
      return { sku: productSku, price: parseFloat(batchPrice), attributes: attrs, image_id: '' };
    });

    setPendingVariations((prev) => [...prev, ...newVars]);
    setBatchPrice('');
  }, [colorInput, estiloInput, tallaInput, batchPrice, productSku]);

  // ---------------------------------------------------------------
  // APPLY TEMPLATE
  // ---------------------------------------------------------------
  const applyTemplate = (key: string) => {
    const tpl = TEMPLATES[key];
    if (!tpl) return;
    if (!confirm(`¿Aplicar plantilla: ${tpl.label}?\nEsto reemplazará la previsualización actual.`)) return;

    const newVars: VariationItem[] = [];
    tpl.config.forEach((grp) => {
      grp.cols.forEach((color) => {
        grp.sz.forEach((size) => {
          newVars.push({
            sku: productSku,
            price: grp.pr,
            attributes: { Color: color, Estilo: grp.st, Talla: size },
            image_id: '',
          });
        });
      });
    });

    setPendingVariations(newVars);
    setColorInput('');
    setEstiloInput('');
    setTallaInput('');
    setBatchPrice('');
  };

  // ---------------------------------------------------------------
  // FINALIZE & CREATE PRODUCT CARD
  // ---------------------------------------------------------------
  const finalizeProduct = () => {
    if (!pendingVariations.length) { alert('Sin variantes'); return; }

    const prices = pendingVariations.map((v) => v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const displayPrice = min === max ? `$${min}` : `$${min} - $${max}`;

    // Group variations by style (non-talla attributes)
    const groups: Record<string, { label: string; imageUrl: string; indices: VariationItem[] }> = {};
    pendingVariations.forEach((v) => {
      const parts: string[] = [];
      Object.entries(v.attributes).forEach(([k, val]) => {
        if (!k.toLowerCase().includes('talla') && !k.toLowerCase().includes('size')) parts.push(val);
      });
      const key = parts.length > 0 ? parts.join(' / ') : 'General';
      if (!groups[key]) groups[key] = { label: key, imageUrl: '', indices: [] };
      groups[key].indices.push(v);
    });

    const newProduct: ProductCard = {
      id: Math.random().toString(36).substring(2, 8),
      name: productName || 'Producto Sin Nombre',
      sku: productSku,
      description: TEMPLATE_DESC,
      categories: selectedCats.map((id) => DEFAULT_CATEGORIES.find((c) => c.id === id)?.display || '').filter(Boolean),
      tags: selectedTags,
      type: 'variable',
      variations: [...pendingVariations],
      imageGroups: groups,
      displayPrice,
    };

    setProducts((prev) => [...prev, newProduct]);
    setPendingVariations([]);
    setScreen('review');
  };

  // ---------------------------------------------------------------
  // SIMULATE UPLOAD
  // ---------------------------------------------------------------
  const simulateUpload = () => {
    if (!products.length) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadLog([]);

    let progress = 0;
    const totalSteps = products.reduce((acc, p) => acc + 1 + p.variations.length, 0);
    let currentStep = 0;

    const processNext = () => {
      if (currentStep >= totalSteps) {
        setUploadLog((prev) => [...prev, '✅ ¡Todos los productos han sido procesados correctamente!']);
        setIsUploading(false);
        return;
      }

      // Find which product/variation we're on
      let accumulated = 0;
      for (const p of products) {
        const pSteps = 1 + p.variations.length;
        if (currentStep < accumulated + pSteps) {
          const localStep = currentStep - accumulated;
          if (localStep === 0) {
            setUploadLog((prev) => [...prev, `📦 Creando producto padre: ${p.name} (SKU: ${p.sku})`]);
          } else {
            const v = p.variations[localStep - 1];
            const attrStr = Object.values(v.attributes).join(' / ');
            setUploadLog((prev) => [...prev, `  ↳ Variación: ${attrStr} → $${v.price}`]);
          }
          break;
        }
        accumulated += pSteps;
      }

      currentStep++;
      progress = Math.round((currentStep / totalSteps) * 100);
      setUploadProgress(progress);

      setTimeout(processNext, 80 + Math.random() * 120);
    };

    setTimeout(processNext, 300);
  };

  // ---------------------------------------------------------------
  // RESET
  // ---------------------------------------------------------------
  const resetAll = () => {
    if (confirm('¿Reiniciar todo?')) {
      setScreen('start');
      setProductName('');
      setProductSku('');
      setSelectedCats([]);
      setSelectedTags([]);
      setColorInput('');
      setEstiloInput('');
      setTallaInput('');
      setBatchPrice('');
      setPendingVariations([]);
      setProducts([]);
      setUploadLog([]);
      setUploadProgress(0);
      setIsUploading(false);
    }
  };

  // ---------------------------------------------------------------
  // FILTERED LISTS
  // ---------------------------------------------------------------
  const filteredCats = DEFAULT_CATEGORIES.filter((c) =>
    c.display.toLowerCase().includes(catFilter.toLowerCase())
  );
  const filteredTags = DEFAULT_TAGS.filter((t) =>
    t.toLowerCase().includes(tagFilter.toLowerCase())
  );

  // ---------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------
  return (
    <div className="nk-suite-modal">
      {/* HEADER */}
      <div className="nk-suite-header">
        <div>
          <h1 className="nk-suite-title">
            Nakama Suite <span style={{ color: 'var(--nk-primary)' }}>v37</span>
          </h1>
          <p className="nk-suite-subtitle">Importador de Productos • ImperioDev Edition</p>
        </div>
        <div className="nk-suite-header-actions">
          {screen !== 'start' && (
            <button className="nk-suite-btn-secondary" onClick={() => setScreen('start')}>Inicio</button>
          )}
          <button className="nk-suite-btn-secondary" onClick={() => router.push('/mi-cuenta')}>Cerrar</button>
          {screen === 'review' && products.length > 0 && !isUploading && (
            <button className="nk-suite-btn-primary" onClick={simulateUpload}>
              🚀 Subir
            </button>
          )}
        </div>
      </div>

      {/* PROGRESS BAR */}
      {isUploading && (
        <div className="nk-suite-progress-bar">
          <div className="nk-suite-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
        </div>
      )}

      {/* CONTENT */}
      <div className="nk-suite-body">

        {/* =================== START SCREEN =================== */}
        {screen === 'start' && (
          <div className="nk-suite-start nk-dash-animate">
            <div className="nk-suite-start-card" onClick={() => setScreen('manual')}>
              <span className="material-icons-outlined nk-suite-start-icon">edit_note</span>
              <h3>Creación Manual</h3>
              <p>Constructor visual de productos</p>
            </div>
            <div className="nk-suite-start-card" onClick={() => alert('La importación CSV está disponible en la versión con API. Aquí usa Creación Manual.')}>
              <span className="material-icons-outlined nk-suite-start-icon">folder_open</span>
              <h3>Importar CSV</h3>
              <p>Carga masiva desde archivo</p>
            </div>
          </div>
        )}

        {/* =================== MANUAL FORM =================== */}
        {screen === 'manual' && (
          <div className="nk-suite-manual nk-dash-animate">
            <div className="nk-suite-manual-header">
              <h2>Configuración</h2>
              <button className="nk-suite-danger-btn" onClick={() => {
                setProductName(''); setProductSku(''); setSelectedCats([]); setSelectedTags([]);
                setColorInput(''); setEstiloInput(''); setTallaInput(''); setBatchPrice('');
                setPendingVariations([]);
              }}>
                <span className="material-icons-outlined" style={{ fontSize: '16px' }}>delete_sweep</span> Limpiar Todo
              </button>
            </div>

            {/* Name & SKU */}
            <div className="nk-suite-form-grid">
              <div className="nk-form-group">
                <label className="nk-suite-label">Nombre del Producto</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="nk-input-base"
                  placeholder="Ej: Camiseta Luffy Gear 5"
                />
              </div>
              <div className="nk-form-group">
                <label className="nk-suite-label">SKU Base (Padre)</label>
                <input
                  type="text"
                  value={productSku}
                  onChange={(e) => setProductSku(e.target.value)}
                  className="nk-input-base"
                  placeholder="Ej: OP-LUFFY-G5"
                />
              </div>
            </div>

            {/* Categories & Tags */}
            <div className="nk-suite-form-grid" style={{ marginTop: '24px' }}>
              <div className="nk-form-group">
                <label className="nk-suite-label">Categorías</label>
                <input
                  type="text"
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  className="nk-input-base"
                  placeholder="Filtrar categorías..."
                  style={{ marginBottom: '8px' }}
                />
                <div className="nk-suite-checkbox-list">
                  {filteredCats.map((c) => (
                    <label key={c.id} className="nk-suite-checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedCats.includes(c.id)}
                        onChange={() => toggleCat(c.id)}
                      />
                      {c.display}
                    </label>
                  ))}
                </div>
              </div>
              <div className="nk-form-group">
                <label className="nk-suite-label">Etiquetas</label>
                <input
                  type="text"
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="nk-input-base"
                  placeholder="Filtrar etiquetas..."
                  style={{ marginBottom: '8px' }}
                />
                <div className="nk-suite-checkbox-list">
                  {filteredTags.map((t) => (
                    <label key={t} className="nk-suite-checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(t)}
                        onChange={() => toggleTag(t)}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* VARIANT BUILDER */}
            <div className="nk-suite-variant-builder">
              {/* Templates */}
              <div className="nk-suite-variant-header">
                <span className="nk-suite-variant-label">
                  <span className="material-icons-outlined">tune</span> Generador Rápido de Variantes
                </span>
              </div>

              <div className="nk-suite-tpl-section">
                <p className="nk-suite-tpl-group-label">🎨 Plantillas de Estampado</p>
                <div className="nk-suite-tpl-btns">
                  <button className="nk-suite-tpl-btn nk-tpl-gray" onClick={() => applyTemplate('semi')}>Semitono (Negro)</button>
                  <button className="nk-suite-tpl-btn nk-tpl-purple" onClick={() => applyTemplate('full')}>Full Colors</button>
                </div>
              </div>
              <div className="nk-suite-tpl-section">
                <p className="nk-suite-tpl-group-label">🧵 Plantillas de Bordado</p>
                <div className="nk-suite-tpl-btns">
                  <button className="nk-suite-tpl-btn nk-tpl-emerald" onClick={() => applyTemplate('peq')}>Pequeños</button>
                  <button className="nk-suite-tpl-btn nk-tpl-emerald" onClick={() => applyTemplate('comp')}>Completos</button>
                </div>
              </div>

              <div className="nk-suite-clear-row">
                <button className="nk-suite-clear-inputs-btn" onClick={() => {
                  setColorInput(''); setEstiloInput(''); setTallaInput(''); setBatchPrice('');
                }}>
                  <span className="material-icons-outlined" style={{ fontSize: '14px' }}>backspace</span> Limpiar Campos
                </button>
              </div>

              {/* Attribute Inputs */}
              <div className="nk-suite-attr-row">
                <span className="nk-suite-attr-label">Color</span>
                <div className="nk-suite-attr-input-wrapper">
                  <input
                    type="text"
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    onFocus={() => setShowColorList(true)}
                    className="nk-input-base"
                    placeholder="Ej: Negro, Blanco"
                  />
                  {showColorList && (
                    <div className="nk-suite-datalist" onMouseLeave={() => setShowColorList(false)}>
                      {ATTR_OPTIONS.Color.map((opt) => (
                        <div key={opt} className="nk-suite-datalist-opt" onClick={() => { appendToInput(setColorInput, opt, colorInput); setShowColorList(false); }}>
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="nk-suite-attr-row">
                <span className="nk-suite-attr-label">Estilo</span>
                <div className="nk-suite-attr-input-wrapper">
                  <input
                    type="text"
                    value={estiloInput}
                    onChange={(e) => setEstiloInput(e.target.value)}
                    onFocus={() => setShowEstiloList(true)}
                    className="nk-input-base"
                    placeholder="Ej: Oversize, T-shirt"
                  />
                  {showEstiloList && (
                    <div className="nk-suite-datalist" onMouseLeave={() => setShowEstiloList(false)}>
                      {ATTR_OPTIONS.Estilo.map((opt) => (
                        <div key={opt} className="nk-suite-datalist-opt" onClick={() => { appendToInput(setEstiloInput, opt, estiloInput); setShowEstiloList(false); }}>
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="nk-suite-attr-row">
                <span className="nk-suite-attr-label">Talla</span>
                <div className="nk-suite-attr-input-wrapper">
                  <div className="nk-suite-size-shortcuts">
                    <button onClick={() => fillSizes('normal')}>S-2XL</button>
                    <button onClick={() => fillSizes('full')}>S-3XL</button>
                  </div>
                  <input
                    type="text"
                    value={tallaInput}
                    onChange={(e) => setTallaInput(e.target.value)}
                    onFocus={() => setShowTallaList(true)}
                    className="nk-input-base"
                    placeholder="Ej: S, M, L"
                  />
                  {showTallaList && (
                    <div className="nk-suite-datalist" onMouseLeave={() => setShowTallaList(false)}>
                      {ATTR_OPTIONS.Talla.map((opt) => (
                        <div key={opt} className="nk-suite-datalist-opt" onClick={() => { appendToInput(setTallaInput, opt, tallaInput); setShowTallaList(false); }}>
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Batch Price & Add */}
              <div className="nk-suite-batch-row">
                <div className="nk-suite-batch-price">
                  <label className="nk-suite-label">Precio del Lote ($)</label>
                  <input
                    type="number"
                    value={batchPrice}
                    onChange={(e) => setBatchPrice(e.target.value)}
                    className="nk-input-base nk-input-price"
                    placeholder="0.00"
                  />
                </div>
                <button className="nk-suite-add-batch-btn" onClick={addBatchVariations}>
                  ➕ Agregar Variantes
                </button>
              </div>

              {/* Staging Table */}
              {pendingVariations.length > 0 && (
                <div className="nk-suite-staging">
                  <div className="nk-suite-staging-header">
                    <h4>
                      <span className="nk-suite-staging-dot"></span> Previsualización ({pendingVariations.length} variantes)
                    </h4>
                    <button className="nk-suite-danger-btn" onClick={() => {
                      if (confirm('¿Borrar variantes?')) setPendingVariations([]);
                    }}>
                      Borrar Todo
                    </button>
                  </div>
                  <div className="nk-suite-staging-table">
                    <div className="nk-suite-staging-thead">
                      <div className="nk-col-3">SKU Ref</div>
                      <div className="nk-col-5">Combinación</div>
                      <div className="nk-col-2">Precio</div>
                      <div className="nk-col-2" style={{ textAlign: 'right' }}>Borrar</div>
                    </div>
                    <div className="nk-suite-staging-tbody">
                      {pendingVariations.map((v, i) => (
                        <div className="nk-suite-staging-row" key={i}>
                          <div className="nk-col-3 nk-staging-sku">{productSku}</div>
                          <div className="nk-col-5 nk-staging-attrs">
                            {Object.values(v.attributes).join(' / ')}
                          </div>
                          <div className="nk-col-2 nk-staging-price">${v.price}</div>
                          <div className="nk-col-2" style={{ textAlign: 'right' }}>
                            <button
                              className="nk-suite-remove-var"
                              onClick={() => setPendingVariations((prev) => prev.filter((_, idx) => idx !== i))}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Finalize Button */}
            <button className="nk-suite-finalize-btn" onClick={finalizeProduct}>
              ✅ Confirmar y Crear Tarjeta
            </button>
          </div>
        )}

        {/* =================== REVIEW SCREEN =================== */}
        {screen === 'review' && (
          <div className="nk-suite-review nk-dash-animate">
            {products.length === 0 ? (
              <div className="nk-suite-empty">
                <span className="material-icons-outlined" style={{ fontSize: '48px', color: 'var(--nk-text-sec)' }}>inventory_2</span>
                <p>No hay productos en la cola. Vuelve al inicio para crear uno.</p>
              </div>
            ) : (
              <div className="nk-suite-products-grid">
                {products.map((p) => (
                  <div className="nk-suite-product-card" key={p.id}>
                    <div className="nk-suite-product-card-header">
                      <div>
                        <h3 className="nk-suite-product-name">{p.name}</h3>
                        <p className="nk-suite-product-sku">SKU: {p.sku}</p>
                      </div>
                      <span className="nk-suite-product-price">{p.displayPrice}</span>
                    </div>
                    <div className="nk-suite-product-meta">
                      <div className="nk-suite-meta-tag">
                        <span className="material-icons-outlined" style={{ fontSize: '14px' }}>category</span>
                        {p.categories.join(', ') || 'Sin categoría'}
                      </div>
                      <div className="nk-suite-meta-tag">
                        <span className="material-icons-outlined" style={{ fontSize: '14px' }}>sell</span>
                        {p.tags.join(', ') || 'Sin etiquetas'}
                      </div>
                      <div className="nk-suite-meta-tag">
                        <span className="material-icons-outlined" style={{ fontSize: '14px' }}>layers</span>
                        {p.variations.length} variaciones
                      </div>
                    </div>
                    {/* Image groups */}
                    <div className="nk-suite-image-groups">
                      {Object.entries(p.imageGroups).map(([key, grp]) => (
                        <div className="nk-suite-img-group" key={key}>
                          <div className="nk-suite-img-thumb">
                            <span className="material-icons-outlined">add_photo_alternate</span>
                          </div>
                          <span className="nk-suite-img-group-label">{grp.label}</span>
                          <span className="nk-suite-img-group-count">({grp.indices.length})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Log */}
            {uploadLog.length > 0 && (
              <div className="nk-suite-upload-log">
                <h4 className="nk-suite-log-title">Registro de Subida</h4>
                <div className="nk-suite-log-body">
                  {uploadLog.map((line, i) => (
                    <div key={i} className="nk-suite-log-line">{line}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
