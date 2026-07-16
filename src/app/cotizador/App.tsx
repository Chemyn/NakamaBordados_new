"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ClientDetails, GarmentCustomization, GarmentListItem, PatchCustomization, CapCustomization, ProductType, GarmentPosition, CapPosition } from './types';
import { RopaConfig } from './components/RopaConfig';
import { ParchesConfig } from './components/ParchesConfig';
import { GorrasConfig } from './components/GorrasConfig';
import { Visualizer } from './components/Visualizer';
import { Marquee } from './components/Marquee';
import { AuthGateModal } from './components/AuthGateModal';
import { generateQuotePDF } from './utils/pdfGenerator';
import { getQuoteZIPBlob } from './utils/zipGenerator';
import { compressImage } from './utils/imageCompressor';
import { useAuth } from '../context/AuthContext';
import { apiOrigin } from '@/lib/api-host';

const availableGarmentPositions = [
  'Pecho Izquierdo',
  'Pecho Derecho',
  'Pecho en Medio',
  'Enfrente',
  'Espalda',
  'Manga Izquierda',
  'Manga Derecha'
];

const getPositionSizeError = (type: string, sizeStr: string): string | null => {
  const numbers = (sizeStr || '').match(/(\d+(?:\.\d+)?)/g);
  if (numbers && numbers.length > 0) {
    const w = parseFloat(numbers[0]);
    const h = numbers[1] ? parseFloat(numbers[1]) : w;
    const minDim = Math.min(w, h);
    const maxDim = Math.max(w, h);
    
    if (type === 'Bordado') {
      if (minDim > 40 || maxDim > 60) {
        return 'La medida máxima para Bordado es 40x60 cm.';
      }
    } else { // DTF/Estampado
      if (minDim > 36 || maxDim > 60) {
        return 'La medida máxima para Estampado es 36x60 cm.';
      }
    }
  }
  return null;
};

