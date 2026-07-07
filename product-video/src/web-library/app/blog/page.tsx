import { Suspense } from 'react'
import { BlogIndexClient } from '@/components/blog/BlogIndexClient'
import { Footer } from '@/components/Footer'
import { BLOG_POSTS } from '@/lib/blog-posts'
import {
  getAgentLibraryForMarketing,
  getMarketingVibeyPortraitUrl,
} from '@/lib/get-agent-library-for-marketing'

export const metadata = {
  title: 'Blog | Vibey',
  description: 'Updates, product news, and insights from Vibey: your AI marketing team.',
}

export default async function BlogPage() {
  const featured = BLOG_POSTS.find((p) => p.featured) ?? null
  const needsAgents = BLOG_POSTS.some((p) => p.featuredListBanner === 'marketing-org')
  const [listBannerAgents, listBannerVibeyPortraitUrl] = needsAgents
    ? await Promise.all([getAgentLibraryForMarketing(), getMarketingVibeyPortraitUrl()])
    : [undefined, undefined]

  return (
    <>
      <main className="min-h-screen pb-20 pt-32">
        <div className="site-container">
          <div className="mx-auto max-w-6xl">
            <h1 className="h1 mb-2 tracking-tight text-white">BLOG</h1>
            <p className="text-color-muted mb-16">
              Product updates, announcements, and insights from the Vibey team.
            </p>

            <Suspense fallback={<div className="text-color-muted body-3">Loading…</div>}>
              <BlogIndexClient
                posts={BLOG_POSTS}
                featured={featured}
                listBannerAgents={listBannerAgents}
                listBannerVibeyPortraitUrl={listBannerVibeyPortraitUrl}
              />
            </Suspense>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
