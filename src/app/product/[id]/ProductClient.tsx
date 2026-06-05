'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product, Variation } from '@/types/product';
import { useCart } from '../../context/CartContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useLanguage } from '../../context/LanguageContext';

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
  
  // Modals
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [luffyModalOpen, setLuffyModalOpen] = useState(false);
  
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
    alert(t('product.added').replace('{name}', product.name));
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

  return (
    <div className="nk-product-detail-page" style={{ paddingTop: '50px', background: 'var(--nk-bg-wrapper)' }}>
      <div className="nk-container">
        <div className="nk-detail-grid">
          <div className="nk-detail-gallery">
            <div className="nk-main-image-wrapper nk-manga-border" style={{ boxShadow: '8px 8px 0px #000' }}>
              <Image 
                src={activeImage || product.images[0]} 
                alt={product.name} 
                width={600} 
                height={800} 
                className="nk-main-image" 
                priority
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div className="nk-thumbnails-list">
              {product.images.map((img, idx) => (
                <button key={idx} className={`nk-thumb-btn nk-manga-border ${activeImage === img ? 'active' : ''}`} style={activeImage === img ? { borderColor: 'var(--nk-primary)', boxShadow: '2px 2px 0px #000' } : {}} onClick={() => setActiveImage(img)}>
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
            </div>
          </div>

          <div className="nk-detail-info">
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span className="nk-info-badge nk-manga-border" style={{ background: 'var(--nk-accent)', color: '#fff' }}>{t('product.official')}</span>
                <span className="nk-info-badge nk-manga-border" style={{ background: '#000', color: '#fff' }}>{t('product.premium')}</span>
            </div>
            <h1 className="nk-detail-title" style={{ textShadow: '2px 2px 0px var(--nk-accent)' }}>{product.name}</h1>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '15px' }}>
                <p className="nk-detail-price" style={{ fontSize: '2.5rem' }}>{displayPrice}</p>
                {product.price > 0 && <span style={{ color: 'var(--nk-primary)', fontWeight: 800 }}>{t('product.free_shipping_badge')}</span>}
            </div>

            <div className="nk-detail-divider" style={{ background: '#000', height: '2px' }}></div>

            {product.type === 'variable' && (
              <div className="nk-detail-swatches-section">
                {attributeNames.map(name => {
                  const options = getAttributeOptions(name);
                  const selectedVal = selectedAttributes[name];
                  const isColor = name.toLowerCase().includes('color');
                  return (
                    <div className="nk-swatch-group" key={name}>
                      <span className="nk-swatch-label" style={{ fontWeight: 800 }}>{name}: {selectedVal || t('product.select')}</span>
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
                            <button key={opt} className={`nk-swatch-option nk-manga-border ${isActive ? 'active' : ''}`} style={isActive ? { background: '#000', color: '#fff', boxShadow: '2px 2px 0px var(--nk-primary)' } : {}} onClick={() => handleAttributeSelect(name, opt)}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="nk-detail-actions-section nk-manga-border" style={{ boxShadow: '6px 6px 0px #000' }}>
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
                <button type="button" className={`nk-btn nk-btn-add-cart nk-manga-border ${vibrateBtn ? 'nk-vibrate' : ''}`} style={{ boxShadow: '4px 4px 0px #000' }} onClick={handleAddToCart}>
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
              <div className="tab-content" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                {activeTab === 'desc' ? (
                  <div>
                    <div className="nk-product-html-desc" dangerouslySetInnerHTML={{ __html: product.description }} />
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
              <div className="nk-store-card group" key={p.id}>
                <div className="nk-store-card-img-wrapper">
                  <Link href={`/product/${p.id}`} className="nk-card-img-link">
                    <Image 
                      src={p.images[0]} 
                      alt={p.name} 
                      width={300} 
                      height={400} 
                      className="nk-card-img" 
                      style={{ objectFit: 'cover' }}
                    />
                  </Link>
                  <div className="nk-card-overlay"><Link href={`/product/${p.id}`} className="nk-overlay-btn">{t('product.view')}</Link></div>
                </div>
                <div className="nk-card-info">
                  <h3 className="nk-card-title"><Link href={`/product/${p.id}`}>{p.name}</Link></h3>
                  <p className="nk-card-price">{displayPrice}</p>
                </div>
              </div>
            );
          }) : (
            [1, 2, 3, 4].map(i => <SkeletonProductCard key={i} />)
          )}
        </div>
      </div>

      {sizeGuideOpen && (
        <div className="nk-modal-backdrop" onClick={() => setSizeGuideOpen(false)}>
          <div className="nk-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="nk-modal-close" onClick={() => setSizeGuideOpen(false)}><span className="material-icons-outlined">close</span></button>
            <h2 className="nk-modal-title">{t('product.size_guide')}</h2>
            <div className="nk-size-guide-images">
              <Image src="https://nakamabordados.com/wp-content/uploads/2026/01/2.webp" alt="Guía 1" width={600} height={800} className="nk-guide-img" />
              <Image src="https://nakamabordados.com/wp-content/uploads/2026/01/3.webp" alt="Guía 2" width={600} height={800} className="nk-guide-img" />
              <Image src="https://nakamabordados.com/wp-content/uploads/2026/01/4.webp" alt="Guía 3" width={600} height={800} className="nk-guide-img" />
              <Image src="https://nakamabordados.com/wp-content/uploads/2026/01/5.webp" alt="Guía 4" width={600} height={800} className="nk-guide-img" />
              <Image src="https://nakamabordados.com/wp-content/uploads/2026/01/6.webp" alt="Guía 5" width={600} height={800} className="nk-guide-img" />
              <Image src="https://nakamabordados.com/wp-content/uploads/2026/01/7.webp" alt="Guía 6" width={600} height={800} className="nk-guide-img" />
              <Image src="https://nakamabordados.com/wp-content/uploads/2026/01/8.webp" alt="Guía 7" width={600} height={800} className="nk-guide-img" />
            </div>
          </div>
        </div>
      )}

      {luffyModalOpen && (
        <div id="luffy-warning-modal">
          <div className="nk-warning-card nk-dash-animate">
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
            <h2 className="nk-warning-title">{currentWarning.title}</h2>
            <p className="nk-warning-phrase">{currentWarning.phrase}</p>
            <button className="nk-warning-close-btn" onClick={() => setLuffyModalOpen(false)}>{t('product.warning.close')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

const SkeletonProductCard = () => (
  <div className="nk-store-card">
    <div className="nk-store-card-img-wrapper nk-skeleton" style={{ aspectRatio: '3/4' }}></div>
    <div className="nk-card-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
      <div className="nk-skeleton" style={{ width: '80%', height: '20px' }}></div>
      <div className="nk-skeleton" style={{ width: '40%', height: '16px' }}></div>
    </div>
  </div>
);
