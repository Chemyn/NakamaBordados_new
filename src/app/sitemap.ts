import { MetadataRoute } from 'next'
import { getProductsFromWP } from '@/lib/queries'
import { Product } from '@/types/product'
 
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://nakamabordados.com'
  
  // Fetch products from WordPress
  let products: Product[] = []
  try {
    products = await getProductsFromWP(200) // Fetch up to 200 products for sitemap to avoid timeout
  } catch (error) {
    console.error('Error fetching products for sitemap:', error)
  }

  const productUrls = products.map((product) => ({
    url: `${baseUrl}/product/${product.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const staticUrls = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/store`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mi-cuenta`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
  ]

  return [...staticUrls, ...productUrls]
}
