'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { fetchCategories } from '../data/products';
import { WPCategory } from '@/lib/queries';
import SearchBar from './SearchBar';

export default function Navbar() {
  const pathname = usePathname();
  const { cartCount } = useCart();
  const { isAdmin } = useAuth();

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [menuOpen, setMenuOpen] = useState(false);
  const [subActive, setSubActive] = useState<string | null>(null);
  const [categories, setCategories] = useState<WPCategory[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchCategories().then(data => {
      if (mounted) setCategories(data);
    });
    return () => { mounted = false; };
  }, []);

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('color-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) ? 'dark' : 'light';

    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    setTimeout(() => {
      setTheme(initialTheme);
    }, 0);
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('color-theme', 'dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('color-theme', 'light');
    }
  };

  const toggleSubmenu = (category: string, e: React.MouseEvent) => {
    e.preventDefault();
    setSubActive(subActive === category ? null : category);
  };

  const getSubcategories = (parentSlug: string) => {
    return categories
      .filter(c => c.parentSlug === parentSlug)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  return (
    <nav className="nk-navbar nk-manga-border" style={{ borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
      <div className="nk-nav-container">
        {/* Mobile menu trigger */}
        <button
          className="nk-nav-toggle nk-mobile-only"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
        >
          <span className="material-icons-outlined">{menuOpen ? 'close' : 'menu'}</span>
        </button>

        {/* Brand Logo - ONLY HOME BUTTON */}
        <Link href="/" className="nk-nav-brand" onClick={() => setMenuOpen(false)}>
          <Image
            src="https://nakamabordados.com/wp-content/uploads/2025/11/LOGO-NAKAMA-scaled-2048x926.png"
            alt="NAKAMA Logo"
            width={200}
            height={90}
            className="nk-logo-img"
            priority
          />
        </Link>

        {/* Desktop Menu links */}
        <div className={`nk-nav-menu ${menuOpen ? 'active' : ''}`}>
          <ul className="nk-nav-list">
            <li>
              <Link
                href="/store"
                className={`nk-nav-link ${pathname === '/store' ? 'active-menu-item' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Tienda
              </Link>
            </li>

            {/* Category: Bordados (Mega Menu) */}
            <li className="nk-nav-item-dropdown nk-mega-trigger"
                onMouseEnter={() => setSubActive('bordados')}
                onMouseLeave={() => setSubActive(null)}
            >
              <div className="nk-dropdown-trigger-wrapper">
                <Link
                  href="/store?category=bordados"
                  className={`nk-nav-link ${pathname.includes('category=bordados') ? 'active-menu-item' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Bordados
                </Link>
                <button className="nk-dropdown-toggle-btn" onClick={(e) => toggleSubmenu('bordados', e)}>
                  <span className={`material-icons-outlined ${subActive === 'bordados' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
              </div>
              <div className={`nk-mega-menu nk-manga-border ${subActive === 'bordados' ? 'active' : ''}`}>
                <ul className="nk-mega-grid">
                  {getSubcategories('bordados').map((sub) => (
                    <li key={sub.id}>
                      <Link href={`/store?category=${sub.slug}`} className="nk-mega-link" onClick={() => { setMenuOpen(false); setSubActive(null); }}>
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>

            <li>
              <Link
                href="/store?category=bordado-con-estampado"
                className={`nk-nav-link ${pathname.includes('category=bordado-con-estampado') ? 'active-menu-item' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                C/Estampado
              </Link>
            </li>

            {/* Category: Estampados (Mega Menu) */}
            <li className="nk-nav-item-dropdown nk-mega-trigger"
                onMouseEnter={() => setSubActive('estampados')}
                onMouseLeave={() => setSubActive(null)}
            >
              <div className="nk-dropdown-trigger-wrapper">
                <Link
                  href="/store?category=estampados"
                  className={`nk-nav-link ${pathname.includes('category=estampados') ? 'active-menu-item' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Estampado
                </Link>
                <button className="nk-dropdown-toggle-btn" onClick={(e) => toggleSubmenu('estampados', e)}>
                  <span className={`material-icons-outlined ${subActive === 'estampados' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
              </div>
              <div className={`nk-mega-menu nk-manga-border ${subActive === 'estampados' ? 'active' : ''}`}>
                <ul className="nk-mega-grid">
                  {getSubcategories('estampados').map((sub) => (
                    <li key={sub.id}>
                      <Link href={`/store?category=${sub.slug}`} className="nk-mega-link" onClick={() => { setMenuOpen(false); setSubActive(null); }}>
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>

            <li>
              <Link
                href="/store?category=edicion-especial"
                className="nk-nav-link nk-link-highlight"
                onClick={() => setMenuOpen(false)}
              >
                Especial
              </Link>
            </li>

            <li>
              <Link
                href="/store?category=lisas"
                className={`nk-nav-link ${pathname.includes('category=lisas') ? 'active-menu-item' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Lisas
              </Link>
            </li>

            <li>
              <Link
                href="/store?category=variedad"
                className={`nk-nav-link ${pathname.includes('category=variedad') ? 'active-menu-item' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Variedad
              </Link>
            </li>

            <li>
              <Link
                href="/store?category=gorras"
                className={`nk-nav-link ${pathname.includes('category=gorras') ? 'active-menu-item' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Gorras
              </Link>
            </li>

            {/* Mobile Mode Changer */}
            <li className="nk-mobile-theme-item">
              <button className="nk-mobile-theme-btn" onClick={toggleTheme}>
                <span className="material-icons-outlined">
                  {theme === 'light' ? 'dark_mode' : 'light_mode'}
                </span>
                <span>{theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}</span>
              </button>
            </li>
          </ul>
        </div>

        {/* Action icons (Search, Account, Cart, Theme Toggle) */}
        <div className="nk-nav-actions">
          <SearchBar />

          <Link href="/mi-cuenta" className="nk-action-btn" title="Mi Cuenta" style={{ background: 'transparent', boxShadow: 'none', border: 'none' }}>
            <span className="material-icons-outlined">person</span>
          </Link>

          <Link href="/checkout" className="nk-action-btn nk-cart-btn" style={{ background: 'transparent', boxShadow: 'none', border: 'none', color: 'inherit' }} title="Carrito">        
            <span className="material-icons-outlined">shopping_bag</span>
            {cartCount > 0 && (
              <span className="nk-cart-badge">{cartCount}</span>
            )}
          </Link>

          <button className="nk-action-btn" onClick={toggleTheme} title="Cambiar Tema" style={{ background: 'transparent', boxShadow: 'none', border: 'none' }}>
            <span className="material-icons-outlined">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          {isAdmin && (
            <Link href="/admin/suite" className="nk-action-btn nk-suite-btn" style={{ background: 'transparent', boxShadow: 'none', border: 'none', color: 'inherit' }} title="Nakama Suite (Admin)">
              <span className="material-icons-outlined">rocket_launch</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
