'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

export default function CartPage() {
  const { cart, subtotal, shipping, discount, total, removeFromCart, updateQuantity, couponCode } = useCart();
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();

  if (cart.length === 0) {
    return (
      <div className="nk-checkout-empty">
        <div className="nk-container">
          <div className="nk-empty-card nk-manga-border">
            <span className="material-icons-outlined" style={{ fontSize: '5rem', color: 'var(--nk-primary)' }}>sailing</span>
            <h2>{t('checkout.empty')}</h2>
            <Link href="/store" className="nk-btn">{t('checkout.back')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nk-cart-page" style={{ padding: '100px 0', background: 'var(--nk-bg-body)', minHeight: '80vh' }}>
      <div className="nk-container">
        <h1 className="nk-section-title" style={{ marginBottom: '40px' }}>{t('cart.page_title')}</h1>
        
        <div className="nk-cart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '40px', alignItems: 'flex-start' }}>
          {/* Table of products */}
          <div className="nk-cart-items nk-manga-border" style={{ background: '#fff', padding: '30px' }}>
            <div className="nk-cart-table-header" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 100px 150px 100px auto', gap: '15px', paddingBottom: '15px', borderBottom: '2px solid #000', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.85rem' }}>
              <div style={{ width: '80px' }}></div>
              <div>{t('cart.item_table.product')}</div>
              <div style={{ textAlign: 'center' }}>{t('cart.item_table.price')}</div>
              <div style={{ textAlign: 'center' }}>{t('cart.item_table.qty')}</div>
              <div style={{ textAlign: 'right' }}>{t('cart.item_table.total')}</div>
              <div style={{ width: '30px' }}></div>
            </div>

            {cart.map((item, idx) => (
              <div key={idx} className="nk-cart-row" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 100px 150px 100px auto', gap: '15px', padding: '20px 0', borderBottom: '1px solid #eee', alignItems: 'center' }}>
                <div style={{ width: '80px', border: '1px solid #000' }}>
                  <Image src={item.variation?.images?.[0] || item.product.images[0]} alt={item.product.name} width={80} height={100} style={{ objectFit: 'cover' }} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800 }}>{item.product.name}</h4>
                  <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: '5px 0 0' }}>
                    {item.selectedTalla && <span style={{ background: '#000', color: '#fff', padding: '2px 6px', marginRight: '5px' }}>{item.selectedTalla}</span>}
                    {item.selectedColor && <span>{item.selectedColor}</span>}
                  </p>
                </div>
                <div style={{ textAlign: 'center', fontWeight: 700 }}>{formatPrice(item.variation?.price || item.product.price)}</div>
                <div style={{ textAlign: 'center' }}>
                   <div className="nk-qty-control" style={{ display: 'inline-flex', alignItems: 'center', border: '2px solid #000', borderRadius: '4px', overflow: 'hidden' }}>
                      <button 
                        onClick={() => updateQuantity(idx, item.quantity - 1)}
                        style={{ background: '#f5f5f5', border: 'none', borderRight: '1px solid #000', padding: '5px 10px', cursor: 'pointer', fontWeight: 800 }}
                      >-</button>
                      <span style={{ padding: '0 15px', minWidth: '30px', textAlign: 'center', fontWeight: 800 }}>{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(idx, item.quantity + 1)}
                        style={{ background: '#f5f5f5', border: 'none', borderLeft: '1px solid #000', padding: '5px 10px', cursor: 'pointer', fontWeight: 800 }}
                      >+</button>
                   </div>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 800, color: 'var(--nk-primary)' }}>{formatPrice((item.variation?.price || item.product.price) * item.quantity)}</div>
                <button 
                  onClick={() => removeFromCart(idx)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc' }}
                  title="Eliminar"
                >
                  <span className="material-icons-outlined">delete</span>
                </button>
              </div>
            ))}

            <div style={{ marginTop: '30px' }}>
              <Link href="/store" className="nk-btn-sec" style={{ textDecoration: 'none', fontSize: '0.9rem', fontWeight: 800 }}>
                ← {t('cart.continue_btn')}
              </Link>
            </div>
          </div>

          {/* Totals & Redirect */}
          <div className="nk-cart-summary nk-manga-border" style={{ background: '#fff', padding: '30px', position: 'sticky', top: '100px' }}>
            <h3 className="nk-checkout-h3" style={{ marginBottom: '20px' }}>{t('checkout.summary')}</h3>
            
            <div className="nk-summary-totals">
                <div className="nk-total-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>{t('checkout.subtotal')}</span>
                  <span style={{ fontWeight: 800 }}>{formatPrice(subtotal)}</span>
                </div>
                <div className="nk-total-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>{t('checkout.shipping')}</span>
                  <span style={{ fontWeight: 800 }}>{shipping > 0 ? formatPrice(shipping) : t('checkout.free')}</span>
                </div>
                {discount > 0 && (
                  <div className="nk-total-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: 'var(--nk-primary)' }}>
                    <span>{t('checkout.discount')}</span>
                    <span style={{ fontWeight: 800 }}>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="nk-total-line nk-final-total" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #000', fontSize: '1.5rem', fontFamily: 'Teko', fontWeight: 800 }}>
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
                  
                  const checkoutUrl = `https://nakamabordados.com/?nk_bridge=1&items=${itemsStr}${couponCode ? `&coupon=${couponCode}` : ''}`;
                  
                  return (
                    <a 
                      href={checkoutUrl} 
                      className="nk-btn nk-btn-block" 
                      style={{ 
                        padding: '20px', 
                        fontSize: '1.4rem', 
                        textAlign: 'center', 
                        textDecoration: 'none',
                        display: 'block',
                        background: 'var(--nk-primary)',
                        color: '#fff',
                        boxShadow: '8px 8px 0px #000'
                      }}
                    >
                      {t('cart.finalize_btn')}
                    </a>
                  );
                })()}
                <p style={{ fontSize: '0.7rem', textAlign: 'center', marginTop: '15px', opacity: 0.6, fontStyle: 'italic' }}>
                  * Serás redirigido a nuestro barco principal para procesar el pago de forma segura.
                </p>
              </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .nk-checkout-empty { padding: 150px 20px; text-align: center; }
        .nk-empty-card { max-width: 500px; margin: 0 auto; padding: 60px 40px; background: #fff; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .nk-checkout-h3 { font-family: 'Teko', sans-serif; font-size: 2rem; border-bottom: 2px solid #000; display: inline-block; line-height: 1; }
        
        @media (max-width: 1024px) {
          .nk-cart-grid { grid-template-columns: 1fr; }
          .nk-cart-summary { order: -1; position: relative; top: 0; }
        }

        @media (max-width: 768px) {
          .nk-cart-table-header { display: none !important; }
          .nk-cart-row {
            grid-template-columns: 80px 1fr auto !important;
            grid-template-areas: 
              "img info delete"
              "img price price";
          }
        }
      `}</style>
    </div>
  );
}
