import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AccountSectionNav, { type AccountSectionId } from './AccountSectionNav';

function ControlledNav() {
  const [activeTab, setActiveTab] = useState<AccountSectionId>('dashboard');

  return (
    <>
      <AccountSectionNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div
        id={`account-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`account-tab-${activeTab}`}
      >
        Panel {activeTab}
      </div>
    </>
  );
}

describe('AccountSectionNav', () => {
  it('exposes the customer sections as an ARIA tablist without privileged work links', () => {
    render(
      <AccountSectionNav
        activeTab="dashboard"
        onTabChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('tablist', { name: 'Secciones de Mi Cuenta' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.queryByRole('tab', { name: /comisiones/i })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /resumen/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('does not expose the retired fixed commission prototype', () => {
    render(
      <AccountSectionNav
        activeTab="dashboard"
        onTabChange={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.queryByRole('tab', { name: /comisiones/i })).not.toBeInTheDocument();
  });

  it('activates and focuses tabs with arrow, Home and End keys', async () => {
    const user = userEvent.setup();
    render(<ControlledNav />);

    const summaryTab = screen.getByRole('tab', { name: /resumen/i });
    summaryTab.focus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /pedidos/i })).toHaveFocus();
    expect(screen.getByRole('tab', { name: /pedidos/i })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: /cuenta/i })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(summaryTab).toHaveFocus();
    expect(summaryTab).toHaveAttribute('aria-selected', 'true');
  });
});
