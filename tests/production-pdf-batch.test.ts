import { describe, expect, it, vi } from 'vitest';

import { uploadProductionPdfBatch } from '@/lib/production-pdf-batch';

describe('uploadProductionPdfBatch', () => {
  it('uploads every selected PDF in order and reports progress', async () => {
    const files = [{ name: 'A.pdf' }, { name: 'B.pdf' }, { name: 'C.pdf' }];
    const upload = vi.fn(async (file: { name: string }) => ({
      success: true,
      product_name: file.name,
    }));
    const progress = vi.fn();

    const result = await uploadProductionPdfBatch(files, upload, progress);

    expect(upload.mock.calls.map(([file]) => file.name)).toEqual(['A.pdf', 'B.pdf', 'C.pdf']);
    expect(progress.mock.calls).toEqual([[1, 3], [2, 3], [3, 3]]);
    expect(result).toEqual({ uploaded: 3, failures: [] });
  });

  it('continues after rejected responses and network errors', async () => {
    const files = [{ name: 'OK.pdf' }, { name: 'BAD.pdf' }, { name: 'OFFLINE.pdf' }];
    const upload = vi
      .fn<(file: { name: string }) => Promise<{ success: boolean; message?: string; suggestions?: string[] }>>()
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, message: 'SKU desconocido.', suggestions: ['BAG-001'] })
      .mockRejectedValueOnce(new Error('Sin conexión'));

    const result = await uploadProductionPdfBatch(files, upload);

    expect(upload).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      uploaded: 1,
      failures: [
        { fileName: 'BAD.pdf', message: 'SKU desconocido. Sugerencias: BAG-001' },
        { fileName: 'OFFLINE.pdf', message: 'Sin conexión' },
      ],
    });
  });
});
