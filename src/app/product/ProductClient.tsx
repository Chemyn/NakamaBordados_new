'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DOMPurify from 'isomorphic-dompurify';
import { Product, Variation } from '@/types/product';
import { isOutOfStock } from '@/lib/products-api';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import ProductPrice from '../components/ProductPrice';
import FreeShippingBadge from '../components/FreeShippingBadge';
import { apiOrigin } from '@/lib/api-host';
import { trackViewContent } from '@/lib/analytics';

interface ProductClientProps {
  initialProduct: Product;
  relatedProducts: Product[];
}

const getMockReviewsForProduct = (dbId: number, rating: number) => {
  const names = ["Carlos M.", "Sofía R.", "Javier T.", "Daniela G.", "Miguel A.", "Andrea L.", "Fernando B.", "Valeria H.", "Alejandro C.", "Mariana P."];
  const comments = [
    "¡La calidad del bordado es increíble! El diseño de Luffy se ve genial. Definitivamente volveré a comprar.",
    "Llegó súper rápido y el empaque premium de Nakama es genial. La prenda es muy cómoda y de excelente material.",
    "El estampado DTF tiene excelente definición y los colores son muy vivos. Recomendado al 100%.",
    "¡El diseño superó mis expectativas! La horma y costuras son perfectas, de calidad de exportación.",
    "Excelente atención al cliente y la calidad de la tela es de primera. Se siente muy abrigadora y premium.",
    "Me encantó el diseño de Zoro. El bordado es grueso y no se deforma tras las lavadas. ¡Muy pirata!",
    "La playera es fresca y el estampado resiste súper bien. Ideal para el día a día. 10/10.",
    "Espectacular. Compré la gorra con bordado 3D y la calidad del relieve es de otro nivel. Súper recomendados.",
    "Nakama nunca falla. Tela gruesa, buen corte y el bordado está impecable. El paquete llegó antes de lo esperado.",
    "Los detalles son brutales. Se nota el cariño en el empaque y las etiquetas. ¡Toda una joya nakama!"
  ];

  const count = ((dbId * 3) % 5) + 4;
  const reviewsList = [];
  for (let i = 0; i < count; i++) {
    const nameIdx = (dbId + i * 7) % names.length;
    const commentIdx = (dbId + i * 11) % comments.length;
    const reviewRating = i === 0 ? Math.ceil(rating) : (i % 3 === 0 ? Math.floor(rating) : 5);
    const daysAgo = ((dbId + i * 13) % 25) + 2;
    reviewsList.push({
      id: `rev-${i}`,
      name: names[nameIdx],
      rating: reviewRating,
      comment: comments[commentIdx],
      date: `Hace ${daysAgo} días`
    });
  }
  return reviewsList;
};

