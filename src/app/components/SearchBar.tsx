'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Product } from '../data/products';
import { useCurrency } from '../context/CurrencyContext';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const router = useRouter();
  const { formatPrice } = useCurrency();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        if (query === '') setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query]);

  // Live search logic
  useEffect(() => {
    if (query.length < 3) {
      const resetResults = () => {
        if (results.length > 0) setResults([]);
        if (showDropdown) setShowDropdown(false);
      };
      queueMicrotask(resetResults);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=6`);
        const data = await res.json();
        if (data && data.products) {
          setResults(data.products);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error('Search fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/store?search=${encodeURIComponent(query.trim())}`);
      closeAll();
    }
  };

  const closeAll = () => {
    setIsMobileOpen(false);
    setShowDropdown(false);
    setIsExpanded(false);
    setQuery('');
    document.body.style.overflow = '';
  };

  const openMobile = () => {
    setIsMobileOpen(true);
    document.body.style.overflow = 'hidden';
    setTimeout(() => mobileInputRef.current?.focus(), 300);
  };

  const toggleDesktop = () => {
    if (isExpanded) {
      if (query === '') setIsExpanded(false);
      else {
        router.push(`/store?search=${encodeURIComponent(query.trim())}`);
        closeAll();
      }
    } else {
      setIsExpanded(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="nk-search-system" ref={containerRef}>
      {/* Desktop Search Trigger & Input */}
      <div className={`nk-search-container nk-desktop-only ${isExpanded ? 'expanded' : ''}`}>
        <input
          ref={inputRef}
          type="text"
          className="nk-search-input-desktop nk-manga-border"
          placeholder="Buscar..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(e)}
          onFocus={() => setIsExpanded(true)}
        />
        <button 
          className="nk-search-trigger nk-manga-border" 
          onClick={toggleDesktop}
          aria-label="Buscar"
          style={{ borderLeft: 'none' }}
        >
          <span className="material-icons-outlined">search</span>
        </button>
        
        {isLoading && (
          <div className="nk-search-loading-icon">
            <span className="material-icons-outlined animate-spin" style={{ fontSize: '18px', color: 'var(--nk-primary)' }}>autorenew</span>
          </div>
        )}

        {/* Desktop Results Dropdown */}
        {showDropdown && isExpanded && (
          <div className="nk-search-results-dropdown nk-manga-border" style={{ boxShadow: '8px 8px 0px #000' }}>
            {results.length > 0 ? (
              <>
                <div className="nk-search-results-header">Resultados</div>
                {results.map((product) => (
                  <Link 
                    key={product.id} 
                    href={`/product/${product.id}`} 
                    className="nk-search-item"
                    onClick={closeAll}
                  >
                    <img src={product.images[0]} alt={product.name} className="nk-search-item-img" />
                    <div className="nk-search-item-info">
                      <h4 className="nk-search-item-title">{product.name}</h4>
                      <p className="nk-search-item-price">{formatPrice(product.price)}</p>
                    </div>
                    <span className="material-icons-outlined text-gray-400">chevron_right</span>
                  </Link>
                ))}
              </>
            ) : query.length >= 3 && !isLoading ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No encontramos nada para &quot;{query}&quot;
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Mobile Search Trigger */}
      <button 
        className="nk-mobile-only nk-action-btn" 
        onClick={openMobile}
        aria-label="Buscar"
      >
        <span className="material-icons-outlined">search</span>
      </button>

      {/* Mobile Search Overlay */}
      {isMobileOpen && (
        <div className="nk-mobile-search-overlay open">
          <div className="nk-mobile-search-header" style={{ background: '#000', borderBottom: '3px solid #f00' }}>
            <span className="nk-mobile-search-title" style={{ color: '#fff' }}>BUSCAR</span>
            <button className="nk-action-btn" onClick={closeAll} style={{ color: '#fff' }}>
              <span className="material-icons-outlined">close</span>
            </button>
          </div>
          <div className="nk-mobile-search-body">
            <form onSubmit={handleSearchSubmit} className="nk-mobile-search-input-wrapper">
              <input
                ref={mobileInputRef}
                type="text"
                className="nk-mobile-search-input nk-manga-border"
                placeholder="¿Qué buscas?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              <button type="submit" className="nk-mobile-search-icon-btn">
                <span className="material-icons-outlined">search</span>
              </button>
            </form>

            <div className="mt-6 space-y-4">
              {results.length > 0 && query.length >= 3 && results.map((product) => (
                <Link 
                  key={product.id} 
                  href={`/product/${product.id}`} 
                  className="nk-search-item nk-manga-border"
                  style={{ background: '#fff', boxShadow: '4px 4px 0px #000', marginBottom: '12px' }}
                  onClick={closeAll}
                >
                  <img src={product.images[0]} alt={product.name} className="nk-search-item-img" />
                  <div className="nk-search-item-info">
                    <h4 className="nk-search-item-title">{product.name}</h4>
                    <p className="nk-search-item-price">{formatPrice(product.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
