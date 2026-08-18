'use client';

import { useMemo, useRef } from 'react';

export type AccountSectionId =
  | 'dashboard'
  | 'orders'
  | 'tracking'
  | 'addresses'
  | 'profile'
  | 'commissions';

interface AccountSection {
  id: AccountSectionId;
  label: string;
  icon: string;
}

const CUSTOMER_SECTIONS: AccountSection[] = [
  { id: 'dashboard', label: 'Resumen', icon: 'dashboard' },
  { id: 'orders', label: 'Pedidos', icon: 'shopping_bag' },
  { id: 'tracking', label: 'Rastreo', icon: 'local_shipping' },
  { id: 'addresses', label: 'Dirección', icon: 'location_on' },
  { id: 'profile', label: 'Cuenta', icon: 'manage_accounts' },
];

const COMMISSIONS_SECTION: AccountSection = {
  id: 'commissions',
  label: 'Comisiones',
  icon: 'payments',
};

interface AccountSectionNavProps {
  activeTab: AccountSectionId;
  hasCommissions: boolean;
  onTabChange: (tab: AccountSectionId) => void;
}

export default function AccountSectionNav({
  activeTab,
  hasCommissions,
  onTabChange,
}: AccountSectionNavProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const sections = useMemo(
    () => hasCommissions ? [...CUSTOMER_SECTIONS, COMMISSIONS_SECTION] : CUSTOMER_SECTIONS,
    [hasCommissions],
  );

  const activateAt = (index: number) => {
    const nextIndex = (index + sections.length) % sections.length;
    const nextSection = sections[nextIndex];
    onTabChange(nextSection.id);
    tabRefs.current[nextIndex]?.focus();
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
        nextIndex = sections.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    activateAt(nextIndex);
  };

  return (
    <>
    <nav className="nk-account-section-nav" aria-label="Navegación de la cuenta">
      <div className="nk-account-tabs" role="tablist" aria-label="Secciones de Mi Cuenta">
        {sections.map((section, index) => {
          const selected = activeTab === section.id;
          return (
            <button
              key={section.id}
              ref={(element) => { tabRefs.current[index] = element; }}
              id={`account-tab-${section.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`account-panel-${section.id}`}
              tabIndex={selected ? 0 : -1}
              className={`nk-account-tab${selected ? ' active' : ''}`}
              onClick={() => onTabChange(section.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <span className="material-icons-outlined" aria-hidden="true">{section.icon}</span>
              <span>{section.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
      <style jsx>{`
        .nk-account-section-nav {
          width: 100%;
        }

        .nk-account-tabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .nk-account-tab {
          min-width: 0;
          min-height: 56px;
          padding: 8px 4px;
          border: 2px solid var(--nk-border);
          border-radius: 4px;
          background: var(--nk-bg-wrapper);
          color: var(--nk-text-main);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          font-family: 'Teko', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          line-height: 1;
          text-transform: uppercase;
          overflow-wrap: anywhere;
          transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease;
        }

        .nk-account-tab .material-icons-outlined {
          font-size: 20px;
        }

        .nk-account-tab.active {
          background: var(--nk-primary);
          border-color: var(--nk-primary);
          color: var(--nk-bg-body);
        }

        .nk-account-tab:hover:not(.active) {
          border-color: var(--nk-primary);
          color: var(--nk-primary);
        }

        .nk-account-tab:focus-visible {
          outline: 3px solid var(--nk-primary);
          outline-offset: 3px;
        }

        @media (min-width: 720px) and (max-width: 991px) {
          .nk-account-tabs {
            grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
          }
        }

        @media (min-width: 992px) {
          .nk-account-tabs {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .nk-account-tab {
            min-height: 48px;
            width: 100%;
            padding: 10px 14px;
            flex-direction: row;
            justify-content: flex-start;
            gap: 10px;
            font-size: 1.3rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nk-account-tab {
            transition: none;
          }
        }
      `}</style>
    </>
  );
}
