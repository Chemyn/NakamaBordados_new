'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage, Language } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { fetchCategories } from '../data/products';
import { WPCategory } from '@/lib/queries';
import { openWpAdmin, WP_ADMIN_URL } from '@/lib/wp-sso';
import SearchBar from './SearchBar';

export default function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category');
  
  const { cartCount } = useCart();
  const { isAdmin } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { currencyInfo, setCurrencyManual } = useCurrency();

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

  // Initialize theme from storage if different from default (light default)
  useEffect(() => {
    const savedTheme = localStorage.getItem('color-theme');
    if (savedTheme === 'dark') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
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

  const handleDropdownLinkClick = (category: string, e: React.MouseEvent) => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      e.preventDefault();
      setSubActive(subActive === category ? null : category);
    } else {
      setMenuOpen(false);
    }
  };

  const getSubcategories = (parentSlug: string) => {
    return categories
      .filter(c => c.parentSlug === parentSlug)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const isCategoryActive = (slug: string) => {
    if (slug === 'bordados') {
      return currentCategory === 'bordados' || getSubcategories('bordados').some(s => s.slug === currentCategory);
    }
    if (slug === 'estampados') {
      return currentCategory === 'estampados' || getSubcategories('estampados').some(s => s.slug === currentCategory);
    }
    return currentCategory === slug;
  };

  return (
    <nav className="nk-navbar nk-manga-border" style={{ borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
      <div className="nk-nav-container">
        {/* Mobile menu trigger */}
        <button
          className={`nk-nav-toggle nk-mobile-only ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
        >
          <div className="hamburger-box">
            <div className="hamburger-inner"></div>
          </div>
        </button>

        {/* Brand Logo - ONLY HOME BUTTON */}
        <Link href="/" className="nk-nav-brand" onClick={() => setMenuOpen(false)}>
          <Image
            src="https://nakamabordados.com/wp-content/uploads/2025/11/LOGO-NAKAMA-scaled-2048x926.png"
            alt="NAKAMA Logo"
            width={160}
            height={70}
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
                className={`nk-nav-link ${pathname === '/store' && !currentCategory ? 'active-menu-item' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {t('nav.store')}
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
                  className={`nk-nav-link ${isCategoryActive('bordados') ? 'active-menu-item' : ''}`}
                  onClick={(e) => handleDropdownLinkClick('bordados', e)}
                >
                  {t('nav.embroidery')}
                </Link>
                <button className="nk-dropdown-toggle-btn" onClick={(e) => toggleSubmenu('bordados', e)}>
                  <span className={`material-icons-outlined ${subActive === 'bordados' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
              </div>
              <div className={`nk-mega-menu nk-manga-border ${subActive === 'bordados' ? 'active' : ''}`}>
                <ul className="nk-mega-grid">
                  {getSubcategories('bordados').map((sub) => (
                    <li key={sub.id}>
                      <Link 
                        href={`/store?category=${sub.slug}`} 
                        className={`nk-mega-link ${currentCategory === sub.slug ? 'active-link' : ''}`} 
                        onClick={() => { setMenuOpen(false); setSubActive(null); }}
                      >
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
                className={`nk-nav-link ${isCategoryActive('bordado-con-estampado') ? 'active-menu-item' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {t('nav.combo')}
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
                  className={`nk-nav-link ${isCategoryActive('estampados') ? 'active-menu-item' : ''}`}
                  onClick={(e) => handleDropdownLinkClick('estampados', e)}
                >
                  {t('nav.prints')}
                </Link>
                <button className="nk-dropdown-toggle-btn" onClick={(e) => toggleSubmenu('estampados', e)}>
                  <span className={`material-icons-outlined ${subActive === 'estampados' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
              </div>
              <div className={`nk-mega-menu nk-manga-border ${subActive === 'estampados' ? 'active' : ''}`}>
                <ul className="nk-mega-grid">
                  {getSubcategories('estampados').map((sub) => (
                    <li key={sub.id}>
                      <Link 
                        href={`/store?category=${sub.slug}`} 
                        className={`nk-mega-link ${currentCategory === sub.slug ? 'active-link' : ''}`} 
                        onClick={() => { setMenuOpen(false); setSubActive(null); }}
                      >
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
                className={`nk-nav-link nk-link-highlight ${isCategoryActive('edicion-especial') ? 'active-menu-item' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {t('nav.special')}
              </Link>
            </li>

            <li>
              <Link
                href="/store?category=lisas"
                className={`nk-nav-link ${isCategoryActive('lisas') ? 'active-menu-item' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {t('nav.plain')}
              </Link>
            </li>

            <li>
              <Link
                href="/store?category=variedad"
                className={`nk-nav-link ${isCategoryActive('variedad') ? 'active-menu-item' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {t('nav.variety')}
              </Link>
            </li>

            <li>
              <Link
                href="/store?category=gorras"
                className={`nk-nav-link ${isCategoryActive('gorras') ? 'active-menu-item' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {t('nav.caps')}
              </Link>
            </li>

            <li>
              <Link
                href="/cotizador"
                className={`nk-nav-link nk-link-highlight ${pathname.startsWith('/cotizador') ? 'active-menu-item' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {t('nav.cotizador')}
              </Link>
            </li>

            {/* Mobile Mode Changer */}
            <li className="nk-mobile-theme-item">
              <button className="nk-mobile-theme-btn" onClick={toggleTheme}>
                <span className="material-icons-outlined">
                  {theme === 'light' ? 'dark_mode' : 'light_mode'}
                </span>
                <span>{theme === 'light' ? t('theme.dark') : t('theme.light')}</span>
              </button>
            </li>

            {/* Mobile Global Selectors */}
            <li className="nk-mobile-only" style={{ padding: '15px 20px', borderTop: '1px solid var(--nk-border)', marginTop: '10px' }}>
              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--nk-text-sec)' }}>{t('nav.language') || 'Idioma'}</span>
                  <select 
                    value={language} 
                    onChange={(e) => { setLanguage(e.target.value as Language); setMenuOpen(false); }}
                    className="nk-manga-input"
                    style={{ padding: '5px 10px', fontSize: '1rem', width: '120px' }}
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--nk-text-sec)' }}>{t('nav.currency') || 'Moneda'}</span>
                  <select 
                    value={currencyInfo.currency} 
                    onChange={(e) => { setCurrencyManual(e.target.value); setMenuOpen(false); }}
                    className="nk-manga-input"
                    style={{ padding: '5px 10px', fontSize: '1rem', width: '120px' }}
                  >
                    <option value="MXN">MXN $</option>
                    <option value="USD">USD $</option>
                  </select>
                </div>
              </div>
            </li>
          </ul>
        </div>

        {/* Action icons (Search, Account, Cart, Theme Toggle, Selectors).
            Sin gap inline: los media queries de globals.css compactan el
            espacio en laptops y el inline los pisaría. */}
        <div className="nk-nav-actions">
          
          {/* Custom Selectors (Desktop only for brevity, handle mobile styles independently) */}
          <div className="nk-desktop-only" style={{ display: 'flex', gap: '5px' }}>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="nk-manga-input"
              style={{ padding: '2px 5px', fontSize: '0.8rem', height: 'auto', border: '2px solid var(--nk-border)' }}
            >
              <option value="es">ES</option>
              <option value="en">EN</option>
            </select>

            <select 
              value={currencyInfo.currency} 
              onChange={(e) => setCurrencyManual(e.target.value)}
              className="nk-manga-input"
              style={{ padding: '2px 5px', fontSize: '0.8rem', height: 'auto', border: '2px solid var(--nk-border)' }}
            >
              <option value="MXN">MXN $</option>
              <option value="USD">USD $</option>
            </select>
          </div>

          <SearchBar />

          <Link href="/mi-cuenta" className="nk-action-btn" title={t('nav.account')} style={{ background: 'transparent', boxShadow: 'none', border: 'none' }}>
            <span className="material-icons-outlined">person</span>
          </Link>

          <Link href="/cart" className="nk-action-btn nk-cart-btn" style={{ background: 'transparent', boxShadow: 'none', border: 'none', color: 'inherit' }} title={t('cart.title')}>        
            <span className="material-icons-outlined">shopping_bag</span>
            {cartCount > 0 && (
              <span className="nk-cart-badge">{cartCount}</span>
            )}
          </Link>

          <button className="nk-action-btn nk-desktop-only" onClick={toggleTheme} title="Cambiar Tema" style={{ background: 'transparent', boxShadow: 'none', border: 'none' }}>
            <span className="material-icons-outlined">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          {isAdmin && (
            <a
              href={WP_ADMIN_URL}
              onClick={(e) => { e.preventDefault(); openWpAdmin(); }}
              className="nk-action-btn nk-suite-btn"
              style={{ background: 'transparent', boxShadow: 'none', border: 'none', color: 'inherit' }}
              title="Escritorio WordPress (Admin)"
            >
              <span className="material-icons-outlined">dashboard</span>
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
