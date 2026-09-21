import { describe, expect, it } from 'vitest';
import {
  chooseAffiliateAttribution,
  parseStoredAffiliateAttribution,
  type AffiliateAttribution,
} from './affiliate-attribution';

const referral: AffiliateAttribution = {
  code: 'NICO',
  source: 'referral',
  expiresAt: '2026-10-19T12:00:00.000Z',
  discountPercentage: 10,
};

describe('affiliate attribution storage', () => {
  it('accepts only a non-expired normalized attribution', () => {
    expect(parseStoredAffiliateAttribution(JSON.stringify(referral), Date.parse('2026-09-19T12:00:00Z'))).toEqual(referral);
    expect(parseStoredAffiliateAttribution(JSON.stringify(referral), Date.parse('2026-10-20T12:00:00Z'))).toBeNull();
    expect(parseStoredAffiliateAttribution('{"code":"NICO","source":"forged"}', Date.now())).toBeNull();
    expect(parseStoredAffiliateAttribution('not-json', Date.now())).toBeNull();
  });

  it('keeps a manual code over an incoming referral', () => {
    const manual: AffiliateAttribution = { ...referral, code: 'MANUAL', source: 'manual' };
    expect(chooseAffiliateAttribution(manual, referral)).toEqual(manual);
  });

  it('allows a new valid referral to replace an older referral', () => {
    const newer: AffiliateAttribution = { ...referral, code: 'ROBIN' };
    expect(chooseAffiliateAttribution(referral, newer)).toEqual(newer);
  });
});

