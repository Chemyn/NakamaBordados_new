'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { emptyCart, addToCart, updateCustomerShipping, getShippingRates, getSessionToken } from '@/lib/cart-mutations';

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
  const [isSyncing, setIsSyncing] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    country: 'México',
    state: '',
    city: '',
    colonia: '',
    address: '',
    postcode: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleCouponApply = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponInput) return;
    const success = applyCoupon(couponInput);
    if (success) {
      setCouponInput('');
    } else {
      setCouponError('Código de cupón inválido. Intenta con NAKAMA10 o NAKAMA20');
    }
  };

  const calculateShippingRates = async () => {
    if (!formData.postcode) {
      alert("Por favor ingresa un código postal para calcular el envío.");
      return;
    }
    
    setIsCalculatingShipping(true);
    try {
      // 1. Ensure local cart is synced to Woo
      await emptyCart();
      for (const item of cart) {
        // Extract parent product ID
        const productId = parseInt(item.product.id.replace('WP-', '')) || parseInt(item.product.id);
        
        // Extract variation ID if it exists
        let variationId: number | undefined = undefined;
        if (item.variation && item.variation.id) {
          // It might be like 'WP-VAR-100194' or just '100194'
          const rawVarId = item.variation.id.replace('WP-VAR-', '').replace('WP-', '');
          const parsedVar = parseInt(rawVarId);
          if (!isNaN(parsedVar)) {
            variationId = parsedVar;
          }
        }
        
        if (!isNaN(productId)) {
          await addToCart(productId, item.quantity, variationId);
        }
      }

      // 2. Update customer postcode
      await updateCustomerShipping(formData.postcode, 'MX', formData.state, formData.city);

      // 3. Get Envia.com rates
      const ratesData = await getShippingRates();
      if (ratesData && ratesData.length > 0 && ratesData[0].rates) {
        setShippingRates(ratesData[0].rates);
        if (ratesData[0].rates.length > 0) {
          setSelectedRate(ratesData[0].rates[0]);
        }
      } else {
        setShippingRates([]);
        alert("No se encontraron tarifas de envío para este código postal.");
      }
    } catch (err) {
      console.error(err);
      alert("Error calculando tarifas de envío.");
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.firstName) errors.firstName = 'Obligatorio';
    if (!formData.lastName) errors.lastName = 'Obligatorio';
    if (!formData.phone) errors.phone = 'Obligatorio';
    if (!formData.email) errors.email = 'Obligatorio';
    if (!formData.postcode) errors.postcode = 'Obligatorio para el envío';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      alert('Por favor, completa los campos obligatorios.');
      return;
    }

    setIsSyncing(true);
    
    try {
      // We already synced during calculateShippingRates, but let's make sure
      if (shippingRates.length === 0) {
        await calculateShippingRates();
      }

      // Get the session token to pass to the native checkout
      const sessionToken = getSessionToken();
      
      // Clear local cart because they are going to WP Checkout
      clearCart();

      // Redirect to native WordPress checkout passing the session via URL
      // If using WPGraphQL CORS, cookies might be passed automatically. 
      // Passing session_id in URL is a fallback that might require a small PHP snippet on WP to catch.
      window.location.href = `https://nakamabordados.com/checkout/?session_id=${sessionToken || ''}`;
    } catch (err) {
      console.error(err);
      alert("Error al procesar el checkout. Inténtalo de nuevo.");
      setIsSyncing(false);
    }
  };

  const finalShipping = selectedRate ? parseFloat(selectedRate.cost) : localShipping;
  const finalTotal = subtotal * (1 - discount) + finalShipping;

  return (
    <div className="nk-checkout-page" style={{ paddingTop: '50px', paddingBottom: '80px' }}>
      <div className="nk-store-hero">
        <span className="nk-store-hero-badge">Caja Registradora</span>
        <h1 className="nk-store-hero-title">Finalizar Compra</h1>
        <p className="nk-store-hero-subtitle">Revisa tu pedido y calcula el envío con Envia.com</p>
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
          <div className="nk-checkout-grid">
            
            {/* Left Column: Form */}
            <div className="nk-checkout-form-col">
              <h2 className="nk-checkout-heading">1. Datos Personales</h2>
              <form className="nk-checkout-form">
                <div className="nk-form-row">
                  <div className="nk-form-group">
                    <label>Nombre *</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className={`nk-input-base ${formErrors.firstName ? 'error' : ''}`} />
                  </div>
                  <div className="nk-form-group">
                    <label>Apellidos *</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className={`nk-input-base ${formErrors.lastName ? 'error' : ''}`} />
                  </div>
                </div>

                <div className="nk-form-row">
                  <div className="nk-form-group">
                    <label>Teléfono *</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className={`nk-input-base ${formErrors.phone ? 'error' : ''}`} />
                  </div>
                  <div className="nk-form-group">
                    <label>Email *</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={`nk-input-base ${formErrors.email ? 'error' : ''}`} />
                  </div>
                </div>

                <h2 className="nk-checkout-heading" style={{ marginTop: '30px' }}>2. Calcular Envío (Envia.com)</h2>
                
                <div className="nk-form-row">
                  <div className="nk-form-group">
                    <label>Código Postal *</label>
                    <input type="text" name="postcode" value={formData.postcode} onChange={handleInputChange} placeholder="Ej: 83000" className={`nk-input-base ${formErrors.postcode ? 'error' : ''}`} />
                  </div>
                  <div className="nk-form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button type="button" onClick={calculateShippingRates} disabled={isCalculatingShipping || !formData.postcode} className="nk-btn" style={{ width: '100%', height: '48px' }}>
                      {isCalculatingShipping ? 'Calculando...' : 'Obtener Tarifas'}
                    </button>
                  </div>
                </div>

                <div className="nk-form-row">
                  <div className="nk-form-group">
                    <label>Estado</label>
                    <input type="text" name="state" value={formData.state} onChange={handleInputChange} className="nk-input-base" />
                  </div>
                  <div className="nk-form-group">
                    <label>Ciudad</label>
                    <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="nk-input-base" />
                  </div>
                </div>

                {shippingRates.length > 0 && (
                  <div style={{ marginTop: '20px', padding: '20px', border: '1px solid var(--nk-border)', borderRadius: '8px', background: 'var(--nk-bg-wrapper)' }}>
                    <h3 style={{ marginBottom: '15px', fontSize: '1.2rem', fontFamily: 'Teko' }}>Selecciona tu método de envío:</h3>
                    {shippingRates.map((rate: any) => (
                      <label key={rate.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--nk-border)', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input 
                            type="radio" 
                            name="shippingRate" 
                            value={rate.id} 
                            checked={selectedRate?.id === rate.id}
                            onChange={() => setSelectedRate(rate)}
                          />
                          <span>{rate.label}</span>
                        </div>
                        <strong style={{ color: 'var(--nk-primary)' }}>{formatPrice(parseFloat(rate.cost))}</strong>
                      </label>
                    ))}
                  </div>
                )}
              </form>
            </div>

            {/* Right Column: Order Review Cart Sidebar */}
            <div className="nk-checkout-sidebar-col">
              <div className="nk-checkout-review-card">
                <h2 className="nk-checkout-heading">Tu Pedido</h2>
                
                <div className="nk-checkout-review-items">
                  {cart.map((item, index) => {
                    const price = item.variation ? item.variation.price : item.product.price;
                    const attrStr = item.variation ? Object.values(item.variation.attributes).join(' / ') : 'Única';

                    return (
                      <div className="nk-review-item" key={index}>
                        <img src={item.product.images[0]} alt={item.product.name} className="nk-review-item-img" />
                        <div className="nk-review-item-details">
                          <h4 className="nk-review-item-title">{item.product.name}</h4>
                          <p className="nk-review-item-meta">Estilo: {attrStr}</p>
                          <p className="nk-review-item-qty">Cantidad: {item.quantity}</p>
                          <button type="button" className="nk-review-remove-btn" onClick={() => removeFromCart(index)}>Eliminar</button>
                        </div>
                        <div className="nk-checkout-item-price">{formatPrice(price * item.quantity)}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="nk-review-divider"></div>

                <form onSubmit={handleCouponApply} className="nk-coupon-form">
                  <label className="nk-coupon-label">CÓDIGO DE DESCUENTO</label>
                  <div className="nk-coupon-input-group">
                    <input type="text" placeholder="Código de cupón" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="nk-coupon-input" />
                    <button type="submit" className="nk-btn nk-btn-coupon">Aplicar</button>
                  </div>
                  {couponError && <p className="nk-coupon-error">{couponError}</p>}
                  {couponCode && (
                    <div className="nk-coupon-active">
                      <span>Cupón: <strong>{couponCode}</strong> ({discount * 100}% desc)</span>
                      <button type="button" onClick={removeCoupon} className="nk-coupon-remove">Remover</button>
                    </div>
                  )}
                </form>

                <div className="nk-review-divider"></div>

                <div className="nk-review-summary">
                  <div className="nk-summary-row">
                    <span>Subtotal:</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="nk-summary-row nk-summary-discount">
                      <span>Descuento:</span>
                      <span>-{formatPrice(subtotal * discount)}</span>
                    </div>
                  )}
                  <div className="nk-summary-row">
                    <span>Envío:</span>
                    <span>{selectedRate ? formatPrice(finalShipping) : (formData.postcode ? 'Calculando...' : 'Ingresa CP')}</span>
                  </div>
                  <div className="nk-summary-row nk-summary-total">
                    <span>Total a Pagar:</span>
                    <span>{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleProceedToPayment} 
                  disabled={isSyncing}
                  className="nk-btn nk-btn-checkout-submit" 
                  style={{ marginTop: '20px' }}
                >
                  {isSyncing ? 'Sincronizando con WooCommerce...' : 'Ir a Pagar de Forma Segura'}
                </button>
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--nk-text-sec)', marginTop: '10px' }}>
                  Serás redirigido a nuestro servidor seguro para completar el pago con MercadoPago o Ecartpay.
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
