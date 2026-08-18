import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import AuthModeTabs, { type AuthMode } from './AuthModeTabs';

function ControlledAuthTabs() {
  const [mode, setMode] = useState<AuthMode>('login');
  return <AuthModeTabs mode={mode} onChange={setMode} />;
}

describe('AuthModeTabs', () => {
  it('selects login and registration with a click', async () => {
    const user = userEvent.setup();
    render(<ControlledAuthTabs />);

    const register = screen.getByRole('tab', { name: /crear cuenta/i });
    await user.click(register);

    expect(register).toHaveAttribute('aria-selected', 'true');
    expect(register).toHaveAttribute('aria-controls', 'auth-panel-register');
  });

  it('wraps arrow focus and supports Home and End', async () => {
    const user = userEvent.setup();
    render(<ControlledAuthTabs />);

    const login = screen.getByRole('tab', { name: /ingresar/i });
    const register = screen.getByRole('tab', { name: /crear cuenta/i });
    login.focus();

    await user.keyboard('{ArrowRight}');
    expect(register).toHaveFocus();
    expect(register).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowRight}');
    expect(login).toHaveFocus();

    await user.keyboard('{End}');
    expect(register).toHaveFocus();

    await user.keyboard('{Home}');
    expect(login).toHaveFocus();
  });
});
