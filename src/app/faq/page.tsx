'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';
import HeroBackground from '../components/HeroBackground';

export default function FAQPage() {
  const { t } = useLanguage();

  const faqs = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    { q: t('faq.q5'), a: t('faq.a5') }
  ];

  return (
    <div className="nk-store-page">
      <div className="nk-store-hero" style={{ background: 'var(--nk-navy)', color: '#fff', padding: '120px 24px 80px', borderBottom: '4px solid var(--nk-primary)', position: 'relative', overflow: 'hidden' }}>
        <HeroBackground pageKey="faq" />
        <div className="nk-container" style={{ position: 'relative', zIndex: 1 }}>
          <span className="nk-store-hero-badge" style={{ background: 'var(--nk-primary)', color: 'white', border: 'none' }}>{t('footer.support')}</span>
          <h1 className="nk-store-hero-title" style={{ color: '#fff', textShadow: '4px 4px 0px #000' }}>{t('faq.title')}</h1>
          <p className="nk-store-hero-subtitle" style={{ color: '#ccc' }}>{t('faq.subtitle')}</p>
        </div>
      </div>

      <div className="nk-container" style={{ padding: '60px 24px' }}>
        <div className="nk-faq-grid" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {faqs.map((faq, idx) => (
            <div key={idx} className="nk-faq-item nk-manga-border" style={{ padding: '30px', background: 'var(--nk-bg-card)', boxShadow: 'var(--nk-manga-shadow)' }}>
              <h3 style={{ fontSize: '1.8rem', color: 'var(--nk-primary)', marginBottom: '15px', lineHeight: 1.1 }}>{faq.q}</h3>
              <p style={{ fontSize: '1.1rem', color: 'var(--nk-text-sec)', lineHeight: 1.6 }}>{faq.a}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '60px' }}>
          <p style={{ marginBottom: '20px', fontWeight: 600 }}>{t('faq.still_doubts')}</p>
          <a href="https://wa.me/526622455087" target="_blank" rel="noopener noreferrer" className="nk-btn">
            {t('faq.contact')}
          </a>
        </div>
      </div>
    </div>
  );
}
