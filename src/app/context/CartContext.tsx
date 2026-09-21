'use client';

import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { Product, Variation } from '@/types/product';
import { apiOrigin } from '@/lib/api-host';
import { trackAddToCart } from '@/lib/analytics';
import {
  AFFILIATE_STORAGE_KEY,
  chooseAffiliateAttribution,
  parseStoredAffiliateAttribution,
  validateAffiliateCode,
  type AffiliateAttribution,
  type AffiliateSource,
} from '@/lib/affiliate-attribution';

export interface CartItem {
  product: Product;
  variation: Variation | null; // null for simple products
  quantity: number;
  selectedColor?: string;
  selectedEstilo?: string;
  selectedTalla?: string;
}

/**
 * Cotización pagable agregada al carrito para pagarla junto con productos u
 * otras cotizaciones. No es un producto: referencia a un pedido de WooCommerce
 * pendiente de pago; el server la valida por orderKey al pasar al checkout y
 * cobra el total real del pedido en ese momento (totalMXN es solo display).
 */
export interface QuoteCartItem {
  orderId: number;  // databaseId del pedido de cotización
  orderKey: string;
  folio: string;    // "NK-1001"
  totalMXN: number; // las cotizaciones siempre se emiten en MXN
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, variation: Variation | null, qty: number) => void;
  removeFromCart: (index: number) => void;
  updateQuantity: (index: number, qty: number) => void;
  clearCart: () => void;
  quoteItems: QuoteCartItem[];
  addQuoteToCart: (quote: QuoteCartItem) => void;
  removeQuoteFromCart: (orderId: number) => void;
  isQuoteInCart: (orderId: number) => boolean;
  cartCount: number;
  subtotal: number;
  shipping: number;
  total: number;
  couponCode: string;
  discount: number; // Stored as absolute monetary discount or fractional depending on logic
  discountType: 'percent' | 'fixed';
  applyCoupon: (code: string) => Promise<{ success: boolean; message?: string }>;
  removeCoupon: () => void;
  affiliateCode: string;
  affiliateSource: AffiliateSource | '';
  affiliateExpiresAt: string;
  promotionReady: boolean;
  applyAffiliateCode: (
    code: string,
    source?: AffiliateSource,
  ) => Promise<{ success: boolean; message?: string }>;
  removeAffiliateCode: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

type ValidatedCoupon =
  | { success: true; code: string; discount: number; type: 'percent' | 'fixed' }
  | { success: false; message: string };

async function validateNativeCoupon(code: string): Promise<ValidatedCoupon> {
  const normalized = code.trim().toUpperCase();

  if (!normalized) {
    return { success: false, message: 'Escribe el código que recibiste.' };
  }

  try {
    // Este campo solo admite cupones nativos de recuperación. WooCommerce es
    // la autoridad y el navegador nunca reconstruye el descuento por su cuenta.
    const res = await fetch(`${apiOrigin()}/?rest_route=/nakama/v1/check-coupon&code=${normalized}`);
    if (!res.ok) {
      return { success: false, message: 'No pudimos validar el cupón. Inténtalo de nuevo.' };
    }

    const data = await res.json();
    if (!data.valid) {
      return { success: false, message: data.message || 'Cupón inválido' };
    }

    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return { success: false, message: 'No pudimos validar el cupón. Inténtalo de nuevo.' };
    }

    const type = data.type === 'percent' ? 'percent' : 'fixed';
    return {
      success: true,
      code: normalized,
      discount: type === 'percent' ? amount / 100 : amount,
      type,
    };
  } catch (error) {
    console.warn('No se pudo validar el cupón con WooCommerce', error);
    return { success: false, message: 'No pudimos validar el cupón. Inténtalo de nuevo.' };
  }
}

/**
 * Lee un atributo de la variación tolerando los nombres reales de WooCommerce:
 * la talla llega como "Size" (no "Talla"), y las claves pueden variar de
 * mayúsculas. Sin esto la talla nunca aparecía en el carrito.
 */
