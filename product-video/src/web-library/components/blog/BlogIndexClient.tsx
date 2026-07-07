'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { BlogBannerOrgChart } from '@/components/blog/banners/BlogBannerOrgChart'
import { BlogBannerVibeyOrb } from '@/components/blog/banners/BlogBannerVibeyOrb'
import { MarketingBrainGraphBlogBanner } from '@/components/marketing/MarketingBrainGraphBlogBanner'
import type { BlogCategory, BlogPostMeta } from '@/lib/blog-posts'
import { BLOG_CATEGORIES } from '@/lib/blog-posts'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'

function PostBanner({
  post,
  listBannerAgents,
  listBannerVibeyPortraitUrl,
}: {
  post: BlogPostMeta
  listBannerAgents?: PublicAgentLibraryRow[]
  listBannerVibeyPortraitUrl?: string
}) {
  const shell = (children: React.ReactNode) => (
    <div className="border-section bg-color-subtle h-56 shrink-0 overflow-hidden border-b">
      {children}
    </div>
  )

  if (post.featuredListBanner === 'marketing-org') {
    return shell(
      <BlogBannerOrgChart
        libraryAgents={listBannerAgents}
        vibeyPortraitUrl={listBannerVibeyPortraitUrl}
      />,
    )
  }
  if (post.featuredListBanner === 'brain') {
    return shell(<MarketingBrainGraphBlogBanner />)
  }
  if (post.featuredListBanner === 'vibey-orb') {
    return shell(<BlogBannerVibeyOrb />)
  }

  return shell(
    <div className="flex h-full items-center justify-center">
      <span className="body-4 text-color-muted font-medium uppercase tracking-widest">
        Coming Soon
      </span>
    </div>,
  )
}

export function BlogIndexClient(props: {
  posts: BlogPostMeta[]
  featured: BlogPostMeta | null
  listBannerAgents?: PublicAgentLibraryRow[]
  listBannerVibeyPortraitUrl?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cat = searchParams.get('category') as BlogCategory | null
  const activeCategory = cat && BLOG_CATEGORIES.includes(cat) ? cat : ('all' as const)

  const filtered =
    activeCategory === 'all'
      ? props.posts
      : props.posts.filter((p) => p.category === activeCategory)

  const setCategory = (next: 'all' | BlogCategory) => {
    const q = new URLSearchParams(searchParams.toString())
    if (next === 'all') q.delete('category')
    else q.set('category', next)
    const s = q.toString()
    router.push(s ? `/blog?${s}` : '/blog')
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory('all')}
          className={`body-4 rounded-full px-4 py-2 font-medium transition-colors ${
            activeCategory === 'all' ? 'chip-glass-emerald' : 'chip-glass-neutral text-color-muted'
          }`}
        >
          All
        </button>
        {BLOG_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`body-4 rounded-full px-4 py-2 font-medium transition-colors ${
              activeCategory === c ? 'chip-glass-emerald' : 'chip-glass-neutral text-color-muted'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((post) => {
          const card = (
            <div className="glass-card border-section flex h-full flex-col overflow-hidden rounded-2xl border transition-all">
              <PostBanner
                post={post}
                listBannerAgents={props.listBannerAgents}
                listBannerVibeyPortraitUrl={props.listBannerVibeyPortraitUrl}
              />
              <div className="flex flex-1 flex-col p-5">
                {/* row 1: badges */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="badge-glass badge-glass-secondary body-4 rounded-full px-2.5 py-0.5 font-semibold">
                    {post.badge}
                  </span>
                  <span className="badge-glass badge-glass-muted body-4 rounded-full px-2.5 py-0.5 font-semibold">
                    {post.category}
                  </span>
                  {post.readingTime && (
                    <span className="text-color-muted body-4">{post.readingTime} min read</span>
                  )}
                </div>
                {/* row 2: title — fixed 2-line height */}
                <h2 className="h4 mb-2 line-clamp-2 text-white">{post.title}</h2>
                {/* row 3: excerpt — fixed 3-line height, pushes footer down */}
                <p className="body-3 text-text-muted mb-4 line-clamp-3 flex-1 leading-relaxed">
                  {post.excerpt}
                </p>
                {/* row 4: author — always rendered, empty placeholder if no author */}
                <div className="mb-4 flex h-6 items-center gap-2">
                  {post.author && post.authorImage && (
                    <img
                      src={post.authorImage}
                      alt={post.author}
                      className="border-color-glass h-6 w-6 shrink-0 rounded-full border object-cover"
                    />
                  )}
                  {post.author && (
                    <>
                      <span className="body-4 text-color-muted font-medium">{post.author}</span>
                      <span className="text-color-muted body-4">·</span>
                      <time className="text-color-muted body-4">{post.date}</time>
                    </>
                  )}
                </div>
                {/* row 5: cta */}
                {post.comingSoon ? (
                  <span className="text-color-muted body-3 inline-flex items-center gap-1 font-medium">
                    Coming soon
                  </span>
                ) : (
                  <span className="text-emerald-accent body-3 inline-flex items-center gap-1 font-medium">
                    Read more
                    <ArrowRight size={14} />
                  </span>
                )}
              </div>
            </div>
          )

          if (post.comingSoon) {
            return (
              <div key={post.slug} className="cursor-default opacity-70">
                {card}
              </div>
            )
          }

          return (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="glass-card-hover block h-full transition-all"
            >
              {card}
            </Link>
          )
        })}
      </div>
    </>
  )
}
