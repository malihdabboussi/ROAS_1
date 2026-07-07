import type { MetadataRoute } from 'next'
import { BLOG_POSTS } from '@/lib/blog-posts'
import { COMPARE_SLUGS } from '@/lib/compare-content'
import { FEATURE_SLUGS } from '@/lib/feature-pages-content'

const BASE_URL = 'https://vibey.im'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/features`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/enterprise`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/compare`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ]

  const featureRoutes: MetadataRoute.Sitemap = FEATURE_SLUGS.map((slug) => ({
    url: `${BASE_URL}/features/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.filter((p) => !p.comingSoon).map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const compareRoutes: MetadataRoute.Sitemap = COMPARE_SLUGS.map((slug) => ({
    url: `${BASE_URL}/compare/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticRoutes, ...featureRoutes, ...blogRoutes, ...compareRoutes]
}
