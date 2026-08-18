import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TrackingFeedback from './TrackingFeedback';

describe('TrackingFeedback', () => {
  it('keeps the last tracking result visible while offering an error retry', async () => {
    const retry = vi.fn();
    const user = userEvent.setup();

    render(
      <TrackingFeedback error="No pudimos consultar la paquetería." loading={false} onRetry={retry}>
        <p>En tránsito por Hermosillo</p>
      </TrackingFeedback>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos consultar la paquetería.');
    expect(screen.getByText('En tránsito por Hermosillo')).toBeVisible();
    expect(Array.from(document.querySelectorAll('style')).some((style) =>
      style.textContent?.includes('var(--nk-danger)'))).toBe(true);

    await user.click(screen.getByRole('button', { name: /reintentar rastreo/i }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('announces a tracking refresh without hiding existing content', () => {
    render(
      <TrackingFeedback error="" loading onRetry={vi.fn()}>
        <p>Guía generada</p>
      </TrackingFeedback>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Actualizando rastreo');
    expect(screen.getByText('Guía generada')).toBeVisible();
  });
});
