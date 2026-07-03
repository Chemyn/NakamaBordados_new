'use client';

import React, { useEffect, useState } from 'react';

/**
 * Fondo opcional para las bandas de hero (nk-store-hero).
 *
 * Lee la configuración pública del hero (definida por el admin en el escritorio
 * de WordPress → plugin "Nakama Hero") y, si hay una imagen o video asignado a
 * esta página (o un override global `all_pages`), lo pinta como fondo a pantalla
 * completa DENTRO de la banda existente, preservando su tamaño actual.
 *
 * Si no hay nada configurado, no renderiza nada: la página se ve idéntica a hoy
 * (fondo navy). Es puramente aditivo — cero regresión por defecto.
 *
 * Requisito: el contenedor padre debe tener `position: relative; overflow: hidden`
 * y el contenido debe ir por encima (z-index >= 1).
 */

type HeroMedia = { image?: string; video?: string };
type HeroCfg = { all_pages?: HeroMedia; pages?: Record<string, HeroMedia> };

// Cache a nivel de módulo: se pide una sola vez por carga de la app.
let configPromise: Promise<HeroCfg> | null = null;
function loadHeroConfig(): Promise<HeroCfg> {
  if (!configPromise) {
    configPromise = fetch('/api/hero-config')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return configPromise;
}

export default function HeroBackground({ pageKey }: { pageKey: string }) {
  const [media, setMedia] = useState<HeroMedia | null>(null);

  useEffect(() => {
    let active = true;
    loadHeroConfig().then((cfg) => {
      if (!active) return;
      const page = cfg.pages?.[pageKey];
      const all = cfg.all_pages;
      const chosen: HeroMedia = {
        video: page?.video || all?.video || '',
        image: page?.image || all?.image || '',
      };
      if (chosen.video || chosen.image) setMedia(chosen);
    });
    return () => {
      active = false;
    };
  }, [pageKey]);

  if (!media) return null;

  return (
    <>
      {media.video ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
        >
          <source src={media.video} />
        </video>
      ) : (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${media.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
          }}
        />
      )}
      {/* Scrim oscuro para mantener legible el texto blanco sobre cualquier imagen/video. */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 0 }} />
    </>
  );
}
