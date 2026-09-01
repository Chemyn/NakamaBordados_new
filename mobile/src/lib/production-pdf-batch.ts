import type { ProdUploadFile, ProdUploadResult } from './api';

export interface MobilePdfUploadFailure {
  fileName: string;
  message: string;
}

export interface MobilePdfBatchResult {
  uploaded: number;
  failures: MobilePdfUploadFailure[];
}

function rejectedMessage(result: ProdUploadResult): string {
  let message = result.message || 'El servidor rechazó el archivo.';
  if (result.suggestions?.length) {
    message += ` Sugerencias: ${result.suggestions.join(' · ')}`;
  }
  return message;
}

/** Sube uno a uno para conservar el endpoint actual y continuar tras un fallo. */
export async function uploadProductionPdfBatch(
  files: readonly ProdUploadFile[],
  upload: (file: ProdUploadFile) => Promise<ProdUploadResult>,
  onProgress?: (done: number, total: number) => void,
): Promise<MobilePdfBatchResult> {
  const failures: MobilePdfUploadFailure[] = [];
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
