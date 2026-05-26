'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { emptyCart, addToCart, updateCustomerShipping, getShippingRates, getSessionToken, updateShippingMethod } from '@/lib/cart-mutations';

export default function CheckoutPage() {
  const { 
    cart, 
    removeFromCart, 
    clearCart,
    subtotal, 
    shipping: localShipping, 
    total: localTotal, 
    couponCode, 
    discount, 
    applyCoupon, 
    removeCoupon 
  } = useCart();
  const { formatPrice } = useCurrency();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  // Envia.com & Woo Shipping Rates
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [selectedRate, setSelectedRate] = useState<any>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

  // Syncing to Woo
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleProceedToPayment = async () => {
    if (cart.length === 0) return;
    setIsRedirecting(true);
    
    try {
      // Build native WooCommerce redirect URL
      // Use the first item to seed the cart and ensure WooCommerce session starts
      // This is the most reliable 'zero-config' way.
      const firstItem = cart[0];
      const wpId = firstItem.variation ? 
          (firstItem.variation.databaseId || firstItem.variation.id.replace('WP-VAR-', '').replace('WP-', '')) : 
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
    <div className="nk-checkout-page" style={{ paddingTop: '50px', paddingBottom: '80px' }}>
      <div className="nk-store-hero">
        <span className="nk-store-hero-badge">Caja Registradora</span>
        <h1 className="nk-store-hero-title">Finalizar Compra</h1>
        <p className="nk-store-hero-subtitle">Revisa tu orden antes de proceder al pago seguro</p>
      </div>

      <div className="nk-container">
        {cart.length === 0 ? (
          <div className="nk-no-results" style={{ padding: '80px 24px' }}>
            <span className="material-icons-outlined nk-no-results-icon">shopping_bag</span>
            <h3>Tu carrito está vacío</h3>
            <p>Agrega algunos productos antes de proceder al pago.</p>
            <Link href="/store" className="nk-btn">Ir a la Tienda</Link>
          </div>
        ) : (
          <div className="nk-checkout-redirect-layout">
            <div className="nk-checkout-review-card nk-dash-animate">
              <h2 className="nk-checkout-heading">Resumen de tu Pedido</h2>
              
              <div className="nk-checkout-review-items">
                {cart.map((item, index) => {
                  const price = item.variation ? item.variation.price : item.product.price;
                  const attrStr = item.variation ? Object.values(item.variation.attributes).join(' / ') : 'Única';

                  return (
                    <div className="nk-review-item" key={index}>
                      <img src={item.product.images[0]} alt={item.product.name} className="nk-review-item-img" />
                      <div className="nk-review-item-details">
                        <h4 className="nk-review-item-title">{item.product.name}</h4>
                        <p className="nk-review-item-meta">{attrStr}</p>
                        <p className="nk-review-item-qty">Cantidad: {item.quantity}</p>
                        <button type="button" className="nk-review-remove-btn" onClick={() => removeFromCart(index)}>Eliminar</button>
                      </div>
                      <div className="nk-checkout-item-price">{formatPrice(price * item.quantity)}</div>
                    </div>
                  );
                })}
              </div>

              <div className="nk-review-divider"></div>

              <div className="nk-review-summary">
                <div className="nk-summary-row">
                  <span>Subtotal:</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="nk-summary-row nk-summary-discount">
                    <span>Descuento ({couponCode}):</span>
                    <span>-{formatPrice(subtotal * discount)}</span>
                  </div>
                )}
                <div className="nk-summary-row">
                  <span>Envío:</span>
                  <span>{subtotal >= 1200 || cart.reduce((s,i)=>s+i.quantity,0) >= 4 ? 'GRATIS' : 'Calculado en siguiente paso'}</span>
                </div>
                <div className="nk-summary-total">
                  <span>Total estimado:</span>
                  <span>{formatPrice(subtotal * (1 - discount))}</span>
                </div>
              </div>

              <div className="nk-checkout-notice-box">
                <span className="material-icons-outlined">security</span>
                <div>
                  <h4>Pago 100% Seguro</h4>
                  <p>Al hacer clic en el botón, serás redirigido al servidor oficial de <strong>Nakama Bordados</strong> para completar tu dirección de envío y realizar el pago mediante MercadoPago, Tarjeta o Transferencia.</p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={handleProceedToPayment} 
                disabled={isRedirecting}
                className="nk-btn nk-btn-checkout-finalize" 
              >
                {isRedirecting ? (
                  <span className="nk-flex-center">
                    <span className="nk-loader-mini"></span> Redirigiendo...
                  </span>
                ) : (
                  `Confirmar y Pagar ${formatPrice(subtotal * (1 - discount))}`
                )}
              </button>
              
              <div className="nk-checkout-footer-links">
                 <Link href="/store">← Continuar Comprando</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
