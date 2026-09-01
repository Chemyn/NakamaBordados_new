import type { ProdUploadResult } from './production-api';

interface NamedFile {
  name: string;
}

export interface ProductionPdfUploadFailure {
  fileName: string;
  message: string;
}

export interface ProductionPdfBatchResult {
  uploaded: number;
  failures: ProductionPdfUploadFailure[];
}

function rejectedMessage(result: ProdUploadResult): string {
  let message = result.message || 'El servidor rechazó el archivo.';
  if (result.suggestions?.length) {
    message += ` Sugerencias: ${result.suggestions.join(' · ')}`;
  }
  return message;
}

/**
 * El servidor recibe un PDF por petición. Este coordinador conserva ese
 * contrato, continúa cuando un archivo falla e informa el avance del lote.
 */
export async function uploadProductionPdfBatch<TFile extends NamedFile>(
  files: readonly TFile[],
  upload: (file: TFile) => Promise<ProdUploadResult>,
  onProgress?: (done: number, total: number) => void,
): Promise<ProductionPdfBatchResult> {
  const failures: ProductionPdfUploadFailure[] = [];
  let uploaded = 0;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    try {
      const result = await upload(file);
      if (result.success) {
        uploaded += 1;
      } else {
        failures.push({ fileName: file.name, message: rejectedMessage(result) });
      }
    } catch (error) {
      failures.push({
        fileName: file.name,
        message: error instanceof Error ? error.message : 'Error de red al subir el PDF.',
      });
    } finally {
      onProgress?.(index + 1, files.length);
    }
  }

  return { uploaded, failures };
}
