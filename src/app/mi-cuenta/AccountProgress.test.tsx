import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AccountProgress from './AccountProgress';

const steps = [
  { key: 'queued', label: 'En espera', icon: 'schedule' },
  { key: 'making', label: 'Fabricando', icon: 'content_cut' },
  { key: 'sent', label: 'Enviado', icon: 'local_shipping' },
];

describe('AccountProgress', () => {
  it('marks reached and current steps without relying on color alone', () => {
    render(<AccountProgress steps={steps} currentIndex={1} label="Progreso del pedido" />);

    const list = screen.getByRole('list', { name: 'Progreso del pedido' });
    const items = screen.getAllByRole('listitem');

    expect(list).toBeInTheDocument();
    expect(items[0]).toHaveClass('is-done');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[1]).toHaveAccessibleName(/fabricando.*paso actual/i);
    expect(items[2]).not.toHaveClass('is-done');
  });

  it('announces a problem on the current step', () => {
    render(
      <AccountProgress
        steps={steps}
        currentIndex={1}
        label="Estado del envío"
        hasProblem
      />,
    );

    const current = screen.getAllByRole('listitem')[1];
    expect(current).toHaveClass('is-problem');
    expect(current).toHaveAccessibleName(/requiere atención/i);
  });
});
