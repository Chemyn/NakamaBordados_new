import { MetadataRoute } from 'next'
import { apiFetchProductSlugs } from '@/lib/products-api'

// Requerido para output: 'export'. Sin new Date() → salida determinista
// (el FTP incremental no lo re-sube en cada build si no cambió el catálogo).
export const dynamic = 'force-static'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://nakamabordados.com'

  // Slugs desde el API PHP/MySQL rápido (no GraphQL).
  let slugs: string[] = []
  try {
    slugs = await apiFetchProductSlugs()
  } catch (error) {
    console.error('Error fetching product slugs for sitemap:', error)
  }

  const productUrls = slugs.map((slug) => ({
    url: `${baseUrl}/product?id=${slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const staticUrls = [
    { url: baseUrl, changeFrequency: 'daily' as const, priority: 1 },
    { url: `${baseUrl}/store`, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/mi-cuenta`, changeFrequency: 'monthly' as const, priority: 0.3 },
  ]

  return [...staticUrls, ...productUrls]
}
