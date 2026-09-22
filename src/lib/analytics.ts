/**
 * Tracking del frontend: Google Analytics 4 (gtag.js) + Meta Pixel (fbevents).
 *
 * El sitio es headless: Site Kit y el plugin del Pixel en WordPress solo
 * inyectan sus scripts en páginas renderizadas por WP (el checkout); el resto
 * del tráfico pasa por este export estático, así que los tags se cargan aquí
 * (componente Analytics) con los MISMOS IDs. La confirmación de pedido es
 * headless, así que el frontend dispara Purchase después de que WordPress
 * valida el pedido y su clave.
 *
 * Los IDs son públicos por diseño (visibles en el HTML de cualquier sitio con
 * analytics). La confirmación headless conserva `order-received` en la ruta
 * para la conversión configurada por URL en Meta. El token de la Conversions
 * API es secreto y vive SOLO en WP.
 */

export const GA_MEASUREMENT_ID = 'G-J7J9RPGN9R';
export const FB_PIXEL_ID = '300714283117069';
export const ANALYTICS_READY_EVENT = 'nakama:analytics-ready';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Solo se mide en producción (mismo patrón que apiOrigin): en localhost/dev
 * los scripts ni se cargan, para no contaminar los datos de GA4 y del Pixel.
 */
export function isTrackingHost(): boolean {
  return (
    typeof window !== 'undefined' &&
    /(^|\.)nakamabordados\.com$/i.test(window.location.hostname)
  );
}

export interface TrackedProduct {
  id: string | number;
  name: string;
  price: number;
  currency?: string;
  quantity?: number;
  contentType?: 'product' | 'product_group';
}

export interface TrackedPurchase {
  orderId: string | number;
  value: number;
  currency?: string;
}

const purchaseMemoryFallback = new Set<string>();

function purchaseStorageKey(orderId: string): string {
  return `nakama:meta-purchase:${orderId}`;
}

function wasPurchaseTracked(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1' || purchaseMemoryFallback.has(key);
  } catch {
    return purchaseMemoryFallback.has(key);
  }
}

function rememberPurchase(key: string): void {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    purchaseMemoryFallback.add(key);
  }
}

/** page_view (GA4) + PageView (Pixel) en cada navegación, incluida la inicial. */
export function trackPageView(url: string): void {
  try {
    window.gtag?.('event', 'page_view', { page_path: url });
    window.fbq?.('track', 'PageView');
  } catch {
    // El tracking nunca debe romper la navegación.
  }
}

/** view_item (GA4) + ViewContent (Pixel) al abrir una página de producto. */
export function trackViewContent(product: TrackedProduct): void {
  try {
    const currency = product.currency || 'MXN';
    window.gtag?.('event', 'view_item', {
      currency,
      value: product.price,
      items: [
        {
          item_id: String(product.id),
          item_name: product.name,
          price: product.price,
        },
      ],
    });
    window.fbq?.('track', 'ViewContent', {
      content_ids: [String(product.id)],
      content_name: product.name,
      content_type: product.contentType || 'product',
      value: product.price,
      currency,
    });
  } catch {
    // El tracking nunca debe romper la página.
  }
}

/** add_to_cart (GA4) + AddToCart (Pixel) al agregar un item al carrito. */
export function trackAddToCart(product: TrackedProduct): void {
  try {
    const currency = product.currency || 'MXN';
    const quantity = product.quantity || 1;
    window.gtag?.('event', 'add_to_cart', {
      currency,
      value: product.price * quantity,
      items: [
        {
          item_id: String(product.id),
          item_name: product.name,
          price: product.price,
          quantity,
        },
      ],
    });
    window.fbq?.('track', 'AddToCart', {
      content_ids: [String(product.id)],
      content_name: product.name,
      content_type: product.contentType || 'product',
      value: product.price * quantity,
      currency,
    });
  } catch {
    // El tracking nunca debe romper el carrito.
  }
}

/** Purchase (Pixel) cuando WordPress ya validó el pedido confirmado. */
export function trackPurchase(purchase: TrackedPurchase): void {
  try {
    const orderId = String(purchase.orderId).trim();
    const value = Number(purchase.value);
    if (!orderId || !Number.isFinite(value) || typeof window.fbq !== 'function') return;

    const storageKey = purchaseStorageKey(orderId);
    if (wasPurchaseTracked(storageKey)) return;

    window.fbq(
      'track',
      'Purchase',
      {
        value,
        currency: (purchase.currency || 'MXN').toUpperCase(),
        order_id: orderId,
      },
      { eventID: `nakama-purchase-${orderId}` },
    );
    rememberPurchase(storageKey);
  } catch {
    // El tracking nunca debe romper la confirmación del pedido.
  }
}
