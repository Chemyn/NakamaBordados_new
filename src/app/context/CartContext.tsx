'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Variation } from '@/types/product';

export interface CartItem {
  product: Product;
  variation: Variation | null; // null for simple products
  quantity: number;
  selectedColor?: string;
  selectedEstilo?: string;
  selectedTalla?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, variation: Variation | null, qty: number) => void;
  removeFromCart: (index: number) => void;
  updateQuantity: (index: number, qty: number) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  shipping: number;
  total: number;
  couponCode: string;
  discount: number; // Stored as absolute monetary discount or fractional depending on logic
  discountType: 'percent' | 'fixed';
  applyCoupon: (code: string) => Promise<{ success: boolean; message?: string }>;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('nakama_cart');
    const savedCoupon = localStorage.getItem('nakama_coupon');
    const savedDiscount = localStorage.getItem('nakama_discount');
    const savedType = localStorage.getItem('nakama_discount_type');

    setTimeout(() => {
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) {
          console.error(e);
        }
      }
      if (savedCoupon && savedDiscount) {
        setCouponCode(savedCoupon);
        setDiscount(parseFloat(savedDiscount));
        setDiscountType((savedType as 'percent' | 'fixed') || 'percent');
      }
    }, 0);
  }, []);

  // Save cart to localStorage on change
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('nakama_cart', JSON.stringify(newCart));
  };

  const addToCart = (product: Product, variation: Variation | null, qty: number) => {
    const newCart = [...cart];
    // Check if item already exists in cart (matching product and variation)
    const existingIndex = newCart.findIndex(item => 
      item.product.id === product.id && 
      ((item.variation === null && variation === null) || 
       (item.variation?.id === variation?.id))
    );

    if (existingIndex > -1) {
      newCart[existingIndex].quantity += qty;
    } else {
      newCart.push({
        product,
        variation,
        quantity: qty,
        selectedColor: variation?.attributes.Color,
        selectedEstilo: variation?.attributes.Estilo,
        selectedTalla: variation?.attributes.Talla
      });
    }
    saveCart(newCart);
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
      newCart[index].quantity = qty;
      saveCart(newCart);
    }
  };

  const clearCart = () => {
    saveCart([]);
    removeCoupon();
  };

  const applyCoupon = async (code: string): Promise<{ success: boolean; message?: string }> => {
    const normalized = code.trim().toUpperCase();
    
    try {
      // Intentar validar usando la API real (requiere nakama-checkout-tools.php)
      const res = await fetch(`https://nakamabordados.com/wp-json/nakama/v1/check-coupon?code=${normalized}`);
      
      if (res.ok) {
        const data = await res.json();
        if (data.valid) {
          setCouponCode(normalized);
          // percentage or fixed_cart
          const type = data.type === 'percent' ? 'percent' : 'fixed';
          const amt = data.type === 'percent' ? (data.amount / 100) : data.amount;
          
          setDiscount(amt);
          setDiscountType(type);
          
          localStorage.setItem('nakama_coupon', normalized);
          localStorage.setItem('nakama_discount', amt.toString());
          localStorage.setItem('nakama_discount_type', type);
          return { success: true };
        } else {
          return { success: false, message: data.message || 'Cupón inválido' };
        }
      }
    } catch (e) {
      console.warn("Fallo API cupones, usando fallback local", e);
    }

    // Fallback local hardcoded si la API falla
    if (normalized === 'NAKAMA10' || normalized === 'CREADOR10') {
      setCouponCode(normalized);
      setDiscount(0.1); 
      setDiscountType('percent');
      localStorage.setItem('nakama_coupon', normalized);
      localStorage.setItem('nakama_discount', '0.1');
      localStorage.setItem('nakama_discount_type', 'percent');
      return { success: true };
    } else if (normalized === 'NAKAMA20') {
      setCouponCode(normalized);
      setDiscount(0.2); 
      setDiscountType('percent');
      localStorage.setItem('nakama_coupon', normalized);
      localStorage.setItem('nakama_discount', '0.2');
      localStorage.setItem('nakama_discount_type', 'percent');
      return { success: true };
    }
    return { success: false, message: 'Cupón no encontrado' };
  };

  const removeCoupon = () => {
    setCouponCode('');
    setDiscount(0);
    setDiscountType('percent');
    localStorage.removeItem('nakama_coupon');
    localStorage.removeItem('nakama_discount');
    localStorage.removeItem('nakama_discount_type');
  };

  // Calculations
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  const subtotal = cart.reduce((sum, item) => {
    const price = item.variation ? item.variation.price : item.product.price;
    return sum + (price * item.quantity);
  }, 0);

  // Calculate discount absolute value
  const discountAmount = discountType === 'percent' ? (subtotal * discount) : discount;

  // Free shipping in 4 items (4pz) or if subtotal >= 1200 as per snippets!
  const isFreeShipping = cartCount >= 4 || subtotal >= 1200;
  const shipping = subtotal > 0 && !isFreeShipping ? 150 : 0; // Standard shipping 150 MXN

  const total = Math.max(0, subtotal - discountAmount + shipping);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartCount,
      subtotal,
      shipping,
      total,
      couponCode,
      discount: discountAmount, // Export the absolute amount for UI consistency
      applyCoupon,
      removeCoupon
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
