import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AffiliateReferralCapture from './AffiliateReferralCapture';

const mocks = {
  applyAffiliateCode: vi.fn(),
  promotionReady: true,
};

vi.mock('../context/CartContext', () => ({
  useCart: () => ({
    promotionReady: mocks.promotionReady,
    applyAffiliateCode: mocks.applyAffiliateCode,
  }),
}));

describe('AffiliateReferralCapture', () => {
  beforeEach(() => {
    mocks.applyAffiliateCode.mockReset().mockResolvedValue({ success: true });
    mocks.promotionReady = true;
    window.history.replaceState(null, '', '/?ref=nico&utm_source=creator');
  });

  it('validates a referral after promotion storage is hydrated and cleans only ref from the URL', async () => {
    render(<AffiliateReferralCapture />);

    await waitFor(() => expect(mocks.applyAffiliateCode).toHaveBeenCalledWith('nico', 'referral'));
    expect(window.location.search).toBe('?utm_source=creator');
  });

  it('waits for the cart provider before consuming the reference', () => {
    mocks.promotionReady = false;
    render(<AffiliateReferralCapture />);
    expect(mocks.applyAffiliateCode).not.toHaveBeenCalled();
    expect(window.location.search).toContain('ref=nico');
  });
});

