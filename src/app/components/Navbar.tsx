'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const pathname = usePathname();
  const { cartCount } = useCart();
  
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [menuOpen, setMenuOpen] = useState(false);
  const [subActive, setSubActive] = useState<string | null>(null);

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

  // Subcategories for dropdowns matching snippets
  const getSubcategories = (cat: string) => {
    if (cat === 'bordados') {
      return [
        { name: 'Anime', href: '/store?category=bordados&tag=Anime' },
        { name: 'Minimalistas', href: '/store?category=bordados&tag=Minimalista' },
        { name: 'Mangas', href: '/store?category=bordados&tag=Manga' }
      ];
    }
    if (cat === 'estampados') {
      return [
        { name: 'Retro', href: '/store?category=estampados&tag=Retro' },
        { name: 'Neon', href: '/store?category=estampados&tag=Neon' }
      ];
    }
    return [];
  };

  return (
    <nav className="nk-navbar">
      <div className="nk-nav-container">
        {/* Mobile menu trigger */}
        <button 
          className="nk-nav-toggle" 
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
        >
          <span className="material-icons-outlined">menu</span>
        </button>

        {/* Brand Logo */}
        <Link href="/" className="nk-nav-brand">
          <img 
            src="https://nakamabordados.com/wp-content/uploads/2025/11/LOGO-NAKAMA-scaled-2048x926.png" 
            alt="NAKAMA Logo" 
            className="nk-logo-img"
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
                Todas
              </Link>
            </li>
            
            {/* Category: Bordados */}
            <li className="nk-nav-item-dropdown">
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
              <ul className={`nk-submenu ${subActive === 'bordados' ? 'active' : ''}`}>
                {getSubcategories('bordados').map((sub, i) => (
                  <li key={i}>
                    <Link href={sub.href} className="nk-submenu-link" onClick={() => { setMenuOpen(false); setSubActive(null); }}>
                      {sub.name}
                    </Link>
                  </li>
                ))}
              </ul>
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

            {/* Category: Estampados */}
            <li className="nk-nav-item-dropdown">
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
              <ul className={`nk-submenu ${subActive === 'estampados' ? 'active' : ''}`}>
                {getSubcategories('estampados').map((sub, i) => (
                  <li key={i}>
                    <Link href={sub.href} className="nk-submenu-link" onClick={() => { setMenuOpen(false); setSubActive(null); }}>
                      {sub.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>

            <li>
              <Link 
                href="/store?category=edicion-especial" 
                className="nk-nav-link nk-link-highlight"
                onClick={() => setMenuOpen(false)}
              >
                Edición Especial
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
          {/* Account Profile Link */}
          <Link href="/mi-cuenta" className="nk-action-btn" title="Mi Cuenta">
            <span className="material-icons-outlined">person</span>
          </Link>

          {/* Desktop Theme Switcher */}
          <button className="nk-action-btn nk-theme-toggle-desktop" onClick={toggleTheme} title="Cambiar Tema">
            <span className="material-icons-outlined">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          {/* Shopping Cart Badge Link */}
          <Link href="/checkout" className="nk-action-btn nk-cart-btn" title="Carrito">
            <span className="material-icons-outlined">shopping_bag</span>
            {cartCount > 0 && (
              <span className="nk-cart-badge">{cartCount}</span>
            )}
          </Link>
          
          {/* Admin Suite launcher */}
          <Link href="/admin/suite" className="nk-action-btn nk-suite-btn" title="Nakama Suite (Admin)">
            <span className="material-icons-outlined text-primary">rocket_launch</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
