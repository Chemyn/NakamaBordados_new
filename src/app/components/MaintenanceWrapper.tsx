'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface SocialLinks {
  facebook: string;
  instagram: string;
  tiktok: string;
}

interface MaintenanceData {
  maintenanceMode: boolean;
  message: string;
  image: string;
  socialLinks: SocialLinks;
}

// Recursos de la página de mantenimiento (mismos que usaba CMP Coming Soon)
const MAINTENANCE_LOGO = 'https://nakamabordados.com/wp-content/uploads/2024/01/Nakama-PNG-300x300.png';
const MAINTENANCE_BG = 'https://nakamabordados.com/wp-content/uploads/2026/07/Fondo-topaz-cgi-4x-1024x1024.png';
const DEFAULT_MESSAGE = 'Nuestros nakamas están realizando cambios increíbles en el sitio. ¡Volvemos muy pronto!';

export default function MaintenanceWrapper({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const [maintenance, setMaintenance] = useState<MaintenanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // nkcb: cache-buster; LiteSpeed cachea las respuestas del API y sin esto
    // un cambio del modo mantenimiento tardaría en verse (o serviría un 404
    // viejo sin CORS, rompiendo el fetch en dev).
    fetch(`https://nakamabordados.com/?rest_route=/nakama/v1/maintenance&nkcb=${Date.now()}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (active && data) {
          setMaintenance(data);
        }
      })
      // warn (no error): si el endpoint no responde (CORS/caché/red), el sitio
      // simplemente se muestra normal; no es un fallo de la app.
      .catch(err => console.warn('No se pudo cargar estado de mantenimiento (se asume inactivo):', err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  if (authLoading || (loading && !pathname.startsWith('/admin') && !pathname.startsWith('/api'))) {
    return (
      <div className="nk-loading-container" style={{ padding: '150px 0', textAlign: 'center', background: 'var(--nk-bg-body)', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div className="nk-spinner" style={{ margin: '0 auto 20px' }}></div>
        <p style={{ fontFamily: 'Teko', fontSize: '1.8rem', color: 'var(--nk-text)' }}>Cargando tripulación...</p>
      </div>
    );
  }

  // Bypass de la pantalla de mantenimiento si:
  // 1. El modo mantenimiento está APAGADO
  // 2. El usuario es administrador (el toggle vive en Mi Cuenta > ADMIN TOOLS)
  // 3. La ruta es de administración/API
  // 4. La ruta es "/mi-cuenta" (para que el admin pueda iniciar sesión)
  const isBypassPath = pathname.startsWith('/admin') || pathname.startsWith('/api') || pathname === '/mi-cuenta';

  if (!maintenance?.maintenanceMode || isAdmin || isBypassPath) {
    return <>{children}</>;
  }

  const socials = [
    { key: 'instagram', url: maintenance.socialLinks?.instagram, icon: 'photo_camera', label: 'Instagram' },
    { key: 'facebook', url: maintenance.socialLinks?.facebook, icon: 'thumb_up', label: 'Facebook' },
    { key: 'tiktok', url: maintenance.socialLinks?.tiktok, icon: 'music_note', label: 'TikTok' },
  ].filter(s => s.url);

  // Pantalla de mantenimiento: clon de la página CMP Coming Soon del sitio,
  // adaptada al sistema de diseño manga/nk de la aplicación.
  return (
    <div
      className="nk-maintenance-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        color: 'var(--nk-text)',
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: `url(${MAINTENANCE_BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay para legibilidad sobre el fondo */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(2px)' }}></div>

      {/* Textos flotantes decorativos (mismo recurso visual del home) */}
      <div className="op-floating-text" style={{ position: 'absolute', top: '5%', left: '-4%', fontSize: '11rem', transform: 'rotate(-14deg)', pointerEvents: 'none', opacity: 0.06, fontWeight: 900 }}>海賊</div>
      <div className="op-floating-text" style={{ position: 'absolute', bottom: '4%', right: '-4%', fontSize: '9rem', transform: 'rotate(10deg)', pointerEvents: 'none', opacity: 0.06, fontWeight: 900 }}>仲間</div>

      <div
        className="nk-maintenance-card nk-manga-border"
        style={{
          maxWidth: '640px',
          width: '100%',
          background: '#fff',
          padding: '50px 30px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '26px',
          position: 'relative',
          zIndex: 1,
          boxShadow: 'var(--nk-manga-shadow-lg, 8px 8px 0 #000)',
        }}
      >
        {/* Logo Nakama */}
        <div style={{ position: 'relative', width: '150px', height: '150px' }}>
          <Image
            src={MAINTENANCE_LOGO}
            alt="Nakama Bordados"
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>

        {/* Título (clon del cmp-title) */}
        <h1
          style={{
            fontFamily: 'Teko, sans-serif',
            fontSize: 'clamp(3rem, 9vw, 4.8rem)',
            color: 'var(--nk-primary, #e82e1e)',
            lineHeight: 0.95,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            textShadow: '3px 3px 0px #000',
          }}
        >
          👷 En mantenimiento 🔧
        </h1>

        {/* Mensaje */}
        <p style={{ fontSize: '1.15rem', lineHeight: 1.6, maxWidth: '520px', margin: 0, color: '#222', fontWeight: 500 }}>
          {maintenance.message || DEFAULT_MESSAGE}
        </p>
        <span style={{ color: 'var(--nk-primary, #e82e1e)', fontSize: '1.4rem', lineHeight: 1 }}>♥</span>

        {/* Redes sociales */}
        {socials.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', alignItems: 'center', borderTop: '2px dashed #ddd', paddingTop: '24px' }}>
            <h3 style={{ fontFamily: 'Teko, sans-serif', fontSize: '1.7rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111' }}>
              Síguenos para avisos
            </h3>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {socials.map(s => (
                <a
                  key={s.key}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nk-btn nk-manga-border"
                  style={{
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--nk-primary, #e82e1e)',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 800,
                    boxShadow: '4px 4px 0 #000',
                  }}
                >
                  <span className="material-icons-outlined">{s.icon}</span> {s.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Acceso administrador */}
        <div style={{ marginTop: '6px', borderTop: '1px dashed #ddd', paddingTop: '18px', width: '100%' }}>
          <p style={{ fontSize: '0.85rem', opacity: 0.55, margin: '0 0 10px 0', color: '#333' }}>¿Eres administrador?</p>
          <Link
            href="/mi-cuenta"
            className="nk-btn"
            style={{
              padding: '6px 16px',
              fontSize: '0.85rem',
              background: 'none',
              border: '2px solid #111',
              color: '#111',
              boxShadow: 'none',
              textDecoration: 'none',
            }}
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
