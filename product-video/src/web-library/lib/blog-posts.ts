export type BlogCategory = 'Product' | 'Company'

/** Visual for the featured card on `/blog`. */
export type BlogFeaturedListBanner = 'marketing-org' | 'brain' | 'vibey-orb'

export type BlogPostMeta = {
  slug: string
  title: string
  excerpt: string
  date: string
  badge: string
  category: BlogCategory
  featured?: boolean
  featuredListBanner?: BlogFeaturedListBanner
  author?: string
  authorImage?: string
  readingTime?: number
  comingSoon?: boolean
}

export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: 'vibey-beta',
    title: 'Introducing Vibey Beta',
    excerpt:
      'A team of specialist AI agents, each with their own memory, tools, and expertise. Studio, Missions, Autopilot, The Brain, Skills, and a built-in marketing engine that publishes live.',
    date: '2026-04-06',
    badge: 'New',
    category: 'Product',
    featured: true,
    featuredListBanner: 'marketing-org',
    author: 'Sefy Tofan',
    authorImage: '/images/authors/sefy-tofan.png',
    readingTime: 4,
  },
  {
    slug: 'the-brain',
    title: 'Building an Identity Not a Database',
    excerpt:
      "Every AI conversation resets. Your team shouldn't. How the Brain gives your agents context that compounds into identity — and why the output feels different.",
    date: '2026-04-06',
    badge: 'Deep Dive',
    category: 'Product',
    author: 'Sefy Tofan',
    authorImage: '/images/authors/sefy-tofan.png',
    readingTime: 9,
    featuredListBanner: 'brain',
  },
  {
    slug: 'the-harness',
    title: 'The Age of AI Organizations',
    excerpt:
      'Not an agent with tools. Not a model with integrations. Why the organizing infrastructure around your AI team is the thing that actually changes what you can build.',
    date: '2026-04-07',
    badge: 'Founders Note',
    category: 'Product',
    author: 'Sefy Tofan',
    authorImage: '/images/authors/sefy-tofan.png',
    readingTime: 8,
    featuredListBanner: 'vibey-orb',
  },
]

export const BLOG_CATEGORIES: BlogCategory[] = ['Product', 'Company']