export default function ProductClient({ initialProduct: product, relatedProducts }: ProductClientProps) {
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  
  // States
  const [activeImage, setActiveImage] = useState(product.images[0]);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'care' | 'reviews' | 'sizes'>('desc');
  const [showAllThumbs, setShowAllThumbs] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // GA4 view_item + Pixel ViewContent, una vez por producto visto (los
  // precios locales son MXN base). Alimenta retargeting y catálogo en Meta.
  useEffect(() => {
    trackViewContent({
      id: product.databaseId || product.id,
      name: product.name,
      price: product.price,
      currency: 'MXN',
    });
  }, [product.id, product.databaseId, product.name, product.price]);

  const dbReviews = product.reviews || [];
  const reviewCount = dbReviews.length;

  const starsCount = [0, 0, 0, 0, 0];
  dbReviews.forEach(r => {
    const starIdx = Math.max(1, Math.min(5, Math.round(r.rating))) - 1;
    starsCount[starIdx]++;
  });

  const getPercentage = (stars: number) => {
    if (reviewCount === 0) return 0;
    return Math.round((starsCount[stars - 1] / reviewCount) * 100);
  };

  // Review Form States
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [reviewEmail, setReviewEmail] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName || !reviewEmail || !reviewComment) {
      setReviewMessage({ type: 'error', text: 'Por favor llena todos los campos.' });
      return;
    }
    setSubmittingReview(true);
    setReviewMessage(null);
    try {
      const apiHost = process.env.NEXT_PUBLIC_API_HOST || apiOrigin();
      const res = await fetch(`${apiHost}/wp-json/nakama/v1/submit-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.databaseId,
          name: reviewName,
          email: reviewEmail,
          rating: reviewRating,
          comment: reviewComment
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReviewMessage({ type: 'success', text: data.message });
        setReviewName('');
        setReviewEmail('');
        setReviewRating(5);
        setReviewComment('');
      } else {
        setReviewMessage({ type: 'error', text: data.message || 'Error al enviar la valoración.' });
      }
    } catch (err) {
      console.error("Error submitting review:", err);
      setReviewMessage({ type: 'error', text: 'Error de red al enviar la valoración.' });
    } finally {
      setSubmittingReview(false);
    }
  };
  
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

  // Una opción está agotada si TODAS las variaciones compatibles con la
  // selección actual + esa opción tienen el SKU base en 0. Mismo filtrado que
  // getAttributeOptions, evaluando stock en vez de solo existencia.
  const isOptionSoldOut = (name: string, opt: string): boolean => {
    const matching = validVariations.filter(v => {
      if (v.attributes[name] !== opt) return false;
      return Object.entries(selectedAttributes).every(([attrName, attrValue]) => {
        if (attrName === name || !attrValue) return true;
        return v.attributes[attrName] === attrValue;
      });
    });
    if (matching.length === 0) return false;
    return matching.every(isOutOfStock);
  };

  const getAttributeOrderValue = (name: string): number => {
    const lower = name.toLowerCase();
    if (lower.includes('estilo') || lower.includes('style')) return 1;
    if (lower.includes('color')) return 2;
    if (lower.includes('talla') || lower.includes('size')) return 3;
    return 99;
  };

  const attributeNames = product.type === 'variable'
    ? Array.from(new Set(validVariations.flatMap(v => Object.keys(v.attributes)))).sort((a, b) => {
        return getAttributeOrderValue(a) - getAttributeOrderValue(b);
      })
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
  const currentSoldOut = currentVariation ? isOutOfStock(currentVariation) : false;

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
    // La prenda base compartida está agotada: no permitir agregar.
    if (currentSoldOut) {
      setVibrateBtn(true);
      setTimeout(() => setVibrateBtn(false), 500);
      return;
    }
    addToCart(product, currentVariation, quantity);
    setSuccessModalOpen(true);
  };

  const isGorras = product.categories.includes('gorras') || product.name.toLowerCase().includes('gorra');

  let displayPrice = formatPrice(product.price);
  // Descuento visible: precio regular tachado + % de rebaja, calculado sobre
  // la variación más barata del subconjunto que coincide con la selección.
  let displayRegular: string | null = null;
  let displayPct = 0;
  if (product.type === 'variable' && validVariations.length > 0) {
    const matchingVariations = validVariations.filter(v => {
      return Object.entries(selectedAttributes).every(([name, value]) => {
        return !value || v.attributes[name] === value;
      });
    });
    const varsToConsider = matchingVariations.length > 0 ? matchingVariations : validVariations;
    const minPrice = Math.min(...varsToConsider.map(v => v.price));
    const maxPrice = Math.max(...varsToConsider.map(v => v.price));
    // Mismo formato que las tarjetas: el código de moneda solo en el precio final.
    displayPrice = minPrice === maxPrice ? formatPrice(minPrice) : `${formatPrice(minPrice).replace(/\s[A-Z]{2,4}$/, '')} - ${formatPrice(maxPrice)}`;

    const cheapest = varsToConsider.reduce((a, b) => (b.price < a.price ? b : a));
    const cheapestRegular = cheapest.regularPrice || 0;
    if (cheapestRegular > cheapest.price && cheapest.price > 0) {
      displayRegular = formatPrice(cheapestRegular);
      displayPct = Math.round((1 - cheapest.price / cheapestRegular) * 100);
    }
  } else if ((product.regularPrice || 0) > product.price && product.price > 0) {
    displayRegular = formatPrice(product.regularPrice as number);
    displayPct = Math.round((1 - product.price / (product.regularPrice as number)) * 100);
  }

  const visibleThumbs = showAllThumbs ? product.images : product.images.slice(0, 5);

  return (
    // paddingTop en función de --header-padding: en laptops el header pasa a
    // dos filas (más alto) y un valor fijo quedaba tapado por el navbar.
    <div className="nk-product-detail-page" style={{ paddingTop: 'calc(var(--header-padding) - 30px)', background: 'var(--nk-bg-wrapper)' }}>
      <div className="nk-container">
        <div className="nk-detail-grid">
          <div className="nk-detail-gallery">
            {/* Título solo móvil: en <=1024px el grid es 1 columna y la galería
                quedaba antes que el título; este duplicado lo pone arriba y el
                original (dentro de .nk-detail-info) se oculta vía CSS. */}
            <h1 className="nk-detail-title nk-detail-title-mobile" style={{ textShadow: '2px 2px 0px var(--nk-accent)' }}>{product.name}</h1>
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
            <div className="nk-info-badges" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span className="nk-info-badge nk-manga-border" style={{ background: 'var(--nk-accent)', color: 'var(--nk-bg-body)' }}>{t('product.official')}</span>
                <span className="nk-info-badge nk-manga-border" style={{ background: 'var(--nk-text-main)', color: 'var(--nk-bg-body)' }}>{t('product.premium')}</span>
            </div>
             <h1 className="nk-detail-title nk-detail-title-desktop" style={{ textShadow: '2px 2px 0px var(--nk-accent)', marginBottom: '5px' }}>{product.name}</h1>
             
             {/* Rating Stars Under Title */}
             {dbReviews.length > 0 ? (
                <div className="nk-info-rating" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', color: '#ffb400' }}>
                    {Array.from({ length: 5 }).map((_, i) => {
                      const ratingVal = product.rating || 5;
                      const isFull = i < Math.floor(ratingVal);
                      const isHalf = !isFull && (i < ratingVal);
                      return (
                        <span key={i} className="material-icons-outlined" style={{ fontSize: '1.2rem' }}>
                          {isFull ? 'star' : isHalf ? 'star_half' : 'star_border'}
                        </span>
                      );
                    })}
                  </div>
                  <span className="small text-muted font-display uppercase tracking-wider" style={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.5px' }}>
                    {product.rating ? product.rating.toFixed(1) : '5.0'} / 5.0 ({dbReviews.length} {t('product.reviews_label')})
                  </span>
                </div>
              ) : (
                <div
                  className="nk-info-rating"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', cursor: 'pointer' }}
                  onClick={() => {
                    setActiveTab('reviews');
                    setShowReviewForm(true);
                    const el = document.querySelector('.nk-detail-tabs-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <div style={{ display: 'flex', color: 'var(--nk-text-sec)', opacity: 0.4 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="material-icons-outlined" style={{ fontSize: '1.2rem' }}>star_border</span>
                    ))}
                  </div>
                  <span className="small text-muted font-display uppercase tracking-wider" style={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.5px', textDecoration: 'underline' }}>
                    Sé el primero en calificar
                  </span>
                </div>
              )}
            
            <div className="nk-info-price" style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <p className="nk-detail-price" style={{ fontSize: 'clamp(1.8rem, 6.5vw, 2.5rem)', margin: 0 }}>
                  <span className="nk-price-line">
                    {displayRegular && <s className="nk-price-regular">{displayRegular}</s>}
                    <span className="nk-price-current">{displayPrice}</span>
                    {displayRegular && displayPct > 0 && <span className="nk-price-off">-{displayPct}%</span>}
                  </span>
                </p>
                <FreeShippingBadge />
            </div>

            <div className="nk-detail-divider" style={{ background: 'var(--nk-border)', height: '2px' }}></div>

            {product.type === 'variable' && (
              <div className="nk-detail-swatches-section">
                {attributeNames.map(name => {
                  const options = getAttributeOptions(name);
                  const selectedVal = selectedAttributes[name];
                  const isColor = name.toLowerCase().includes('color');
                  const isSize = name.toLowerCase().includes('talla') || name.toLowerCase().includes('size');
                  return (
                    <div className="nk-swatch-group" key={name}>
                      <span className="nk-swatch-label" style={{ fontWeight: 800 }}>{name.toUpperCase()}: {(selectedVal || t('product.select')).toUpperCase()}</span>
                      <div className={isColor ? "nk-color-swatches-container" : "nk-swatches-container"}>
                        {options.map(opt => {
                          const isActive = selectedVal === opt;
                          const soldOut = isOptionSoldOut(name, opt);
                          if (isColor) {
                            const colorMap: Record<string, string> = {
                              'negro': '#000000', 'black': '#000000', 'blanco': '#ffffff', 'white': '#ffffff',
                              'rojo': '#ff0000', 'red': '#ff0000', 'azul': '#0000ff', 'blue': '#0000ff',
                              'gris': '#808080', 'gray': '#808080', 'marino': '#000080', 'navy': '#000080',
                              'carbon': '#333333', 'hueso': '#f5f5dc', 'arena': '#d2b48c', 'militar': '#4b5320',
                              'kaki': '#D5C58A', 'khaki': '#D5C58A',
                              'acid-wash': 'url(https://nakamabordados.com/wp-content/uploads/2024/01/acid-wash-pattern.jpg)',
                              'rosa': '#ffc0cb', 'pink': '#ffc0cb'
                            };
                            const colorValue = colorMap[opt.toLowerCase()] || '#cccccc';
                            const isPattern = colorValue.startsWith('url');
                            return (
                              <button
                                key={opt}
                                className={`nk-color-swatch nk-manga-border ${isActive ? 'active' : ''} ${soldOut ? 'nk-swatch-soldout' : ''}`}
                                style={{ backgroundColor: isPattern ? 'transparent' : colorValue, backgroundImage: isPattern ? colorValue : 'none' }}
                                data-color-name={opt}
                                onClick={() => { if (!soldOut) handleAttributeSelect(name, opt); }}
                                disabled={soldOut}
                                title={soldOut ? `${opt} — Agotado` : opt}
                              ></button>
                            );
                          }
                          return (
                            <button key={opt} className={`nk-swatch-option nk-manga-border ${isActive ? 'active' : ''} ${soldOut ? 'nk-swatch-soldout' : ''}`} style={isActive ? { background: 'var(--nk-text-main)', color: 'var(--nk-bg-body)', boxShadow: 'var(--nk-manga-shadow)' } : {}} onClick={() => { if (!soldOut) handleAttributeSelect(name, opt); }} disabled={soldOut} title={soldOut ? `${opt} — Agotado` : undefined}>
                              {opt.toUpperCase()}{soldOut ? ' · AGOTADO' : ''}
                            </button>
                          );
                        })}
                      </div>
                      {/* Sin overrides inline: el rediseño manga de
                          .nk-size-guide-trigger (globals.css) trae su propio
                          padding/alto; los 4px del diseño-enlace anterior lo
                          dejaban apretado contra el borde. */}
                      {isSize && !isGorras && (
                        <div style={{ marginTop: '12px' }}>
                          <button type="button" className="nk-size-guide-trigger" onClick={() => setSizeGuideOpen(true)}>
                            <span className="material-icons-outlined">straighten</span>
                            {t('product.size_guide')}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {product.type === 'simple' && !isGorras && (
              <div style={{ marginBottom: '15px' }}>
                <button type="button" className="nk-size-guide-trigger" onClick={() => setSizeGuideOpen(true)}>
                  <span className="material-icons-outlined">straighten</span>
                  {t('product.size_guide')}
                </button>
              </div>
            )}

            {/* Promociones activas, junto a las variaciones (mismas del banner) */}
            <div className="nk-detail-promos nk-manga-border">
              <div className="nk-detail-promos-head">
                <span className="material-icons-outlined">local_activity</span>
                {t('product.promos_title')}
              </div>
              <ul className="nk-detail-promos-list">
                <li>{t('marquee.welcome')}</li>
                <li>{t('marquee.shipping')}</li>
                <li>{t('marquee.msi')}</li>
                <li>{t('marquee.transfer')}</li>
              </ul>
              <Link href="/promociones" className="nk-detail-promos-link">
                {t('product.promos_link')}
                <span className="material-icons-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
              </Link>
            </div>

            <div className="nk-detail-actions-section nk-manga-border" style={{ boxShadow: 'var(--nk-manga-shadow-lg)' }}>
              <div className="nk-action-row">
                <div className="nk-qty-selector nk-manga-border">
                  <button className="nk-qty-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="nk-qty-input" />
                  <button className="nk-qty-btn" onClick={() => setQuantity(quantity + 1)}>+</button>
                </div>
                <button type="button" className={`nk-btn nk-btn-add-cart nk-manga-border ${vibrateBtn ? 'nk-vibrate' : ''} ${currentSoldOut ? 'nk-btn-soldout' : ''}`} style={{ boxShadow: 'var(--nk-manga-shadow)' }} onClick={handleAddToCart} disabled={currentSoldOut}>
                  {currentSoldOut ? 'AGOTADO' : t('product.add_to_cart')}
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
                <li><button className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => { setActiveTab('reviews'); if (dbReviews.length === 0) setShowReviewForm(true); }}>{t('product.reviews_tab')} ({reviewCount})</button></li>
                {!isGorras && (
                  <li><button className={`tab-btn ${activeTab === 'sizes' ? 'active' : ''}`} onClick={() => setActiveTab('sizes')}>{t('product.sizes_tab')}</button></li>
                )}
              </ul>
              <div className="tab-content nk-manga-border" style={{ fontSize: '0.95rem', lineHeight: '1.6', background: 'var(--nk-bg-card)', padding: '20px' }}>
                {activeTab === 'desc' && (
                  <div>
                    <div className="nk-product-html-desc" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description || '') }} />
                    <p style={{ marginTop: '15px', fontWeight: 'bold', fontFamily: 'Courier New' }}>SKU: {currentVariation ? currentVariation.sku : product.sku}</p>
                  </div>
                )}
                {activeTab === 'care' && (
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
                {activeTab === 'reviews' && (
                  <div>
                    {dbReviews.length === 0 ? (
                      <div className="text-center py-4" style={{ borderBottom: '1px dashed var(--nk-border)', marginBottom: '20px' }}>
                        <p className="text-muted" style={{ fontWeight: 600 }}>Aún no hay valoraciones para este producto. ¡Sé el primero en calificarlo!</p>
                      </div>
                    ) : (
                      <>
                        {/* Score Summary Block */}
                        <div style={{ display: 'flex', gap: '30px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid var(--nk-border)' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: 'Teko', fontSize: '3rem', fontWeight: 800, lineHeight: 1, color: 'var(--nk-primary)' }}>
                              {product.rating ? product.rating.toFixed(1) : '5.0'}
                            </div>
                            <div style={{ display: 'flex', color: '#ffb400', justifyContent: 'center', margin: '5px 0' }}>
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className="material-icons-outlined" style={{ fontSize: '1.2rem' }}>
                                  {i < Math.floor(product.rating || 5) ? 'star' : 'star_border'}
                                </span>
                              ))}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--nk-text-sec)', fontWeight: 600 }}>
                              {reviewCount} {t('product.reviews_label')}
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                              <span style={{ width: '80px', fontWeight: 700 }}>5 estrellas</span>
                              <div style={{ flex: 1, height: '8px', background: 'var(--nk-border)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${getPercentage(5)}%`, height: '100%', background: '#ffb400' }}></div>
                              </div>
                              <span style={{ width: '30px', textAlign: 'right', fontWeight: 700 }}>{getPercentage(5)}%</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                              <span style={{ width: '80px', fontWeight: 700 }}>4 estrellas</span>
                              <div style={{ flex: 1, height: '8px', background: 'var(--nk-border)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${getPercentage(4)}%`, height: '100%', background: '#ffb400' }}></div>
                              </div>
                              <span style={{ width: '30px', textAlign: 'right', fontWeight: 700 }}>{getPercentage(4)}%</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                              <span style={{ width: '80px', fontWeight: 700 }}>3 estrellas</span>
                              <div style={{ flex: 1, height: '8px', background: 'var(--nk-border)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${getPercentage(3)}%`, height: '100%', background: '#ffb400' }}></div>
                              </div>
                              <span style={{ width: '30px', textAlign: 'right', fontWeight: 700 }}>{getPercentage(3)}%</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                              <span style={{ width: '80px', fontWeight: 700 }}>2 estrellas</span>
                              <div style={{ flex: 1, height: '8px', background: 'var(--nk-border)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${getPercentage(2)}%`, height: '100%', background: '#ffb400' }}></div>
                              </div>
                              <span style={{ width: '30px', textAlign: 'right', fontWeight: 700 }}>{getPercentage(2)}%</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                              <span style={{ width: '80px', fontWeight: 700 }}>1 estrella</span>
                              <div style={{ flex: 1, height: '8px', background: 'var(--nk-border)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${getPercentage(1)}%`, height: '100%', background: '#ffb400' }}></div>
                              </div>
                              <span style={{ width: '30px', textAlign: 'right', fontWeight: 700 }}>{getPercentage(1)}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Toggle Review Form Button: separado de la lista de
                            reseñas con aire + divisor (en móvil quedaba pegado) */}
                        <div style={{ margin: '5px 0 30px', paddingBottom: '20px', borderBottom: '1px dashed var(--nk-border)' }}>
                          <button 
                            type="button" 
                            onClick={() => setShowReviewForm(!showReviewForm)} 
                            className="nk-btn nk-manga-border py-2 px-4 font-display" 
                            style={{ background: 'var(--nk-accent)', color: 'var(--nk-bg-body)', fontWeight: 800, fontSize: '0.85rem' }}
                          >
                            {showReviewForm ? 'CANCELAR VALORACIÓN' : 'ESCRIBIR VALORACIÓN'}
                          </button>
                        </div>

                        {/* Review List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
                          {dbReviews.map((rev) => (
                            <div key={rev.id} style={{ paddingBottom: '15px', borderBottom: '1px dashed var(--nk-border)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '10px', marginBottom: '5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ fontWeight: 800, color: 'var(--nk-text-main)' }}>{rev.name}</span>
                                  <div style={{ display: 'flex', color: '#ffb400' }}>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <span key={i} className="material-icons-outlined" style={{ fontSize: '0.85rem' }}>
                                        {i < rev.rating ? 'star' : 'star_border'}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--nk-text-sec)', fontWeight: 600 }}>{rev.date}</span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--nk-text-sec)' }}>{rev.comment}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* FORMULARIO DE VALORACIÓN */}
                    {(dbReviews.length === 0 || showReviewForm) && (
                      <form onSubmit={handleReviewSubmit} className="nk-manga-border mt-4" style={{ background: 'var(--nk-bg-card)', padding: '20px', boxShadow: 'var(--nk-manga-shadow)', border: '2px solid var(--nk-border)' }}>
                        <h4 className="font-display text-primary-brand mb-4" style={{ fontSize: '1.4rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--nk-primary)' }}>ESCRIBIR VALORACIÓN</h4>
                        
                        {reviewMessage && (
                          <div className={`alert ${reviewMessage.type === 'success' ? 'alert-success border-success text-success bg-success bg-opacity-10' : 'alert-danger border-danger text-danger bg-danger bg-opacity-10'} p-3 mb-4 nk-manga-border`} style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                            {reviewMessage.text}
                          </div>
                        )}
                        
                        <div className="mb-4">
                          <label className="form-label font-display small tracking-wider" style={{ fontWeight: 800, color: 'var(--nk-text-main)', marginBottom: '8px', display: 'block' }}>CALIFICACIÓN</label>
                          <div style={{ display: 'flex', gap: '8px', color: '#ffb400', cursor: 'pointer' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span 
                                key={star} 
                                className="material-icons-outlined" 
                                onClick={() => setReviewRating(star)}
                                style={{ fontSize: '2rem' }}
                              >
                                {star <= reviewRating ? 'star' : 'star_border'}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Responsive columns layout using Flexbox wrap instead of grid */}
                        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
                          <div style={{ flex: '1 1 250px' }}>
                            <label className="form-label font-display small tracking-wider" style={{ fontWeight: 800, color: 'var(--nk-text-main)', marginBottom: '6px', display: 'block' }}>TU NOMBRE</label>
                            <input 
                              type="text" 
                              className="form-control nk-manga-border" 
                              style={{ 
                                width: '100%', 
                                outline: 'none', 
                                padding: '10px 12px', 
                                background: 'var(--nk-bg-body)', 
                                color: 'var(--nk-text-main)',
                                border: '2px solid var(--nk-border)',
                                fontSize: '0.9rem'
                              }}
                              value={reviewName} 
                              onChange={(e) => setReviewName(e.target.value)} 
                              required 
                            />
                          </div>
                          <div style={{ flex: '1 1 250px' }}>
                            <label className="form-label font-display small tracking-wider" style={{ fontWeight: 800, color: 'var(--nk-text-main)', marginBottom: '6px', display: 'block' }}>TU CORREO ELECTRÓNICO</label>
                            <input 
                              type="email" 
                              className="form-control nk-manga-border" 
                              style={{ 
                                width: '100%', 
                                outline: 'none', 
                                padding: '10px 12px', 
                                background: 'var(--nk-bg-body)', 
                                color: 'var(--nk-text-main)',
                                border: '2px solid var(--nk-border)',
                                fontSize: '0.9rem'
                              }}
                              value={reviewEmail} 
                              onChange={(e) => setReviewEmail(e.target.value)} 
                              required 
                            />
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="form-label font-display small tracking-wider" style={{ fontWeight: 800, color: 'var(--nk-text-main)', marginBottom: '6px', display: 'block' }}>TU OPINIÓN</label>
                          <textarea 
                            className="form-control nk-manga-border" 
                            rows={4} 
                            style={{ 
                              width: '100%', 
                              outline: 'none', 
                              padding: '10px 12px', 
                              background: 'var(--nk-bg-body)', 
                              color: 'var(--nk-text-main)',
                              border: '2px solid var(--nk-border)',
                              fontSize: '0.9rem',
                              resize: 'vertical'
                            }}
                            value={reviewComment} 
                            onChange={(e) => setReviewComment(e.target.value)} 
                            required
                          ></textarea>
                        </div>

                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="nk-btn nk-manga-border w-100"
                          style={{
                            background: 'var(--nk-primary)',
                            fontWeight: 800,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            padding: '12px 20px',
                            color: '#fff',
                            boxShadow: 'var(--nk-manga-shadow)',
                            textTransform: 'uppercase',
                            transition: 'transform 0.1s'
                          }}
                        >
                          {submittingReview ? 'ENVIANDO...' : 'ENVIAR VALORACIÓN'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
                {activeTab === 'sizes' && (
                  <div>
                    <p style={{ fontWeight: 700, marginBottom: '15px' }}>{t('product.sizes_tab_hint')}</p>
                    {/* Mismas láminas que el modal de guía de tallas */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '15px' }}>
                      {[2,3,4,5,6,7,8].map(num => (
                        <div key={num} onClick={() => setZoomImage(`https://nakamabordados.com/wp-content/uploads/2026/01/${num}.webp`)} style={{ cursor: 'zoom-in' }} className="nk-manga-border">
                          <Image
                            src={`https://nakamabordados.com/wp-content/uploads/2026/01/${num}.webp`}
                            alt={`Guía de tallas ${num}`}
                            width={600}
                            height={800}
                            className="nk-guide-img"
                            style={{ width: '100%', height: 'auto', display: 'block' }}
                          />
                        </div>
                      ))}
                    </div>
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
            <span>• {t('marquee.welcome')}</span>
            <span>• {t('marquee.shipping')}</span>
            <span>• {t('marquee.msi')}</span>
            <span>• {t('marquee.transfer')}</span>
            <span>• {t('marquee.welcome')}</span>
            <span>• {t('marquee.shipping')}</span>
            <span>• {t('marquee.msi')}</span>
            <span>• {t('marquee.transfer')}</span>
          </div>
        </div>
      </div>

      <div className="nk-container pb-20">
        <h2 className="nk-section-title text-center" style={{ marginBottom: '40px' }}>{t('product.related')}</h2>
        <div className="nk-store-grid">
          {relatedProducts.length > 0 ? relatedProducts.map(p => {
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
                <div className="nk-card-info" style={{ textAlign: 'left', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px' }}>
                  <h3 className="nk-card-title" style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0', lineHeight: 1.1 }}>
                    <Link href={`/product?id=${p.id}`} style={{ color: 'var(--nk-text-main)', textDecoration: 'none' }}>{p.name}</Link>
                  </h3>
                  <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                    <p className="nk-card-price" style={{ color: 'var(--nk-primary)', fontWeight: '800', margin: '0', fontSize: '1.2rem', fontFamily: 'Teko' }}><ProductPrice product={p} /></p>
                    <FreeShippingBadge style={{ marginTop: '4px' }} />
                    {p.salesCount !== undefined && p.salesCount > 0 && (
                      <p className="nk-card-sales" style={{ fontSize: '0.8rem', color: 'var(--nk-text-sec)', margin: '4px 0 0 0', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                        {p.salesCount} {p.salesCount === 1 ? 'vendido' : 'vendidos'}
                      </p>
                    )}
                  </div>
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
            <div className="nk-size-guide-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '20px' }}>
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
          <div className="nk-modal-card nk-manga-border" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', textAlign: 'center', padding: 'clamp(24px, 6vw, 40px)', background: 'var(--nk-bg-card)', boxShadow: 'var(--nk-manga-shadow-lg)' }}>
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
            
            {/* flexWrap: en 360px los dos botones no caben en una fila (el
                font-size !important de .nk-btn los hace anchos) */}
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="nk-btn nk-btn-ghost"
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
  <div 
    className="nk-store-card" 
    style={{ background: 'var(--nk-bg-card)', border: '2px solid var(--nk-border)', borderRadius: '0', padding: '0', boxShadow: 'var(--nk-manga-shadow)', pointerEvents: 'none' }}
  >
    <div className="nk-store-card-img-wrapper nk-skeleton nk-manga-border" style={{ borderRadius: '0', overflow: 'hidden', position: 'relative', aspectRatio: '1/1', borderBottom: '2px solid var(--nk-border)' }}></div>
    <div className="nk-card-info" style={{ textAlign: 'left', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div className="nk-skeleton" style={{ width: '85%', height: '20px', borderRadius: '0' }}></div>
      <div className="nk-skeleton" style={{ width: '40%', height: '24px', borderRadius: '0' }}></div>
    </div>
  </div>
);
