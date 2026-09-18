import { describe, expect, it } from 'vitest';
import {
  countdownParts,
  createServerClock,
  latestPresaleLaunch,
  mapDropsByProduct,
} from './drops';
import type { DropCampaign } from '@/types/drop';

const campaign: DropCampaign = {
  id: 7,
  productId: 41,
  productSlug: 'sudadera-akira',
  status: 'presale',
  launchAt: '2026-10-15T18:00:00Z',
  serverNow: '2026-10-15T17:59:00Z',
  unlimited: false,
  remaining: 4,
  timerPosition: 'overlay',
  prices: [{ itemId: 41, presalePrice: '899.00', launchPrice: '1199.00' }],
};

describe('Drops time and cart domain', () => {
  it('uses server time instead of trusting the device clock', () => {
    const clock = createServerClock('2026-10-15T17:59:00Z', Date.parse('2026-10-15T12:00:00Z'));
    expect(clock.now(Date.parse('2026-10-15T12:00:30Z'))).toBe(Date.parse('2026-10-15T17:59:30Z'));
  });

  it('returns stable four-part countdown values and clamps at zero', () => {
    expect(countdownParts(Date.parse('2026-10-16T20:02:03Z'), Date.parse('2026-10-15T18:00:00Z'))).toEqual({ days: 1, hours: 2, minutes: 2, seconds: 3, complete: false });
    expect(countdownParts(Date.parse('2026-10-15T17:00:00Z'), Date.parse('2026-10-15T18:00:00Z'))).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, complete: true });
  });

  it('maps campaigns by both numeric product id and slug', () => {
    const map = mapDropsByProduct([campaign]);
    expect(map.get('41')).toBe(campaign);
    expect(map.get('sudadera-akira')).toBe(campaign);
  });

  it('finds the latest launch only when the cart contains a presale', () => {
    expect(latestPresaleLaunch([{ product: { drop: campaign } }, { product: {} }])).toBe('2026-10-15T18:00:00Z');
    expect(latestPresaleLaunch([{ product: {} }])).toBeNull();
  });
});
