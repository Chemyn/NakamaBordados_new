import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteProductionPdf, listProductionPdfs } from '@/lib/api';

import { ORDER_DETAIL_KEY } from './useOrderDetail';

export const PRODUCTION_PDFS_KEY = 'production-pdfs';

export function useProductionPdfs() {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [PRODUCTION_PDFS_KEY] }),
      queryClient.invalidateQueries({ queryKey: [ORDER_DETAIL_KEY] }),
    ]);
  };

  const list = useQuery({
    queryKey: [PRODUCTION_PDFS_KEY],
    queryFn: listProductionPdfs,
  });

  const remove = useMutation({
    mutationFn: deleteProductionPdf,
    onSuccess: refresh,
  });

  return { list, remove, refresh };
}
