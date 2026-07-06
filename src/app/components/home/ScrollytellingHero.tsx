'use client';

import React, { useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import Link from 'next/link';

interface HeroSources {
  webm?: string;
  mp4?: string;
  /** Override global (all_pages) del Nakama Hero Manager */
  video?: string;
  image?: string;
}

// Current hardcoded defaults — used if no prop is supplied.
const DEFAULT_WEBM = 'https://nakamabordados.com/wp-content/uploads/2026/01/banner2.webm';
const DEFAULT_MP4 = 'https://nakamabordados.com/wp-content/uploads/2026/01/banner2.mp4';

export default function ScrollytellingHero({ heroSources }: { heroSources?: HeroSources }) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Precedencia (igual que HeroBackground): video propio del home >
  // override global (all_pages) > defaults. No se renderizan <source> vacíos.
  const sources: { src: string; type?: string }[] = [];
  let bgImage = '';
  if (heroSources?.webm || heroSources?.mp4) {
    if (heroSources.webm) sources.push({ src: heroSources.webm, type: 'video/webm' });
    if (heroSources.mp4) sources.push({ src: heroSources.mp4, type: 'video/mp4' });
  } else if (heroSources?.video) {
    sources.push({ src: heroSources.video });
  } else if (heroSources?.image) {
    bgImage = heroSources.image;
  } else {
    sources.push({ src: DEFAULT_WEBM, type: 'video/webm' });
    sources.push({ src: DEFAULT_MP4, type: 'video/mp4' });
  }
  // key: fuerza el remount del <video> cuando cambian las fuentes; sin esto el
  // navegador sigue reproduciendo el video anterior (React no llama a load()).
  const videoKey = sources.map(s => s.src).join('|');

  return (
    <section className="nk-video-hero" style={{ position: 'relative', width: '100%', height: '90vh', overflow: 'hidden', background: '#000' }}>
      {bgImage ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
            opacity: 0.7
          }}
        />
      ) : (
      <video
        key={videoKey}
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
        {sources.map(s => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
      </video>
      )}

      {/* Overlay Gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(0,0,0,0.8) 100%)', zIndex: 1 }}></div>

      <div className="nk-container" style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '800px' }}>
          <span className="nk-store-hero-badge" style={{ background: 'var(--nk-primary)', color: 'white', border: 'none', marginBottom: '20px' }}>
            {t('hero.scrolly.badge')}
          </span>
          {/* El tamaño lo gobierna .nk-section-title (clamp global con
              !important); un fontSize inline aquí es código muerto. */}
          <h1 className="nk-section-title" style={{ color: 'white', textShadow: '4px 4px 0px #000', lineHeight: 0.9, marginBottom: '30px' }}>
            {t('hero.scrolly.title')}
          </h1>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/store" className="nk-btn nk-btn-hero nk-manga-border" style={{ boxShadow: 'var(--nk-manga-shadow-lg)' }}>
               EXPLORAR TIENDA
            </Link>
            <Link href="/cotizador" className="nk-btn nk-btn-hero nk-manga-border" style={{ background: '#000000', color: '#ffffff', boxShadow: 'var(--nk-manga-shadow-lg)' }}>
               PERSONALIZADOS / COTIZAR
            </Link>
          </div>
          {/* Fila propia para que siempre quede DEBAJO de Personalizados */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <Link href="/promociones" className="nk-btn nk-btn-hero nk-manga-border" style={{ background: '#ffffff', color: 'var(--nk-primary)', boxShadow: 'var(--nk-manga-shadow-lg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
               <span className="material-icons-outlined" style={{ fontSize: '20px' }}>local_activity</span>
               {t('hero.promos_btn')}
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
