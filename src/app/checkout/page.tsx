'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../context/CartContext';

export default function CheckoutPage() {
  const { 
    cart, 
    removeFromCart, 
    clearCart,
    subtotal, 
    shipping, 
    total, 
    couponCode, 
    discount, 
    applyCoupon, 
    removeCoupon 
  } = useCart();

  // Coupon input state
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  // Shipping form fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    country: 'México',
    state: '',
    city: '',
    colonia: '',
    address: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'paypal' | 'oxxo' | 'bacs'
  const [isOrdered, setIsOrdered] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

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

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.firstName) errors.firstName = 'El nombre es obligatorio';
    if (!formData.lastName) errors.lastName = 'El apellido es obligatorio';
    if (!formData.phone) errors.phone = 'El teléfono es obligatorio';
    if (!formData.email) errors.email = 'El email es obligatorio';
    if (!formData.state) errors.state = 'El estado es obligatorio';
    if (!formData.city) errors.city = 'La ciudad es obligatoria';
    if (!formData.colonia) errors.colonia = 'La colonia es obligatoria';
    if (!formData.address) errors.address = 'La dirección es obligatoria';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      alert('Por favor, completa todos los campos obligatorios del envío.');
      return;
    }

    // Process order mock
    const randomOrderNum = Math.floor(100000 + Math.random() * 900000).toString();
    setOrderNumber(randomOrderNum);
    setIsOrdered(true);
    
    // Clear cart details after a successful order
    setTimeout(() => {
      clearCart();
    }, 100);
  };

  if (isOrdered) {
    return (
      <div className="nk-container text-center" style={{ padding: '120px 24px' }}>
        <div style={{ fontSize: '5rem', color: 'var(--nk-primary)', marginBottom: '10px' }}>
          <span className="material-icons-outlined" style={{ fontSize: 'inherit' }}>check_circle</span>
        </div>
        <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>¡GRACIAS POR TU COMPRA, NAKAMA!</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--nk-text-sec)', marginBottom: '10px' }}>
          Tu pedido <strong>#{orderNumber}</strong> ha sido recibido con éxito.
        </p>
        <p style={{ color: 'var(--nk-text-sec)', marginBottom: '30px' }}>
          {paymentMethod === 'bacs' 
            ? 'Por favor, realiza la transferencia bancaria con el número de pedido como referencia y envíanos tu comprobante por WhatsApp.' 
            : 'Te enviaremos los detalles del envío y número de guía a tu correo electrónico muy pronto.'}
        </p>
        
        {paymentMethod === 'bacs' && (
          <div style={{ background: 'var(--nk-bg-wrapper)', border: '1px solid var(--nk-border)', padding: '20px', borderRadius: '8px', maxWidth: '500px', margin: '0 auto 30px auto', textAlign: 'left' }}>
            <h4 style={{ fontFamily: 'Teko', fontSize: '1.5rem', marginBottom: '10px' }}>Datos para Transferencia:</h4>
            <p><strong>Banco:</strong> BBVA Bancomer</p>
            <p><strong>Cuenta:</strong> 0123 4567 8901 2345</p>
            <p><strong>CLABE:</strong> 012345678901234567</p>
            <p><strong>Beneficiario:</strong> Nakama Bordados S.A. de C.V.</p>
            <p style={{ marginTop: '10px', color: 'var(--nk-primary)', fontWeight: 'bold' }}>Monto a pagar: ${total.toFixed(2)} MXN</p>
          </div>
        )}

        <Link href="/" className="nk-btn">Volver al Inicio</Link>
      </div>
    );
  }

  return (
    <div className="nk-checkout-page" style={{ paddingTop: '50px', paddingBottom: '80px' }}>
      
      {/* Hero Header */}
      <div className="nk-store-hero">
        <span className="nk-store-hero-badge">Caja Registradora</span>
        <h1 className="nk-store-hero-title">Finalizar Compra</h1>
        <p className="nk-store-hero-subtitle">Completa tu pedido de forma rápida y segura.</p>
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
            
            {/* Left Column: Billing/Shipping Details Form */}
            <div className="nk-checkout-form-col">
              <h2 className="nk-checkout-heading">Detalles de Envío</h2>
              
              <form onSubmit={handleSubmitOrder} className="nk-checkout-form">
                <div className="nk-form-row">
                  <div className="nk-form-group">
                    <label>Nombre *</label>
                    <input 
                      type="text" 
                      name="firstName" 
                      value={formData.firstName} 
                      onChange={handleInputChange} 
                      className={`nk-input-base ${formErrors.firstName ? 'error' : ''}`}
                    />
                    {formErrors.firstName && <span className="nk-field-error">{formErrors.firstName}</span>}
                  </div>
                  <div className="nk-form-group">
                    <label>Apellidos *</label>
                    <input 
                      type="text" 
                      name="lastName" 
                      value={formData.lastName} 
                      onChange={handleInputChange} 
                      className={`nk-input-base ${formErrors.lastName ? 'error' : ''}`}
                    />
                    {formErrors.lastName && <span className="nk-field-error">{formErrors.lastName}</span>}
                  </div>
                </div>

                <div className="nk-form-row">
                  <div className="nk-form-group">
                    <label>Teléfono *</label>
                    <input 
                      type="text" 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleInputChange} 
                      placeholder="Ej: 6622455087"
                      className={`nk-input-base ${formErrors.phone ? 'error' : ''}`}
                    />
                    {formErrors.phone && <span className="nk-field-error">{formErrors.phone}</span>}
                  </div>
                  <div className="nk-form-group">
                    <label>Email *</label>
                    <input 
                      type="email" 
                      name="email" 
                      value={formData.email} 
                      onChange={handleInputChange} 
                      className={`nk-input-base ${formErrors.email ? 'error' : ''}`}
                    />
                    {formErrors.email && <span className="nk-field-error">{formErrors.email}</span>}
                  </div>
                </div>

                <div className="nk-form-row">
                  <div className="nk-form-group">
                    <label>País *</label>
                    <select name="country" value={formData.country} onChange={handleInputChange} className="nk-input-base">
                      <option value="México">México</option>
                    </select>
                  </div>
                  <div className="nk-form-group">
                    <label>Estado / Provincia *</label>
                    <input 
                      type="text" 
                      name="state" 
                      value={formData.state} 
                      onChange={handleInputChange} 
                      placeholder="Ej: Sonora"
                      className={`nk-input-base ${formErrors.state ? 'error' : ''}`}
                    />
                    {formErrors.state && <span className="nk-field-error">{formErrors.state}</span>}
                  </div>
                </div>

                <div className="nk-form-row">
                  <div className="nk-form-group">
                    <label>Ciudad *</label>
                    <input 
                      type="text" 
                      name="city" 
                      value={formData.city} 
                      onChange={handleInputChange} 
                      className={`nk-input-base ${formErrors.city ? 'error' : ''}`}
                    />
                    {formErrors.city && <span className="nk-field-error">{formErrors.city}</span>}
                  </div>
                  {/* Reordered field Colonia, as per snippets */}
                  <div className="nk-form-group">
                    <label>Colonia / Vecindario *</label>
                    <input 
                      type="text" 
                      name="colonia" 
                      value={formData.colonia} 
                      onChange={handleInputChange} 
                      placeholder="Ingresa tu colonia"
                      className={`nk-input-base ${formErrors.colonia ? 'error' : ''}`}
                    />
                    {formErrors.colonia && <span className="nk-field-error">{formErrors.colonia}</span>}
                  </div>
                </div>

                <div className="nk-form-group">
                  <label>Dirección (Calle y Número) *</label>
                  <input 
                    type="text" 
                    name="address" 
                    value={formData.address} 
                    onChange={handleInputChange} 
                    placeholder="Calle, número de casa, departamento, etc."
                    className={`nk-input-base ${formErrors.address ? 'error' : ''}`}
                  />
                  {formErrors.address && <span className="nk-field-error">{formErrors.address}</span>}
                </div>

                {/* Payment Selection */}
                <h2 className="nk-checkout-heading" style={{ marginTop: '40px' }}>Método de Pago</h2>
                <div className="nk-payment-options">
                  <label className={`nk-payment-option-label ${paymentMethod === 'card' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="card" 
                      checked={paymentMethod === 'card'} 
                      onChange={() => setPaymentMethod('card')}
                    />
                    <span>Tarjeta de Crédito / Débito (Visa, Mastercard, Amex)</span>
                  </label>

                  <label className={`nk-payment-option-label ${paymentMethod === 'paypal' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="paypal" 
                      checked={paymentMethod === 'paypal'} 
                      onChange={() => setPaymentMethod('paypal')}
                    />
                    <span>PayPal (3 MSI disponible)</span>
                  </label>

                  <label className={`nk-payment-option-label ${paymentMethod === 'oxxo' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="oxxo" 
                      checked={paymentMethod === 'oxxo'} 
                      onChange={() => setPaymentMethod('oxxo')}
                    />
                    <span>OXXO Pay (Efectivo)</span>
                  </label>

                  <label className={`nk-payment-option-label ${paymentMethod === 'bacs' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="bacs" 
                      checked={paymentMethod === 'bacs'} 
                      onChange={() => setPaymentMethod('bacs')}
                    />
                    <span>Transferencia Bancaria Directa (BACS)</span>
                  </label>
                </div>

                {paymentMethod === 'bacs' && (
                  <div className="nk-payment-bacs-info">
                    Realiza tu pago directamente en nuestra cuenta bancaria. Por favor usa tu número de Pedido como referencia. Tu pedido no será enviado hasta que los fondos se hayan recibido.
                  </div>
                )}

                <button type="submit" className="nk-btn nk-btn-checkout-submit">
                  Confirmar Compra (${total.toFixed(2)} MXN)
                </button>
              </form>
            </div>

            {/* Right Column: Order Review Cart Sidebar */}
            <div className="nk-checkout-sidebar-col">
              <div className="nk-checkout-review-card">
                <h2 className="nk-checkout-heading">Tu Pedido</h2>
                
                {/* Cart list items */}
                <div className="nk-checkout-review-items">
                  {cart.map((item, index) => {
                    const price = item.variation ? item.variation.price : item.product.price;
                    const attrStr = item.variation 
                      ? Object.values(item.variation.attributes).join(' / ') 
                      : 'Única';

                    return (
                      <div className="nk-review-item" key={index}>
                        <img src={item.product.images[0]} alt={item.product.name} className="nk-review-item-img" />
                        <div className="nk-review-item-details">
                          <h4 className="nk-review-item-title">{item.product.name}</h4>
                          <p className="nk-review-item-meta">Estilo: {attrStr}</p>
                          <p className="nk-review-item-qty">Cantidad: {item.quantity}</p>
                          <button 
                            type="button" 
                            className="nk-review-remove-btn"
                            onClick={() => removeFromCart(index)}
                          >
                            Eliminar
                          </button>
                        </div>
                        <div className="nk-review-item-price">
                          ${(price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="nk-review-divider"></div>

                {/* Promo Coupon apply form */}
                <form onSubmit={handleCouponApply} className="nk-coupon-form">
                  <label className="nk-coupon-label">CÓDIGO DE DESCUENTO</label>
                  <div className="nk-coupon-input-group">
                    <input 
                      type="text" 
                      placeholder="Código de cupón" 
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="nk-coupon-input"
                    />
                    <button type="submit" className="nk-btn nk-btn-coupon">Aplicar</button>
                  </div>
                  {couponError && <p className="nk-coupon-error">{couponError}</p>}
                  {couponCode && (
                    <div className="nk-coupon-active">
                      <span>Cupón activo: <strong>{couponCode}</strong> ({discount * 100}% desc)</span>
                      <button type="button" onClick={removeCoupon} className="nk-coupon-remove">Remover</button>
                    </div>
                  )}
                </form>

                <div className="nk-review-divider"></div>

                {/* Subtotal, shipping and totals summary */}
                <div className="nk-review-summary">
                  <div className="nk-summary-row">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)} MXN</span>
                  </div>
                  {discount > 0 && (
                    <div className="nk-summary-row nk-summary-discount">
                      <span>Descuento ({discount * 100}%):</span>
                      <span>-${(subtotal * discount).toFixed(2)} MXN</span>
                    </div>
                  )}
                  <div className="nk-summary-row">
                    <span>Envío:</span>
                    <span>{shipping === 0 ? 'Gratis' : `$${shipping.toFixed(2)} MXN`}</span>
                  </div>
                  <div className="nk-summary-row nk-summary-total">
                    <span>Total:</span>
                    <span>${total.toFixed(2)} MXN</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}
      </div>
      
    </div>
  );
}
