import { jsPDF } from 'jspdf';
import type { ClientDetails, GarmentCustomization, PatchCustomization, CapCustomization } from '../types';

export function generateQuotePDF(
  client: ClientDetails,
  productType: 'ropa' | 'parches' | 'gorras',
  ropaConfig: GarmentCustomization,
  patchConfig: PatchCustomization,
  capConfig: CapCustomization,
  folioStr?: string
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
    doc.text(`ID: ${folioStr || 'NK-' + Math.floor(100000 + Math.random() * 900000)}`, pageWidth - 15, 27, { align: 'right' });

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
    // Color, talla y cantidad agrupados en la misma línea (la talla antes
    // viajaba suelta dentro de "Detalles Adicionales").
    doc.text(`Color de Prenda: ${ropaConfig.color}`, 15, currentY);
    doc.text(`Talla: ${ropaConfig.talla}`, 90, currentY);
    doc.text(`Cantidad: ${ropaConfig.quantity} pz(s)`, 130, currentY);
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
    doc.text(`Color de gorra: ${capConfig.color || 'No especificado'}`, 100, currentY);
    currentY += 5;
    doc.text(`Cantidad: ${capConfig.quantity} pz(s)`, 15, currentY);
    doc.text(`Bordado 3D (Relieve): ${capConfig.add3D ? 'Sí' : 'No'}`, 100, currentY);
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
  const imageUploads: { label: string; posName: string; technique: string; size: string; base64: string }[] = [];

  if (productType === 'ropa') {
    Object.entries(ropaConfig.positions).forEach(([posName, pos]) => {
      if (pos.active && pos.file && pos.filePreview) {
        imageUploads.push({ 
          label: `Ropa - ${posName}`, 
          posName, 
          technique: pos.type, 
          size: pos.size, 
          base64: pos.filePreview 
        });
      }
    });
  } else if (productType === 'parches') {
    if (patchConfig.file && patchConfig.filePreview) {
      imageUploads.push({ 
        label: `Diseño de Parche`, 
        posName: 'Parche', 
        technique: 'Bordado/Estampado', 
        size: `${patchConfig.width}x${patchConfig.height} cm`, 
        base64: patchConfig.filePreview 
      });
    }
  } else if (productType === 'gorras') {
    Object.entries(capConfig.positions).forEach(([posName, pos]) => {
      if (pos.active && pos.file && pos.filePreview) {
        imageUploads.push({ 
          label: `Gorra - ${posName}`, 
          posName, 
          technique: pos.type, 
          size: pos.size, 
          base64: pos.filePreview 
        });
      }
    });
  }

  // Draw images section if any exist
  if (imageUploads.length > 0) {
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
    doc.text('DISEÑOS Y UBICACIONES DE REFERENCIA', 15, imgY);
    imgY += 8;

    const itemWidth = pageWidth - 30; // 180mm
    const itemHeight = 55;             // 55mm
    const gap = 8;

    for (const item of imageUploads) {
      if (imgY + itemHeight > pageHeight - 25) {
        doc.addPage();
        pageCount++;
        drawHeader(pageCount);
        imgY = 40;
      }

      const xCard = 15;

      // Draw gray card background
      doc.setFillColor(248, 248, 248);
      doc.rect(xCard, imgY, itemWidth, itemHeight, 'F');
      doc.setDrawColor(230, 230, 230);
      doc.rect(xCard, imgY, itemWidth, itemHeight, 'S');

      // 1. Render uploaded design image on the left
      const imgBoxW = 55;
      const imgBoxH = 45;
      const xImg = xCard + 5;
      const yImg = imgY + 5;
      
      // Draw inner white box for image
      doc.setFillColor(255, 255, 255);
      doc.rect(xImg, yImg, imgBoxW, imgBoxH, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.rect(xImg, yImg, imgBoxW, imgBoxH, 'S');

      try {
        const cleanBase64 = item.base64.split(',')[1] || item.base64;
        const format = item.base64.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(cleanBase64, format, xImg + 2, yImg + 2, imgBoxW - 4, imgBoxH - 4);
      } catch (err) {
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(150, 10, 10);
        doc.text('[Error de imagen]', xImg + 15, yImg + imgBoxH / 2);
      }

      // 2. Render placement details text in the middle
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      
      const xText = xImg + imgBoxW + 6;
      let yText = imgY + 12;
      doc.text(item.label.toUpperCase(), xText, yText);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      yText += 8;
      doc.text(`Técnica: ${item.technique}`, xText, yText);
      yText += 6;
      doc.text(`Medida: ${item.size}`, xText, yText);

      // 3. Render silhouette schematic on the right
      if (item.posName !== 'Parche') {
        const silBoxW = 50;
        const xSil = xCard + itemWidth - silBoxW - 5;
        const ySil = imgY + 5;

        if (productType === 'ropa') {
          drawTshirtSilhouette(doc, xSil, ySil, silBoxW - 5, item.posName);
        } else if (productType === 'gorras') {
          drawCapSilhouette(doc, xSil, ySil, silBoxW - 5, item.posName);
        }
      }

      imgY += itemHeight + gap;
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

// ============================================================================
// AUXILIARY VECTOR DRAWING SCHEMATICS FOR POSITION REFERENCES
// ============================================================================

function drawTshirtSilhouette(doc: jsPDF, x: number, y: number, size: number, highlightedPos: string) {
  doc.setLineWidth(0.3);
  doc.setDrawColor(180, 180, 180);
  doc.setFillColor(248, 250, 252); // #F8FAFC

  const scale = size / 100;
  const isBack = highlightedPos === 'Espalda';

  // Draw main shirt path
  doc.moveTo(x + 40 * scale, y + 16 * scale);
  if (isBack) {
    // Flat neck for back view
    doc.curveTo(x + 45 * scale, y + 18 * scale, x + 55 * scale, y + 18 * scale, x + 60 * scale, y + 16 * scale);
  } else {
    // Normal curved neck for front view
    doc.curveTo(x + 43.3 * scale, y + 21 * scale, x + 56.7 * scale, y + 21 * scale, x + 60 * scale, y + 16 * scale);
  }
  doc.lineTo(x + 74 * scale, y + 21 * scale);
  doc.lineTo(x + 88 * scale, y + 36 * scale);
  doc.lineTo(x + 80 * scale, y + 46 * scale);
  doc.lineTo(x + 71 * scale, y + 38 * scale);
  doc.lineTo(x + 71 * scale, y + 88 * scale);
  doc.curveTo(x + 63 * scale, y + 91 * scale, x + 37 * scale, y + 91 * scale, x + 29 * scale, y + 88 * scale);
  doc.lineTo(x + 29 * scale, y + 38 * scale);
  doc.lineTo(x + 20 * scale, y + 46 * scale);
  doc.lineTo(x + 12 * scale, y + 36 * scale);
  doc.lineTo(x + 26 * scale, y + 21 * scale);
  doc.lineTo(x + 40 * scale, y + 16 * scale);
  doc.fillStroke();

  // Stitching guidelines (dotted lines)
  doc.setLineWidth(0.15);
  doc.setDrawColor(160, 174, 192); // #94A3B8
  
  // Left sleeve stitch
  doc.line(x + 29 * scale, y + 38 * scale, x + 20 * scale, y + 46 * scale);
  // Right sleeve stitch
  doc.line(x + 71 * scale, y + 38 * scale, x + 80 * scale, y + 46 * scale);
  // Collar stitching curve
  doc.moveTo(x + 40 * scale, y + 16 * scale);
  doc.curveTo(x + 45 * scale, y + 22 * scale, x + 55 * scale, y + 22 * scale, x + 60 * scale, y + 16 * scale);
  doc.stroke();

  // Position highlight spot
  doc.setFillColor(255, 51, 51);
  doc.setDrawColor(255, 51, 51);
  doc.setLineWidth(0.4);

  let px = 50;
  let py = 50;

  switch (highlightedPos) {
    case 'Pecho Izquierdo':
      px = 38.5;
      py = 32.5;
      break;
    case 'Pecho Derecho':
      px = 61.5;
      py = 32.5;
      break;
    case 'Pecho en Medio':
      px = 50;
      py = 33.5;
      break;
    case 'Enfrente':
      px = 50;
      py = 61;
      break;
    case 'Espalda':
      px = 50;
      py = 53;
      break;
    case 'Manga Izquierda':
      px = 21.75;
      py = 35.25;
      break;
    case 'Manga Derecha':
      px = 78.25;
      py = 35.25;
      break;
  }

  const pdfX = x + px * scale;
  const pdfY = y + py * scale;

  doc.circle(pdfX, pdfY, 2.5, 'F');
  doc.circle(pdfX, pdfY, 3.8, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 51, 51);
  if (isBack) {
    doc.text('VISTA TRASERA (ESPALDA)', x + 50 * scale, y + 98 * scale, { align: 'center' });
  } else {
    doc.text('VISTA FRONTAL', x + 50 * scale, y + 98 * scale, { align: 'center' });
  }
}

function drawCapSilhouette(doc: jsPDF, x: number, y: number, size: number, highlightedPos: string) {
  doc.setLineWidth(0.3);
  doc.setDrawColor(180, 180, 180);
  
  const scale = size / 100;

  let px = 50;
  let py = 50;
  let viewText = 'VISTA DE REFERENCIA';

  if (highlightedPos === 'Frontal') {
    viewText = 'VISTA FRONTAL';
    // Draw Front View Cap
    doc.setFillColor(248, 250, 252); // #F8FAFC
    doc.moveTo(x + 20 * scale, y + 70 * scale);
    doc.curveTo(x + 15 * scale, y + 35 * scale, x + 30 * scale, y + 22 * scale, x + 50 * scale, y + 22 * scale);
    doc.curveTo(x + 70 * scale, y + 22 * scale, x + 85 * scale, y + 35 * scale, x + 80 * scale, y + 70 * scale);
    doc.lineTo(x + 20 * scale, y + 70 * scale);
    doc.fillStroke();

    // Visor
    doc.setFillColor(226, 232, 240); // #E2E8F0
    doc.moveTo(x + 16 * scale, y + 71 * scale);
    doc.curveTo(x + 25 * scale, y + 82 * scale, x + 75 * scale, y + 82 * scale, x + 84 * scale, y + 71 * scale);
    doc.curveTo(x + 86 * scale, y + 69 * scale, x + 81 * scale, y + 67 * scale, x + 80 * scale, y + 67 * scale);
    doc.curveTo(x + 70 * scale, y + 68 * scale, x + 30 * scale, y + 68 * scale, x + 20 * scale, y + 67 * scale);
    doc.curveTo(x + 19 * scale, y + 67 * scale, x + 14 * scale, y + 69 * scale, x + 16 * scale, y + 71 * scale);
    doc.fillStroke();

    // Stitching / Panel lines
    doc.setLineWidth(0.15);
    doc.setDrawColor(203, 213, 225); // #CBD5E1
    doc.line(x + 50 * scale, y + 22 * scale, x + 50 * scale, y + 70 * scale);
    doc.moveTo(x + 50 * scale, y + 22 * scale);
    doc.curveTo(x + 38 * scale, y + 30 * scale, x + 24 * scale, y + 50 * scale, x + 20 * scale, y + 70 * scale);
    doc.stroke();
    doc.moveTo(x + 50 * scale, y + 22 * scale);
    doc.curveTo(x + 62 * scale, y + 30 * scale, x + 76 * scale, y + 50 * scale, x + 80 * scale, y + 70 * scale);
    doc.stroke();

    // Button
    doc.setFillColor(71, 85, 105);
    doc.setDrawColor(51, 65, 85);
    doc.circle(x + 50 * scale, y + 22 * scale, 3 * scale, 'FD');

    px = 50;
    py = 48;
  } 
  else if (highlightedPos === 'Lateral izquierdo') {
    viewText = 'LADO IZQUIERDO';
    // Draw Left Side View Cap
    doc.setFillColor(248, 250, 252);
    doc.moveTo(x + 25 * scale, y + 70 * scale);
    doc.curveTo(x + 26 * scale, y + 48 * scale, x + 28 * scale, y + 38 * scale, x + 35 * scale, y + 34 * scale);
    doc.curveTo(x + 55 * scale, y + 24 * scale, x + 80 * scale, y + 32 * scale, x + 82 * scale, y + 70 * scale);
    doc.lineTo(x + 25 * scale, y + 70 * scale);
    doc.fillStroke();

    // Visor pointing left
    doc.setFillColor(226, 232, 240);
    doc.moveTo(x + 26 * scale, y + 68 * scale);
    doc.curveTo(x + 16 * scale, y + 68 * scale, x + 6 * scale, y + 72 * scale, x + 4 * scale, y + 75 * scale);
    doc.curveTo(x + 10 * scale, y + 79 * scale, x + 22 * scale, y + 76 * scale, x + 26 * scale, y + 71 * scale);
    doc.lineTo(x + 26 * scale, y + 68 * scale);
    doc.fillStroke();

    // Adjuster strap
    doc.setFillColor(71, 85, 105);
    doc.setDrawColor(51, 65, 85);
    doc.moveTo(x + 80 * scale, y + 68 * scale);
    doc.curveTo(x + 85 * scale, y + 70 * scale, x + 88 * scale, y + 74 * scale, x + 88 * scale, y + 74 * scale);
    doc.lineTo(x + 86 * scale, y + 78 * scale);
    doc.curveTo(x + 83 * scale, y + 75 * scale, x + 80 * scale, y + 72 * scale, x + 80 * scale, y + 72 * scale);
    doc.lineTo(x + 80 * scale, y + 68 * scale);
    doc.fillStroke();

    // Button
    doc.circle(x + 58 * scale, y + 26 * scale, 2.5 * scale, 'FD');

    px = 55;
    py = 54;
  } 
  else if (highlightedPos === 'Lateral derecho') {
    viewText = 'LADO DERECHO';
    // Draw Right Side View Cap
    doc.setFillColor(248, 250, 252);
    doc.moveTo(x + 18 * scale, y + 70 * scale);
    doc.curveTo(x + 20 * scale, y + 32 * scale, x + 45 * scale, y + 24 * scale, x + 65 * scale, y + 34 * scale);
    doc.curveTo(x + 72 * scale, y + 38 * scale, x + 74 * scale, y + 48 * scale, x + 75 * scale, y + 70 * scale);
    doc.lineTo(x + 18 * scale, y + 70 * scale);
    doc.fillStroke();

    // Visor pointing right
    doc.setFillColor(226, 232, 240);
    doc.moveTo(x + 74 * scale, y + 68 * scale);
    doc.curveTo(x + 84 * scale, y + 68 * scale, x + 94 * scale, y + 72 * scale, x + 96 * scale, y + 75 * scale);
    doc.curveTo(x + 90 * scale, y + 79 * scale, x + 78 * scale, y + 76 * scale, x + 74 * scale, y + 71 * scale);
    doc.lineTo(x + 74 * scale, y + 68 * scale);
    doc.fillStroke();

    // Adjuster strap
    doc.setFillColor(71, 85, 105);
    doc.setDrawColor(51, 65, 85);
    doc.moveTo(x + 20 * scale, y + 68 * scale);
    doc.curveTo(x + 15 * scale, y + 70 * scale, x + 12 * scale, y + 74 * scale, x + 12 * scale, y + 74 * scale);
    doc.lineTo(x + 14 * scale, y + 78 * scale);
    doc.curveTo(x + 17 * scale, y + 75 * scale, x + 20 * scale, y + 72 * scale, x + 20 * scale, y + 72 * scale);
    doc.lineTo(x + 20 * scale, y + 68 * scale);
    doc.fillStroke();

    // Button
    doc.circle(x + 42 * scale, y + 26 * scale, 2.5 * scale, 'FD');

    px = 45;
    py = 54;
  } 
  else if (highlightedPos === 'Parte trasera') {
    viewText = 'VISTA TRASERA';
    // Draw Back View Cap
    doc.setFillColor(248, 250, 252);
    doc.moveTo(x + 20 * scale, y + 70 * scale);
    doc.curveTo(x + 15 * scale, y + 35 * scale, x + 30 * scale, y + 22 * scale, x + 50 * scale, y + 22 * scale);
    doc.curveTo(x + 70 * scale, y + 22 * scale, x + 85 * scale, y + 35 * scale, x + 80 * scale, y + 70 * scale);
    doc.lineTo(x + 20 * scale, y + 70 * scale);
    doc.fillStroke();

    // Cutout opening at the back
    doc.setFillColor(248, 248, 248);
    doc.moveTo(x + 38 * scale, y + 70 * scale);
    doc.curveTo(x + 38 * scale, y + 56 * scale, x + 62 * scale, y + 56 * scale, x + 62 * scale, y + 70 * scale);
    doc.lineTo(x + 38 * scale, y + 70 * scale);
    doc.fillStroke();

    // Adjuster strap
    doc.setFillColor(71, 85, 105);
    doc.setDrawColor(51, 65, 85);
    doc.rect(x + 36 * scale, y + 68 * scale, 28 * scale, 2.5 * scale, 'FD');

    // Button
    doc.circle(x + 50 * scale, y + 22 * scale, 3 * scale, 'FD');

    px = 50;
    py = 42;
  }

  // Draw the highlighted spot
  doc.setFillColor(255, 51, 51);
  doc.setDrawColor(255, 51, 51);
  doc.setLineWidth(0.4);

  const pdfX = x + px * scale;
  const pdfY = y + py * scale;

  doc.circle(pdfX, pdfY, 2.5, 'F');
  doc.circle(pdfX, pdfY, 3.8, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 51, 51);
  doc.text(viewText, x + 50 * scale, y + 98 * scale, { align: 'center' });
}
