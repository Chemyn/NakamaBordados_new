import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canShowQuotePaymentActions,
  mergeQuotePaymentEligibility,
} from '../src/lib/quote-payment.ts';

test('merges the server decision by order ID and fails closed for missing nodes', () => {
  const orders = [
    { id: 'order-1', databaseId: 1, orderKey: 'key-1' },
    { id: 'order-2', databaseId: 2, orderKey: 'key-2' },
    { id: 'order-3', databaseId: 3, orderKey: 'key-3' },
  ];

  const merged = mergeQuotePaymentEligibility(orders, [
    { id: 'order-1', nakamaQuotePaymentEligible: true },
    { id: 'order-2', nakamaQuotePaymentEligible: false },
  ]);

  assert.deepEqual(
    merged.map(order => order.nakamaQuotePaymentEligible),
    [true, false, false],
  );
  assert.deepEqual(
    mergeQuotePaymentEligibility(orders, undefined).map(order => order.nakamaQuotePaymentEligible),
    [false, false, false],
  );
});

test('shows quote payment actions only for an exact true server decision with payment identifiers', () => {
  assert.equal(canShowQuotePaymentActions({
    nakamaQuotePaymentEligible: true,
    databaseId: 10,
    orderKey: 'wc_order_key',
  }), true);

  for (const nakamaQuotePaymentEligible of [false, undefined, null, 1, 'true']) {
    assert.equal(canShowQuotePaymentActions({
      nakamaQuotePaymentEligible,
      databaseId: 10,
      orderKey: 'wc_order_key',
    }), false);
  }

  assert.equal(canShowQuotePaymentActions({
    nakamaQuotePaymentEligible: true,
    databaseId: 0,
    orderKey: 'wc_order_key',
  }), false);
  assert.equal(canShowQuotePaymentActions({
    nakamaQuotePaymentEligible: true,
    databaseId: 10,
    orderKey: '',
  }), false);
});
