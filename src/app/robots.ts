import { MetadataRoute } from 'next'

// Requerido para output: 'export' (genera /robots.txt estático en build).
export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/mi-cuenta/'],
    },
    sitemap: 'https://nakamabordados.com/sitemap.xml',
  }
}
