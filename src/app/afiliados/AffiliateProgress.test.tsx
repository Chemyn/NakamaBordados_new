import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AffiliateProgress from './AffiliateProgress';

vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => ({
    'affiliates.mission.progressKicker': 'Meta del próximo mes',
    'affiliates.mission.progressTitle': 'Tu impacto mensual',
    'affiliates.mission.currentReward': 'Recompensa actual',
    'affiliates.mission.oneProduct': '1 prenda',
    'affiliates.mission.manyProducts': '{count} prendas',
    'affiliates.mission.remaining': 'Te faltan {amount} para desbloquear {count} prendas.',
    'affiliates.mission.maxReached': '¡Meta máxima alcanzada para el siguiente mes!',
    'affiliates.mission.noCarry': 'El cupo se recalcula cada mes y no se acumula.',
    'affiliates.mission.milestones': 'Metas de prendas del mes',
  }[key] || key) }),
}));

describe('AffiliateProgress', () => {
  it('announces the exact current progress, next target, and reward', () => {
    render(<AffiliateProgress progress={{
      salesMxn: 7500,
      tier: 1,
      quota: 1,
      next: { thresholdMxn: 10000, remainingMxn: 2500, rewardQuota: 2 },
      milestones: {
        second: { thresholdMxn: 10000, remainingMxn: 2500, reached: false, progressPercent: 75 },
        third: { thresholdMxn: 30000, remainingMxn: 22500, reached: false, progressPercent: 25 },
      },
    }} />);

    expect(screen.getByText('1 prenda')).toBeVisible();
    expect(screen.getByText(/Te faltan \$2,500.00 para desbloquear 2 prendas/)).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '7500');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '10000');
    expect(screen.getByText(/no se acumula/i)).toBeVisible();
    expect(screen.getByRole('list', { name: 'Metas de prendas del mes' })).toHaveTextContent('$10,000.00');
    expect(screen.getByRole('list', { name: 'Metas de prendas del mes' })).toHaveTextContent('$30,000.00');
  });

  it('shows the maximum three-product achievement without a false next goal', () => {
    render(<AffiliateProgress progress={{
      salesMxn: 30000, tier: 3, quota: 3, next: null,
      milestones: {
        second: { thresholdMxn: 10000, remainingMxn: 0, reached: true, progressPercent: 100 },
        third: { thresholdMxn: 30000, remainingMxn: 0, reached: true, progressPercent: 100 },
      },
    }} />);
    expect(screen.getAllByText('3 prendas')[0]).toBeVisible();
    expect(screen.getByText(/Meta máxima alcanzada/i)).toBeVisible();
  });
});
