import { Footer } from '@/components/Footer'
import { Hero } from '@/components/sections/Hero'
import { getAgentLibraryForMarketing } from '@/lib/get-agent-library-for-marketing'

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Vibey',
  url: 'https://vibey.im',
  logo: 'https://vibey.im/Logos/logov2/icon-text-white.png',
  description:
    'Vibey is an AI operating system for running a business — a team of specialist AI agents with persistent memory, autonomous execution, and a built-in marketing engine.',
  sameAs: [
    'https://x.com/usevibey',
    'https://www.instagram.com/vibey.im/',
    'https://www.linkedin.com/company/usevibey',
    'https://www.youtube.com/@usevibey',
  ],
}

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Vibey',
  url: 'https://vibey.im',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'AI operating system for running a business. Hire specialist agents, delegate missions, build funnels, run ads, send email sequences, and operate on Autopilot.',
  offers: {
    '@type': 'Offer',
    url: 'https://vibey.im/pricing',
  },
  featureList: [
    'Specialist AI agents with persistent memory',
    'Autonomous mission execution',
    'Funnel and website builder',
    'Email sequence automation',
    'Meta and Google Ads management',
    'Social content creation and publishing',
    'CEO-level Autopilot orchestration',
    '35+ platform integrations',
  ],
}

export default async function HomePage() {
  const agents = await getAgentLibraryForMarketing()
  const teamPreviewAgents = agents.slice(0, 3).map((a) => ({
    imageUrl: a.image_url,
    label: a.role || a.default_name,
  }))

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <main>
        <Hero teamPreviewAgents={teamPreviewAgents} />
      </main>
      <Footer />
    </>
  )
}
