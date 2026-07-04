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

export default function MaintenanceWrapper({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const [maintenance, setMaintenance] = useState<MaintenanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('https://nakamabordados.com/?rest_route=/nakama/v1/maintenance')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (active && data) {
          setMaintenance(data);
        }
      })
      .catch(err => console.error('Error cargando estado de mantenimiento:', err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  const toggleMaintenance = async (newState: boolean) => {
    try {
      const res = await fetch('https://nakamabordados.com/?rest_route=/nakama/v1/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: newState }),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMaintenance(prev => (prev ? { ...prev, maintenanceMode: newState } : null));
        } else {
          alert('Error al guardar estado de mantenimiento.');
        }
      } else {
        alert('Error al conectar con la API de WordPress (Verifica tu sesión).');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    }
  };

  if (authLoading || (loading && !pathname.startsWith('/admin') && !pathname.startsWith('/api'))) {
    return (
      <div className="nk-loading-container" style={{ padding: '150px 0', textAlign: 'center', background: 'var(--nk-bg-body)', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div className="nk-spinner" style={{ margin: '0 auto 20px' }}></div>
        <p style={{ fontFamily: 'Teko', fontSize: '1.8rem', color: 'var(--nk-text)' }}>Cargando tripulación...</p>
      </div>
    );
  }

  // Bypass checks if:
  // 1. Maintenance mode is OFF
  // 2. The user is logged in and is an administrator
  // 3. The current path is an admin page or API route
  // 4. The current path is "/mi-cuenta" (so the admin can access the login form)
  const isBypassPath = pathname.startsWith('/admin') || pathname.startsWith('/api') || pathname === '/mi-cuenta';
  
  if (!maintenance?.maintenanceMode || isAdmin || isBypassPath) {
    return (
      <>
        {isAdmin && maintenance && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 99999,
            background: 'var(--nk-bg-card)',
            border: '2px solid var(--nk-border)',
            boxShadow: 'var(--nk-manga-shadow)',
            padding: '15px 20px',
            fontFamily: 'Inter, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '300px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-icons-outlined" style={{ color: maintenance.maintenanceMode ? 'var(--nk-primary)' : '#10B981' }}>
                {maintenance.maintenanceMode ? 'construction' : 'check_circle'}
              </span>
              <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                Mantenimiento: {maintenance.maintenanceMode ? 'ACTIVO' : 'INACTIVO'}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', margin: 0, opacity: 0.8 }}>
              {maintenance.maintenanceMode 
                ? 'Los clientes ven la pantalla de espera. Tú puedes ver el sitio normal.' 
                : 'El sitio está visible para todo el público en producción.'}
            </p>
            <button 
              onClick={() => toggleMaintenance(!maintenance.maintenanceMode)}
              className="nk-btn" 
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '0.8rem',
                background: maintenance.maintenanceMode ? '#10B981' : 'var(--nk-primary)',
                color: '#fff',
                border: 'none',
                boxShadow: 'none',
                cursor: 'pointer',
                fontWeight: 800,
                textTransform: 'uppercase'
              }}
            >
              {maintenance.maintenanceMode ? 'Desactivar Modo' : 'Activar Modo'}
            </button>
          </div>
        )}
        {children}
      </>
    );
  }

  // Render Maintenance Screen
  return (
    <div className="nk-maintenance-page" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--nk-bg-body)',
      padding: '40px 20px',
      color: 'var(--nk-text)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div className="nk-maintenance-card nk-manga-border" style={{
        maxWidth: '700px',
        width: '100%',
        background: 'var(--nk-bg-card)',
        padding: '50px 30px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '30px'
      }}>
        {/* Title */}
        <h1 style={{
          fontFamily: 'Teko, sans-serif',
          fontSize: '4.5rem',
          color: 'var(--nk-primary)',
          lineHeight: '0.9',
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          Sitio en Mantenimiento
        </h1>

        {/* Maintenance Image */}
        {maintenance.image && (
          <div className="nk-manga-border" style={{
            position: 'relative',
            width: '100%',
            height: '300px',
            overflow: 'hidden'
          }}>
            <Image
              src={maintenance.image}
              alt="Mantenimiento"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>
        )}

        {/* Message */}
        <p style={{
          fontSize: '1.2rem',
          lineHeight: '1.6',
          maxWidth: '550px',
          opacity: 0.9,
          margin: 0
        }}>
          {maintenance.message}
        </p>

        {/* Social Media Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', alignItems: 'center' }}>
          <h3 style={{
            fontFamily: 'Teko, sans-serif',
            fontSize: '1.8rem',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Síguenos para avisos
          </h3>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {maintenance.socialLinks.instagram && (
              <a href={maintenance.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="nk-btn" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-icons-outlined">photo_camera</span> Instagram
              </a>
            )}
            {maintenance.socialLinks.facebook && (
              <a href={maintenance.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="nk-btn" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-icons-outlined">facebook</span> Facebook
              </a>
            )}
            {maintenance.socialLinks.tiktok && (
              <a href={maintenance.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="nk-btn" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-icons-outlined">smart_display</span> TikTok
              </a>
            )}
          </div>
        </div>

        {/* Admin Login Shortcut */}
        <div style={{ marginTop: '20px', borderTop: '1px dashed var(--nk-border)', paddingTop: '20px', width: '100%' }}>
          <p style={{ fontSize: '0.9rem', opacity: 0.6, margin: '0 0 10px 0' }}>¿Eres administrador?</p>
          <Link href="/mi-cuenta" className="nk-btn" style={{
            padding: '5px 15px',
            fontSize: '0.85rem',
            background: 'none',
            border: '2px solid var(--nk-border)',
            color: 'var(--nk-text)',
            boxShadow: 'none'
          }}>
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
