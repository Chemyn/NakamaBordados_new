'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Product, fetchProductById, fetchProducts, Variation } from '../../data/products';
import { useCart } from '../../context/CartContext';
import { useCurrency } from '../../context/CurrencyContext';

export default function ProductDetailPage() {
  const params = useParams();
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchProductById(id), fetchProducts()]).then(([prodData, allProds]) => {
      if (mounted) {
        setProduct(prodData || null);
        
        if (prodData) {
          setRelatedProducts(
            allProds.filter(p => p.id !== prodData.id && p.categories.some(c => prodData.categories.includes(c))).slice(0, 4)
          );
        }
        
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [id]);

  // States
  const [activeImage, setActiveImage] = useState('');
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'care'>('desc');
  
  // Modals
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [luffyModalOpen, setLuffyModalOpen] = useState(false);
  
  // Vibration
  const [vibrateBtn, setVibrateBtn] = useState(false);

  // Initialize main image
  useEffect(() => {
    if (product) {
      const firstImage = product.images[0];
      setTimeout(() => {
        setActiveImage(firstImage);
        // Reset selected attributes
        setSelectedAttributes({});
        setQuantity(1);
      }, 0);
    }
  }, [product]);

  if (loading) {
    return (
      <div className="nk-container text-center" style={{ padding: '120px 24px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '20px' }}>Cargando Producto...</h2>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="nk-container text-center" style={{ padding: '120px 24px' }}>
        <h2 style={{ fontSize: '3rem', marginBottom: '20px' }}>Producto no encontrado</h2>
        <p style={{ color: 'var(--nk-text-sec)', marginBottom: '30px' }}>Lo sentimos, la prenda que buscas no existe en nuestra tienda.</p>
        <Link href="/store" className="nk-btn">Volver a la Tienda</Link>
      </div>
    );
  }

  // Get unique values for attributes in variations
  const getAttributeOptions = (name: string): string[] => {
    const options = new Set<string>();
    product.variations.forEach(v => {
      const val = v.attributes[name];
      if (val) options.add(val);
    });
    return Array.from(options);
  };

  const attributeNames = product.type === 'variable' 
    ? Array.from(new Set(product.variations.flatMap(v => Object.keys(v.attributes)))) 
    : [];

  // Find currently selected variation
  const getSelectedVariation = (): Variation | null => {
    if (product.type === 'simple') return null;
    
    // Check if all attribute types are selected
    if (Object.keys(selectedAttributes).length < attributeNames.length) {
      return null;
    }

    return product.variations.find(v => {
      return attributeNames.every(name => v.attributes[name] === selectedAttributes[name]);
    }) || null;
  };

  const currentVariation = getSelectedVariation();

  const handleAttributeSelect = (name: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddToCart = () => {
    // If variable, check if all selections are made
    if (product.type === 'variable') {
      if (Object.keys(selectedAttributes).length < attributeNames.length) {
        // Trigger shake vibration
        setVibrateBtn(true);
        setTimeout(() => setVibrateBtn(false), 500);
        // Show Luffy Modal
        setLuffyModalOpen(true);
        return;
      }
    }

    // Add to cart
    addToCart(product, currentVariation, quantity);
    
    // Show success feedback
    alert(`¡${product.name} agregado al carrito!`);
  };

  const isGorras = product.categories.includes('gorras') || product.name.toLowerCase().includes('gorra');

  return (
    <div className="nk-product-detail-page" style={{ paddingTop: '50px' }}>
      
      {/* 1. Main Product grid container */}
      <div className="nk-container">
        <div className="nk-detail-grid">
          
          {/* Gallery component (Left Column) */}
          <div className="nk-detail-gallery">
            <div className="nk-main-image-wrapper">
              <img src={activeImage} alt={product.name} className="nk-main-image" />
            </div>
            
            <div className="nk-thumbnails-list">
              {product.images.map((img, idx) => (
                <button 
                  key={idx}
                  className={`nk-thumb-btn ${activeImage === img ? 'active' : ''}`}
                  onClick={() => setActiveImage(img)}
                >
                  <img src={img} alt={`${product.name} Vista ${idx + 1}`} className="nk-thumb-img" />
                </button>
              ))}
            </div>
          </div>

          {/* Details & options (Right Column) */}
          <div className="nk-detail-info">
            <span className="nk-info-badge">Colección Oficial</span>
            <h1 className="nk-detail-title">{product.name}</h1>
            
            {product.type === 'variable' && product.variations && product.variations.length > 0 ? (
                <>
                  <p className="nk-detail-price">
                    {currentVariation 
                      ? formatPrice(currentVariation.price)
                      : `${formatPrice(Math.min(...product.variations.map(v => v.price)))} - ${formatPrice(Math.max(...product.variations.map(v => v.price)))}`}
                  </p>
                </>
              ) : (
                <p className="nk-detail-price">{formatPrice(product.price)}</p>
              )}
            
            <div className="nk-detail-divider"></div>

            {/* Product short description */}
            <div className="nk-detail-desc">
              <p>{product.description.split('\n\n')[0]}</p>
            </div>

            {/* Selection Options (Swatches) */}
            {product.type === 'variable' && (
              <div className="nk-detail-swatches-section">
                {attributeNames.map(name => {
                  const options = getAttributeOptions(name);
                  const selectedVal = selectedAttributes[name];
                  
                  return (
                    <div className="nk-swatch-group" key={name}>
                      <span className="nk-swatch-label">{name}: {selectedVal || 'Seleccionar'}</span>
                      <div className="nk-swatches-container">
                        {options.map(opt => (
                          <button
                            key={opt}
                            className={`nk-swatch-option ${selectedVal === opt ? 'active' : ''}`}
                            onClick={() => handleAttributeSelect(name, opt)}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Form actions (Qty, Size Guide, Buy Button) */}
            <div className="nk-detail-actions-section">
              {/* Size guide button (Standard clothing only, not for caps) */}
              {!isGorras && (
                <div style={{ marginBottom: '15px' }}>
                  <button 
                    type="button" 
                    className="nk-size-guide-trigger"
                    onClick={() => setSizeGuideOpen(true)}
                  >
                    <span className="material-icons-outlined">straighten</span>
                    Guía de tallas
                  </button>
                </div>
              )}

              <div className="nk-action-row">
                {/* Quantity select counter */}
                <div className="nk-qty-selector">
                  <button 
                    className="nk-qty-btn" 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="nk-qty-input"
                  />
                  <button 
                    className="nk-qty-btn" 
                    onClick={() => setQuantity(quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart button */}
                <button
                  type="button"
                  className={`nk-btn nk-btn-add-cart ${vibrateBtn ? 'nk-vibrate' : ''}`}
                  onClick={handleAddToCart}
                >
                  Agregar al Carrito
                </button>
              </div>
            </div>

            {/* Tabs info section (Description / Care) */}
            <div className="nk-detail-tabs-section">
              <ul className="tab-list">
                <li>
                  <button 
                    className={`tab-btn ${activeTab === 'desc' ? 'active' : ''}`}
                    onClick={() => setActiveTab('desc')}
                  >
                    Descripción
                  </button>
                </li>
                <li>
                  <button 
                    className={`tab-btn ${activeTab === 'care' ? 'active' : ''}`}
                    onClick={() => setActiveTab('care')}
                  >
                    Cuidado de Prenda
                  </button>
                </li>
              </ul>
              
              <div className="tab-content" style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--nk-text-sec)' }}>
                {activeTab === 'desc' ? (
                  <div>
                    <p style={{ whiteSpace: 'pre-line' }}>{product.description}</p>
                    <p style={{ marginTop: '15px', fontWeight: 'bold' }}>SKU Base: {product.sku}</p>
                  </div>
                ) : (
                  <div>
                    <p>Para mantener tus bordados y estampados como nuevos de por vida, te sugerimos seguir las siguientes instrucciones:</p>
                    <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
                      <li>Lavar a mano o máquina en ciclo delicado con agua fría.</li>
                      <li>Lavar la prenda volteada al revés (diseño hacia adentro).</li>
                      <li>No usar blanqueadores ni detergentes agresivos.</li>
                      <li>Secar a la sombra colgado. Evitar secadora de calor.</li>
                      <li>No planchar directamente sobre el bordado o estampado.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 2. Middle Marquee Bar */}
      <div className="nk-marquee-bar" style={{ margin: '60px 0' }}>
        <div className="nk-marquee-wrapper">
          <div className="nk-marquee-content animate-marquee">
            <span>• ENVIO GRATIS EN 4PZ O DESDE $1200 MXN</span>
            <span>• 3 MSI A PARTIR DE $500 MXN</span>
            <span>• ENVIOS SEGUROS A TODO MÉXICO</span>
            <span>• CALIDAD PREMIUM EXCLUSIVA</span>
            
            <span>• ENVIO GRATIS EN 4PZ O DESDE $1200 MXN</span>
            <span>• 3 MSI A PARTIR DE $500 MXN</span>
            <span>• ENVIOS SEGUROS A TODO MÉXICO</span>
            <span>• CALIDAD PREMIUM EXCLUSIVA</span>
          </div>
        </div>
      </div>

      {/* 3. Related Products section */}
      <div className="nk-container pb-20">
        <h2 className="nk-section-title text-center" style={{ marginBottom: '40px' }}>También te puede gustar</h2>
        <div className="nk-store-grid">
          {relatedProducts.map(p => {
            const minPrice = p.type === 'variable' && p.variations.length > 0 
                  ? Math.min(...p.variations.map(v => v.price)) 
                  : p.price;
            const maxPrice = p.type === 'variable' && p.variations.length > 0
                  ? Math.max(...p.variations.map(v => v.price)) 
                  : p.price;
            const displayPrice = minPrice === maxPrice 
                  ? formatPrice(minPrice)
                  : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;

            return (
              <div className="nk-store-card group" key={p.id}>
                <div className="nk-store-card-img-wrapper">
                  <Link href={`/product/${p.id}`} className="nk-card-img-link">
                    <img src={p.images[0]} alt={p.name} className="nk-card-img" />
                  </Link>
                  <div className="nk-card-overlay">
                    <Link href={`/product/${p.id}`} className="nk-overlay-btn">Ver Producto</Link>
                  </div>
                </div>
                <div className="nk-card-info">
                  <h3 className="nk-card-title">
                    <Link href={`/product/${p.id}`}>{p.name}</Link>
                  </h3>
                  <p className="nk-card-price">{displayPrice}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Size Guide Modal */}
      {sizeGuideOpen && (
        <div className="nk-modal-backdrop" onClick={() => setSizeGuideOpen(false)}>
          <div className="nk-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="nk-modal-close" onClick={() => setSizeGuideOpen(false)} aria-label="Close size guide">
              <span className="material-icons-outlined">close</span>
            </button>
            <h2 className="nk-modal-title">Guía de tallas</h2>
            <div className="nk-size-guide-images">
              <img src="https://nakamabordados.com/wp-content/uploads/2026/01/2.webp" alt="Guía 1" className="nk-guide-img" />
              <img src="https://nakamabordados.com/wp-content/uploads/2026/01/3.webp" alt="Guía 2" className="nk-guide-img" />
              <img src="https://nakamabordados.com/wp-content/uploads/2026/01/4.webp" alt="Guía 3" className="nk-guide-img" />
              <img src="https://nakamabordados.com/wp-content/uploads/2026/01/5.webp" alt="Guía 4" className="nk-guide-img" />
            </div>
          </div>
        </div>
      )}

      {/* 5. One Piece Luffy Warning Modal */}
      {luffyModalOpen && (
        <div id="luffy-warning-modal">
          <div className="luffy-dialog">
            ¡OI, NAKAMA!
            <span className="luffy-subtext">¡Elige tu estilo (variación) antes de zarpar!</span>
          </div>
          
          <div className="op-container">
            <div className="op-skull">
              <div className="op-bones">
                <div className="op-bones__body--left">
                  <div className="op-bones__circles--top">
                    <div className="op-bones__circles op-bones__circles--left"></div>
                    <div className="op-bones__circles op-bones__circles--right"></div>
                  </div>
                  <div className="op-bones__circles--bottom">
                    <div className="op-bones__circles op-bones__circles--left"></div>
                    <div className="op-bones__circles op-bones__circles--right"></div>
                  </div>
                </div>
                <div className="op-bones__body--right">
                  <div className="op-bones__circles--top">
                    <div className="op-bones__circles op-bones__circles--left"></div>
                    <div className="op-bones__circles op-bones__circles--right"></div>
                  </div>
                  <div className="op-bones__circles--bottom">
                    <div className="op-bones__circles op-bones__circles--left"></div>
                    <div className="op-bones__circles op-bones__circles--right"></div>
                  </div>
                </div>
              </div>
              <div className="op-mouth">
                <div className="op-mouth__teeth">
                  <div className="op-teeth__vertical-lines">
                    <div className="op-teeth__vertical-line op-teeth__vertical-line--1"></div>
                    <div className="op-teeth__vertical-line op-teeth__vertical-line--2"></div>
                    <div className="op-teeth__vertical-line op-teeth__vertical-line--3"></div>
                  </div>
                  <div className="op-teeth__diagonal-lines">
                    <div className="op-teeth__diagonal-line op-teeth__diagonal-line--1"></div>
                    <div className="op-teeth__diagonal-line op-teeth__diagonal-line--2"></div>
                    <div className="op-teeth__diagonal-line op-teeth__diagonal-line--3"></div>
                  </div>
                </div>
              </div>
              <div className="op-head">
                <div className="op-hat">
                  <div className="op-hat__crown">
                    <div className="op-hat__band"></div>
                  </div>
                  <div className="op-hat__brim"></div>
                </div>
                <div className="op-eyes">
                  <div className="op-eyes__circle op-eyes_circle--left"></div>
                  <div className="op-eyes__circle op-eyes_circle--right"></div>
                </div>
                <div className="op-nose"></div>
              </div>
            </div>
          </div>

          <button className="luffy-close-btn" onClick={() => setLuffyModalOpen(false)}>ENTENDIDO</button>
        </div>
      )}

    </div>
  );
}
