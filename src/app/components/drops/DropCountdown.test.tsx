import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DropCountdown from './DropCountdown';

describe('DropCountdown', () => {
  it('renders four labelled, tabular countdown units from server time', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-15T12:00:00Z'));
    render(
      <DropCountdown
        launchAt="2026-10-15T18:01:02Z"
        serverNow="2026-10-15T18:00:00Z"
        labels={{ days: 'Días', hours: 'Horas', minutes: 'Min', seconds: 'Seg' }}
      />,
    );
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
    expect(screen.getByText('Días')).toBeInTheDocument();
    expect(screen.getByTestId('drop-countdown')).toHaveClass('dropCountdown');
    vi.restoreAllMocks();
  });
});
