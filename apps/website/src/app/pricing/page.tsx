import type { Metadata } from 'next'
import { Footer } from '@/components/Footer'
import { PricingPreview } from '@/components/sections/PricingPreview'

export const metadata: Metadata = {
  title: 'Pricing | Vibey',
  description:
    'Simple, transparent pricing for Vibey — the AI operating system for your business. Start free, scale with your team.',
  openGraph: {
    title: 'Pricing | Vibey',
    description:
      'Simple, transparent pricing for Vibey — the AI operating system for your business.',
    url: 'https://vibey.im/pricing',
    siteName: 'Vibey',
    type: 'website',
    images: [
      { url: '/Logos/logov2/icon-text-white.png', width: 1200, height: 630, alt: 'Vibey Pricing' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@usevibey',
    title: 'Pricing | Vibey',
    description:
      'Simple, transparent pricing for Vibey — the AI operating system for your business.',
  },
  alternates: { canonical: 'https://vibey.im/pricing' },
}

export default function PricingPage() {
  return (
    <>
      <main className="pt-20">
        <PricingPreview />
      </main>
      <Footer />
    </>
  )
}
