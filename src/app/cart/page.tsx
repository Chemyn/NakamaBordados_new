'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart, getVariationAttr } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { seedWpSession } from '@/lib/wp-sso';

export default function CartPage() {
  const { cart, subtotal, shipping, discount, total, removeFromCart, updateQuantity, couponCode } = useCart();
  const { formatPrice, currencyInfo } = useCurrency();
  const { t } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const [showEmptyModal, setShowEmptyModal] = React.useState(false);
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [loadingMessage, setLoadingMessage] = React.useState('Levantando el ancla...');
  const router = useRouter();

  React.useEffect(() => {
    if (cart.length === 0) {
      const timer = setTimeout(() => setShowEmptyModal(true), 500);
      return () => clearTimeout(timer);
    }
  }, [cart.length]);

  React.useEffect(() => {
    if (!isRedirecting) return;
    
    const messages = [
      'Levantando el ancla y soltando amarras...',
      'Cargando tus tesoros en la bodega del barco...',
      'Navegando a través del Grand Line hacia el barco principal...',
      'Preparando la pasarela de pago segura de WooCommerce...',
      'Abriendo el cofre de pago...'
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, 1500);

    return () => clearInterval(interval);
  }, [isRedirecting]);

  React.useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setIsRedirecting(false);
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  const handleRedirect = () => {
    setShowEmptyModal(false);
    router.push('/store');
  };

  if (cart.length === 0) {
    return (
      <div className="nk-cart-page" style={{ padding: '100px 0', background: 'var(--nk-bg-body)', minHeight: '80vh' }}>
        <div className="nk-container">
          <div className="nk-empty-cart-view nk-manga-border" style={{ background: 'var(--nk-bg-card)', padding: '60px 20px', textAlign: 'center' }}>
            <span className="material-icons-outlined" style={{ fontSize: 'clamp(3rem, 12vw, 5rem)', color: 'var(--nk-primary)', marginBottom: '20px' }}>shopping_basket</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 6vw, 2.5rem)', marginBottom: '20px' }}>{t('checkout.empty')}</h2>
            <Link href="/store" className="nk-btn">{t('checkout.back')}</Link>
          </div>
        </div>

        {showEmptyModal && (
          <div className="nk-modal-backdrop" style={{ zIndex: 9999 }}>
            <div className="nk-modal-card nk-manga-border" style={{ maxWidth: '400px', textAlign: 'center' }}>
              <div className="nk-skull-art crew-luffy" style={{ transform: 'scale(0.6)', margin: '-40px auto 0' }}>
                <div className="skull-hat"><div className="straw-crown"><div className="straw-band"></div></div><div className="straw-brim"></div></div>
                <div className="skull-base"><div className="skull-eyes"><div className="skull-eye left"></div><div className="skull-eye right"></div></div><div className="skull-nose"></div></div>
                <div className="skull-jaw"></div>
              </div>
              <h3 className="nk-modal-title" style={{ marginTop: '0' }}>¡TU BARCO ESTÁ VACÍO!</h3>
              <p style={{ marginBottom: '25px', color: 'var(--nk-text-sec)', fontWeight: 600 }}>No hemos encontrado tesoros en tu carrito. ¿Quieres ir a la tienda a buscar algunos?</p>
              <button onClick={handleRedirect} className="nk-btn nk-btn-block" style={{ width: '100%' }}>IR A LA TIENDA</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="nk-cart-page" style={{ padding: '120px 0 80px', background: 'var(--nk-bg-body)', minHeight: '100vh' }}>
      <div className="nk-container">
        <h1 className="nk-section-title" style={{ marginBottom: '40px', textAlign: 'center' }}>{t('cart.page_title')}</h1>
        
        <div className="nk-cart-grid">
          {/* Table of products */}
          <div className="nk-cart-items nk-manga-border" style={{ background: 'var(--nk-bg-card)', padding: '30px' }}>
            {/* Sin nk-desktop-only: esa utilidad fuerza display:flex !important
                y rompía el grid del encabezado; el media query de abajo ya lo
                oculta en móvil. */}
            <div className="nk-cart-table-header">
              <div style={{ width: '80px' }}></div>
              <div>{t('cart.item_table.product')}</div>
              <div style={{ textAlign: 'center' }}>{t('cart.item_table.price')}</div>
              <div style={{ textAlign: 'center' }}>{t('cart.item_table.qty')}</div>
              <div style={{ textAlign: 'right' }}>{t('cart.item_table.total')}</div>
              <div style={{ width: '30px' }}></div>
            </div>

            {cart.map((item, idx) => {
              // Fallback a los atributos de la variación: carritos guardados
              // antes del fix de talla ("Size" vs "Talla") no traen
              // selectedTalla/selectedEstilo en localStorage.
              const talla = item.selectedTalla || getVariationAttr(item.variation, 'talla');
              const estilo = item.selectedEstilo || getVariationAttr(item.variation, 'estilo');
              const color = item.selectedColor || getVariationAttr(item.variation, 'color');
              return (
              <div key={idx} className="nk-cart-row">
                <div className="nk-cart-item-img nk-manga-border">
                  <Image src={item.variation?.images?.[0] || item.product.images[0]} alt={item.product.name} width={80} height={100} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                </div>
                <div className="nk-cart-item-info">
                  <h4 className="nk-cart-item-title">{item.product.name}</h4>
                  <div className="nk-cart-item-meta">
                    {talla && <span className="nk-meta-pill">{talla.toUpperCase()}</span>}
                    {estilo && <span className="nk-meta-text">{estilo.toUpperCase()}</span>}
                    {color && <span className="nk-meta-text">{color.toUpperCase()}</span>}
                  </div>
                  <div className="nk-mobile-only nk-cart-item-price-mobile">
                    {formatPrice(item.variation?.price || item.product.price)}
                  </div>
                </div>
                <div className="nk-desktop-only" style={{ textAlign: 'center', fontWeight: 700 }}>{formatPrice(item.variation?.price || item.product.price)}</div>
                <div className="nk-cart-item-qty-col">
                   <div className="nk-qty-control nk-manga-border">
                      <button 
                        onClick={() => updateQuantity(idx, item.quantity - 1)}
                        className="nk-qty-btn-cart"
                      >-</button>
                      <span className="nk-qty-value-cart">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(idx, item.quantity + 1)}
                        className="nk-qty-btn-cart"
                      >+</button>
                   </div>
                </div>
                <div className="nk-cart-item-total-col">
                  {formatPrice((item.variation?.price || item.product.price) * item.quantity)}
                </div>
                <div className="nk-cart-item-remove-col">
                  <button
                    onClick={() => removeFromCart(idx)}
                    className="nk-cart-remove-btn"
                    title="Eliminar"
                  >
                    <span className="material-icons-outlined">delete</span>
                  </button>
                </div>
              </div>
              );
            })}

            <div style={{ marginTop: '30px' }}>
              <Link href="/store" className="nk-btn-sec" style={{ textDecoration: 'none', fontSize: '0.9rem', fontWeight: 800 }}>
                ← {t('cart.continue_btn')}
              </Link>
            </div>
          </div>

          {/* Totals & Redirect */}
          <div className="nk-cart-summary nk-manga-border" style={{ background: 'var(--nk-bg-card)', padding: '30px' }}>
            <h3 className="nk-checkout-h3" style={{ marginBottom: '20px', fontFamily: 'Teko', fontSize: '2rem', borderBottom: '2px solid var(--nk-border)', display: 'inline-block' }}>{t('checkout.summary')}</h3>
            
            <div className="nk-summary-totals">
                <div className="nk-total-line">
                  <span>{t('checkout.subtotal')}</span>
                  <span style={{ fontWeight: 800 }}>{formatPrice(subtotal)}</span>
                </div>
                <div className="nk-total-line">
                  <span>{t('checkout.shipping')}</span>
                  <span style={{ fontWeight: 800 }}>{shipping > 0 ? formatPrice(shipping) : t('checkout.free')}</span>
                </div>
                {discount > 0 && (
                  <div className="nk-total-line" style={{ color: 'var(--nk-primary)' }}>
                    <span>{t('checkout.discount')}</span>
                    <span style={{ fontWeight: 800 }}>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="nk-total-line nk-final-total-cart">
                  <span>{t('checkout.total')}</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <div style={{ marginTop: '30px' }}>
                {(() => {
                  const itemsStr = cart.map(item => {
                    const id = item.variation?.databaseId || item.product.databaseId;
                    return `${id}:${item.quantity}`;
                  }).join(',');
                  
                  // index.php explícito: la raíz "/" con query string sirve el index.html
                  // estático (DirectoryIndex) y el bridge nunca llega a WordPress.
                  // currency: el bridge fija la cookie nakama_currency para que el
                  // checkout de WooCommerce cobre en la misma moneda que ve el usuario.
                  const checkoutUrl = `https://nakamabordados.com/index.php?nk_bridge=1&items=${itemsStr}&currency=${currencyInfo.currency}${couponCode ? `&coupon=${couponCode}` : ''}`;
                  
                  return (
                    <a
                      href={checkoutUrl}
                      className="nk-btn nk-btn-block nk-btn-cart-finalize"
                      style={authLoading ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
                      onClick={async (e) => {
                        e.preventDefault();
                        // Compra con cuenta obligatoria: sin sesión se manda al
                        // login/registro y ?return= lo regresa aquí al terminar.
                        // (Retiene los descuentos de segundas compras por cliente.)
                        if (authLoading) return;
                        if (!user) {
                          router.push('/mi-cuenta/?return=/cart/');
                          return;
                        }
                        // Sembrar la sesión de WordPress ANTES del bridge: sin esto
                        // WooCommerce trata al usuario como invitado y le pide
                        // iniciar sesión / recapturar sus datos de envío.
                        setIsRedirecting(true);
                        await seedWpSession();
                        window.location.href = checkoutUrl;
                      }}
                    >
                      {!authLoading && !user ? 'Inicia sesión para finalizar' : t('cart.finalize_btn')}
                    </a>
                  );
                })()}
                <p style={{ fontSize: '0.7rem', textAlign: 'center', marginTop: '15px', opacity: 0.6, fontStyle: 'italic', color: 'var(--nk-text-sec)' }}>
                  * Serás redirigido a nuestro barco principal para procesar el pago de forma segura.
                </p>
              </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .nk-cart-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 40px;
          align-items: flex-start;
        }

        .nk-cart-table-header {
          display: grid;
          grid-template-columns: 80px 1fr 100px 150px 100px 40px;
          gap: 15px;
          padding-bottom: 15px;
          border-bottom: 2px solid var(--nk-border);
          font-weight: 800;
          text-transform: uppercase;
          font-size: 0.85rem;
          color: var(--nk-text-sec);
        }

        .nk-cart-row {
          display: grid;
          grid-template-columns: 80px 1fr 100px 150px 100px 40px;
          gap: 15px;
          padding: 24px 0;
          border-bottom: 1px solid var(--nk-border);
          align-items: center;
          transition: background 0.2s ease;
        }

        .nk-cart-item-img {
          width: 80px;
          aspect-ratio: 3/4;
          overflow: hidden;
          background: #fff;
        }

        .nk-cart-item-title {
          margin: 0;
          font-size: 1.4rem;
          font-weight: 800;
          line-height: 1.1;
          overflow-wrap: anywhere;
        }

        .nk-cart-item-meta {
          display: flex;
          gap: 8px;
          margin-top: 8px;
          align-items: center;
        }

        .nk-meta-pill {
          background: var(--nk-primary);
          color: #fff;
          padding: 2px 8px;
          font-size: 0.7rem;
          font-weight: 800;
          border-radius: 2px;
        }

        .nk-meta-text {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--nk-text-sec);
        }

        .nk-qty-control {
          display: inline-flex;
          align-items: center;
          background: var(--nk-bg-wrapper);
          overflow: hidden;
        }

        .nk-qty-btn-cart {
          background: transparent;
          border: none;
          padding: 8px 12px;
          min-width: 44px; /* target táctil mínimo */
          min-height: 44px;
          cursor: pointer;
          font-weight: 800;
          color: var(--nk-text-main);
          font-size: 1.1rem;
        }

        .nk-qty-btn-cart:hover {
          background: var(--nk-primary);
          color: #fff;
        }

        .nk-qty-value-cart {
          padding: 0 15px;
          min-width: 40px;
          text-align: center;
          font-weight: 800;
          font-family: 'Teko', sans-serif;
          font-size: 1.2rem;
        }

        .nk-cart-item-total-col {
          text-align: right;
          font-weight: 800;
          color: var(--nk-primary);
          font-size: 1.1rem;
        }

        .nk-cart-remove-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--nk-text-sec);
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 44px; /* target táctil mínimo */
          min-height: 44px;
          opacity: 0.5;
          transition: all 0.2s;
        }

        .nk-cart-remove-btn:hover {
          color: var(--nk-primary);
          opacity: 1;
        }

        .nk-total-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-weight: 600;
        }

        .nk-final-total-cart {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 2px solid var(--nk-border);
          font-size: 2.2rem;
          font-family: 'Teko', sans-serif;
          font-weight: 800;
          line-height: 1;
        }

        .nk-btn-cart-finalize {
          padding: 18px;
          font-size: 1.6rem !important;
          text-align: center;
          text-decoration: none;
          display: block;
          width: 100%;
        }

        @media (max-width: 1200px) {
          .nk-cart-grid { grid-template-columns: 1fr; }
          .nk-cart-summary { order: -1; position: relative; top: 0; margin-bottom: 30px; }
        }

        @media (max-width: 768px) {
          .nk-cart-row {
            position: relative !important;
            grid-template-columns: 80px 1fr !important;
            grid-template-areas:
              "img info"
              "img qty"
              "img total" !important;
            gap: 12px 16px !important;
            padding: 20px 0 !important;
            align-items: start !important;
          }

          .nk-cart-items { padding: 16px !important; }

          .nk-cart-item-img {
            grid-area: img !important;
            width: 100% !important;
            height: auto !important;
            aspect-ratio: 3/4 !important;
          }

          .nk-cart-item-info {
            grid-area: info !important;
            padding-right: 40px !important; /* Evitar colisión con el botón de eliminar absoluto */
          }

          .nk-cart-item-qty-col {
            grid-area: qty !important;
            justify-self: flex-start !important;
            margin-top: 2px !important;
          }

          .nk-cart-item-total-col {
            grid-area: total !important;
            align-self: center !important;
            justify-self: start !important;
            text-align: left !important;
            font-size: 1.25rem !important;
            font-weight: 800 !important;
            color: var(--nk-primary) !important;
            margin-top: 4px !important;
          }

          .nk-cart-item-total-col::before {
            content: "Subtotal: " !important;
            font-size: 0.85rem !important;
            color: var(--nk-text-sec) !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
          }

          .nk-cart-item-remove-col {
            grid-area: unset !important;
            position: absolute !important;
            top: 16px !important;
            right: 0 !important;
            z-index: 10 !important;
          }

          .nk-cart-item-title {
            font-size: 1.1rem !important;
            margin-bottom: 2px !important;
          }

          .nk-cart-item-price-mobile {
            font-size: 0.9rem !important;
            font-weight: 700 !important;
            color: var(--nk-primary) !important;
            margin-top: 4px !important;
          }

          .nk-cart-table-header { display: none !important; }
        }
      `}</style>
      
      <style jsx global>{`
        /* Loading Overlay Styles (Global to style React Portal elements) */
        .nk-loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(10, 10, 10, 0.85) !important;
          backdrop-filter: blur(8px) !important;
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease-out;
        }

        .nk-loading-content {
          background: var(--nk-bg-card);
          padding: 40px;
          max-width: 420px;
          width: 90%;
          text-align: center;
          box-shadow: var(--nk-manga-shadow-lg);
          border: 3px solid #000;
          position: relative;
        }

        .nk-loading-title {
          font-family: 'Teko', sans-serif;
          font-size: 2.5rem;
          font-weight: 900;
          margin-top: 10px;
          margin-bottom: 5px;
          letter-spacing: 1px;
          color: var(--nk-text-main);
          text-transform: uppercase;
        }

        .nk-loading-subtitle {
          font-size: 1rem;
          font-weight: 700;
          color: var(--nk-text-sec);
          margin-bottom: 25px;
          min-height: 48px;
        }

        .nk-loading-bar-wrapper {
          height: 8px;
          width: 100%;
          background: var(--nk-border);
          border: 2px solid #000;
          overflow: hidden;
          position: relative;
        }

        .nk-loading-bar-fill {
          height: 100%;
          width: 50%;
          background: var(--nk-primary);
          position: absolute;
          left: 0;
          animation: loadingProgress 2s infinite ease-in-out;
        }

        @keyframes loadingProgress {
          0% { left: -50%; }
          100% { left: 100%; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .nk-spin-animation {
          animation: wobbleHat 3s infinite ease-in-out;
        }

        @keyframes wobbleHat {
          0%, 100% { transform: scale(0.8) rotate(0deg); }
          25% { transform: scale(0.85) rotate(-5deg); }
          75% { transform: scale(0.85) rotate(5deg); }
        }
      `}</style>
      
      {isRedirecting && typeof document !== 'undefined' && createPortal(
        <div className="nk-loading-overlay">
          <div className="nk-loading-content nk-manga-border">
            <div className="nk-loading-spinner-container">
              <div className="nk-skull-art crew-luffy nk-spin-animation" style={{ transform: 'scale(0.8)', margin: '0 auto 20px' }}>
                <div className="skull-hat"><div className="straw-crown"><div className="straw-band"></div></div><div className="straw-brim"></div></div>
                <div className="skull-base"><div className="skull-eyes"><div className="skull-eye left"></div><div className="skull-eye right"></div></div><div className="skull-nose"></div></div>
                <div className="skull-jaw"></div>
              </div>
            </div>
            <h2 className="nk-loading-title">LEVANTA EL ANCLA</h2>
            <p className="nk-loading-subtitle">{loadingMessage}</p>
            <div className="nk-loading-bar-wrapper">
              <div className="nk-loading-bar-fill"></div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
