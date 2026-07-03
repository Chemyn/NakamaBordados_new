'use client';

import React, { useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import Link from 'next/link';

interface HeroSources {
  webm?: string;
  mp4?: string;
}

// Current hardcoded defaults — used if no prop is supplied.
const DEFAULT_WEBM = 'https://nakamabordados.com/wp-content/uploads/2026/01/banner2.webm';
const DEFAULT_MP4 = 'https://nakamabordados.com/wp-content/uploads/2026/01/banner2.mp4';

export default function ScrollytellingHero({ heroSources }: { heroSources?: HeroSources }) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);

  const webmSrc = heroSources?.webm || DEFAULT_WEBM;
  const mp4Src = heroSources?.mp4 || DEFAULT_MP4;

  return (
    <section className="nk-video-hero" style={{ position: 'relative', width: '100%', height: '90vh', overflow: 'hidden', background: '#000' }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="nk-hero-video"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'translate(-50%, -50%)',
          zIndex: 0,
          opacity: 0.7
        }}
      >
        <source src={webmSrc} type="video/webm" />
        <source src={mp4Src} type="video/mp4" />
      </video>

      {/* Overlay Gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(0,0,0,0.8) 100%)', zIndex: 1 }}></div>

      <div className="nk-container" style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '800px' }}>
          <span className="nk-store-hero-badge" style={{ background: 'var(--nk-primary)', color: 'white', border: 'none', marginBottom: '20px' }}>
            {t('hero.scrolly.badge')}
          </span>
          <h1 className="nk-section-title" style={{ fontSize: 'clamp(3rem, 10vw, 6rem)', color: 'white', textShadow: '4px 4px 0px #000', lineHeight: 0.9, marginBottom: '30px' }}>
            {t('hero.scrolly.title')}
          </h1>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/store" className="nk-btn nk-btn-hero nk-manga-border" style={{ boxShadow: 'var(--nk-manga-shadow-lg)' }}>
               EXPLORAR TIENDA
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 3, animation: 'bounce 2s infinite' }}>
        <span className="material-icons-outlined" style={{ color: '#fff', fontSize: '32px' }}>keyboard_double_arrow_down</span>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {transform: translateX(-50%) translateY(0);}
          40% {transform: translateX(-50%) translateY(-10px);}
          60% {transform: translateX(-50%) translateY(-5px);}
        }
      `}</style>
    </section>
  );
}
