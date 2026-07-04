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
  doc.setFillColor(242, 242, 242);

  const cx = x + size / 2;
  const cy = y + size / 2;
  
  const w = size * 0.45;
  const h = size * 0.45;

  // Draw main body box
  doc.rect(cx - w * 0.5, cy - h * 0.4, w, h * 1.4, 'FD');

  // Draw sleeves as triangles
  // Left sleeve
  doc.triangle(
    cx - w * 0.5, cy - h * 0.4, // shoulder top
    cx - w * 0.9, cy - h * 0.1, // sleeve tip
    cx - w * 0.5, cy + h * 0.1, // armpit
    'FD'
  );
  // Right sleeve
  doc.triangle(
    cx + w * 0.5, cy - h * 0.4,
    cx + w * 0.9, cy - h * 0.1,
    cx + w * 0.5, cy + h * 0.1,
    'FD'
  );

  // Collar neck cut (small white triangle at top)
  doc.setFillColor(248, 248, 248); // card background color
  doc.setDrawColor(180, 180, 180);
  doc.triangle(
    cx - w * 0.18, cy - h * 0.4,
    cx, cy - h * 0.25,
    cx + w * 0.18, cy - h * 0.4,
    'FD'
  );

  // Position highlight spot
  doc.setFillColor(255, 51, 51);
  doc.setDrawColor(255, 51, 51);
  doc.setLineWidth(0.4);

  let px = cx;
  let py = cy;
  let isBack = false;

  switch (highlightedPos) {
    case 'Pecho Izquierdo':
      px = cx - w * 0.22;
      py = cy - h * 0.18;
      break;
    case 'Pecho Derecho':
      px = cx + w * 0.22;
      py = cy - h * 0.18;
      break;
    case 'Pecho en Medio':
      px = cx;
      py = cy - h * 0.18;
      break;
    case 'Enfrente':
      px = cx;
      py = cy + h * 0.2;
      break;
    case 'Espalda':
      px = cx;
      py = cy + h * 0.2;
      isBack = true;
      break;
    case 'Manga Izquierda':
      px = cx - w * 0.7;
      py = cy - h * 0.15;
      break;
    case 'Manga Derecha':
      px = cx + w * 0.7;
      py = cy - h * 0.15;
      break;
  }

  doc.circle(px, py, 3, 'F');
  doc.circle(px, py, 4.5, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 51, 51);
  if (isBack) {
    doc.text('VISTA TRASERA (ESPALDA)', cx, cy + h + 4, { align: 'center' });
  } else {
    doc.text('VISTA FRONTAL', cx, cy + h + 4, { align: 'center' });
  }
}

function drawCapSilhouette(doc: jsPDF, x: number, y: number, size: number, highlightedPos: string) {
  doc.setLineWidth(0.3);
  doc.setDrawColor(180, 180, 180);
  doc.setFillColor(242, 242, 242);

  const cx = x + size / 2;
  const cy = y + size / 2;
  
  const w = size * 0.4;
  const h = size * 0.35;

  // Draw Cap Dome (Head section) as a circle
  doc.circle(cx - w * 0.1, cy, w * 0.65, 'FD');

  // Draw Cap Visor (flat snapback visor) as a triangle/polygon on the right
  doc.triangle(
    cx + w * 0.25, cy + h * 0.1, // middle visor connection
    cx + w * 0.95, cy + h * 0.25, // visor tip
    cx + w * 0.25, cy + h * 0.4, // bottom connection
    'FD'
  );

  // Draw adjustable snap back opening/strap
  doc.setFillColor(248, 248, 248); // card background color
  // Back cutout circle
  doc.circle(cx - w * 0.65, cy + h * 0.1, w * 0.2, 'FD');

  // Position highlight spot
  doc.setFillColor(255, 51, 51);
  doc.setDrawColor(255, 51, 51);
  doc.setLineWidth(0.4);

  let px = cx;
  let py = cy;
  let viewText = 'VISTA LATERAL / FRONTAL';

  switch (highlightedPos) {
    case 'Frontal':
      px = cx + w * 0.1;
      py = cy - h * 0.15;
      viewText = 'VISTA FRONTAL';
      break;
    case 'Lateral izquierdo':
      px = cx - w * 0.1;
      py = cy;
      viewText = 'VISTA LATERAL IZQ.';
      break;
    case 'Lateral derecho':
      px = cx - w * 0.1;
      py = cy;
      viewText = 'VISTA LATERAL DER.';
      break;
    case 'Parte trasera':
      px = cx - w * 0.65;
      py = cy + h * 0.05;
      viewText = 'VISTA TRASERA';
      break;
  }

  doc.circle(px, py, 3, 'F');
  doc.circle(px, py, 4.5, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 51, 51);
  doc.text(viewText, cx, cy + h + 6, { align: 'center' });
}