export const App: React.FC = () => {
  // Tab/Product Selection
  const [activeProduct, setActiveProduct] = useState<ProductType>('ropa');
  
  // Loading state for webhook submission
  const [isSending, setIsSending] = useState(false);

  // Selected position currently focused/highlighted in visualizer
  const [selectedPosition, setSelectedPosition] = useState<string | null>('Pecho Izquierdo');

  // Form errors validation state
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; positions?: string }>({});

  // Client Info State (Marca/Proyecto field is removed)
  const [clientDetails, setClientDetails] = useState<ClientDetails>({
    name: '',
    phone: '',
    email: ''
  });

  // Sesión del cliente: autollenar nombre, teléfono y correo desde su cuenta
  // (solo campos vacíos, para no pisar lo que el cliente ya escribió).
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  // Gate de login: sin sesión el cliente puede armar/ver la cotización, pero
  // para ENVIARLA debe iniciar sesión (o crear cuenta) desde este modal.
  const [showAuthGate, setShowAuthGate] = useState(false);
  useEffect(() => {
    if (!user) return;
    setClientDetails(prev => ({
      name: prev.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || '',
      phone: prev.phone || user.billingPhone || '',
      email: prev.email || user.email || '',
    }));
  }, [user]);

  // State: Clothing (Ropa) - ALL 7 areas are fully initialized in the state to avoid undefined errors
  const [ropaConfig, setRopaConfig] = useState<GarmentCustomization>({
    model: 'Oversize',
    color: 'Negro',
    talla: 'M',
    quantity: 10,
    positions: {
      'Pecho Izquierdo': { active: true, type: 'Bordado', size: '10x10', file: null, filePreview: '' },
      'Pecho Derecho': { active: false, type: 'Bordado', size: '10x10', file: null, filePreview: '' },
      'Pecho en Medio': { active: false, type: 'Bordado', size: '10x10', file: null, filePreview: '' },
      'Enfrente': { active: false, type: 'DTF', size: '20x25', file: null, filePreview: '' },
      'Espalda': { active: false, type: 'DTF', size: '28x32', file: null, filePreview: '' },
      'Manga Izquierda': { active: false, type: 'DTF', size: '8x8', file: null, filePreview: '' },
      'Manga Derecha': { active: false, type: 'DTF', size: '8x8', file: null, filePreview: '' }
    },
    additionalDetails: ''
  });

  // State: Patches (Parches)
  const [patchConfig, setPatchConfig] = useState<PatchCustomization>({
    shape: 'Rectangular',
    width: '8.5',
    height: '5.0',
    quantity: 50,
    file: null,
    filePreview: '',
    additionalDetails: ''
  });

  // State: Caps (Gorras) - Fully initialized
  const [capConfig, setCapConfig] = useState<CapCustomization>({
    option: 'Bordado Al frente',
    model: 'Kamel 804 (Tela)',
    color: 'Black (Negro)',
    quantity: 20,
    add3D: true,
    positions: {
      'Frontal': { active: true, type: 'Bordado', size: 'Regular', file: null, filePreview: '' },
      'Lateral izquierdo': { active: false, type: 'Bordado', size: 'Regular', file: null, filePreview: '' },
      'Lateral derecho': { active: false, type: 'Bordado', size: 'Regular', file: null, filePreview: '' },
      'Parte trasera': { active: false, type: 'Bordado', size: 'Regular', file: null, filePreview: '' }
    },
    additionalDetails: ''
  });

  // Lista de combinaciones prenda+color+talla (solo ropa): un mismo folio
  // puede cotizar varias variantes; los diseños configurados aplican a todas.
  const [garmentList, setGarmentList] = useState<GarmentListItem[]>([]);

  const addGarmentToList = () => {
    setGarmentList(prev => {
      const existing = prev.find(i =>
        i.model === ropaConfig.model && i.color === ropaConfig.color && i.talla === ropaConfig.talla
      );
      if (existing) {
        // Misma combinación: se suman las cantidades en lugar de duplicar filas.
        return prev.map(i => (i.id === existing.id ? { ...i, quantity: i.quantity + ropaConfig.quantity } : i));
      }
      return [...prev, {
        id: Date.now(),
        model: ropaConfig.model,
        color: ropaConfig.color,
        talla: ropaConfig.talla,
        quantity: ropaConfig.quantity,
      }];
    });
  };

  const removeGarmentFromList = (id: number) => {
    setGarmentList(prev => prev.filter(i => i.id !== id));
  };

  const garmentListTotal = garmentList.reduce((sum, i) => sum + i.quantity, 0);
  const garmentListLines = garmentList
    .map(i => `- ${i.model} | ${i.color} | Talla ${i.talla} | ${i.quantity} pz`)
    .join('\n');

  // Config de ropa "enriquecida" para los documentos. La talla única ya se
  // imprime en el PDF junto a color/cantidad (pdfGenerator), así que solo la
  // lista de combinaciones viaja en additionalDetails (el PDF imprime una
  // sola tripleta modelo/color/cantidad y la lista necesita el detalle).
  const getRopaConfigForDocs = (): GarmentCustomization => {
    if (garmentList.length === 0) {
      return ropaConfig;
    }
    const header = `LISTA DE PRENDAS (${garmentListTotal} pz en total):\n${garmentListLines}`;
    return {
      ...ropaConfig,
      // Con lista de combinaciones la talla del selector no representa el
      // pedido: el PDF muestra "Ver lista" y el detalle vive en el header.
      talla: 'Ver lista',
      additionalDetails: ropaConfig.additionalDetails
        ? `${header}\n\n${ropaConfig.additionalDetails}`
        : header,
    };
  };

  // Sync effect: automatically select the first active position when switching product tabs
  useEffect(() => {
    if (activeProduct === 'ropa') {
      const activeKeys = Object.keys(ropaConfig.positions).filter(k => ropaConfig.positions[k].active);
      setSelectedPosition(activeKeys[0] || 'Pecho Izquierdo');
    } else if (activeProduct === 'gorras') {
      const activeKeys = Object.keys(capConfig.positions).filter(k => capConfig.positions[k].active);
      setSelectedPosition(activeKeys[0] || 'Frontal');
    } else {
      setSelectedPosition(null);
    }
  }, [activeProduct]);

  // Sync effect: automatically reset sleeve positions if Tank Top is selected
  useEffect(() => {
    if (ropaConfig.model === 'Tank Top') {
      let resetNeeded = false;
      const updatedPositions = { ...ropaConfig.positions };
      
      if (updatedPositions['Manga Izquierda'].active) {
        updatedPositions['Manga Izquierda'] = {
          ...updatedPositions['Manga Izquierda'],
          active: false,
          file: null,
          filePreview: ''
        };
        resetNeeded = true;
      }
      if (updatedPositions['Manga Derecha'].active) {
        updatedPositions['Manga Derecha'] = {
          ...updatedPositions['Manga Derecha'],
          active: false,
          file: null,
          filePreview: ''
        };
        resetNeeded = true;
      }

      if (resetNeeded) {
        setRopaConfig(prev => ({
          ...prev,
          positions: updatedPositions
        }));
        
        // Adjust selectedPosition if it was on a sleeve
        if (selectedPosition === 'Manga Izquierda' || selectedPosition === 'Manga Derecha') {
          const firstActive = Object.keys(updatedPositions).find(k => updatedPositions[k].active);
          setSelectedPosition(firstActive || 'Pecho Izquierdo');
        }
      }
    }
  }, [ropaConfig.model, selectedPosition]);

  // Shake effect for validation alerts
  const [isSubmitShaking, setIsSubmitShaking] = useState(false);

  // Form Validation
  const validateForm = (): boolean => {
    const errors: { name?: string; phone?: string; positions?: string } = {};

    if (!clientDetails.name.trim()) {
      errors.name = 'Por favor, ingresa tu nombre completo.';
    }
    if (!clientDetails.phone.trim()) {
      errors.phone = 'Por favor, ingresa tu teléfono (WhatsApp).';
    }

    if (activeProduct === 'ropa') {
      const activePositions = Object.entries(ropaConfig.positions).filter(([_, p]) => p.active);
      if (activePositions.length === 0) {
        errors.positions = 'Debes seleccionar al menos una posición de diseño para personalizar tu prenda (haz clic en la camiseta).';
      } else {
        for (const [name, p] of activePositions) {
          const err = getPositionSizeError(p.type, p.size);
          if (err) {
            errors.positions = `El área "${name}" excede la medida permitida. ${err}`;
            break;
          }
        }
      }
    } else if (activeProduct === 'gorras') {
      const activePositions = Object.values(capConfig.positions).filter(p => p.active);
      if (activePositions.length === 0) {
        errors.positions = 'Debes seleccionar al menos una posición de diseño para tu gorra.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Active/Inactive state togglers
  const activatePosition = (position: string) => {
    if (activeProduct === 'ropa') {
      const updated = { ...ropaConfig.positions };
      updated[position] = { ...updated[position], active: true };
      setRopaConfig({ ...ropaConfig, positions: updated });
    } else if (activeProduct === 'gorras') {
      const updated = { ...capConfig.positions };
      updated[position] = { ...updated[position], active: true };
      setCapConfig({ ...capConfig, positions: updated });
    }
  };

  const deactivatePosition = (position: string) => {
    if (activeProduct === 'ropa') {
      const updated = { ...ropaConfig.positions };
      updated[position] = { ...updated[position], active: false, file: null, filePreview: '' };
      setRopaConfig({ ...ropaConfig, positions: updated });
      if (selectedPosition === position) {
        const firstActive = Object.keys(updated).find(k => updated[k].active);
        setSelectedPosition(firstActive || null);
      }
    } else if (activeProduct === 'gorras') {
      const updated = { ...capConfig.positions };
      updated[position] = { ...updated[position], active: false, file: null, filePreview: '' };
      setCapConfig({ ...capConfig, positions: updated });
      if (selectedPosition === position) {
        const firstActive = Object.keys(updated).find(k => updated[k].active);
        setSelectedPosition(firstActive || null);
      }
    }
  };

  // SVG Visualizer hotspots click handler
  const handlePositionToggle = (position: string) => {
    if (formErrors.positions) {
      setFormErrors(prev => ({ ...prev, positions: undefined }));
    }
    
    if (activeProduct === 'ropa') {
      if (ropaConfig.positions[position]?.active) {
        setSelectedPosition(position);
      } else {
        activatePosition(position);
        setSelectedPosition(position);
      }
    } else if (activeProduct === 'gorras') {
      if (capConfig.positions[position]?.active) {
        setSelectedPosition(position);
      } else {
        activatePosition(position);
        setSelectedPosition(position);
      }
    }
  };

  // Helper updates for position parameters (supports batched partial updates)
  const updateGarmentPositionFields = (posName: string, fields: Partial<GarmentPosition>) => {
    setRopaConfig(prev => {
      const updatedPositions = { ...prev.positions };
      updatedPositions[posName] = {
        ...updatedPositions[posName],
        ...fields
      };
      return { ...prev, positions: updatedPositions };
    });
  };

  const updateCapPositionFields = (posName: string, fields: Partial<CapPosition>) => {
    setCapConfig(prev => {
      const updatedPositions = { ...prev.positions };
      updatedPositions[posName] = {
        ...updatedPositions[posName],
        ...fields
      };
      return { ...prev, positions: updatedPositions };
    });
  };

  const updateGarmentPositionField = (posName: string, field: keyof GarmentPosition, value: any) => {
    updateGarmentPositionFields(posName, { [field]: value });
  };

  const updateCapPositionField = (posName: string, field: keyof CapPosition, value: any) => {
    updateCapPositionFields(posName, { [field]: value });
  };

  // File upload logic with validation
  const handlePositionFileUpload = async (posName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`El archivo es demasiado grande. El límite es de 10 MB. Tu archivo pesa ${(file.size / (1024 * 1024)).toFixed(2)} MB.`);
      e.target.value = '';
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Solo se permiten archivos de imagen en formato JPEG, JPG o PNG.');
      e.target.value = '';
      return;
    }

    try {
      const compressed = await compressImage(file);
      if (activeProduct === 'ropa') {
        updateGarmentPositionFields(posName, {
          file: compressed.file,
          filePreview: compressed.preview
        });
      } else if (activeProduct === 'gorras') {
        updateCapPositionFields(posName, {
          file: compressed.file,
          filePreview: compressed.preview
        });
      }
    } catch (err) {
      console.error("Error compressing file:", err);
      // Fallback
      const reader = new FileReader();
      reader.onloadend = () => {
        if (activeProduct === 'ropa') {
          updateGarmentPositionFields(posName, {
            file,
            filePreview: reader.result as string
          });
        } else if (activeProduct === 'gorras') {
          updateCapPositionFields(posName, {
            file,
            filePreview: reader.result as string
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removePositionFile = (posName: string) => {
    if (activeProduct === 'ropa') {
      updateGarmentPositionFields(posName, { file: null, filePreview: '' });
    } else if (activeProduct === 'gorras') {
      updateCapPositionFields(posName, { file: null, filePreview: '' });
    }
  };



  // Helper: send quote details and files (PDF & ZIP) to Discord Webhook
  const sendQuoteToDiscord = async (pdfDoc: any, pdfFilename: string, folioStr: string): Promise<boolean> => {
    const webhookUrl = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL;
    if (!webhookUrl || webhookUrl.includes('your-webhook-id')) {
      console.warn("Discord Webhook URL not configured or has default placeholder.");
      return false;
    }

    try {
      // 1. Get PDF blob
      const pdfBlob = pdfDoc.output('blob');

      // 2. Get ZIP blob (includes original high-res designs)
      const { blob: zipBlob, filename: zipFilename } = await getQuoteZIPBlob(
        clientDetails.name,
        activeProduct,
        getRopaConfigForDocs(),
        patchConfig,
        capConfig
      );

      // 3. Build message text
      let productDetailsText = '';
      if (activeProduct === 'ropa') {
        const activePositions = Object.keys(ropaConfig.positions)
          .filter(k => ropaConfig.positions[k].active)
          .map(k => `${k} (${ropaConfig.positions[k].type} - ${ropaConfig.positions[k].size})`)
          .join(', ');
        if (garmentList.length > 0) {
          productDetailsText = `**Ropa (${garmentListTotal} pz en ${garmentList.length} combinación(es)):**\n${garmentListLines}\n- Áreas: ${activePositions}`;
        } else {
          productDetailsText = `**Ropa:** ${ropaConfig.model}\n- Color: ${ropaConfig.color}\n- Talla: ${ropaConfig.talla}\n- Cantidad: ${ropaConfig.quantity} pz\n- Áreas: ${activePositions}`;
        }
      } else if (activeProduct === 'parches') {
        productDetailsText = `**Parches:** ${patchConfig.shape}\n- Medidas: ${patchConfig.width}x${patchConfig.height} cm\n- Cantidad: ${patchConfig.quantity} pz`;
      } else if (activeProduct === 'gorras') {
        const activePositions = Object.keys(capConfig.positions)
          .filter(k => capConfig.positions[k].active)
          .map(k => `${k} (${capConfig.positions[k].type} - ${capConfig.positions[k].size})`)
          .join(', ');
        productDetailsText = `**Gorras:** ${capConfig.model}\n- Color: ${capConfig.color}\n- Cantidad: ${capConfig.quantity} pz\n- Áreas: ${activePositions}\n- Bordado 3D: ${capConfig.add3D ? 'Sí' : 'No'}`;
      }

      const discordMessage = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📢 **NUEVA SOLICITUD DE COTIZACIÓN (${folioStr})**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 **Cliente:** ${clientDetails.name}
📱 **Teléfono (WhatsApp):** ${clientDetails.phone}
📧 **Email:** ${clientDetails.email || 'No proporcionado'}
📦 **Detalle del Producto:**
${productDetailsText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Adjunto se encuentra el PDF de la cotización formal y el archivo ZIP con todas las imágenes de referencia cargadas por el cliente._`;

      // 4. Create FormData
      const formData = new FormData();
      formData.append('content', discordMessage);
      formData.append('files[0]', pdfBlob, pdfFilename);
      formData.append('files[1]', zipBlob, zipFilename);

      // 5. Send POST
      const res = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Discord returned status ${res.status}`);
      }

      return true;
    } catch (error) {
      console.error("Error sending quote to Discord Webhook:", error);
      return false;
    }
  };

  // Action: Send WhatsApp (Bypasses popup blocker by uploading files to Discord first and then opening WhatsApp!)
  const handleWhatsAppQuote = async () => {
    // Gate de sesión: enviar una cotización requiere cuenta iniciada. Sin
    // sesión se abre el modal de login/registro sin perder el avance del
    // formulario (todo el estado vive en memoria en este componente).
    if (!user) {
      setShowAuthGate(true);
      return;
    }

    if (!validateForm() || isSending) {
      triggerSubmitShake();
      return;
    }

    setIsSending(true);
    let sendSuccess = false;

    // Fetch incremental folio from WooCommerce API with client-side fallback
    let folioStr = `NK-${Math.floor(100000 + Math.random() * 900000)}`;
    
    // Bypass fetch on localhost to prevent CORS/Cloudflare dev overlay errors
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (!isLocalhost) {
      try {
        // ?rest_route=: la ruta /wp-json/ da 404 con el .htaccess del sitio
        // (por eso los folios salían del fallback aleatorio y no del contador).
        const folioRes = await fetch(`${apiOrigin()}/?rest_route=/nakama/v1/next-folio&nkcb=${Date.now()}`);
        if (folioRes.ok) {
          const data = await folioRes.json();
          if (data && data.formatted) {
            folioStr = data.formatted;
          }
        }
      } catch (e) {
        console.error("Error fetching next folio from WP REST API, using fallback ID:", e);
      }
    }

    // Resumen del producto (se usa en el pedido de WooCommerce y en WhatsApp)
    let summaryText = '';
    if (activeProduct === 'ropa') {
      // Formato con color: "Prendas Textiles (Oversize, Negro, L - 1pz)" — así
      // se lee en el pedido de WooCommerce, Mi Cuenta y el correo del taller.
      summaryText = garmentList.length > 0
        ? `Prendas Textiles (${garmentList.length} combinación(es) - ${garmentListTotal}pz)`
        : `Prendas Textiles (${ropaConfig.model}, ${ropaConfig.color}, ${ropaConfig.talla} - ${ropaConfig.quantity}pz)`;
    } else if (activeProduct === 'parches') {
      summaryText = `Parches Bordados (${patchConfig.shape} - ${patchConfig.quantity}pz)`;
    } else if (activeProduct === 'gorras') {
      summaryText = `Gorras (${capConfig.model} - ${capConfig.quantity}pz)`;
    }

    // Crear el pedido de cotización en WooCommerce (estado "En espera") con el
    // folio como número de pedido: el cliente lo verá en Mi Cuenta y podrá
    // pagar cuando el taller le asigne precio. Si hay sesión (JWT) el pedido
    // queda ligado a su cuenta; no es fatal si falla (el flujo sigue).
    if (!isLocalhost) {
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        const token = typeof window !== 'undefined' ? localStorage.getItem('wp-jwt') : null;
        if (token) headers['Authorization'] = `Bearer ${token}`;
        await fetch(`${apiOrigin()}/?rest_route=/nakama/v1/quote-order&nkcb=${Date.now()}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            folio: folioStr,
            name: clientDetails.name,
            email: clientDetails.email,
            phone: clientDetails.phone,
            summary: summaryText,
          }),
        });
      } catch (e) {
        console.warn('No se pudo registrar el pedido de cotización en WooCommerce:', e);
      }
    }

    const sanitizedClientName = clientDetails.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_-]/g, '');
    const pdfFilename = `cotizacion_nakama_${folioStr.toLowerCase()}_${sanitizedClientName || 'cliente'}.pdf`;

    try {
      // 1. Generate PDF with dynamic folio counter (config enriquecida:
      // incluye la lista de prendas o la talla única en los detalles)
      const doc = generateQuotePDF(
        clientDetails,
        activeProduct,
        getRopaConfigForDocs(),
        patchConfig,
        capConfig,
        folioStr
      );

      // 2. Upload to Discord Webhook with folio identifier
      sendSuccess = await sendQuoteToDiscord(doc, pdfFilename, folioStr);

      if (!sendSuccess) {
        // Fallback: download locally if webhook is down or not configured
        doc.save(pdfFilename);
        alert('No pudimos cargar tus archivos automáticamente al servidor del taller. Se ha descargado el PDF en tu dispositivo. Por favor, adjúntalo manualmente en el chat de WhatsApp que se abrirá a continuación.');
      }
    } catch (err) {
      console.error('Error in quote submission flow:', err);
    } finally {
      setIsSending(false);
    }

    const number = '526622455087';

    const message = `¡Hola Nakama! Acabo de enviar mi solicitud de cotización formal (${folioStr}) para:\n` +
      `*Producto:* ${summaryText}\n` +
      `*Cliente:* ${clientDetails.name}\n` +
      `*Teléfono:* ${clientDetails.phone}\n\n` +
      (sendSuccess 
        ? `_Los archivos de diseño y PDF formal ya se han cargado automáticamente en el sistema del taller con el folio *${folioStr}*. Quedo en espera de la confirmación de recepción._`
        : `_Te adjunto a continuación la cotización en PDF que se acaba de descargar en mi dispositivo._`
      );

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${number}?text=${encoded}`, '_blank');

    // Página de agradecimiento: WhatsApp abre en pestaña nueva y esta pestaña
    // navega a /cotizador/gracias, que lee los datos desde sessionStorage
    // (se pierde al cerrar la pestaña, suficiente para una confirmación).
    try {
      sessionStorage.setItem('nakama_last_quote', JSON.stringify({
        folio: folioStr,
        name: clientDetails.name,
        email: clientDetails.email,
        summary: summaryText,
        date: new Date().toISOString(),
      }));
    } catch { /* sessionStorage bloqueado: la página de gracias muestra la versión genérica */ }
    router.push('/cotizador/gracias');
  };

  const triggerSubmitShake = () => {
    setIsSubmitShaking(true);
    setTimeout(() => setIsSubmitShaking(false), 500);
  };

  /* Tarjeta del diseñador: filtra a quien YA tiene su diseño (que cotice solo
     en la web) de quien necesita diseño desde cero/vectorizar/quitar fondo.
     Se renderiza DOS veces con clases responsivas de Bootstrap — arriba de
     todo en móvil (d-lg-none, antes de iniciar el flujo) y en la columna
     derecha en desktop (d-none d-lg-block). */
  const renderDesignerCard = (visibilityClass: string) => (
    <div className={`custom-card bg-white border border-light-subtle mb-4 ${visibilityClass}`}>
      <h5 className="font-display text-primary-brand mb-2">
        ¿Ya tienes tu imagen, logo o diseño listo en buena calidad?
      </h5>
      <p className="text-muted small mb-3">
        ➡️ ¡Súbelo directamente al cotizador de nuestra web! Ahí podrás ver el
        precio final de tu prenda y hacer tu pedido de inmediato sin esperar a
        que un diseñador te responda.
      </p>
      <h5 className="font-display text-primary-brand mb-2">
        ¿De verdad necesitas que diseñemos desde cero, vectoricemos o quitemos un fondo?
      </h5>
      <p className="text-muted small mb-3">
        ➡️ ¡Perfecto, estás en el lugar correcto! Cuéntanos a detalle tu idea
        aquí abajo y en breve el diseñador te atenderá para cotizar el servicio
        de diseño.
      </p>
      <a
        href={`https://wa.me/526621438401?text=${encodeURIComponent('Hola, vengo del cotizador de Nakama Bordados. Tengo una idea pero aún no tengo el diseño, ¿me ayudas a crearlo?')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-outline-success py-2 font-display text-white border-success w-100"
        style={{ backgroundColor: '#25D366' }}
      >
        <i className="bi bi-whatsapp me-2"></i>
        Solicitar diseño desde cero
      </a>
    </div>
  );

  // Helper panel inputs layout for Ropa positions
  const renderRopaPositionForm = (posName: string, slotTitle: string, isOptional: boolean, slotIndex: number, onRemove?: () => void) => {
    const pos = ropaConfig.positions[posName];
    if (!pos) return null;

    let allowedPositions = availableGarmentPositions;
    if (ropaConfig.model === 'Tank Top') {
      allowedPositions = availableGarmentPositions.filter(p => p !== 'Manga Izquierda' && p !== 'Manga Derecha');
    }
    
    const activeKeys = Object.keys(ropaConfig.positions).filter(k => ropaConfig.positions[k].active);
    const selectOptions = allowedPositions.filter(p => p === posName || !activeKeys.includes(p));

    const handleSelectPosition = (newPos: string) => {
      const updated = { ...ropaConfig.positions };
      updated[newPos] = {
        ...updated[newPos],
        type: pos.type,
        size: pos.size,
        file: pos.file,
        filePreview: pos.filePreview,
        active: true
      };
      if (newPos !== posName) {
        updated[posName] = { ...updated[posName], active: false, file: null, filePreview: '' };
      }
      setRopaConfig({ ...ropaConfig, positions: updated });
      setSelectedPosition(newPos);
    };

    const isSlotActive = selectedPosition === posName;

    return (
      <div 
        onClick={() => {
          setSelectedPosition(posName);
        }}
        className={`p-3 mb-3 border rounded transition bg-white ${isSlotActive ? 'border-danger shadow-sm' : 'border-light-subtle'}`}
        style={{ cursor: 'pointer', borderWidth: isSlotActive ? '2px' : '1px' }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className={`badge ${isSlotActive ? 'bg-danger' : 'bg-secondary'} rounded-pill`}>
            {slotTitle}: {posName}
          </span>
          {isOptional && onRemove && (
            <button 
              type="button" 
              className="btn btn-link text-danger p-0 m-0 text-decoration-none small"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <i className="bi bi-x-circle-fill me-1"></i> Eliminar
            </button>
          )}
        </div>

        <div className="row g-3" onClick={(e) => e.stopPropagation()}>
          {/* Cambiar Posición Select */}
          <div className="col-12">
            <label className="form-label nk-step-label small uppercase fw-bold">Cambiar Posición:</label>
            <select
              className="form-select"
              value={posName}
              onChange={(e) => handleSelectPosition(e.target.value)}
            >
              <option value={posName}>{posName}</option>
              {selectOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          {/* Técnica */}
          <div className="col-12 col-sm-6">
            <label className="form-label nk-step-label small uppercase fw-bold">Técnica:</label>
            <select
              className="form-select"
              value={pos.type}
              onChange={(e) => updateGarmentPositionField(posName, 'type', e.target.value as any)}
            >
              <option value="DTF">DTF (Estampado digital a todo color)</option>
              <option value="Bordado">Bordado</option>
            </select>
          </div>

          {/* Medidas */}
          <div className="col-12 col-sm-6">
            <label className="form-label nk-step-label small uppercase fw-bold">Medida aprox. en CM (Ej. 10x10):</label>
            <input
              type="text"
              className={`form-control ${getPositionSizeError(pos.type, pos.size) ? 'is-invalid' : ''}`}
              value={pos.size}
              onChange={(e) => updateGarmentPositionField(posName, 'size', e.target.value)}
              placeholder="Ancho x Alto en CM"
            />
            {getPositionSizeError(pos.type, pos.size) && (
              <div className="invalid-feedback d-block">
                {getPositionSizeError(pos.type, pos.size)}
              </div>
            )}
          </div>

          {/* Archivos */}
          <div className="col-12">
            <label className="form-label nk-step-label small uppercase fw-bold">Diseño de Referencia (Máx. 10MB, JPEG/PNG):</label>
            {!pos.filePreview ? (
              <div className="border border-secondary border-dashed p-3 rounded text-center bg-light">
                <input
                  type="file"
                  id={`file-ropa-${posName}`}
                  className="d-none"
                  accept=".jpeg,.jpg,.png"
                  onChange={(e) => handlePositionFileUpload(posName, e)}
                />
                <label htmlFor={`file-ropa-${posName}`} className="m-0 cursor-pointer text-primary-brand font-display fs-5">
                  <i className="bi bi-cloud-arrow-up-fill me-2 fs-4"></i>
                  Subir Archivo
                </label>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-3 p-2 bg-light rounded border border-light-subtle">
                <img 
                  src={pos.filePreview} 
                  alt="preview" 
                  className="object-fit-cover rounded border border-secondary bg-white"
                  style={{ width: '60px', height: '60px' }}
                />
                <div className="flex-grow-1 overflow-hidden">
                  <p className="small m-0 text-truncate text-dark fw-bold">{pos.file?.name}</p>
                  <p className="small m-0 text-muted">{(pos.file!.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <button 
                  type="button" 
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => removePositionFile(posName)}
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Helper panel inputs layout for Cap positions
  const renderGorraPositionForm = (posName: string, slotTitle: string, isOptional: boolean, slotIndex: number, onRemove?: () => void) => {
    const pos = capConfig.positions[posName];
    if (!pos) return null;

    const allowed = ['Frontal', 'Lateral izquierdo', 'Lateral derecho', 'Parte trasera'];
    const activeKeys = Object.keys(capConfig.positions).filter(k => capConfig.positions[k].active);
    const selectOptions = allowed.filter(p => p === posName || !activeKeys.includes(p));

    const handleSelectPosition = (newPos: string) => {
      const updated = { ...capConfig.positions };
      updated[newPos] = {
        ...updated[newPos],
        type: pos.type,
        size: pos.size,
        file: pos.file,
        filePreview: pos.filePreview,
        active: true
      };
      if (newPos !== posName) {
        updated[posName] = { ...updated[posName], active: false, file: null, filePreview: '' };
      }
      setCapConfig({ ...capConfig, positions: updated });
      setSelectedPosition(newPos);
    };

    const isSlotActive = selectedPosition === posName;

    return (
      <div 
        onClick={() => {
          setSelectedPosition(posName);
        }}
        className={`p-3 mb-3 border rounded transition bg-white ${isSlotActive ? 'border-danger shadow-sm' : 'border-light-subtle'}`}
        style={{ cursor: 'pointer', borderWidth: isSlotActive ? '2px' : '1px' }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className={`badge ${isSlotActive ? 'bg-danger' : 'bg-secondary'} rounded-pill`}>
            {slotTitle}: {posName}
          </span>
          {isOptional && onRemove && (
            <button 
              type="button" 
              className="btn btn-link text-danger p-0 m-0 text-decoration-none small"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <i className="bi bi-x-circle-fill me-1"></i> Eliminar
            </button>
          )}
        </div>

        <div className="row g-3" onClick={(e) => e.stopPropagation()}>
          {/* Posición Select */}
          <div className="col-12">
            <label className="form-label nk-step-label small uppercase fw-bold">Cambiar Posición:</label>
            <select
              className="form-select"
              value={posName}
              onChange={(e) => handleSelectPosition(e.target.value)}
            >
              <option value={posName}>{posName}</option>
              {selectOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Técnica */}
          <div className="col-12 col-sm-6">
            <label className="form-label nk-step-label small uppercase fw-bold">Técnica:</label>
            <select
              className="form-select"
              value={pos.type}
              onChange={(e) => updateCapPositionField(posName, 'type', e.target.value as any)}
            >
              <option value="Bordado">Bordado</option>
              <option value="TPU">TPU (Vinil Textil para detalles pequeños)</option>
            </select>
          </div>

          {/* Tamaño Recomendado */}
          <div className="col-12 col-sm-6">
            <label className="form-label nk-step-label small uppercase fw-bold">Tamaño Recomendado:</label>
            <select
              className="form-select"
              value={pos.size}
              onChange={(e) => updateCapPositionField(posName, 'size', e.target.value as any)}
            >
              <option value="Pequeño">Pequeño (Discreto)</option>
              <option value="Regular">Regular (Normal)</option>
              <option value="Grande">Grande (Llamativo)</option>
            </select>
          </div>

          {/* Subir archivo */}
          <div className="col-12">
            <label className="form-label nk-step-label small uppercase fw-bold">Diseño de Referencia (Máx. 10MB, JPEG/PNG):</label>
            {!pos.filePreview ? (
              <div className="border border-secondary border-dashed p-3 rounded text-center bg-light">
                <input
                  type="file"
                  id={`file-cap-${posName}`}
                  className="d-none"
                  accept=".jpeg,.jpg,.png"
                  onChange={(e) => handlePositionFileUpload(posName, e)}
                />
                <label htmlFor={`file-cap-${posName}`} className="m-0 cursor-pointer text-primary-brand font-display fs-5">
                  <i className="bi bi-cloud-arrow-up-fill me-2 fs-4"></i>
                  Subir Archivo
                </label>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-3 p-2 bg-light rounded border border-light-subtle">
                <img 
                  src={pos.filePreview} 
                  alt="preview" 
                  className="object-fit-cover rounded border border-secondary bg-white"
                  style={{ width: '60px', height: '60px' }}
                />
                <div className="flex-grow-1 overflow-hidden">
                  <p className="small m-0 text-truncate text-dark fw-bold">{pos.file?.name}</p>
                  <p className="small m-0 text-muted">{(pos.file!.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <button 
                  type="button" 
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => removePositionFile(posName)}
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Main customizer section renderer
  const renderActivePositionsPanel = () => {
    if (activeProduct === 'parches') return null;

    return (
      <div className="custom-card mb-4 bg-white border border-light-subtle">
        <h3 className="font-display text-primary-brand mb-1">
          <i className="bi bi-gear-wide-connected me-2"></i>
          Áreas de Personalización Activas
        </h3>
        <p className="text-muted small mb-4">
          A continuación, configura las técnicas, medidas y diseños para las posiciones seleccionadas.
        </p>

        {formErrors.positions && (
          <div className="alert alert-danger py-2 small mb-3 border-0 bg-danger bg-opacity-10 text-danger">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {formErrors.positions}
          </div>
        )}

        {activeProduct === 'ropa' ? (
          <div>
            {(() => {
              const activeKeys = Object.keys(ropaConfig.positions).filter(k => ropaConfig.positions[k].active);
              let allowed = availableGarmentPositions;
              if (ropaConfig.model === 'Tank Top') {
                allowed = availableGarmentPositions.filter(p => p !== 'Manga Izquierda' && p !== 'Manga Derecha');
              }
              const inactiveKeys = allowed.filter(k => !activeKeys.includes(k));

              return (
                <>
                  {activeKeys.map((posName, index) => (
                    <div key={posName}>
                      {renderRopaPositionForm(
                        posName,
                        index === 0 ? 'Área Principal' : `Área ${index + 1} (Opcional)`,
                        activeKeys.length > 1,
                        index + 1,
                        () => deactivatePosition(posName)
                      )}
                    </div>
                  ))}

                  {inactiveKeys.length > 0 && (
                    <div className="text-center py-2 mt-2 border border-dashed rounded bg-light border-secondary">
                      <button
                        type="button"
                        className="btn btn-outline-danger font-display px-4 py-2 border-primary-brand text-primary-brand bg-white"
                        onClick={() => {
                          const nextToActivate = inactiveKeys[0];
                          activatePosition(nextToActivate);
                          setSelectedPosition(nextToActivate);
                        }}
                      >
                        <i className="bi bi-plus-circle-fill me-2"></i>
                        Añadir otra Área de Personalizado
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          <div>
            {(() => {
              const allowed = ['Frontal', 'Lateral izquierdo', 'Lateral derecho', 'Parte trasera'];
              const activeKeys = Object.keys(capConfig.positions).filter(k => capConfig.positions[k].active);
              const inactiveKeys = allowed.filter(k => !activeKeys.includes(k));

              return (
                <>
                  {activeKeys.map((posName, index) => (
                    <div key={posName}>
                      {renderGorraPositionForm(
                        posName,
                        index === 0 ? 'Área Principal' : `Área ${index + 1} (Opcional)`,
                        activeKeys.length > 1,
                        index + 1,
                        () => deactivatePosition(posName)
                      )}
                    </div>
                  ))}

                  {inactiveKeys.length > 0 && (
                    <div className="text-center py-2 mt-2 border border-dashed rounded bg-light border-secondary">
                      <button
                        type="button"
                        className="btn btn-outline-danger font-display px-4 py-2 border-primary-brand text-primary-brand bg-white"
                        onClick={() => {
                          const nextToActivate = inactiveKeys[0];
                          activatePosition(nextToActivate);
                          setSelectedPosition(nextToActivate);
                        }}
                      >
                        <i className="bi bi-plus-circle-fill me-2"></i>
                        Añadir otra Área de Personalizado
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const getActivePositionsArray = (): string[] => {
    if (activeProduct === 'ropa') {
      return Object.entries(ropaConfig.positions)
        .filter(([_, p]) => p.active)
        .map(([name]) => name);
    } else if (activeProduct === 'gorras') {
      return Object.entries(capConfig.positions)
        .filter(([_, p]) => p.active)
        .map(([name]) => name);
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-light text-dark pb-5">
      {/* 1. Header */}
      <header className="py-3 border-bottom border-light-subtle bg-white">
        <div className="container d-flex justify-content-center justify-content-sm-between align-items-center">
          <div className="d-flex flex-column flex-sm-row align-items-center gap-3 text-center text-sm-start">
            <img 
              id="nk-brand-logo" 
              src="/logo.png" 
              alt="Nakama Logo" 
              className="img-fluid"
              style={{ maxHeight: '55px', width: 'auto', objectFit: 'contain' }} 
            />
            <div>
              <h1 className="text-muted small m-0 uppercase tracking-widest font-display fs-5 fs-sm-4 fw-bold">
                LABORATORIO DE PRENDAS PERSONALIZADAS
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Marquee Ticker */}
      <Marquee />

      {/* 3. Main Container Workspace */}
      <div className="container mt-5">
        <div className="row g-4">
          
          {/* COLUMNA IZQUIERDA: CONFIGURADOR + VISUALIZADOR */}
          <div className="col-12 col-lg-8">

            {/* ¿SIN DISEÑO? — en móvil es el PRIMER recuadro, antes de iniciar el flujo */}
            {renderDesignerCard('d-lg-none')}

            {/* TABS DE PRODUCTO */}
            <div className="custom-card mb-4 bg-white border border-light-subtle">
              <h5 className="nk-step-label small mb-3">Paso 1: Selecciona el tipo de producto</h5>
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`custom-tab-btn flex-grow-1 flex-sm-grow-0 ${activeProduct === 'ropa' ? 'active' : ''}`}
                  onClick={() => setActiveProduct('ropa')}
                >
                  <i className="bi bi-tag-fill me-2"></i> Ropa / Playeras / Hoodies
                </button>
                <button
                  type="button"
                  className={`custom-tab-btn flex-grow-1 flex-sm-grow-0 ${activeProduct === 'parches' ? 'active' : ''}`}
                  onClick={() => setActiveProduct('parches')}
                >
                  <i className="bi bi-shield-fill me-2"></i> Parches Bordados
                </button>
                <button
                  type="button"
                  className={`custom-tab-btn flex-grow-1 flex-sm-grow-0 ${activeProduct === 'gorras' ? 'active' : ''}`}
                  onClick={() => setActiveProduct('gorras')}
                >
                  <span className="nk-cap-icon me-2" aria-hidden="true"></span> Gorras
                </button>
              </div>
            </div>

            {/* VISUALIZADOR INTERACTIVO */}
            <Visualizer
              productType={activeProduct}
              selectedPositions={getActivePositionsArray()}
              onPositionToggle={handlePositionToggle}
              onPositionRemove={deactivatePosition}
              selectedEditingPosition={selectedPosition}
              onSelectPositionForEditing={setSelectedPosition}
              patchShape={patchConfig.shape}
              garmentModel={ropaConfig.model}
            />

            {/* AREAS DE PERSONALIZACION ACTIVAS EDITORES */}
            {renderActivePositionsPanel()}

            {/* CONFIGURACION GENERAL POR PRODUCTO */}
            {activeProduct === 'ropa' && (
              <RopaConfig
                config={ropaConfig}
                onChange={setRopaConfig}
                garmentList={garmentList}
                onAddToList={addGarmentToList}
                onRemoveFromList={removeGarmentFromList}
              />
            )}
            {activeProduct === 'parches' && (
              <ParchesConfig config={patchConfig} onChange={setPatchConfig} />
            )}
            {activeProduct === 'gorras' && (
              <GorrasConfig config={capConfig} onChange={setCapConfig} />
            )}

          </div>

          {/* COLUMNA DERECHA: DATOS DEL CLIENTE + RESUMEN STICKY */}
          <div className="col-12 col-lg-4">
            <div className="position-sticky" style={{ top: '24px' }}>
              
              {/* ¿SIN DISEÑO? CONTACTO CON DISEÑADOR (solo desktop; en móvil va arriba de todo) */}
              {renderDesignerCard('d-none d-lg-block')}

              {/* DATOS DEL CLIENTE */}
              <div className="custom-card bg-white border border-light-subtle mb-4">
                <h4 className="font-display text-primary-brand mb-3">
                  <i className="bi bi-person-lines-fill me-2"></i>
                  Datos del Cliente
                </h4>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label nk-step-label small uppercase fw-bold">Nombre Completo *</label>
                    <input
                      type="text"
                      className={`form-control ${formErrors.name ? 'is-invalid border-danger' : ''}`}
                      value={clientDetails.name}
                      onChange={(e) => {
                        setClientDetails({ ...clientDetails, name: e.target.value });
                        if (formErrors.name) setFormErrors({ ...formErrors, name: undefined });
                      }}
                      placeholder="Tu nombre o contacto"
                      required
                    />
                    {formErrors.name && (
                      <div className="text-danger small mt-1">
                        <i className="bi bi-exclamation-circle-fill me-1"></i>
                        {formErrors.name}
                      </div>
                    )}
                  </div>
                  <div className="col-12">
                    <label className="form-label nk-step-label small uppercase fw-bold">Teléfono de Contacto (WhatsApp) *</label>
                    <input
                      type="text"
                      className={`form-control ${formErrors.phone ? 'is-invalid border-danger' : ''}`}
                      value={clientDetails.phone}
                      onChange={(e) => {
                        setClientDetails({ ...clientDetails, phone: e.target.value });
                        if (formErrors.phone) setFormErrors({ ...formErrors, phone: undefined });
                      }}
                      placeholder="Ej. +52 662 123 4567"
                      required
                    />
                    {formErrors.phone && (
                      <div className="text-danger small mt-1">
                        <i className="bi bi-exclamation-circle-fill me-1"></i>
                        {formErrors.phone}
                      </div>
                    )}
                  </div>
                  <div className="col-12">
                    <label className="form-label nk-step-label small uppercase fw-bold">Correo Electrónico</label>
                    <input
                      type="email"
                      className="form-control"
                      value={clientDetails.email}
                      onChange={(e) => setClientDetails({ ...clientDetails, email: e.target.value })}
                      placeholder="ejemplo@correo.com"
                    />
                  </div>
                </div>
              </div>

              {/* RESUMEN DE COTIZACIÓN */}
              <div className="custom-card bg-white border border-light-subtle">
                <h4 className="font-display text-primary-brand mb-3">
                  <i className="bi bi-file-earmark-bar-graph-fill me-2"></i>
                  Resumen del Pedido
                </h4>
                
                {/* Detalles de resumen */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                    <span className="text-muted small">Producto:</span>
                    <span className="fw-semibold text-dark uppercase">
                      {activeProduct === 'ropa' ? 'Prendas Textiles' : activeProduct === 'parches' ? 'Parches Bordados' : 'Gorras'}
                    </span>
                  </div>

                  {activeProduct === 'ropa' && garmentList.length === 0 && (
                    <>
                      <div className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                        <span className="text-muted small">Modelo:</span>
                        <span className="text-dark text-truncate" style={{ maxWidth: '200px' }}>{ropaConfig.model}</span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                        <span className="text-muted small">Color de Prenda:</span>
                        <span className="text-dark">{ropaConfig.color}</span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                        <span className="text-muted small">Talla:</span>
                        <span className="text-dark">{ropaConfig.talla}</span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                        <span className="text-muted small">Cantidad:</span>
                        <span className="text-primary-brand fw-bold">{ropaConfig.quantity} pz(s)</span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                        <span className="text-muted small">Áreas a personalizar:</span>
                        <span className="text-dark fw-semibold">
                          {Object.values(ropaConfig.positions).filter(p => p.active).length} área(s)
                        </span>
                      </div>
                    </>
                  )}

                  {/* Con lista: el resumen enumera cada combinación agregada */}
                  {activeProduct === 'ropa' && garmentList.length > 0 && (
                    <>
                      {garmentList.map(item => (
                        <div key={item.id} className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                          <span className="text-muted small text-truncate" style={{ maxWidth: '200px' }}>
                            {item.model} &middot; {item.color} &middot; {item.talla}
                          </span>
                          <span className="text-dark fw-semibold">{item.quantity} pz</span>
                        </div>
                      ))}
                      <div className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                        <span className="text-muted small">Total de prendas:</span>
                        <span className="text-primary-brand fw-bold">{garmentListTotal} pz(s)</span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                        <span className="text-muted small">Áreas a personalizar:</span>
                        <span className="text-dark fw-semibold">
                          {Object.values(ropaConfig.positions).filter(p => p.active).length} área(s)
                        </span>
                      </div>
                    </>
                  )}

                  {activeProduct === 'parches' && (
                    <>
                      <div className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                        <span className="text-muted small">Forma:</span>
                        <span className="text-dark">{patchConfig.shape}</span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                        <span className="text-muted small">Medidas:</span>
                        <span className="text-dark">{patchConfig.width || '-'} x {patchConfig.height || '-'} cm</span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                        <span className="text-muted small">Cantidad:</span>
                        <span className="text-primary-brand fw-bold">{patchConfig.quantity} pz(s)</span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                        <span className="text-muted small">Diseño cargado:</span>
                        <span className={patchConfig.file ? "text-success fw-bold" : "text-warning"}>
                          {patchConfig.file ? 'Sí' : 'No'}
                        </span>
                      </div>
                    </>
                  )}

                  {activeProduct === 'gorras' && (
                    <>
                      <div className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                        <span className="text-muted small">Modelo:</span>
                        <span className="text-dark">{capConfig.model}</span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                        <span className="text-muted small">Color de Gorra:</span>
                        <span className="text-dark">{capConfig.color}</span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                        <span className="text-muted small">Cantidad:</span>
                        <span className="text-primary-brand fw-bold">{capConfig.quantity} pz(s)</span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                        <span className="text-muted small">Áreas a personalizar:</span>
                        <span className="text-dark fw-semibold">
                          {Object.values(capConfig.positions).filter(p => p.active).length} área(s)
                        </span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom border-light-subtle py-2">
                        <span className="text-muted small">Bordado en 3D:</span>
                        <span className="text-dark">{capConfig.add3D ? 'Sí' : 'No'}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* WhatsApp Security Alert Note */}
                <div className="alert alert-info py-2 small mb-3 border-0 bg-light text-dark">
                  <i className="bi bi-info-circle-fill me-2 text-primary-brand"></i>
                  <strong>Proceso Automatizado:</strong> Al hacer clic abajo, tus diseños y cotización en PDF se enviarán de forma automática al sistema de nuestro taller, y te redirigiremos a WhatsApp para confirmar con un asesor. ¡No tienes que descargar ni adjuntar nada!
                </div>

                {/* ACCIONES */}
                <div className="d-grid gap-3">
                  {!authLoading && !user ? (
                    // Sin sesión: el botón invita a iniciar sesión/registrarse.
                    // El cliente ya pudo armar toda su cotización (solo observar);
                    // el envío queda detrás del gate.
                    <button
                      type="button"
                      className="btn btn-dark py-3 fs-5 font-display border-0"
                      onClick={() => setShowAuthGate(true)}
                    >
                      <i className="bi bi-lock-fill me-2"></i>
                      Inicia sesión para enviar tu cotización
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`btn btn-outline-success py-3 fs-5 font-display text-white border-success ${isSubmitShaking ? 'btn-shake' : ''}`}
                      style={{ backgroundColor: '#25D366' }}
                      onClick={handleWhatsAppQuote}
                      disabled={isSending || authLoading}
                    >
                      {isSending ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Cargando archivos al taller...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-whatsapp me-2"></i>
                          Confirmar y Enviar vía WhatsApp
                        </>
                      )}
                    </button>
                  )}
                </div>

                <p className="text-muted small text-center m-0 mt-3 font-display tracking-wide uppercase">
                  {!authLoading && !user
                    ? 'Crea tu cuenta o inicia sesión para enviar tu cotización'
                    : 'Revisamos y contestamos en menos de 2 horas hábiles'}
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>

      {showAuthGate && (
        <AuthGateModal
          onClose={() => setShowAuthGate(false)}
          onSuccess={() => setShowAuthGate(false)}
        />
      )}
    </div>
  );
};
export default App;
