import { jsPDF } from 'jspdf';
import type { ClientDetails, GarmentCustomization, PatchCustomization, CapCustomization } from '../types';

export function generateQuotePDF(
  client: ClientDetails,
  productType: 'ropa' | 'parches' | 'gorras',
  ropaConfig: GarmentCustomization,
  patchConfig: PatchCustomization,
  capConfig: CapCustomization
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Primary Red Color
  const brandRed = [255, 51, 51]; // #FF3333
  const darkGray = [20, 20, 20];
  const borderLight = [230, 230, 230];

  // Helper functions
  const drawHeader = (_pageNum: number) => {
    // Top Brand Border Line
    doc.setFillColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // Get Brand Logo from DOM and render
    const logoEl = document.getElementById('nk-brand-logo') as HTMLImageElement | null;
    if (logoEl) {
      try {
        // Draw logo: aspect ratio ~2.35:1. Spanning 35mm width and 15mm height.
        doc.addImage(logoEl, 'PNG', 15, 8, 35, 15);
      } catch (err) {
        console.error("Error drawing logo in PDF header:", err);
        // Fallback text if logo load fails
        doc.setTextColor(20, 20, 20);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(28);
        doc.text('NAKAMA', 15, 20);
      }
    } else {
      // Fallback text
      doc.setTextColor(20, 20, 20);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(28);
      doc.text('NAKAMA', 15, 20);
    }
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('CLOTHING BRAND • COTIZADOR PERSONALIZADOS', 15, 28);

    // Quote details (Right side)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.text('COTIZACIÓN PERSONALIZADA', pageWidth - 15, 18, { align: 'right' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const dateStr = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Fecha: ${dateStr}`, pageWidth - 15, 23, { align: 'right' });
    doc.text(`ID: NK-${Math.floor(100000 + Math.random() * 900000)}`, pageWidth - 15, 27, { align: 'right' });

    // Horizontal line
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 32, pageWidth - 15, 32);
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    
    // Horizontal divider
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.setLineWidth(0.5);
    doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);

    doc.text('Este documento es una cotización preliminar. Los precios finales dependen de la revisión técnica de los diseños.', 15, pageHeight - 10);
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
  };

  // Render Page 1
  drawHeader(1);

  // Client Details Panel
  doc.setFillColor(248, 248, 248);
  doc.rect(15, 37, pageWidth - 30, 28, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text('DATOS DEL CLIENTE', 20, 43);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Nombre: ${client.name || 'N/A'}`, 20, 49);
  doc.text(`Email: ${client.email || 'N/A'}`, 20, 54);
  doc.text(`Teléfono: ${client.phone || 'N/A'}`, 20, 59);
  doc.text(`Tipo de Producto: ${productType.toUpperCase()}`, 100, 49);

  // Customization Specs Table
  let currentY = 73;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
  doc.text('DETALLES DE LA COTIZACIÓN', 15, currentY);
  currentY += 6;

  // Render product details
  if (productType === 'ropa') {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(`Prenda Seleccionada: ${ropaConfig.model}`, 15, currentY);
    currentY += 5;
    doc.setFont('Helvetica', 'normal');
    doc.text(`Color de Prenda: ${ropaConfig.color}`, 15, currentY);
    doc.text(`Cantidad: ${ropaConfig.quantity} pz(s)`, 100, currentY);
    currentY += 8;

    // Header of Table
    doc.setFillColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.rect(15, currentY, pageWidth - 30, 7, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('Posición', 20, currentY + 5);
    doc.text('Tipo de Técnica', 65, currentY + 5);
    doc.text('Medida Estimada', 120, currentY + 5);
    doc.text('Diseño', pageWidth - 30, currentY + 5, { align: 'right' });
    currentY += 7;

    // Table rows
    const activePositions = Object.entries(ropaConfig.positions).filter(([_, pos]) => pos.active);
    
    if (activePositions.length === 0) {
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text('No se han seleccionado áreas específicas de diseño.', 20, currentY + 6);
      currentY += 10;
    } else {
      activePositions.forEach(([posName, details]) => {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(20, 20, 20);
        doc.text(posName, 20, currentY + 5);
        doc.text(details.type, 65, currentY + 5);
        doc.text(`${details.size || 'No especificada'} CM`, 120, currentY + 5);
        doc.text(details.file ? 'Cargado' : 'Sin archivo', pageWidth - 30, currentY + 5, { align: 'right' });
        
        // Underline
        doc.setDrawColor(240, 240, 240);
        doc.line(15, currentY + 8, pageWidth - 15, currentY + 8);
        currentY += 8;
      });
    }

    if (ropaConfig.additionalDetails) {
      currentY += 4;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Detalles Adicionales:', 15, currentY);
      currentY += 5;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const splitText = doc.splitTextToSize(ropaConfig.additionalDetails, pageWidth - 30);
      doc.text(splitText, 15, currentY);
      currentY += splitText.length * 4.5 + 4;
    }

  } else if (productType === 'parches') {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(`Parches Personalizados`, 15, currentY);
    currentY += 5;
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Forma: ${patchConfig.shape}`, 15, currentY);
    doc.text(`Cantidad: ${patchConfig.quantity} pz(s)`, 100, currentY);
    currentY += 5;
    doc.text(`Medidas: Ancho: ${patchConfig.width || '-'} CM  x  Alto: ${patchConfig.height || '-'} CM`, 15, currentY);
    currentY += 8;

    if (patchConfig.additionalDetails) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Detalles Adicionales:', 15, currentY);
      currentY += 5;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const splitText = doc.splitTextToSize(patchConfig.additionalDetails, pageWidth - 30);
      doc.text(splitText, 15, currentY);
      currentY += splitText.length * 4.5 + 4;
    }
  } else if (productType === 'gorras') {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(`Gorra Personalizada: ${capConfig.model || 'Modelo Estándar'}`, 15, currentY);
    currentY += 5;
    doc.setFont('Helvetica', 'normal');
    const activePositionsCount = Object.values(capConfig.positions).filter(p => p.active).length;
    doc.text(`Áreas a personalizar: ${activePositionsCount} área(s)`, 15, currentY);
    doc.text(`Cantidad: ${capConfig.quantity} pz(s)`, 100, currentY);
    currentY += 5;
    doc.text(`Bordado 3D (Relieve): ${capConfig.add3D ? 'Sí' : 'No'}`, 15, currentY);
    currentY += 8;

    // Header of Table
    doc.setFillColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.rect(15, currentY, pageWidth - 30, 7, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('Posición', 20, currentY + 5);
    doc.text('Tipo de Técnica', 65, currentY + 5);
    doc.text('Tamaño Recomendado', 120, currentY + 5);
    doc.text('Diseño', pageWidth - 30, currentY + 5, { align: 'right' });
    currentY += 7;

    const activePositions = Object.entries(capConfig.positions).filter(([_, pos]) => pos.active);
    
    if (activePositions.length === 0) {
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text('No se han seleccionado áreas de bordado/TPU.', 20, currentY + 6);
      currentY += 10;
    } else {
      activePositions.forEach(([posName, details]) => {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(20, 20, 20);
        doc.text(posName, 20, currentY + 5);
        doc.text(details.type, 65, currentY + 5);
        doc.text(details.size, 120, currentY + 5);
        doc.text(details.file ? 'Cargado' : 'Sin archivo', pageWidth - 30, currentY + 5, { align: 'right' });
        
        // Underline
        doc.setDrawColor(240, 240, 240);
        doc.line(15, currentY + 8, pageWidth - 15, currentY + 8);
        currentY += 8;
      });
    }

    if (capConfig.additionalDetails) {
      currentY += 4;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Detalles Adicionales:', 15, currentY);
      currentY += 5;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const splitText = doc.splitTextToSize(capConfig.additionalDetails, pageWidth - 30);
      doc.text(splitText, 15, currentY);
      currentY += splitText.length * 4.5 + 4;
    }
  }

  // Reference Images Section
  // Gather all uploads
  const imageUploads: { label: string; base64: string }[] = [];

  if (productType === 'ropa') {
    Object.entries(ropaConfig.positions).forEach(([posName, pos]) => {
      if (pos.active && pos.file && pos.filePreview) {
        imageUploads.push({ label: `Prenda - ${posName}`, base64: pos.filePreview });
      }
    });
  } else if (productType === 'parches') {
    if (patchConfig.file && patchConfig.filePreview) {
      imageUploads.push({ label: `Diseño de Parche (${patchConfig.shape})`, base64: patchConfig.filePreview });
    }
  } else if (productType === 'gorras') {
    Object.entries(capConfig.positions).forEach(([posName, pos]) => {
      if (pos.active && pos.file && pos.filePreview) {
        imageUploads.push({ label: `Gorra - ${posName}`, base64: pos.filePreview });
      }
    });
  }

  // Draw images section if any exist
  if (imageUploads.length > 0) {
    // Determine whether to put images on Page 1 or Page 2
    // If currentY is beyond 190, add page
    let imgY = currentY + 5;
    let pageCount = 1;

    if (imgY > 195) {
      doc.addPage();
      pageCount = 2;
      drawHeader(2);
      imgY = 40;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.text('IMÁGENES DE REFERENCIA PARA LOS DISEÑOS', 15, imgY);
    imgY += 8;

    // Draw in a grid structure
    let col = 0;
    const maxCols = 2;
    const itemWidth = 80;
    const itemHeight = 60;
    const gap = 10;

    for (const item of imageUploads) {
      if (imgY + itemHeight > pageHeight - 25) {
        doc.addPage();
        pageCount++;
        drawHeader(pageCount);
        imgY = 40;
        col = 0;
      }

      const xPos = 15 + col * (itemWidth + gap);

      // Draw gray card background
      doc.setFillColor(245, 245, 245);
      doc.rect(xPos, imgY, itemWidth, itemHeight, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.rect(xPos, imgY, itemWidth, itemHeight, 'S');

      // Draw the image inside the border box
      try {
        const cleanBase64 = item.base64.split(',')[1] || item.base64;
        // Estimate extension
        const format = item.base64.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(cleanBase64, format, xPos + 5, imgY + 5, itemWidth - 10, itemHeight - 16);
      } catch (err) {
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(150, 10, 10);
        doc.text('[Error cargando imagen]', xPos + 10, imgY + itemHeight / 2);
        console.error(err);
      }

      // Title/Label under the image inside card
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);
      doc.text(item.label.toUpperCase(), xPos + 5, imgY + itemHeight - 5);

      col++;
      if (col >= maxCols) {
        col = 0;
        imgY += itemHeight + gap;
      }
    }

    // After grid, adjust total pages
    const totalPages = pageCount;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawFooter(i, totalPages);
    }
  } else {
    drawFooter(1, 1);
  }

  return doc;
}
