import { getLegalContent } from '@/app/legal-content'
import { Footer } from '@/components/Footer'

export default function PrivacyPage() {
  const content = getLegalContent('privacy-policy.md')

  return (
    <>
      <main className="pb-20 pt-32">
        <div className="site-container">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-text-primary h1 mb-8 tracking-tight">PRIVACY POLICY</h1>
            <article className="text-text-muted body-3 whitespace-pre-wrap leading-relaxed">
              {content}
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
