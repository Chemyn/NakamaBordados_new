import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchGraphQL } from './graphql-client';

function graphQLResponse(errors: Array<{ message: string }>): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue({ data: null, errors }),
  } as unknown as Response;
}

describe('fetchGraphQL optional schema fields', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not emit console errors when an explicitly optional field is unavailable', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(graphQLResponse([
      { message: 'Cannot query field "nakamaQuotePaymentEligible" on type "Order".' },
    ])));

    const result = await fetchGraphQL(
      'query OptionalQuoteField { customer { orders { nodes { nakamaQuotePaymentEligible } } } }',
      {},
      {},
      { optionalSchemaFields: ['nakamaQuotePaymentEligible'] },
    );

    expect(result.errors).toHaveLength(1);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('continues reporting unrelated GraphQL errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(graphQLResponse([
      { message: 'Cannot query field "unexpectedField" on type "Order".' },
    ])));

    await fetchGraphQL(
      'query BrokenField { customer { orders { nodes { unexpectedField } } } }',
      {},
      {},
      { optionalSchemaFields: ['nakamaQuotePaymentEligible'] },
    );

    expect(consoleError).toHaveBeenCalledTimes(3);
  });
});
