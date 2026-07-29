import type { Metadata } from 'next'
import { ExecutiveBriefContent } from './ExecutiveBriefContent'

export const metadata: Metadata = {
  title: 'Executive Brief | ROAS',
  description:
    'Leadership pre-read: how ROAS connects company memory, specialist agents, and governed workflows for ERP-heavy, compliance-sensitive operations.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Executive Brief | ROAS',
    description:
      'Leadership pre-read: how ROAS connects company memory, specialist agents, and governed workflows for ERP-heavy, compliance-sensitive operations.',
    url: 'https://vibey.im/executive-brief',
    siteName: 'ROAS',
    type: 'website',
    images: [
      {
        url: '/Logos/logov2/icon-text-white.png',
        width: 1200,
        height: 630,
        alt: 'ROAS Executive Brief',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@usevibey',
    title: 'Executive Brief | ROAS',
    description:
      'Leadership pre-read: how ROAS connects company memory, specialist agents, and governed workflows for ERP-heavy, compliance-sensitive operations.',
    images: ['/Logos/logov2/icon-text-white.png'],
  },
}

export default function ExecutiveBriefPage() {
  return <ExecutiveBriefContent />
}

