'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

export default function CheckoutPage() {
  const { cart, subtotal, shipping, discount, total, couponCode, applyCoupon, removeCoupon, clearCart } = useCart();
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const router = useRouter();

  const [formData, setLocalFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    postcode: '',
    country: 'MX'
  });

  const [couponInput, setCouponInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setLocalFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleApplyCoupon = async () => {
    if (!couponInput) return;
    setLoading(true);
    const res = await applyCoupon(couponInput);
    setLoading(false);
    if (res.success) setCouponInput('');
    else alert(res.message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate order processing
    setTimeout(() => {
      setIsProcessing(false);
      alert('¡Pedido realizado con éxito! (Simulación)');
      clearCart();
      router.push('/');
    }, 2000);
  };

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
    <div className="nk-checkout-page" style={{ padding: '80px 0', background: 'var(--nk-bg-body)' }}>
      <div className="nk-container">
        <h1 className="nk-section-title" style={{ marginBottom: '40px' }}>{t('checkout.title')}</h1>
        
        <form className="nk-checkout-grid-main" onSubmit={handleSubmit}>
          {/* Left Column: Form */}
          <div className="nk-checkout-form-col">
            <div className="nk-checkout-section nk-manga-border">
              <h3 className="nk-checkout-h3">{t('checkout.billing')}</h3>
              
              <div className="nk-form-group">
                <label>{t('checkout.email')}</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="nk-manga-input" />
              </div>

              <div className="nk-form-grid-2">
                <div className="nk-form-group">
                  <label>{t('checkout.first_name')}</label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required className="nk-manga-input" />
                </div>
                <div className="nk-form-group">
                  <label>{t('checkout.last_name')}</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required className="nk-manga-input" />
                </div>
              </div>

              <div className="nk-form-group">
                <label>{t('checkout.phone')}</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required className="nk-manga-input" />
              </div>

              <div className="nk-form-group">
                <label>{t('checkout.address')}</label>
                <input type="text" name="address" value={formData.address} onChange={handleInputChange} required className="nk-manga-input" />
              </div>

              <div className="nk-form-group">
                <label>{t('checkout.apartment')}</label>
                <input type="text" name="apartment" value={formData.apartment} onChange={handleInputChange} className="nk-manga-input" />
              </div>

              <div className="nk-form-grid-3">
                <div className="nk-form-group">
                  <label>{t('checkout.city')}</label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} required className="nk-manga-input" />
                </div>
                <div className="nk-form-group">
                  <label>{t('checkout.state')}</label>
                  <input type="text" name="state" value={formData.state} onChange={handleInputChange} required className="nk-manga-input" />
                </div>
                <div className="nk-form-group">
                  <label>{t('checkout.postcode')}</label>
                  <input type="text" name="postcode" value={formData.postcode} onChange={handleInputChange} required className="nk-manga-input" />
                </div>
              </div>

              <div className="nk-form-group">
                <label>{t('checkout.country')}</label>
                <select name="country" value={formData.country} onChange={handleInputChange} className="nk-manga-input">
                  <option value="MX">México</option>
                  <option value="US">USA</option>
                  <option value="ES">España</option>
                </select>
              </div>
            </div>

            <div className="nk-checkout-section nk-manga-border" style={{ marginTop: '30px' }}>
              <h3 className="nk-checkout-h3">{t('checkout.shipping_method')}</h3>
              <div className="nk-shipping-option active">
                <span className="material-icons-outlined">local_shipping</span>
                <div>
                  <p style={{ fontWeight: 800 }}>{shipping > 0 ? 'Envío Estándar' : 'Envío Gratis'}</p>
                  <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Entrega estimada: 3-7 días hábiles</p>
                </div>
                <span style={{ marginLeft: 'auto', fontWeight: 800 }}>{shipping > 0 ? formatPrice(shipping) : t('checkout.free')}</span>
              </div>
            </div>

            <div className="nk-checkout-section nk-manga-border" style={{ marginTop: '30px' }}>
              <h3 className="nk-checkout-h3">{t('checkout.payment_method')}</h3>
              <div className="nk-payment-grid">
                <div className="nk-payment-item active">
                  <span className="material-icons-outlined">credit_card</span>
                  <span>MercadoPago</span>
                </div>
                <div className="nk-payment-item">
                  <span className="material-icons-outlined">payments</span>
                  <span>PayPal</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="nk-checkout-summary-col">
            <div className="nk-summary-card nk-manga-border">
              <h3 className="nk-checkout-h3">{t('checkout.summary')}</h3>
              
              <div className="nk-summary-items">
                {cart.map((item, idx) => (
                  <div key={idx} className="nk-summary-item">
                    <div className="nk-summary-img-wrapper">
                      <Image src={item.variation?.images?.[0] || item.product.images[0]} alt={item.product.name} width={50} height={60} style={{ objectFit: 'cover' }} />
                      <span className="nk-summary-qty">{item.quantity}</span>
                    </div>
                    <div className="nk-summary-info">
                      <p className="nk-summary-name">{item.product.name}</p>
                      <p className="nk-summary-meta">
                        {item.selectedTalla && <span>{item.selectedTalla}</span>}
                        {item.selectedColor && <span> / {item.selectedColor}</span>}
                      </p>
                    </div>
                    <span className="nk-summary-price">{formatPrice((item.variation?.price || item.product.price) * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="nk-coupon-section">
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    placeholder={t('checkout.coupon.placeholder')} 
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="nk-manga-input"
                    style={{ flex: 1 }}
                  />
                  <button type="button" onClick={handleApplyCoupon} disabled={loading} className="nk-btn" style={{ padding: '0 20px' }}>
                    {loading ? '...' : t('checkout.coupon.apply')}
                  </button>
                </div>
                {couponCode && (
                  <div className="nk-active-coupon">
                    <span>{couponCode}</span>
                    <button type="button" onClick={removeCoupon}><span className="material-icons-outlined">close</span></button>
                  </div>
                )}
              </div>

              <div className="nk-summary-totals">
                <div className="nk-total-line">
                  <span>{t('checkout.subtotal')}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="nk-total-line">
                  <span>{t('checkout.shipping')}</span>
                  <span>{shipping > 0 ? formatPrice(shipping) : t('checkout.free')}</span>
                </div>
                {discount > 0 && (
                  <div className="nk-total-line nk-discount">
                    <span>{t('checkout.discount')}</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="nk-total-line nk-final-total">
                  <span>{t('checkout.total')}</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <button 
                type="submit" 
                className={`nk-btn nk-btn-block ${isProcessing ? 'loading' : ''}`}
                disabled={isProcessing}
                style={{ marginTop: '20px', padding: '20px', fontSize: '1.5rem' }}
              >
                {isProcessing ? t('checkout.processing') : t('checkout.place_order')}
              </button>
            </div>
          </div>
        </form>
      </div>

      <style jsx>{`
        .nk-checkout-empty {
          padding: 150px 20px;
          text-align: center;
        }
        .nk-empty-card {
          max-width: 500px;
          margin: 0 auto;
          padding: 60px 40px;
          background: var(--nk-bg-card);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .nk-checkout-grid-main {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 40px;
          align-items: flex-start;
        }
        .nk-checkout-section {
          background: var(--nk-bg-card);
          padding: 30px;
        }
        .nk-checkout-h3 {
          font-family: 'Teko', sans-serif;
          font-size: 2rem;
          margin-bottom: 25px;
          border-bottom: 2px solid var(--nk-border);
          display: inline-block;
          line-height: 1;
        }
        .nk-form-group {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .nk-form-group label {
          font-weight: 800;
          font-size: 0.85rem;
          text-transform: uppercase;
        }
        .nk-form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .nk-form-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
        }
        .nk-shipping-option {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 20px;
          border: 2px solid var(--nk-border);
          cursor: pointer;
        }
        .nk-shipping-option.active {
          background: var(--nk-bg-wrapper);
          border-color: var(--nk-primary);
          box-shadow: 4px 4px 0 var(--nk-border);
        }
        .nk-payment-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .nk-payment-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 20px;
          border: 2px solid var(--nk-border);
          cursor: pointer;
          font-weight: 800;
          font-family: 'Teko', sans-serif;
          font-size: 1.2rem;
        }
        .nk-payment-item.active {
          border-color: var(--nk-primary);
          background: var(--nk-bg-wrapper);
          box-shadow: 4px 4px 0 var(--nk-border);
        }
        .nk-summary-card {
          background: var(--nk-bg-card);
          padding: 30px;
          position: sticky;
          top: 100px;
        }
        .nk-summary-items {
          margin-bottom: 30px;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .nk-summary-item {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .nk-summary-img-wrapper {
          position: relative;
          border: 1px solid var(--nk-border);
        }
        .nk-summary-qty {
          position: absolute;
          top: -10px;
          right: -10px;
          background: var(--nk-border);
          color: var(--nk-bg-body);
          width: 20px;
          height: 20px;
          border-radius: 50%;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }
        .nk-summary-info {
          flex: 1;
        }
        .nk-summary-name {
          font-weight: 800;
          font-size: 0.9rem;
          margin-bottom: 2px;
        }
        .nk-summary-meta {
          font-size: 0.75rem;
          opacity: 0.6;
        }
        .nk-summary-price {
          font-weight: 800;
          font-family: 'Teko', sans-serif;
        }
        .nk-coupon-section {
          padding: 20px 0;
          border-top: 1px dashed var(--nk-border);
          border-bottom: 1px dashed var(--nk-border);
          margin-bottom: 20px;
        }
        .nk-active-coupon {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--nk-border);
          color: var(--nk-bg-body);
          padding: 5px 12px;
          margin-top: 10px;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .nk-active-coupon button {
          background: none;
          border: none;
          color: inherit;
          padding: 0;
          cursor: pointer;
        }
        .nk-total-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-weight: 600;
        }
        .nk-discount {
          color: var(--nk-primary);
        }
        .nk-final-total {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 2px solid var(--nk-border);
          font-size: 1.5rem;
          font-family: 'Teko', sans-serif;
          font-weight: 800;
        }

        @media (max-width: 1024px) {
          .nk-checkout-grid-main {
            grid-template-columns: 1fr;
          }
          .nk-checkout-summary-col {
            order: -1;
          }
        }

        @media (max-width: 600px) {
          .nk-form-grid-2, .nk-form-grid-3 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
