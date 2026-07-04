'use client';

import React, { useEffect, useState } from 'react';

const MAINTENANCE_ENDPOINT = 'https://nakamabordados.com/?rest_route=/nakama/v1/maintenance';

/**
 * Toggle de Modo Mantenimiento (solo se monta en ADMIN TOOLS de mi-cuenta,
 * bajo el botón de Escritorio WordPress). Lee el estado del endpoint público
 * y lo cambia vía POST autenticado con el JWT del admin.
 */
export default function MaintenanceToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(MAINTENANCE_ENDPOINT)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (active && data) setEnabled(!!data.maintenanceMode);
      })
      .catch(err => console.warn('No se pudo leer estado de mantenimiento:', err));
    return () => {
      active = false;
    };
  }, []);

  const toggle = async () => {
    if (enabled === null || saving) return;
    const newState = !enabled;
    const label = newState ? 'ACTIVAR' : 'DESACTIVAR';
    if (!window.confirm(`¿Seguro que quieres ${label} el modo mantenimiento? ${newState ? 'Los clientes verán la pantalla de espera.' : 'El sitio quedará visible para todo el público.'}`)) {
      return;
    }
    setSaving(true);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      const token = typeof window !== 'undefined' ? localStorage.getItem('wp-jwt') : null;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(MAINTENANCE_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({ enabled: newState }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEnabled(newState);
        } else {
          alert('Error al guardar estado de mantenimiento.');
        }
      } else {
        alert('Error al conectar con la API de WordPress (verifica tu sesión).');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      className="nk-admin-btn"
      onClick={toggle}
      disabled={enabled === null || saving}
      title={enabled === null ? 'Consultando estado…' : enabled ? 'El sitio muestra la pantalla de mantenimiento a los clientes' : 'El sitio está visible al público'}
      style={{
        background: enabled ? 'var(--nk-primary)' : 'transparent',
        color: enabled ? '#fff' : 'inherit',
        border: enabled ? '2px solid var(--nk-primary)' : undefined,
        opacity: enabled === null || saving ? 0.6 : 1,
        cursor: enabled === null || saving ? 'wait' : 'pointer',
      }}
    >
      <span className="material-icons-outlined">construction</span>
      {enabled === null
        ? 'Mantenimiento…'
        : saving
          ? 'Guardando…'
          : `Mantenimiento: ${enabled ? 'ACTIVO' : 'INACTIVO'}`}
    </button>
  );
}
