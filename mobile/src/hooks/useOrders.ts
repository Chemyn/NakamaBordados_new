import { useInfiniteQuery } from '@tanstack/react-query';

import { fetchProductionOrders, type ProdCard, type ProdColumn } from '@/lib/api';

export const ORDERS_KEY = 'production-orders';

/**
 * Una columna del tablero. El servidor pagina de 5 en 5 y responde `has_more`,
 * así que la lista crece al llegar al final en vez de con un botón "Ver más".
 */
export function useOrders(column: ProdColumn) {
  const query = useInfiniteQuery({
    queryKey: [ORDERS_KEY, column],
    queryFn: ({ pageParam }) => fetchProductionOrders(column, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.page + 1 : undefined),
  });

  const orders: ProdCard[] = query.data?.pages.flatMap((page) => page.orders) ?? [];
  const hasMore = query.hasNextPage;

  return {
    ...query,
    orders,
    /** Conteo cargado; con `hasMore` la UI lo muestra como "N+". */
    count: orders.length,
    hasMore,
  };
}
