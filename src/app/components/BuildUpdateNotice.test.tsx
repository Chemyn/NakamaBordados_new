import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BuildUpdateNotice from './BuildUpdateNotice';

describe('BuildUpdateNotice', () => {
  it('offers a deliberate refresh when a newer deployment is available', async () => {
    const onRefresh = vi.fn();
    const fetcher = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ buildId: 'new-build' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));

    render(<BuildUpdateNotice currentBuildId="old-build" fetcher={fetcher} onRefresh={onRefresh} />);

    expect(await screen.findByRole('status')).toHaveTextContent('Hay una nueva versión disponible');
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/app/web-version.json?'), {
      cache: 'no-store',
    });
  });

  it('stays out of the way when the deployed version matches', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ buildId: 'same-build' })));

    render(<BuildUpdateNotice currentBuildId="same-build" fetcher={fetcher} />);

    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
