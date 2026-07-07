import type { Metadata } from 'next'
import { AnimateOnScroll } from '@/components/AnimateOnScroll'
import { FeaturePageLayout } from '@/components/feature-pages/FeaturePageLayout'

export const metadata: Metadata = {
  title: 'Updates | Vibey',
  description: 'Product changelog and release notes for Vibey.',
}

const entries = [
  {
    date: '2026-02-16',
    title: 'Vibey Beta',
    body: 'Public beta opens for waitlist members. Studio, Funnel Builder, and The Workspace Brain ship together.',
  },
  {
    date: '2026-01-08',
    title: 'HQ workspaces (preview)',
    body: 'Enterprise tenants can segment brands into isolated workspaces with shared governance.',
  },
  {
    date: '2025-12-02',
    title: 'Integrations expansion',
    body: 'OAuth connections for CRM, ads, and payments enter closed testing.',
  },
]

export default function UpdatesPage() {
  return (
    <FeaturePageLayout>
      <section className="relative pb-10 pt-10 md:pt-16">
        <div className="site-container">
          <div className="mx-auto max-w-3xl">
            <AnimateOnScroll>
              <h1 className="h1 mb-4 tracking-tight text-white">UPDATES</h1>
              <p className="text-text-muted body-1 mb-12">
                High-signal changelog entries. For narrative launches, read the{' '}
                <a href="/blog" className="text-emerald-accent underline-offset-2 hover:underline">
                  blog
                </a>
                .
              </p>
              <div className="space-y-8">
                {entries.map((e) => (
                  <div key={e.title} className="glass-card border-section rounded-2xl border p-6">
                    <time className="text-color-dim body-4 mb-2 block">{e.date}</time>
                    <h2 className="h4 mb-2 text-white">{e.title}</h2>
                    <p className="text-text-muted body-3 leading-relaxed">{e.body}</p>
                  </div>
                ))}
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>
    </FeaturePageLayout>
  )
}
