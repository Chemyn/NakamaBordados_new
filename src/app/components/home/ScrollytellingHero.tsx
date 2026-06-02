'use client';

import React, { useRef, useEffect, useLayoutEffect } from 'react';

const heroImages = [
  "https://nakamabordados.com/wp-content/uploads/2026/05/hsale1.avif",
  "https://nakamabordados.com/wp-content/uploads/2026/05/hsale2.avif",
  "https://nakamabordados.com/wp-content/uploads/2026/05/hsale3.avif"
];

export default function ScrollytellingHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);

  // DOM Style Mutator & Cleanup
  useLayoutEffect(() => {
    // Sobrescribir temporalmente propiedades globales
    const originalBodyBg = document.body.style.backgroundColor;
    const originalHtmlBg = document.documentElement.style.backgroundColor;

    document.body.style.backgroundColor = '#000';
    document.documentElement.style.backgroundColor = '#000';

    // Cleanup: Restauración de estado de estilos
    return () => {
      document.body.style.backgroundColor = originalBodyBg;
      document.documentElement.style.backgroundColor = originalHtmlBg;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cargar imágenes
    let loadedCount = 0;
    const images = heroImages.map((src) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === heroImages.length) {
          render(0); // Render inicial
        }
      };
      return img;
    });
    imagesRef.current = images;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      render(getScrollProgress());
    };

    const getScrollProgress = () => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const totalHeight = rect.height - window.innerHeight;
      const progress = -rect.top / totalHeight;
      return Math.max(0, Math.min(1, progress));
    };

    const render = (progress: number) => {
      if (!ctx || imagesRef.current.length < heroImages.length) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Actualizar opacidad del overlay directamente (DOM Mutator)
      if (overlayRef.current) {
        const opacity = progress > 0.85 ? (progress - 0.85) * (1 / 0.15) : 0;
        overlayRef.current.style.opacity = opacity.toString();
      }

      // Lógica de "240 fotogramas" mapeada al scroll (0 a 1)
      const sectionCount = heroImages.length;
      const sectionProgress = progress * (sectionCount - 1);
      const currentIdx = Math.floor(sectionProgress);
      const nextIdx = Math.min(currentIdx + 1, sectionCount - 1);
      const localProgress = sectionProgress - currentIdx;

      // Dibujar imagen actual
      const drawImage = (img: HTMLImageElement, alpha: number, p: number) => {
        if (!img.complete) return;
        ctx.globalAlpha = alpha;

        const canvasWidth = window.innerWidth;
        const canvasHeight = window.innerHeight;

        const scaleX = canvasWidth / img.width;
        const scaleY = canvasHeight / img.height;
        const baseScale = Math.max(scaleX, scaleY);

        // Zoom suave corregido para mayor nitidez
        const zoom = baseScale * (1 + p * 0.08); 
        const drawWidth = img.width * zoom;
        const drawHeight = img.height * zoom;

        const offsetX = (canvasWidth - drawWidth) / 2;
        const offsetY = (canvasHeight - drawHeight) / 2;

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        // Añadir capa de contraste para que el texto resalte siempre
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      };

      if (currentIdx === nextIdx) {
        drawImage(imagesRef.current[currentIdx], 1, localProgress);
      } else {
        // Cross-fade
        drawImage(imagesRef.current[currentIdx], 1 - localProgress, localProgress);
        drawImage(imagesRef.current[nextIdx], localProgress, localProgress - 1);
      }

      // Dibujar hint de scroll si estamos al principio
      if (progress < 0.05) {
        drawScrollHint(ctx, canvas);
      }
    };

    const drawScrollHint = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      ctx.save();
      ctx.font = '24px "Material Icons Outlined"';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText('keyboard_arrow_down', canvas.width / 2, canvas.height - 50);
      ctx.restore();
    };

    const onScroll = () => {
      requestAnimationFrame(() => render(getScrollProgress()));
    };

    window.addEventListener('scroll', onScroll);
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <section 
      ref={containerRef} 
      className="nk-scrollytelling-container"
      style={{ height: '400vh', position: 'relative', background: '#000' }}
    >
      <div 
        style={{ 
          position: 'sticky', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100vh', 
          overflow: 'hidden',
          zIndex: 10
        }}
      >
        <canvas ref={canvasRef} style={{ display: 'block' }} />
        
        {/* Overlay Text Content - Aparece al final */}
        <div 
          ref={overlayRef}
          className="nk-scrolly-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            color: 'white',
            textAlign: 'center',
            padding: '20px',
            opacity: 0,
            transition: 'opacity 0.2s ease-out'
          }}
        >
          <div className="nk-container">
            <span 
              className="nk-store-hero-badge" 
              style={{ background: 'var(--nk-primary)', color: 'white', border: 'none' }}
            >
              Nueva Colección
            </span>
            <h2 
              className="nk-section-title" 
              style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)', color: 'white', textShadow: '0 4px 30px rgba(0,0,0,0.8), 4px 4px 0px #000', lineHeight: 1 }}
            >
              Domina el Grand Line
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
}
