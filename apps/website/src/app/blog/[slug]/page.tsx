import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { TheBrainArticle } from '@/components/blog/TheBrainArticle'
import { TheHarnessArticle } from '@/components/blog/TheHarnessArticle'
import { VibeyBetaArticle } from '@/components/blog/VibeyBetaArticle'
import { Footer } from '@/components/Footer'
import { BLOG_POSTS } from '@/lib/blog-posts'
import {
  getAgentLibraryForMarketing,
  getMarketingVibeyPortraitUrl,
} from '@/lib/get-agent-library-for-marketing'
import { getMarketingHrShowcaseData } from '@/lib/marketing-hr-showcase-data'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = BLOG_POSTS.find((p) => p.slug === slug)
  if (!post) return { title: 'Not found | ROAS' }
  const url = `https://vibey.im/blog/${slug}`
  return {
    title: `${post.title} | ROAS`,
    description: post.excerpt,
    openGraph: {
      title: `${post.title} | ROAS`,
      description: post.excerpt,
      url,
      siteName: 'ROAS',
      type: 'article',
      publishedTime: post.date,
      authors: post.author ? [post.author] : undefined,
      images: post.authorImage
        ? [{ url: post.authorImage, width: 800, height: 800, alt: post.author ?? 'ROAS' }]
        : [{ url: '/Logos/logov2/icon-text-white.png', width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@usevibey',
      title: `${post.title} | ROAS`,
      description: post.excerpt,
    },
    alternates: { canonical: url },
  }
}

function PostBody({
  slug,
  agents,
  vibeyPortraitUrl,
  hrShowcaseData,
}: {
  slug: string
  agents?: PublicAgentLibraryRow[]
  vibeyPortraitUrl?: string
  hrShowcaseData?: Awaited<ReturnType<typeof getMarketingHrShowcaseData>>
}) {
  if (slug === 'vibey-beta')
    return (
      <VibeyBetaArticle
        agents={agents}
        vibeyPortraitUrl={vibeyPortraitUrl}
        hrShowcaseData={hrShowcaseData}
      />
    )
  if (slug === 'the-brain') return <TheBrainArticle />
  if (slug === 'the-harness') return <TheHarnessArticle />
  return null
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = BLOG_POSTS.find((p) => p.slug === slug)
  if (!post) notFound()

  const needsAgents = slug === 'vibey-beta'
  const [agents, vibeyPortraitUrl] = needsAgents
    ? await Promise.all([getAgentLibraryForMarketing(), getMarketingVibeyPortraitUrl()])
    : [undefined, undefined]
  const hrShowcaseData =
    needsAgents && agents ? await getMarketingHrShowcaseData(agents) : undefined

  const body = PostBody({ slug, agents, vibeyPortraitUrl, hrShowcaseData })
  if (!body) notFound()

  const blogPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    url: `https://vibey.im/blog/${post.slug}`,
    author: {
      '@type': 'Person',
      name: post.author ?? 'ROAS',
      image: post.authorImage ? `https://vibey.im${post.authorImage}` : undefined,
    },
    publisher: {
      '@type': 'Organization',
      name: 'ROAS',
      url: 'https://vibey.im',
      logo: { '@type': 'ImageObject', url: 'https://vibey.im/Logos/logov2/icon-text-white.png' },
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
      />
      <main className="min-h-screen pb-20 pt-32">
        <div className="site-container">
          <article className="mx-auto max-w-4xl">
            <Link
              href="/blog"
              className="text-color-muted body-3 mb-8 inline-flex items-center gap-2 transition-colors hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to Blog
            </Link>

            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="badge-glass badge-glass-secondary body-4 rounded-full px-2.5 py-0.5 font-semibold">
                {post.badge}
              </span>
              <span className="badge-glass badge-glass-muted body-4 rounded-full px-2.5 py-0.5 font-semibold">
                {post.category}
              </span>
            </div>

            <h1 className="h1 mb-8 tracking-tight text-white">{post.title}</h1>

            {post.author && (
              <div className="mb-8 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="border-color-glass h-8 w-8 shrink-0 overflow-hidden rounded-full border">
                    {post.authorImage ? (
                      <img
                        src={post.authorImage}
                        alt={post.author}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="bg-color-subtle flex h-full w-full items-center justify-center">
                        <span className="body-4 font-semibold text-white">
                          {post.author
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="body-3 text-color-secondary font-medium">{post.author}</span>
                </div>
                <span className="text-color-muted body-4">·</span>
                <time className="text-color-muted body-3">{post.date}</time>
                {post.readingTime && (
                  <>
                    <span className="text-color-muted body-4">·</span>
                    <span className="text-color-muted body-3">{post.readingTime} min read</span>
                  </>
                )}
              </div>
            )}

            {body}
          </article>
        </div>
      </main>
      <Footer />
    </>
  )
}
