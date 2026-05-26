'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';

import { syncCartWithServer } from '@/lib/cart-mutations';

export default function CheckoutPage() {
  const { 
    cart, 
    removeFromCart, 
    clearCart,
    subtotal, 
    couponCode, 
    discount 
  } = useCart();
  const { formatPrice } = useCurrency();

  // Syncing to Woo
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleProceedToPayment = async () => {
    if (cart.length === 0) return;
    setIsRedirecting(true);
    
    try {
      // 1. Sync entire cart with WordPress via GraphQL
      await syncCartWithServer(cart);

      // 2. Build redirect URL. Since we synced, WooCommerce already knows the cart content
      // if the session token is correctly associated.
      // We still pass the first item as a fallback 'seed' just in case.
      const firstItem = cart[0];
      const wpId = firstItem.variation ? 
          (firstItem.variation.databaseId || firstItem.variation.id.replace('WP-VAR-', '')) : 
          (firstItem.product.databaseId || firstItem.product.id.replace('WP-', ''));

      let redirectUrl = `https://nakamabordados.com/checkout/?add-to-cart=${wpId}&quantity=${firstItem.quantity}`;
      
      if (couponCode) {
        redirectUrl += `&coupon_code=${couponCode}`;
      }

      // Clear local cart before redirect
      clearCart();
      
      // Redirect to the real WordPress checkout
      window.location.href = redirectUrl;
    } catch (err) {
      console.error("Redirect error:", err);
      alert("Hubo un problema al conectar con el servidor de pagos. Por favor intenta de nuevo.");
      setIsRedirecting(false);
    }
  };

  return (
    <div className="nk-checkout-page" style={{ paddingTop: '50px', paddingBottom: '80px', background: 'var(--nk-bg-wrapper)', minHeight: '100vh' }}>
      <div className="nk-store-hero" style={{ background: 'transparent' }}>
        <span className="nk-store-hero-badge nk-manga-border" style={{ background: 'var(--nk-accent)', color: '#000' }}>Caja Registradora del Sunny</span>
        <h1 className="nk-store-hero-title" style={{ textShadow: '2px 2px 0px var(--nk-accent)' }}>Finalizar Compra</h1>
        <p className="nk-store-hero-subtitle" style={{ fontWeight: 600 }}>Revisa tu botín antes de proceder al pago seguro</p>
      </div>

      <div className="nk-container">
        {cart.length === 0 ? (
          <div className="nk-no-results nk-manga-border" style={{ padding: '80px 24px', background: '#fff', boxShadow: '8px 8px 0px #000' }}>
            <span className="material-icons-outlined nk-no-results-icon">shopping_bag</span>
            <h3 style={{ fontSize: '2rem' }}>Tu barco está vacío</h3>
            <p style={{ fontWeight: 600 }}>¡Añade algunos tesoros antes de zarpar!</p>
            <Link href="/store" className="nk-btn nk-manga-border" style={{ boxShadow: '4px 4px 0px #000' }}>Ir a la Tienda</Link>
          </div>
        ) : (
          <div className="nk-checkout-redirect-layout">
            <div className="nk-checkout-review-card nk-dash-animate nk-manga-border" style={{ boxShadow: '12px 12px 0px #000' }}>
              <h2 className="nk-checkout-heading" style={{ fontSize: '2.5rem !important', fontWeight: 800 }}>Resumen de tu Pedido</h2>
              
              <div className="nk-checkout-review-items">
                {cart.map((item, index) => {
                  const price = item.variation ? item.variation.price : item.product.price;
                  const attrStr = item.variation ? Object.values(item.variation.attributes).join(' / ') : 'Única';

                  return (
                    <div className="nk-review-item" key={index} style={{ borderBottomColor: '#eee' }}>
                      <img src={item.product.images[0]} alt={item.product.name} className="nk-review-item-img nk-manga-border" style={{ boxShadow: '3px 3px 0px #000' }} />
                      <div className="nk-review-item-details">
                        <h4 className="nk-review-item-title" style={{ fontWeight: 800 }}>{item.product.name}</h4>
                        <p className="nk-review-item-meta">{attrStr}</p>
                        <p className="nk-review-item-qty">Cantidad: {item.quantity}</p>
                        <button type="button" className="nk-review-remove-btn" onClick={() => removeFromCart(index)}>Eliminar</button>
                      </div>
                      <div className="nk-checkout-item-price" style={{ color: 'var(--nk-primary)', fontWeight: 800 }}>{formatPrice(price * item.quantity)}</div>
                    </div>
                  );
                })}
              </div>

              <div className="nk-review-divider" style={{ background: '#000', height: '2px' }}></div>

              <div className="nk-review-summary">
                <div className="nk-summary-row">
                  <span style={{ fontWeight: 700 }}>Subtotal:</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="nk-summary-row nk-summary-discount" style={{ color: 'var(--nk-primary)', fontWeight: 800 }}>
                    <span>Descuento ({couponCode}):</span>
                    <span>-{formatPrice(subtotal * discount)}</span>
                  </div>
                )}
                <div className="nk-summary-row">
                  <span style={{ fontWeight: 700 }}>Envío:</span>
                  <span style={{ fontWeight: 600 }}>{subtotal >= 1200 || cart.reduce((s,i)=>s+i.quantity,0) >= 4 ? '¡GRATIS!' : 'Calculado en siguiente paso'}</span>
                </div>
                <div className="nk-summary-total" style={{ borderTop: '2px solid #000', paddingTop: '15px' }}>
                  <span style={{ fontSize: '1.4rem' }}>Total estimado:</span>
                  <span style={{ color: 'var(--nk-primary)', fontSize: '2rem' }}>{formatPrice(subtotal * (1 - discount))}</span>
                </div>
              </div>

              <div className="nk-checkout-notice-box nk-manga-border" style={{ background: 'var(--nk-accent)', borderColor: '#000', boxShadow: '4px 4px 0px #000' }}>
                <span className="material-icons-outlined">security</span>
                <div>
                  <h4 style={{ fontWeight: 800 }}>Pago 100% Seguro</h4>
                  <p style={{ color: '#000', fontWeight: 600 }}>Al hacer clic en el botón, serás redirigido al servidor oficial de <strong>Nakama Bordados</strong> para completar tu dirección de envío y realizar el pago mediante MercadoPago, Tarjeta o Transferencia.</p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={handleProceedToPayment} 
                disabled={isRedirecting}
                className="nk-btn nk-btn-checkout-finalize nk-manga-border"
                style={{ boxShadow: '6px 6px 0px #000' }}
              >
                {isRedirecting ? (
                  <span className="nk-flex-center">
                    <span className="nk-loader-mini"></span> Redirigiendo al Grand Line...
                  </span>
                ) : (
                  `¡Confirmar y Pagar Mi Botín!`
                )}
              </button>
              
              <div className="nk-checkout-footer-links" style={{ marginTop: '20px' }}>
                 <Link href="/store" style={{ fontWeight: 700 }}>← Seguir buscando tesoros</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
