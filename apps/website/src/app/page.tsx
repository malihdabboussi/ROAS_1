import { Footer } from '@/components/Footer'
import { HeroLegacy } from '@/components/sections/HeroLegacy'
import { getAgentLibraryForMarketing } from '@/lib/get-agent-library-for-marketing'

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ROAS',
  url: 'https://vibey.im',
  logo: 'https://vibey.im/Logos/logov2/icon-text-white.png',
  description:
    'ROAS is the hybrid operating layer for humans and AI agents — The Brain, Agents, and Spaces in one place.',
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
  name: 'ROAS',
  url: 'https://vibey.im',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Hybrid operating layer for humans and AI agents. The Brain holds the knowledge. Agents do the work. Spaces is where it happens.',
  featureList: [
    'The Brain — User, Agent, Company, and Customer knowledge graphs',
    'Agents — specialist AI workforce with roles, skills, and tools',
    'Spaces — tasks, docs, channels, and flows for humans and agents',
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
        <HeroLegacy teamPreviewAgents={teamPreviewAgents} />
      </main>
      <Footer />
    </>
  )
}
