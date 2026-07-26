import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteProductionPdf, listProductionPdfs, uploadProductionPdf, type ProdUploadResult } from '@/lib/api';

export const PDFS_KEY = 'production-pdfs';

interface UploadInput {
  uri: string;
  fileName: string;
}

/** Patrones en PDF, uno por SKU. El servidor valida el nombre del archivo. */
export function usePdfs() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [PDFS_KEY] });

  const list = useQuery({
    queryKey: [PDFS_KEY],
    queryFn: listProductionPdfs,
  });

  const upload = useMutation<ProdUploadResult, Error, UploadInput>({
    mutationFn: ({ uri, fileName }) => uploadProductionPdf(uri, fileName),
    onSuccess: (result) => {
      // Un 400 con sugerencias también llega aquí: solo se recarga si guardó.
      if (result.success) void invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteProductionPdf(id),
    onSuccess: () => void invalidate(),
  });

  return { list, upload, remove };
}
