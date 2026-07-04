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
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadStatus = React.useCallback(() => {
    setFailed(false);
    setEnabled(null);
    // nkcb: cache-buster; LiteSpeed cachea las respuestas del API y podría
    // servir un estado viejo (o un 404 de antes de instalar el plugin).
    fetch(`${MAINTENANCE_ENDPOINT}&nkcb=${Date.now()}`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status} (¿plugin nakama-products-api v1.3+ instalado en WP?)`))))
      .then(data => setEnabled(!!data?.maintenanceMode))
      .catch(err => {
        console.warn('No se pudo leer estado de mantenimiento:', err);
        setFailed(true);
      });
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const toggle = async () => {
    if (failed) {
      loadStatus();
      return;
    }
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
      disabled={(enabled === null && !failed) || saving}
      title={
        failed
          ? 'No responde el endpoint de mantenimiento en WordPress (¿plugin nakama-products-api v1.3+ activo?). Clic para reintentar.'
          : enabled === null
            ? 'Consultando estado…'
            : enabled
              ? 'El sitio muestra la pantalla de mantenimiento a los clientes'
              : 'El sitio está visible al público'
      }
      style={{
        // Hereda el estilo base .nk-admin-btn; solo se pinta rojo cuando el
        // modo mantenimiento está ACTIVO.
        background: enabled ? 'var(--nk-primary)' : undefined,
        color: enabled ? '#fff' : undefined,
        opacity: (enabled === null && !failed) || saving ? 0.6 : 1,
        cursor: (enabled === null && !failed) || saving ? 'wait' : 'pointer',
      }}
    >
      <span className="material-icons-outlined">{failed ? 'sync_problem' : 'construction'}</span>
      {failed
        ? 'Mantenimiento: sin conexión (reintentar)'
        : enabled === null
          ? 'Consultando estado…'
          : saving
            ? 'Guardando…'
            : `Mantenimiento: ${enabled ? 'ACTIVO' : 'INACTIVO'}`}
    </button>
  );
}
