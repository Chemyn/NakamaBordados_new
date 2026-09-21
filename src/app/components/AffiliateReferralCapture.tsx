'use client';

import { useEffect } from 'react';
import { useCart } from '../context/CartContext';

export default function AffiliateReferralCapture() {
  const { promotionReady, applyAffiliateCode } = useCart();

  useEffect(() => {
    if (!promotionReady) return;

    const params = new URLSearchParams(window.location.search);
    const referral = params.get('ref');
    if (!referral) return;

    let active = true;
    void applyAffiliateCode(referral, 'referral').finally(() => {
      if (!active) return;
      params.delete('ref');
      const query = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    });

    return () => { active = false; };
  }, [applyAffiliateCode, promotionReady]);

  return null;
}

