'use client';

import { useRef } from 'react';

export type AuthMode = 'login' | 'register';

const AUTH_MODES: Array<{ id: AuthMode; label: string }> = [
  { id: 'login', label: 'Ingresar' },
  { id: 'register', label: 'Crear cuenta' },
];

interface AuthModeTabsProps {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
}

export default function AuthModeTabs({ mode, onChange }: AuthModeTabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const activateAt = (index: number) => {
    const nextIndex = (index + AUTH_MODES.length) % AUTH_MODES.length;
    onChange(AUTH_MODES[nextIndex].id);
    refs.current[nextIndex]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = index + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = index - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = AUTH_MODES.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    activateAt(nextIndex);
  };

  return (
    <>
      <div className="nk-auth-tabs" role="tablist" aria-label="Acceso a Mi Cuenta">
        {AUTH_MODES.map((authMode, index) => {
          const selected = mode === authMode.id;
          return (
            <button
              key={authMode.id}
              ref={(element) => { refs.current[index] = element; }}
              id={`auth-tab-${authMode.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`auth-panel-${authMode.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(authMode.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {authMode.label}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .nk-auth-tabs {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin: 0 0 20px;
        }

        .nk-auth-tabs button {
          min-height: 48px;
          padding: 8px;
          border: 2px solid var(--nk-border);
          background: var(--nk-bg-wrapper);
          color: var(--nk-text-main);
          font-family: 'Teko', sans-serif;
          font-size: 1.2rem;
          font-weight: 700;
          text-transform: uppercase;
          cursor: pointer;
        }

        .nk-auth-tabs button[aria-selected='true'] {
          border-color: var(--nk-primary);
          background: var(--nk-primary);
          color: var(--nk-bg-body);
        }

        .nk-auth-tabs button:focus-visible {
          outline: 3px solid var(--nk-primary);
          outline-offset: 3px;
        }
      `}</style>
    </>
  );
}
