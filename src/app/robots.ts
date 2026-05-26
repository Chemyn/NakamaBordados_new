import { MetadataRoute } from 'next'
 
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