export function getVariationAttr(
  variation: Variation | null,
  kind: 'color' | 'estilo' | 'talla'
): string | undefined {
  if (!variation?.attributes) return undefined;
  const wanted: Record<typeof kind, string[]> = {
    color: ['color'],
    estilo: ['estilo', 'style'],
    talla: ['talla', 'size'],
  };
  for (const [name, value] of Object.entries(variation.attributes)) {
    const n = name.toLowerCase();
    if (wanted[kind].some(w => n.includes(w)) && typeof value === 'string' && value) {
      return value;
    }
  }
  return undefined;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quoteItems, setQuoteItems] = useState<QuoteCartItem[]>([]);
  const [couponCode, setCouponCode] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [affiliateAttribution, setAffiliateAttribution] = useState<AffiliateAttribution | null>(null);
  const [promotionReady, setPromotionReady] = useState(false);

  const removeCoupon = useCallback(() => {
    setCouponCode('');
    setDiscount(0);
    setDiscountType('percent');
    localStorage.removeItem('nakama_coupon');
    localStorage.removeItem('nakama_discount');
    localStorage.removeItem('nakama_discount_type');
  }, []);

  const removeAffiliateCode = useCallback(() => {
    setAffiliateAttribution(null);
    localStorage.removeItem(AFFILIATE_STORAGE_KEY);
  }, []);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('nakama_cart');
    const savedQuotes = localStorage.getItem('nakama_quote_cart');
    const savedCoupon = localStorage.getItem('nakama_coupon');
    const savedAffiliate = parseStoredAffiliateAttribution(
      localStorage.getItem(AFFILIATE_STORAGE_KEY),
    );
    let cancelled = false;

    const timeoutId = window.setTimeout(() => {
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) {
          console.error(e);
        }
      }
      if (savedQuotes) {
        try {
          setQuoteItems(JSON.parse(savedQuotes));
        } catch (e) {
          console.error(e);
        }
      }
      const hydratePromotion = async () => {
        if (savedAffiliate) {
          const result = await validateAffiliateCode(savedAffiliate.code);
          if (cancelled) return;
          if (result.success) {
            const refreshed: AffiliateAttribution = {
              ...result.attribution,
              source: savedAffiliate.source,
            };
            setAffiliateAttribution(refreshed);
            localStorage.setItem(AFFILIATE_STORAGE_KEY, JSON.stringify(refreshed));
            removeCoupon();
            setPromotionReady(true);
            return;
          }
          localStorage.removeItem(AFFILIATE_STORAGE_KEY);
        } else {
          localStorage.removeItem(AFFILIATE_STORAGE_KEY);
        }

        if (savedCoupon) {
          const result = await validateNativeCoupon(savedCoupon);
          if (cancelled) return;
          if (!result.success) {
            removeCoupon();
          } else {
            setCouponCode(result.code);
            setDiscount(result.discount);
            setDiscountType(result.type);
            localStorage.setItem('nakama_discount', result.discount.toString());
            localStorage.setItem('nakama_discount_type', result.type);
          }
        }

        if (!cancelled) setPromotionReady(true);
      };

      void hydratePromotion();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [removeCoupon]);

  // Save cart to localStorage on change
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('nakama_cart', JSON.stringify(newCart));
  };

  const saveQuoteItems = (newQuotes: QuoteCartItem[]) => {
    setQuoteItems(newQuotes);
    localStorage.setItem('nakama_quote_cart', JSON.stringify(newQuotes));
  };

  const addToCart = (product: Product, variation: Variation | null, qty: number) => {
    const newCart = [...cart];
    // Check if item already exists in cart (matching product and variation)
    const existingIndex = newCart.findIndex(item =>
      item.product.id === product.id &&
      ((item.variation === null && variation === null) ||
       (item.variation?.id === variation?.id))
    );

    // Tope por stock de la prenda base compartida (nakama-warehouse). null =
    // sin tracking → sin tope; la verdad final la impone el servidor al pagar.
    const cap = typeof variation?.stock === 'number' ? variation.stock : null;
    if (cap !== null && cap <= 0) return; // agotado: no agregar

    if (existingIndex > -1) {
      const target = newCart[existingIndex].quantity + qty;
      newCart[existingIndex].quantity = cap !== null ? Math.min(target, cap) : target;
    } else {
      newCart.push({
        product,
        variation,
        quantity: cap !== null ? Math.min(qty, cap) : qty,
        selectedColor: getVariationAttr(variation, 'color'),
        selectedEstilo: getVariationAttr(variation, 'estilo'),
        selectedTalla: getVariationAttr(variation, 'talla')
      });
    }
    saveCart(newCart);

    // GA4 add_to_cart + Pixel AddToCart (los precios locales son MXN base).
    trackAddToCart({
      // Las variaciones tienen su propio ID en el catálogo de Meta.
      id: variation?.databaseId || variation?.id || product.databaseId || product.id,
      name: product.name,
      price: variation ? variation.price : product.price,
      quantity: qty,
      currency: 'MXN',
    });
  };

  const removeFromCart = (index: number) => {
    const newCart = cart.filter((_, i) => i !== index);
    saveCart(newCart);
  };

  const updateQuantity = (index: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(index);
      return;
    }
    const newCart = [...cart];
    if (newCart[index]) {
      // Tope por stock de la prenda base compartida (null = sin tracking).
      const cap = typeof newCart[index].variation?.stock === 'number'
        ? (newCart[index].variation!.stock as number)
        : null;
      newCart[index].quantity = cap !== null ? Math.min(qty, Math.max(1, cap)) : qty;
      saveCart(newCart);
    }
  };

  const addQuoteToCart = (quote: QuoteCartItem) => {
    if (quoteItems.some(q => q.orderId === quote.orderId)) return;
    saveQuoteItems([...quoteItems, quote]);
  };

  const removeQuoteFromCart = (orderId: number) => {
    saveQuoteItems(quoteItems.filter(q => q.orderId !== orderId));
  };

  const isQuoteInCart = (orderId: number) => quoteItems.some(q => q.orderId === orderId);

  const clearCart = () => {
    saveCart([]);
    saveQuoteItems([]);
    removeCoupon();
    removeAffiliateCode();
  };

  const applyAffiliateCode = useCallback(async (
    code: string,
    source: AffiliateSource = 'manual',
  ): Promise<{ success: boolean; message?: string }> => {
    const result = await validateAffiliateCode(code);
    if (!result.success) {
      if (source === 'manual' || affiliateAttribution?.source !== 'manual') {
        removeAffiliateCode();
      }
      return result;
    }

    const incoming: AffiliateAttribution = { ...result.attribution, source };
    const chosen = chooseAffiliateAttribution(affiliateAttribution, incoming);
    if (chosen === affiliateAttribution) return { success: true };

    setAffiliateAttribution(chosen);
    localStorage.setItem(AFFILIATE_STORAGE_KEY, JSON.stringify(chosen));
    removeCoupon();
    return { success: true };
  }, [affiliateAttribution, removeAffiliateCode, removeCoupon]);

  const applyCoupon = useCallback(async (code: string): Promise<{ success: boolean; message?: string }> => {
    const result = await validateNativeCoupon(code);
    if (!result.success) return result;

    removeAffiliateCode();
    setCouponCode(result.code);
    setDiscount(result.discount);
    setDiscountType(result.type);
    localStorage.setItem('nakama_coupon', result.code);
    localStorage.setItem('nakama_discount', result.discount.toString());
    localStorage.setItem('nakama_discount_type', result.type);
    return { success: true };
  }, [removeAffiliateCode]);

  // Calculations
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0) + quoteItems.length;

  // Subtotal en MXN base: productos + cotizaciones. Es la estimación local;
  // el server recalcula la cotización con su total real al pasar al checkout.
  const quotesSubtotal = quoteItems.reduce((sum, q) => sum + q.totalMXN, 0);
  const subtotal = cart.reduce((sum, item) => {
    const price = item.variation ? item.variation.price : item.product.price;
    return sum + (price * item.quantity);
  }, 0) + quotesSubtotal;

  // Calculate discount absolute value
  const affiliateDiscount = affiliateAttribution
    ? affiliateAttribution.discountPercentage / 100
    : 0;
  const discountAmount = affiliateAttribution
    ? subtotal * affiliateDiscount
    : (discountType === 'percent' ? subtotal * discount : discount);

  // Envío gratis a partir de $1,500 MXN (promo vigente; el subtotal local
  // siempre está en MXN base). Es solo la estimación del carrito local: el
  // costo real de paquetería lo calcula el checkout de WooCommerce.
  const isFreeShipping = !affiliateAttribution && subtotal >= 1500;
  const shipping = subtotal > 0 && !isFreeShipping ? 150 : 0; // Standard shipping 150 MXN

  const total = Math.max(0, subtotal - discountAmount + shipping);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      quoteItems,
      addQuoteToCart,
      removeQuoteFromCart,
      isQuoteInCart,
      cartCount,
      subtotal,
      shipping,
      total,
      couponCode,
      discount: discountAmount, // Export the absolute amount for UI consistency
      discountType: affiliateAttribution ? 'percent' : discountType,
      applyCoupon,
      removeCoupon,
      affiliateCode: affiliateAttribution?.code || '',
      affiliateSource: affiliateAttribution?.source || '',
      affiliateExpiresAt: affiliateAttribution?.expiresAt || '',
      promotionReady,
      applyAffiliateCode,
      removeAffiliateCode,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
