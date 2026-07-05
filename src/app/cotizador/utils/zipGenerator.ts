import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import type { GarmentCustomization, PatchCustomization, CapCustomization } from '../types';

// Helper to normalize Spanish strings for filenames
function normalizeFilename(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/[^a-z0-9_-]/g, ''); // Remove special characters
}

export async function getQuoteZIPBlob(
  clientName: string,
  productType: 'ropa' | 'parches' | 'gorras',
  ropaConfig: GarmentCustomization,
  patchConfig: PatchCustomization,
  capConfig: CapCustomization
): Promise<{ blob: Blob; filename: string }> {
  const zip = new JSZip();
  const folderName = `diseños_referencia`;
  const designFolder = zip.folder(folderName);
  const sanitizedClientName = normalizeFilename(clientName || 'cliente');

  // 1. Scan and add files
  if (productType === 'ropa') {
    Object.entries(ropaConfig.positions).forEach(([posName, pos]) => {
      if (pos.active && pos.file) {
        const fileExt = pos.file.name.substring(pos.file.name.lastIndexOf('.')) || '.png';
        const normalizedPos = normalizeFilename(posName);
        const newFilename = `ropa_${normalizedPos}${fileExt}`;
        if (designFolder) {
          designFolder.file(newFilename, pos.file);
        }
      }
    });
  } else if (productType === 'parches') {
    if (patchConfig.file) {
      const fileExt = patchConfig.file.name.substring(patchConfig.file.name.lastIndexOf('.')) || '.png';
      const shapeNormalized = normalizeFilename(patchConfig.shape);
      const newFilename = `parche_${shapeNormalized}${fileExt}`;
      if (designFolder) {
        designFolder.file(newFilename, patchConfig.file);
      }
    }
  } else if (productType === 'gorras') {
    Object.entries(capConfig.positions).forEach(([posName, pos]) => {
      if (pos.active && pos.file) {
        const fileExt = pos.file.name.substring(pos.file.name.lastIndexOf('.')) || '.png';
        const normalizedPos = normalizeFilename(posName);
        const newFilename = `gorra_${normalizedPos}${fileExt}`;
        if (designFolder) {
          designFolder.file(newFilename, pos.file);
        }
      }
    });
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const zipFilename = `cotizacion_nakama_${sanitizedClientName}.zip`;

  return {
    blob: zipContent,
    filename: zipFilename
  };
}

export async function generateQuoteZIP(
  clientName: string,
  productType: 'ropa' | 'parches' | 'gorras',
  ropaConfig: GarmentCustomization,
  patchConfig: PatchCustomization,
  capConfig: CapCustomization
): Promise<void> {
  const { blob, filename } = await getQuoteZIPBlob(
    clientName,
    productType,
    ropaConfig,
    patchConfig,
    capConfig
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
