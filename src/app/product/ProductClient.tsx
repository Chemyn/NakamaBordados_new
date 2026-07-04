'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DOMPurify from 'isomorphic-dompurify';
import { Product, Variation } from '@/types/product';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

interface ProductClientProps {
  initialProduct: Product;
  relatedProducts: Product[];
}

export default function ProductClient({ initialProduct: product, relatedProducts }: ProductClientProps) {
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  
  // States
  const [activeImage, setActiveImage] = useState(product.images[0]);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'care'>('desc');
  const [showAllThumbs, setShowAllThumbs] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  
  // Zoom logic
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0, show: false });
  const imgRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!imgRef.current) return;
    const { left, top, width, height } = imgRef.current.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setZoomPos({ x, y, show: true });
  };

  // Modals
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [luffyModalOpen, setLuffyModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  
  const WARNINGS = [
    { 
      title: t('product.warning.luffy.title'), 
      phrase: t('product.warning.luffy.phrase'), 
      crewClass: 'crew-luffy' 
    },
    { 
      title: t('product.warning.zoro.title'), 
      phrase: t('product.warning.zoro.phrase'), 
      crewClass: 'crew-zoro' 
    },
    { 
      title: t('product.warning.sanji.title'), 
      phrase: t('product.warning.sanji.phrase'), 
      crewClass: 'crew-sanji' 
    },
    { 
      title: t('product.warning.chopper.title'), 
      phrase: t('product.warning.chopper.phrase'), 
      crewClass: 'crew-chopper' 
    }
  ];

  const [currentWarning, setCurrentWarning] = useState(WARNINGS[0]);

  // Vibration
  const [vibrateBtn, setVibrateBtn] = useState(false);

  // Variations
  const validVariations = product.variations || [];

  // Size sorting map
  const SIZE_ORDER: Record<string, number> = {
    '2xs': 1, 'xs': 2, 's': 3, 'm': 4, 'l': 5, 'xl': 6, '2xl': 7, '3xl': 8, '4xl': 9, '5xl': 10,
    'ch': 3, 'med': 4, 'g': 5, 'eg': 6, '2eg': 7
  };

  const getAttributeOptions = (name: string): string[] => {
    const relevantVariations = validVariations.filter(v => {
      return Object.entries(selectedAttributes).every(([attrName, attrValue]) => {
        if (attrName === name || !attrValue) return true;
        return v.attributes[attrName] === attrValue;
      });
    });

    const options = new Set<string>();
    relevantVariations.forEach(v => {
      const val = v.attributes[name];
      if (val) options.add(val);
    });

    const optionsArray = Array.from(options);
    
    if (name.toLowerCase().includes('talla') || name.toLowerCase().includes('size')) {
      return optionsArray.sort((a, b) => {
        const orderA = SIZE_ORDER[a.toLowerCase()] || 99;
        const orderB = SIZE_ORDER[b.toLowerCase()] || 99;
        return orderA - orderB;
      });
    }

    return optionsArray.sort();
  };

  const attributeNames = product.type === 'variable' 
    ? Array.from(new Set(validVariations.flatMap(v => Object.keys(v.attributes)))) 
    : [];

  const getSelectedVariation = (): Variation | null => {
    if (product.type === 'simple') return null;
    if (Object.keys(selectedAttributes).length < attributeNames.length) {
      return null;
    }
    return validVariations.find(v => {
      return attributeNames.every(name => v.attributes[name] === selectedAttributes[name]);
    }) || null;
  };

  const currentVariation = getSelectedVariation();

  const handleAttributeSelect = (name: string, value: string) => {
    setSelectedAttributes(prev => {
      if (prev[name] === value) {
        const next = { ...prev };
        delete next[name];
        return next;
      }

      const cleanedAttrs: Record<string, string> = { [name]: value };
      
      attributeNames.forEach(attrName => {
        if (attrName === name) return;
        const currentVal = prev[attrName];
        if (!currentVal) return;
        const isStillValid = validVariations.some(v => 
          v.attributes[name] === value && v.attributes[attrName] === currentVal
        );
        if (isStillValid) cleanedAttrs[attrName] = currentVal;
      });
      
      const match = validVariations.find(v => 
        attributeNames.every(attr => v.attributes[attr] === cleanedAttrs[attr])
      );
      
      if (match && match.images && match.images.length > 0) {
        setActiveImage(match.images[0]);
      } else {
        const colorAttr = attributeNames.find(n => n.toLowerCase().includes('color'));
        if (colorAttr && cleanedAttrs[colorAttr]) {
            const colorMatch = validVariations.find(v => v.attributes[colorAttr] === cleanedAttrs[colorAttr] && v.images && v.images.length > 0);
            if (colorMatch && colorMatch.images) {
                setActiveImage(colorMatch.images[0]);
            }
        }
      }
      return cleanedAttrs;
    });
  };

  const handleAddToCart = () => {
    if (product.type === 'variable') {
      if (Object.keys(selectedAttributes).length < attributeNames.length) {
        setVibrateBtn(true);
        setTimeout(() => setVibrateBtn(false), 500);
        const randomWarning = WARNINGS[Math.floor(Math.random() * WARNINGS.length)];
        setCurrentWarning(randomWarning);
        setLuffyModalOpen(true);
        return;
      }
    }
    addToCart(product, currentVariation, quantity);
    setSuccessModalOpen(true);
  };

  const isGorras = product.categories.includes('gorras') || product.name.toLowerCase().includes('gorra');

  let displayPrice = formatPrice(product.price);
  if (product.type === 'variable' && validVariations.length > 0) {
    const matchingVariations = validVariations.filter(v => {
      return Object.entries(selectedAttributes).every(([name, value]) => {
        return !value || v.attributes[name] === value;
      });
    });
    const varsToConsider = matchingVariations.length > 0 ? matchingVariations : validVariations;
    const minPrice = Math.min(...varsToConsider.map(v => v.price));
    const maxPrice = Math.max(...varsToConsider.map(v => v.price));
    displayPrice = minPrice === maxPrice ? formatPrice(minPrice) : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
  }

  const visibleThumbs = showAllThumbs ? product.images : product.images.slice(0, 5);

  return (
    <div className="nk-product-detail-page" style={{ paddingTop: '50px', background: 'var(--nk-bg-wrapper)' }}>
      <div className="nk-container">
        <div className="nk-detail-grid">
          <div className="nk-detail-gallery">
            <div 
              ref={imgRef}
              className="nk-main-image-wrapper nk-manga-border" 
              style={{ boxShadow: 'var(--nk-manga-shadow-lg)', cursor: 'zoom-in', position: 'relative', overflow: 'hidden' }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setZoomPos(prev => ({ ...prev, show: false }))}
              onClick={() => setZoomImage(activeImage || product.images[0])}
            >
              <Image 
                src={activeImage || product.images[0]} 
                alt={product.name} 
                width={600} 
                height={800} 
                className="nk-main-image" 
                priority
                style={{ 
                  objectFit: 'cover',
                  transform: zoomPos.show ? 'scale(2)' : 'scale(1)',
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  transition: zoomPos.show ? 'none' : 'transform 0.3s ease'
                }}
              />
              {!zoomPos.show && (
                <div className="nk-zoom-hint nk-desktop-only" style={{ position: 'absolute', bottom: '15px', right: '15px', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '5px', borderRadius: '50%', display: 'flex' }}>
                  <span className="material-icons-outlined">zoom_in</span>
                </div>
              )}
            </div>
            <div className="nk-thumbnails-list">
              {visibleThumbs.map((img, idx) => (
                <button 
                  key={idx} 
                  className={`nk-thumb-btn nk-manga-border ${activeImage === img ? 'active' : ''}`} 
                  style={activeImage === img ? { borderColor: 'var(--nk-primary)', boxShadow: 'var(--nk-manga-shadow)' } : {}} 
                  onClick={() => setActiveImage(img)}
                >
                  <Image 
                    src={img} 
                    alt={`${product.name} Vista ${idx + 1}`} 
                    width={80} 
                    height={100} 
                    className="nk-thumb-img" 
                    style={{ objectFit: 'cover' }}
                  />
                </button>
              ))}
              {product.images.length > 5 && !showAllThumbs && (
                <button className="nk-thumb-btn nk-manga-border nk-show-more-thumbs" onClick={() => setShowAllThumbs(true)} style={{ background: 'var(--nk-primary)', color: '#fff', fontWeight: 800, fontSize: '0.8rem' }}>
                  +{product.images.length - 5}
                </button>
              )}
            </div>
          </div>

          <div className="nk-detail-info">
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span className="nk-info-badge nk-manga-border" style={{ background: 'var(--nk-accent)', color: 'var(--nk-bg-body)' }}>{t('product.official')}</span>
                <span className="nk-info-badge nk-manga-border" style={{ background: 'var(--nk-text-main)', color: 'var(--nk-bg-body)' }}>{t('product.premium')}</span>
            </div>
            <h1 className="nk-detail-title" style={{ textShadow: '2px 2px 0px var(--nk-accent)' }}>{product.name}</h1>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '15px' }}>
                <p className="nk-detail-price" style={{ fontSize: '2.5rem' }}>{displayPrice}</p>
            </div>

            <div className="nk-detail-divider" style={{ background: 'var(--nk-border)', height: '2px' }}></div>

            {product.type === 'variable' && (
              <div className="nk-detail-swatches-section">
                {attributeNames.map(name => {
                  const options = getAttributeOptions(name);
                  const selectedVal = selectedAttributes[name];
                  const isColor = name.toLowerCase().includes('color');
                  return (
                    <div className="nk-swatch-group" key={name}>
                      <span className="nk-swatch-label" style={{ fontWeight: 800 }}>{name.toUpperCase()}: {(selectedVal || t('product.select')).toUpperCase()}</span>
                      <div className={isColor ? "nk-color-swatches-container" : "nk-swatches-container"}>
                        {options.map(opt => {
                          const isActive = selectedVal === opt;
                          if (isColor) {
                            const colorMap: Record<string, string> = {
                              'negro': '#000000', 'black': '#000000', 'blanco': '#ffffff', 'white': '#ffffff',
                              'rojo': '#ff0000', 'red': '#ff0000', 'azul': '#0000ff', 'blue': '#0000ff',
                              'gris': '#808080', 'gray': '#808080', 'marino': '#000080', 'navy': '#000080',
                              'carbon': '#333333', 'hueso': '#f5f5dc', 'arena': '#d2b48c', 'militar': '#4b5320',
                              'acid-wash': 'url(https://nakamabordados.com/wp-content/uploads/2024/01/acid-wash-pattern.jpg)',
                              'rosa': '#ffc0cb', 'pink': '#ffc0cb'
                            };
                            const colorValue = colorMap[opt.toLowerCase()] || '#cccccc';
                            const isPattern = colorValue.startsWith('url');
                            return (
                              <button
                                key={opt}
                                className={`nk-color-swatch nk-manga-border ${isActive ? 'active' : ''}`}
                                style={{ backgroundColor: isPattern ? 'transparent' : colorValue, backgroundImage: isPattern ? colorValue : 'none' }}
                                data-color-name={opt}
                                onClick={() => handleAttributeSelect(name, opt)}
                                title={opt}
                              ></button>
                            );
                          }
                          return (
                            <button key={opt} className={`nk-swatch-option nk-manga-border ${isActive ? 'active' : ''}`} style={isActive ? { background: 'var(--nk-text-main)', color: 'var(--nk-bg-body)', boxShadow: 'var(--nk-manga-shadow)' } : {}} onClick={() => handleAttributeSelect(name, opt)}>
                              {opt.toUpperCase()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="nk-detail-actions-section nk-manga-border" style={{ boxShadow: 'var(--nk-manga-shadow-lg)' }}>
              {!isGorras && (
                <div style={{ marginBottom: '15px' }}>
                  <button type="button" className="nk-size-guide-trigger" onClick={() => setSizeGuideOpen(true)}>
                    <span className="material-icons-outlined">straighten</span>
                    {t('product.size_guide')}
                  </button>
                </div>
              )}
              <div className="nk-action-row">
                <div className="nk-qty-selector nk-manga-border">
                  <button className="nk-qty-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="nk-qty-input" />
                  <button className="nk-qty-btn" onClick={() => setQuantity(quantity + 1)}>+</button>
                </div>
                <button type="button" className={`nk-btn nk-btn-add-cart nk-manga-border ${vibrateBtn ? 'nk-vibrate' : ''}`} style={{ boxShadow: 'var(--nk-manga-shadow)' }} onClick={handleAddToCart}>
                  {t('product.add_to_cart')}
                </button>
              </div>
            </div>
            
            {/* Trust Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
                <div className="nk-trust-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700 }}>
                    <span className="material-icons-outlined" style={{ color: 'var(--nk-primary)' }}>verified_user</span>
                    {t('product.secure_payment')}
                </div>
                <div className="nk-trust-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700 }}>
                    <span className="material-icons-outlined" style={{ color: 'var(--nk-primary)' }}>local_shipping</span>
                    {t('product.guaranteed_shipping')}
                </div>
            </div>

            <div className="nk-detail-tabs-section">
              <ul className="tab-list">
                <li><button className={`tab-btn ${activeTab === 'desc' ? 'active' : ''}`} onClick={() => setActiveTab('desc')}>{t('product.desc_tab')}</button></li>
                <li><button className={`tab-btn ${activeTab === 'care' ? 'active' : ''}`} onClick={() => setActiveTab('care')}>{t('product.care_tab')}</button></li>
              </ul>
              <div className="tab-content nk-manga-border" style={{ fontSize: '0.95rem', lineHeight: '1.6', background: 'var(--nk-bg-card)', padding: '20px' }}>
                {activeTab === 'desc' ? (
                  <div>
                    <div className="nk-product-html-desc" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description || '') }} />
                    <p style={{ marginTop: '15px', fontWeight: 'bold', fontFamily: 'Courier New' }}>SKU: {currentVariation ? currentVariation.sku : product.sku}</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontWeight: 700, marginBottom: '10px' }}>{t('product.care_title')}</p>
                    <ul style={{ paddingLeft: '20px' }}>
                      <li>{t('product.care_1')}</li>
                      <li>{t('product.care_2')}</li>
                      <li>{t('product.care_3')}</li>
                      <li>{t('product.care_4')}</li>
                      <li>{t('product.care_5')}</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="nk-marquee-bar" style={{ margin: '60px 0' }}>
        <div className="nk-marquee-wrapper">
          <div className="nk-marquee-content animate-marquee">
            <span>• {t('marquee.msi')}</span>
            <span>• {t('marquee.quality')}</span>
            <span>• {t('marquee.join')}</span>
            <span>• {t('marquee.msi')}</span>
            <span>• {t('marquee.quality')}</span>
            <span>• {t('marquee.join')}</span>
          </div>
        </div>
      </div>

      <div className="nk-container pb-20">
        <h2 className="nk-section-title text-center" style={{ marginBottom: '40px' }}>{t('product.related')}</h2>
        <div className="nk-store-grid">
          {relatedProducts.length > 0 ? relatedProducts.map(p => {
            const minPrice = p.type === 'variable' && p.variations.length > 0 ? Math.min(...p.variations.map(v => v.price)) : p.price;
            const maxPrice = p.type === 'variable' && p.variations.length > 0 ? Math.max(...p.variations.map(v => v.price)) : p.price;
            const displayPrice = minPrice === maxPrice ? formatPrice(minPrice) : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
            return (
              <div 
                className="nk-store-card" 
                key={p.id}
                style={{ background: 'var(--nk-bg-card)', border: '2px solid var(--nk-border)', borderRadius: '0', padding: '0', transition: 'transform 0.3s ease, box-shadow 0.3s ease', boxShadow: 'var(--nk-manga-shadow)' }}
              >
                <div className="nk-store-card-img-wrapper" style={{ borderRadius: '0', overflow: 'hidden', position: 'relative', aspectRatio: '1/1', borderBottom: '2px solid var(--nk-border)' }}>
                  <Link href={`/product?id=${p.id}`} className="nk-card-img-link">
                    <Image 
                      src={p.images[0]} 
                      alt={p.name} 
                      width={300} 
                      height={300} 
                      className="nk-card-img" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      loading="lazy" 
                    />
                  </Link>
                  <div className="nk-card-overlay">
                    <Link href={`/product?id=${p.id}`} className="nk-overlay-btn">{t('product.view')}</Link>
                  </div>
                </div>
                <div className="nk-card-info" style={{ textAlign: 'left', padding: '20px' }}>
                  <h3 className="nk-card-title" style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0', lineHeight: 1.1 }}>
                    <Link href={`/product?id=${p.id}`} style={{ color: 'var(--nk-text-main)', textDecoration: 'none' }}>{p.name}</Link>
                  </h3>
                  <p className="nk-card-price" style={{ color: 'var(--nk-primary)', fontWeight: '800', marginTop: '10px', fontSize: '1.2rem', fontFamily: 'Teko' }}>{displayPrice}</p>
                </div>
              </div>
            );
          }) : (
            [1, 2, 3, 4].map(i => <SkeletonProductCard key={i} />)
          )}
        </div>
      </div>

      {/* ZOOM MODAL (Enhanced for mobile/full-view) */}
      {zoomImage && (
        <div className="nk-modal-backdrop" onClick={() => setZoomImage(null)} style={{ background: 'rgba(0,0,0,0.95)', zIndex: 10000 }}>
          <div 
            className="nk-zoom-container" 
            onClick={(e) => e.stopPropagation()} 
            style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
          >
            <button 
              className="nk-modal-close" 
              onClick={() => setZoomImage(null)} 
              style={{ position: 'fixed', top: '20px', right: '20px', background: '#fff', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, color: '#000' }}
            >
              <span className="material-icons-outlined">close</span>
            </button>
            <div style={{ width: '100%', height: '100%', overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Image 
                    src={zoomImage} 
                    alt="Zoom" 
                    width={1200} 
                    height={1600} 
                    unoptimized
                    style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain', margin: 'auto' }} 
                />
            </div>
          </div>
        </div>
      )}

      {sizeGuideOpen && (
        <div className="nk-modal-backdrop" onClick={() => setSizeGuideOpen(false)}>
          <div className="nk-modal-card nk-manga-border" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto', background: 'var(--nk-bg-card)' }}>
            <button className="nk-modal-close" onClick={() => setSizeGuideOpen(false)} style={{ background: 'var(--nk-primary)', color: '#fff' }}><span className="material-icons-outlined">close</span></button>
            <h2 className="nk-modal-title" style={{ textAlign: 'center', fontSize: '2.5rem' }}>{t('product.size_guide')}</h2>
            <p style={{ textAlign: 'center', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--nk-text-sec)' }}>Haz clic en las imágenes para ampliar los detalles técnicos.</p>
            <div className="nk-size-guide-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              {[2,3,4,5,6,7,8].map(num => (
                <div key={num} onClick={() => setZoomImage(`https://nakamabordados.com/wp-content/uploads/2026/01/${num}.webp`)} style={{ cursor: 'zoom-in' }} className="nk-manga-border">
                  <Image 
                    src={`https://nakamabordados.com/wp-content/uploads/2026/01/${num}.webp`} 
                    alt={`Guía ${num}`} 
                    width={600} 
                    height={800} 
                    className="nk-guide-img" 
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {luffyModalOpen && (
        <div id="luffy-warning-modal">
          <div className="nk-warning-card nk-dash-animate nk-manga-border" style={{ boxShadow: 'var(--nk-manga-shadow-lg)', background: 'var(--nk-bg-card)' }}>
            <div className={`nk-skull-art ${currentWarning.crewClass}`}>
              <div className="skull-hat">
                {currentWarning.crewClass === 'crew-luffy' && (
                  <div className="straw-crown"><div className="straw-band"></div></div>
                )}
                {currentWarning.crewClass === 'crew-luffy' && <div className="straw-brim"></div>}
              </div>
              <div className="skull-bones">
                <div className="bone bone-1"></div>
                <div className="bone bone-2"></div>
              </div>
              <div className="skull-base">
                <div className="skull-eyes">
                  <div className="skull-eye left"></div>
                  <div className="skull-eye right"></div>
                </div>
                <div className="skull-nose"></div>
              </div>
              <div className="skull-jaw"></div>
            </div>
            <h2 className="nk-warning-title" style={{ color: 'var(--nk-primary)' }}>{currentWarning.title}</h2>
            <p className="nk-warning-phrase" style={{ color: 'var(--nk-text-main)' }}>{currentWarning.phrase}</p>
            <button className="nk-warning-close-btn" style={{ background: 'var(--nk-primary)', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: 800, marginTop: '20px' }} onClick={() => setLuffyModalOpen(false)}>{t('product.warning.close')}</button>
          </div>
        </div>
      )}

      {successModalOpen && (
        <div className="nk-modal-backdrop" onClick={() => setSuccessModalOpen(false)} style={{ zIndex: 99999 }}>
          <div className="nk-modal-card nk-manga-border" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', textAlign: 'center', padding: '40px', background: 'var(--nk-bg-card)', boxShadow: 'var(--nk-manga-shadow-lg)' }}>
            <button className="nk-modal-close" onClick={() => setSuccessModalOpen(false)} style={{ background: 'var(--nk-primary)', color: '#fff' }}>
              <span className="material-icons-outlined">close</span>
            </button>
            
            <div style={{ margin: '0 auto 20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255, 69, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--nk-primary)' }}>
              <span className="material-icons-outlined" style={{ fontSize: '3.5rem', color: 'var(--nk-primary)' }}>sailing</span>
            </div>
            
            <h2 style={{ fontFamily: 'Teko', fontSize: '2.5rem', textTransform: 'uppercase', marginBottom: '10px', color: 'var(--nk-text-main)' }}>
              ¡AGREGADO AL BARCO!
            </h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '25px', opacity: 0.8, color: 'var(--nk-text-sec)' }}>
              Has sumado <strong>{product.name}</strong> {quantity > 1 ? `(x${quantity})` : ''} a tu botín.
            </p>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="nk-btn" 
                style={{ flex: 1, padding: '12px', fontSize: '1.1rem', background: 'transparent', border: '3px solid var(--nk-border)', color: 'var(--nk-text-main)', boxShadow: 'none' }} 
                onClick={() => setSuccessModalOpen(false)}
              >
                Seguir Navegando
              </button>
              <Link 
                href="/cart" 
                className="nk-btn" 
                style={{ flex: 1, padding: '12px', fontSize: '1.1rem', background: 'var(--nk-primary)', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Ver Carrito
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SkeletonProductCard = () => (
  <div className="nk-store-card" style={{ pointerEvents: 'none' }}>
    <div className="nk-store-card-img-wrapper nk-skeleton nk-manga-border" style={{ aspectRatio: '3/4', boxShadow: 'var(--nk-manga-shadow)' }}></div>
    <div className="nk-card-info" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
      <div className="nk-skeleton" style={{ width: '85%', height: '18px', borderRadius: '0' }}></div>
      <div className="nk-skeleton" style={{ width: '40%', height: '16px', borderRadius: '0' }}></div>
    </div>
  </div>
);
