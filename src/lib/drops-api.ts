import { apiOrigin } from '@/lib/api-host';
import type { DropCampaign, DropsResponse } from '@/types/drop';

const API_BASE = process.env.NEXT_PUBLIC_WP_REST_URL || apiOrigin();

export async function apiFetchDrops(productId?: number): Promise<DropsResponse> {
  const suffix = productId ? `&product_id=${encodeURIComponent(String(productId))}` : '';
  try {
    const response = await fetch(`${API_BASE}/?rest_route=/nakama/v1/drops${suffix}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return { items: [], serverNow: new Date().toISOString() };
    const data = await response.json();
    return {
      items: Array.isArray(data?.items) ? data.items as DropCampaign[] : [],
      serverNow: typeof data?.serverNow === 'string' ? data.serverNow : new Date().toISOString(),
    };
  } catch (error) {
    // El frontend estático debe degradar a estado vacío si WordPress está
    // temporalmente fuera de alcance (incluido el entorno local sin CORS).
    console.warn('apiFetchDrops unavailable:', error);
    return { items: [], serverNow: new Date().toISOString() };
  }
}
