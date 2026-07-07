import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/vibey-pitch', '/api/'],
    },
    sitemap: 'https://vibey.im/sitemap.xml',
  }
}
