'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

export default function CartPage() {
  const { cart, subtotal, shipping, discount, total, removeFromCart, updateQuantity, couponCode } = useCart();
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const [showEmptyModal, setShowEmptyModal] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    if (cart.length === 0) {
      const timer = setTimeout(() => setShowEmptyModal(true), 500);
      return () => clearTimeout(timer);
    }
  }, [cart.length]);

  const handleRedirect = () => {
    setShowEmptyModal(false);
    router.push('/store');
  };

  if (cart.length === 0) {
    return (
      <div className="nk-cart-page" style={{ padding: '100px 0', background: 'var(--nk-bg-body)', minHeight: '80vh' }}>
        <div className="nk-container">
          <div className="nk-empty-cart-view nk-manga-border" style={{ background: 'var(--nk-bg-card)', padding: '60px 20px', textAlign: 'center' }}>
            <span className="material-icons-outlined" style={{ fontSize: '5rem', color: 'var(--nk-primary)', marginBottom: '20px' }}>shopping_basket</span>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>{t('checkout.empty')}</h2>
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
            <div className="nk-cart-table-header nk-desktop-only">
              <div style={{ width: '80px' }}></div>
              <div>{t('cart.item_table.product')}</div>
              <div style={{ textAlign: 'center' }}>{t('cart.item_table.price')}</div>
              <div style={{ textAlign: 'center' }}>{t('cart.item_table.qty')}</div>
              <div style={{ textAlign: 'right' }}>{t('cart.item_table.total')}</div>
              <div style={{ width: '30px' }}></div>
            </div>

            {cart.map((item, idx) => (
              <div key={idx} className="nk-cart-row">
                <div className="nk-cart-item-img nk-manga-border">
                  <Image src={item.variation?.images?.[0] || item.product.images[0]} alt={item.product.name} width={80} height={100} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                </div>
                <div className="nk-cart-item-info">
                  <h4 className="nk-cart-item-title">{item.product.name}</h4>
                  <div className="nk-cart-item-meta">
                    {item.selectedTalla && <span className="nk-meta-pill">{item.selectedTalla.toUpperCase()}</span>}
                    {item.selectedColor && <span className="nk-meta-text">{item.selectedColor.toUpperCase()}</span>}
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
            ))}

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
                  const checkoutUrl = `https://nakamabordados.com/index.php?nk_bridge=1&items=${itemsStr}${couponCode ? `&coupon=${couponCode}` : ''}`;
                  
                  return (
                    <a 
                      href={checkoutUrl} 
                      className="nk-btn nk-btn-block nk-btn-cart-finalize"
                    >
                      {t('cart.finalize_btn')}
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
            grid-template-columns: 80px 1fr 40px;
            grid-template-areas: 
              "img info remove"
              "img qty total";
            gap: 15px;
            padding: 20px 0;
          }

          .nk-cart-item-img { grid-area: img; }
          .nk-cart-item-info { grid-area: info; }
          .nk-cart-item-qty-col { grid-area: qty; justify-self: flex-start; }
          .nk-cart-item-total-col { grid-area: total; align-self: center; }
          .nk-cart-item-remove-col { grid-area: remove; align-self: flex-start; }

          .nk-cart-item-title { font-size: 1.1rem; }
          .nk-cart-item-price-mobile { font-size: 0.9rem; font-weight: 700; color: var(--nk-primary); margin-top: 4px; }
          
          .nk-cart-table-header { display: none !important; }
        }
      `}</style>
    </div>
  );
}
