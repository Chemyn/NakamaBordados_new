import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchProductionOrderDetail,
  finishProductionOrder,
  takeProductionOrder,
  validateProductionItem,
  type ProdOrderDetail,
} from '@/lib/api';

import { ORDERS_KEY } from './useOrders';

export const ORDER_DETAIL_KEY = 'production-order';

interface ValidateInput {
  itemId: number;
  validated: boolean;
}

/**
 * Detalle de un pedido y las tres acciones del operador. Cualquiera de ellas
 * invalida el tablero porque mueve la tarjeta de columna o cambia su progreso.
 */
export function useOrderDetail(orderId: number) {
  const queryClient = useQueryClient();
  const detailKey = [ORDER_DETAIL_KEY, orderId];

  const detail = useQuery({
    queryKey: detailKey,
    queryFn: () => fetchProductionOrderDetail(orderId),
    enabled: Number.isFinite(orderId) && orderId > 0,
  });

  const invalidateBoard = () => queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });

  const setValidated = (itemId: number, validated: boolean) => {
    const current = queryClient.getQueryData<ProdOrderDetail>(detailKey);
    if (!current) return;
    queryClient.setQueryData<ProdOrderDetail>(detailKey, {
      ...current,
      products: current.products.map((product) =>
        product.item_id === itemId ? { ...product, validated } : product,
      ),
    });
  };

  const validate = useMutation({
    mutationFn: ({ itemId, validated }: ValidateInput) =>
      validateProductionItem(orderId, itemId, validated),

    // El check debe responder al instante: se pinta primero y se revierte si falla.
    onMutate: async ({ itemId, validated }: ValidateInput) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      setValidated(itemId, validated);
    },

    // Se revierte solo esa línea, no el pedido entero: el operador puede haber
    // marcado otro producto mientras esta petición estaba en vuelo.
    onError: (_error, { itemId, validated }) => {
      setValidated(itemId, !validated);
      void queryClient.invalidateQueries({ queryKey: detailKey });
    },

    // El progreso que devuelve el servidor manda sobre el cálculo local.
    onSuccess: (progress) => {
      const current = queryClient.getQueryData<ProdOrderDetail>(detailKey);
      if (current) queryClient.setQueryData<ProdOrderDetail>(detailKey, { ...current, progress });
      void invalidateBoard();
    },
  });

  const take = useMutation({
    mutationFn: () => takeProductionOrder(orderId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: detailKey });
      await invalidateBoard();
    },
  });

  const finish = useMutation({
    mutationFn: () => finishProductionOrder(orderId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: detailKey });
      await invalidateBoard();
    },
  });

  return { detail, validate, take, finish };
}
