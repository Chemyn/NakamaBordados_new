'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';

import { 
  syncCartWithServer, 
  fetchCheckoutData, 
  updateCustomerShipping,
  updateShippingMethod,
  checkout
} from '@/lib/cart-mutations';

const MEX_STATES = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", 
  "Ciudad de México", "Coahuila", "Colima", "Durango", "Guanajuato", "Guerrero", "Hidalgo", 
  "Jalisco", "México", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", 
  "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", 
  "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
];

interface ShippingRate {
  id: string;
  label: string;
  cost: string;
}

interface PaymentGateway {
  id: string;
  title: string;
  description: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart, subtotal, discount, couponCode } = useCart();
  const { formatPrice } = useCurrency();

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address1: '',
    city: '',
    state: 'Sonora',
    postcode: ''
  });

  // UI State
  const [loading, setLoading] = useState(false);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<ShippingRate[]>([]);
  const [selectedShipping, setSelectedShipping] = useState('');
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [selectedPayment, setSelectedPayment] = useState('bacs'); // Default to transfer
  const [error, setError] = useState('');

  const totalItemsCount = cart.reduce((s, i) => s + i.quantity, 0);
  const hasFreeShippingPromo = subtotal >= 1200 || totalItemsCount >= 4;

  const hasInitiated = useRef(false);

  // Initial load
  useEffect(() => {
    if (cart.length > 0 && !hasInitiated.current) {
      hasInitiated.current = true;
      initCheckout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

  const initCheckout = async () => {
    setLoading(true);
    console.log("[Checkout] Starting initialization...");
    try {
      console.log("[Checkout] Syncing cart with server...");
      const syncSuccess = await syncCartWithServer(cart);
      console.log("[Checkout] Sync success:", syncSuccess);

      console.log("[Checkout] Fetching checkout data...");
      const data = await fetchCheckoutData();
      console.log("[Checkout] Data received:", !!data);
      
      if (data) {
        const gateways = data.paymentGateways?.nodes || [];
        console.log(`[Checkout] Found ${gateways.length} payment gateways`);
        setPaymentGateways(gateways);
        
        const defaultGateway = gateways.find((g: PaymentGateway) => g.id === 'bacs') || gateways[0];
        if (defaultGateway) {
            setSelectedPayment(defaultGateway.id);
        }

        const methods = data?.cart?.availableShippingMethods?.rates || [];
        console.log(`[Checkout] Found ${methods.length} initial shipping methods`);
        setShippingMethods(methods);
      }
    } catch (err) {
      console.error("[Checkout] Init error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Update shipping when postcode changes
  useEffect(() => {
    if (formData.postcode.length >= 5) {
      refreshShipping();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.postcode, formData.state, formData.city]);

  const refreshShipping = async () => {
    setLoadingShipping(true);
    try {
      await updateCustomerShipping(formData.postcode, 'MX', formData.state, formData.city);
      const data = await fetchCheckoutData();
      const methods = data?.cart?.availableShippingMethods?.rates || [];
      setShippingMethods(methods);
      if (methods.length > 0) {
        setSelectedShipping(methods[0].id);
        await updateShippingMethod(methods[0].id);
      }
    } catch (err) {
      console.error("Shipping update error:", err);
    } finally {
      setLoadingShipping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleShippingChange = async (id: string) => {
    setSelectedShipping(id);
    setLoadingShipping(true);
    try {
      await updateShippingMethod(id);
    } finally {
      setLoadingShipping(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) {
        setError('Por favor selecciona un método de pago.');
        return;
    }

    setLoading(true);
    setError('');

    try {
      const input = {
        billing: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address1: formData.address1,
          city: formData.city,
          state: formData.state,
          postcode: formData.postcode,
          country: 'MX'
        },
        shipping: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          address1: formData.address1,
          city: formData.city,
          state: formData.state,
          postcode: formData.postcode,
          country: 'MX'
        },
        paymentMethod: selectedPayment,
        isPaid: false,
        shippingMethod: selectedShipping
      };

      const result = await checkout(input);

      if (result?.result === 'success') {
        clearCart();
        if (result.redirect) {
          window.location.href = result.redirect;
        } else {
          router.push(`/mi-cuenta?order=${result.order.orderNumber}`);
        }
      } else {
        setError('Hubo un problema al procesar tu pedido. Inténtalo de nuevo.');
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || 'Error en el servidor de pagos.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="nk-checkout-page" style={{ paddingTop: '100px', textAlign: 'center' }}>
        <h1 className="nk-manga-title">Tu barco está vacío</h1>
        <Link href="/store" className="nk-btn">Ir a la Tienda</Link>
      </div>
    );
  }

  return (
    <div className="nk-checkout-page" style={{ background: 'var(--nk-bg-wrapper)', minHeight: '100vh', padding: '120px 24px 80px' }}>
      <div className="nk-container">
        <div style={{ marginBottom: '40px' }}>
          <span className="nk-store-hero-badge" style={{ background: 'var(--nk-primary)', color: '#fff' }}>CAJA DEL SUNNY</span>
          <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', fontFamily: 'Teko', textTransform: 'uppercase', lineHeight: 1 }}>Finalizar Compra</h1>
          <p style={{ fontWeight: 600, color: 'var(--nk-text-sec)' }}>Asegura tu botín con nuestra tripulación.</p>
        </div>

        <form onSubmit={handleSubmitOrder} className="nk-checkout-grid">
          
          {/* Left: Billing/Shipping */}
          <div className="nk-checkout-form-section nk-manga-border" style={{ padding: '30px', background: 'var(--nk-bg-card)', boxShadow: 'var(--nk-manga-shadow)' }}>
            <h2 style={{ fontFamily: 'Teko', fontSize: '2.2rem', marginBottom: '25px', borderBottom: '3px solid var(--nk-border)', paddingBottom: '10px' }}>1. Datos de Envío</h2>
            
            <div className="nk-form-grid-2">
              <div className="nk-input-group">
                <label>Nombre *</label>
                <input required name="firstName" value={formData.firstName} onChange={handleInputChange} className="nk-manga-input" />
              </div>
              <div className="nk-input-group">
                <label>Apellido *</label>
                <input required name="lastName" value={formData.lastName} onChange={handleInputChange} className="nk-manga-input" />
              </div>
            </div>

            <div className="nk-form-grid-2" style={{ marginTop: '20px' }}>
              <div className="nk-input-group">
                <label>Email *</label>
                <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="nk-manga-input" />
              </div>
              <div className="nk-input-group">
                <label>Teléfono *</label>
                <input required type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="nk-manga-input" />
              </div>
            </div>

            <div className="nk-input-group" style={{ marginTop: '20px' }}>
              <label>Dirección (Calle y Número) *</label>
              <input required name="address1" value={formData.address1} onChange={handleInputChange} className="nk-manga-input" />
            </div>

            <div className="nk-form-grid-3" style={{ marginTop: '20px' }}>
              <div className="nk-input-group">
                <label>C.P. *</label>
                <input required name="postcode" value={formData.postcode} onChange={handleInputChange} className="nk-manga-input" placeholder="83000" maxLength={5} />
              </div>
              <div className="nk-input-group">
                <label>Ciudad *</label>
                <input required name="city" value={formData.city} onChange={handleInputChange} className="nk-manga-input" />
              </div>
              <div className="nk-input-group">
                <label>Estado *</label>
                <select name="state" value={formData.state} onChange={handleInputChange} className="nk-manga-input" style={{ width: '100%' }}>
                  {MEX_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Shipping Methods Section */}
            <div style={{ marginTop: '45px' }}>
              <h2 style={{ fontFamily: 'Teko', fontSize: '2.2rem', marginBottom: '20px', borderBottom: '3px solid var(--nk-border)', paddingBottom: '10px' }}>2. Método de Envío</h2>
              
              {hasFreeShippingPromo && (
                  <div className="nk-promo-banner nk-manga-border" style={{ background: '#e6fffa', borderColor: '#38b2ac', color: '#234e52', padding: '12px', marginBottom: '20px', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="material-icons-outlined">celebration</span>
                      ¡TIENES ENVÍO GRATIS! (Promo de 4+ piezas o compra mayor a $1,200)
                  </div>
              )}

              {loadingShipping ? (
                <div className="nk-flex-center" style={{ padding: '30px', background: 'var(--nk-bg-wrapper)', border: '2px dashed var(--nk-border)' }}>
                  <div className="nk-loader-mini"></div>
                  <span style={{ marginLeft: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Calculando rutas piratas...</span>
                </div>
              ) : shippingMethods.length > 0 ? (
                <div className="nk-shipping-options" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {shippingMethods.map(method => (
                    <label key={method.id} className={`nk-shipping-card ${selectedShipping === method.id ? 'active' : ''}`} style={{
                      padding: '18px',
                      border: '3px solid var(--nk-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: selectedShipping === method.id ? 'var(--nk-primary)' : 'var(--nk-bg-card)',
                      color: selectedShipping === method.id ? '#fff' : 'inherit',
                      boxShadow: selectedShipping === method.id ? '5px 5px 0px #000' : 'none',
                      transition: 'all 0.2s'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <input type="radio" checked={selectedShipping === method.id} onChange={() => handleShippingChange(method.id)} style={{ width: '20px', height: '20px', accentColor: '#000' }} />
                        <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{method.label}</span>
                      </div>
                      <span style={{ fontWeight: 900, fontSize: '1.2rem' }}>
                        {method.cost === '0' || hasFreeShippingPromo ? '¡GRATIS!' : formatPrice(parseFloat(method.cost))}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '25px', background: 'var(--nk-bg-wrapper)', border: '2px dashed var(--nk-border)', textAlign: 'center', borderRadius: '4px' }}>
                   <span className="material-icons-outlined" style={{ fontSize: '2rem', color: 'var(--nk-text-ter)', marginBottom: '10px' }}>local_shipping</span>
                   <p style={{ color: 'var(--nk-text-sec)', fontStyle: 'italic', fontWeight: 600 }}>Completa tu dirección y código postal para ver las opciones de entrega.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Summary & Payment */}
          <div className="nk-checkout-summary-section">
            <div className="nk-checkout-review-card nk-manga-border" style={{ padding: '30px', background: 'var(--nk-bg-card)', boxShadow: 'var(--nk-manga-shadow-lg)', position: 'sticky', top: '100px' }}>
              <h3 style={{ fontFamily: 'Teko', fontSize: '2.2rem', marginBottom: '20px', textTransform: 'uppercase' }}>Resumen del Botín</h3>
              
              <div className="nk-checkout-items-mini" style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '25px', paddingRight: '10px' }}>
                {cart.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '15px', marginBottom: '20px', borderBottom: '1px solid var(--nk-border)', paddingBottom: '15px', opacity: 0.9 }}>
                    <div style={{ position: 'relative', width: '60px', height: '75px', flexShrink: 0 }}>
                      <Image src={item.product.images[0]} alt={item.product.name} fill style={{ objectFit: 'cover' }} className="nk-manga-border" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{item.product.name}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--nk-text-sec)', marginTop: '4px', fontWeight: 600 }}>
                        {item.variation ? Object.values(item.variation.attributes).join(' / ') : 'Única'} x {item.quantity}
                      </p>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--nk-primary)' }}>{formatPrice((item.variation?.price || item.product.price) * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--nk-bg-wrapper)', padding: '20px', border: '2px solid var(--nk-border)', marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 600 }}>
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--nk-primary)', fontWeight: 800, marginBottom: '8px' }}>
                    <span>Descuento ({couponCode})</span>
                    <span>-{formatPrice(subtotal * discount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 600 }}>
                  <span>Envío</span>
                  <span>{selectedShipping && !hasFreeShippingPromo ? formatPrice(parseFloat(shippingMethods.find(m => m.id === selectedShipping)?.cost || '0')) : (hasFreeShippingPromo ? 'GRATIS' : '$0.00')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', paddingTop: '15px', borderTop: '2px solid var(--nk-border)', fontSize: '2.2rem', fontFamily: 'Teko', lineHeight: 1 }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--nk-primary)' }}>
                    {formatPrice(
                        (subtotal * (1 - discount)) + 
                        (hasFreeShippingPromo ? 0 : parseFloat(shippingMethods.find(m => m.id === selectedShipping)?.cost || '0'))
                    )}
                  </span>
                </div>
              </div>

              {/* Payment Gateways */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontFamily: 'Teko', fontSize: '1.8rem', marginBottom: '15px', textTransform: 'uppercase' }}>3. Método de Pago</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {paymentGateways.length > 0 ? paymentGateways.map(gw => (
                    <label key={gw.id} style={{
                      padding: '14px',
                      border: '2px solid var(--nk-border)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: selectedPayment === gw.id ? 'var(--nk-bg-wrapper)' : 'transparent',
                      borderColor: selectedPayment === gw.id ? 'var(--nk-primary)' : 'var(--nk-border)',
                      fontWeight: 700,
                      transition: 'all 0.2s'
                    }}>
                      <input type="radio" name="payment" value={gw.id} checked={selectedPayment === gw.id} onChange={() => setSelectedPayment(gw.id)} style={{ accentColor: 'var(--nk-primary)', width: '18px', height: '18px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 800 }}>{gw.title}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--nk-text-sec)', fontWeight: 500 }} dangerouslySetInnerHTML={{ __html: gw.description }}></div>
                      </div>
                    </label>
                  )) : (
                    <div className="nk-loader-mini" style={{ margin: '0 auto' }}></div>
                  )}
                </div>
              </div>

              {error && (
                <div className="nk-error-box nk-manga-border" style={{ background: '#fff1f0', borderColor: '#ffa39e', color: '#cf1322', padding: '15px', marginBottom: '25px', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="material-icons-outlined">error_outline</span>
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading || shippingMethods.length === 0}
                className="nk-btn nk-btn-checkout-finalize" 
                style={{ 
                  width: '100%', 
                  padding: '18px', 
                  fontSize: '1.8rem', 
                  opacity: (loading || shippingMethods.length === 0) ? 0.6 : 1,
                  boxShadow: '6px 6px 0px #000'
                }}
              >
                {loading ? (
                    <span className="nk-flex-center"><span className="nk-loader-mini" style={{ borderColor: '#fff', borderTopColor: 'transparent' }}></span> &nbsp; Procesando...</span>
                ) : '¡Zarpar y Pagar!'}
              </button>
              
              {shippingMethods.length === 0 && !loading && (
                <p style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '15px', color: 'var(--nk-primary)', fontWeight: 800, textTransform: 'uppercase' }}>
                  ⚠️ Completa tus datos para habilitar el pago
                </p>
              )}

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <Link href="/store" style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--nk-text-sec)', textDecoration: 'underline' }}>
                   Volver a la tienda
                </Link>
              </div>
            </div>
          </div>

        </form>
      </div>

      <style jsx>{`
        .nk-checkout-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 40px;
          align-items: start;
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

        .nk-input-group label {
          display: block;
          font-family: 'Teko', sans-serif;
          font-size: 1.2rem;
          margin-bottom: 5px;
          text-transform: uppercase;
          font-weight: 700;
        }

        @media (max-width: 1024px) {
          .nk-checkout-grid {
            grid-template-columns: 1fr;
          }
          .nk-checkout-summary-section {
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
