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
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  shipping: number;
  total: number;
  couponCode: string;
  discount: number;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('nakama_cart');
    const savedCoupon = localStorage.getItem('nakama_coupon');
    const savedDiscount = localStorage.getItem('nakama_discount');

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

  const clearCart = () => {
    saveCart([]);
    removeCoupon();
  };

  const applyCoupon = (code: string): boolean => {
    const normalized = code.trim().toUpperCase();
    // Simple mock coupons:
    // NAKAMA10 - 10% off
    // NAKAMA20 - 20% off
    // GRATIS - Free shipping (handled in shipping calculation)
    if (normalized === 'NAKAMA10' || normalized === 'CREADOR10') {
      setCouponCode(normalized);
      setDiscount(0.1); // 10%
      localStorage.setItem('nakama_coupon', normalized);
      localStorage.setItem('nakama_discount', '0.1');
      return true;
    } else if (normalized === 'NAKAMA20') {
      setCouponCode(normalized);
      setDiscount(0.2); // 20%
      localStorage.setItem('nakama_coupon', normalized);
      localStorage.setItem('nakama_discount', '0.2');
      return true;
    }
    return false;
  };

  const removeCoupon = () => {
    setCouponCode('');
    setDiscount(0);
    localStorage.removeItem('nakama_coupon');
    localStorage.removeItem('nakama_discount');
  };

  // Calculations
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  const subtotal = cart.reduce((sum, item) => {
    const price = item.variation ? item.variation.price : item.product.price;
    return sum + (price * item.quantity);
  }, 0);

  // Free shipping in 4 items (4pz) or if subtotal >= 1200 as per snippets!
  // "Nuevas promociones 4pz y envio gratis a partir de 1200"
  const isFreeShipping = cartCount >= 4 || subtotal >= 1200;
  const shipping = subtotal > 0 && !isFreeShipping ? 150 : 0; // Standard shipping 150 MXN

  const total = Math.max(0, subtotal * (1 - discount) + shipping);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      clearCart,
      cartCount,
      subtotal,
      shipping,
      total,
      couponCode,
      discount,
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
