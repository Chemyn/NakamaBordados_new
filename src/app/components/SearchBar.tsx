'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types/product';
import { useCurrency } from '../context/CurrencyContext';
import { WPCategory, WPTag } from '@/lib/queries';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [catResults, setCatResults] = useState<WPCategory[]>([]);
  const [tagResults, setTagResults] = useState<WPTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const router = useRouter();
  const { formatPrice } = useCurrency();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const closeAll = useCallback(() => {
    setIsMobileOpen(false);
    setShowDropdown(false);
    setIsExpanded(false);
    setQuery('');
    document.body.style.overflow = '';
  }, []);

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
      if (results.length > 0 || showDropdown) {
        queueMicrotask(() => {
          setResults([]);
          setShowDropdown(false);
        });
      }
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=6`);
        const data = await res.json();
        if (data) {
          setResults(data.products || []);
          setCatResults(data.categories || []);
          setTagResults(data.tags || []);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error('Search fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query, results.length, showDropdown]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/store?search=${encodeURIComponent(query.trim())}`);
      closeAll();
    }
  };

  const openMobile = () => {
    setIsMobileOpen(true);
    document.body.style.overflow = 'hidden';
    // Small delay to ensure the overlay is mounting before focus
    setTimeout(() => {
      if (mobileInputRef.current) {
        mobileInputRef.current.focus();
        // Force font size to 16px on focus to prevent iOS zoom
        mobileInputRef.current.style.fontSize = '16px';
      }
    }, 300);
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
          className="nk-search-trigger" 
          onClick={toggleDesktop}
          aria-label="Buscar"
          style={{ background: 'transparent', boxShadow: 'none', border: 'none' }}
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
          <div className="nk-search-results-dropdown nk-manga-border">
            {(results.length > 0 || catResults.length > 0 || tagResults.length > 0) ? (
              <>
                {/* Categorías y Etiquetas combinadas como "Sugerencias" */}
                {(catResults.length > 0 || tagResults.length > 0) && (
                  <div className="p-4 border-b border-gray-100">
                    <div className="nk-search-results-header">Sugerencias</div>
                    <div className="flex flex-wrap gap-2">
                      {catResults.map(cat => (
                        <Link 
                          key={`cat-${cat.slug}`} 
                          href={`/store?category=${cat.slug}`}
                          className="nk-search-pill"
                          onClick={closeAll}
                        >
                          Categoría: {cat.name}
                        </Link>
                      ))}
                      {tagResults.map(tag => (
                        <Link 
                          key={`tag-${tag.slug}`} 
                          href={`/store?tag=${tag.slug}`}
                          className="nk-search-pill nk-pill-red"
                          onClick={closeAll}
                        >
                          #{tag.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Productos */}
                {results.length > 0 && (
                  <>
                    <div className="nk-search-results-header">Productos</div>
                    {results.map((product) => (
                      <Link 
                        key={product.id} 
                        href={`/product/${product.id}`} 
                        className="nk-search-item"
                        onClick={closeAll}
                      >
                        <Image 
                          src={product.images[0]} 
                          alt={product.name} 
                          width={40} 
                          height={40} 
                          className="nk-search-item-img" 
                          style={{ objectFit: 'cover' }}
                        />
                        <div className="nk-search-item-info">
                          <h4 className="nk-search-item-title">{product.name}</h4>
                          <p className="nk-search-item-price">{formatPrice(product.price)}</p>
                        </div>
                        <span className="material-icons-outlined text-gray-400">chevron_right</span>
                      </Link>
                    ))}
                  </>
                )}
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
        <div className={`nk-mobile-search-overlay ${isMobileOpen ? 'open' : ''}`}>
          <div className="nk-mobile-search-header">
            <span className="nk-mobile-search-title">BUSCAR</span>
            <button className="nk-action-btn" onClick={closeAll}>
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

            <div className="nk-mobile-search-suggestions">
              {/* Mobile Suggestions */}
              {(catResults.length > 0 || tagResults.length > 0) && (
                <div className="nk-search-pills-container">
                  {catResults.map(cat => (
                    <Link 
                      key={`m-cat-${cat.slug}`} 
                      href={`/store?category=${cat.slug}`}
                      className="nk-search-pill"
                      onClick={closeAll}
                    >
                      📁 {cat.name}
                    </Link>
                  ))}
                  {tagResults.map(tag => (
                    <Link 
                      key={`m-tag-${tag.slug}`} 
                      href={`/store?tag=${tag.slug}`}
                      className="nk-search-pill nk-pill-red"
                      onClick={closeAll}
                    >
                      # {tag.name}
                    </Link>
                  ))}
                </div>
              )}

              {results.length > 0 && query.length >= 3 && results.map((product) => (
                <Link 
                  key={product.id} 
                  href={`/product/${product.id}`} 
                  className="nk-search-item nk-manga-border"
                  onClick={closeAll}
                >
                  <Image 
                    src={product.images[0]} 
                    alt={product.name} 
                    width={50} 
                    height={50} 
                    className="nk-search-item-img" 
                    style={{ objectFit: 'cover' }}
                  />
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
