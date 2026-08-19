export interface QuotePaymentFields {
  nakamaQuotePaymentEligible?: unknown;
  databaseId?: number;
  orderKey?: string;
}

interface QuotePaymentEligibilityNode {
  id?: unknown;
  nakamaQuotePaymentEligible?: unknown;
}

export function mergeQuotePaymentEligibility<T extends { id: string }>(
  orders: readonly T[],
  nodes: unknown,
): Array<T & { nakamaQuotePaymentEligible: boolean }> {
  const eligibleById = new Map<string, boolean>();

  if (Array.isArray(nodes)) {
    for (const rawNode of nodes) {
      const node = rawNode as QuotePaymentEligibilityNode;
      if (typeof node?.id === 'string') {
        eligibleById.set(node.id, node.nakamaQuotePaymentEligible === true);
      }
    }
  }

  return orders.map(order => ({
    ...order,
    nakamaQuotePaymentEligible: eligibleById.get(order.id) === true,
  }));
}

export function canShowQuotePaymentActions(order: QuotePaymentFields): boolean {
  return order.nakamaQuotePaymentEligible === true
    && Number.isInteger(order.databaseId)
    && Number(order.databaseId) > 0
    && typeof order.orderKey === 'string'
    && order.orderKey.length > 0;
}
