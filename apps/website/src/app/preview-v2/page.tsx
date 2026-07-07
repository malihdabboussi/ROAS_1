import { Footer } from '@/components/Footer'
import { HomeArchitecture } from '@/components/sections/home/HomeArchitecture'
import { HomeFinalCTA } from '@/components/sections/home/HomeFinalCTA'
import { HomeFounderNote } from '@/components/sections/home/HomeFounderNote'
import { HomeHeroNew } from '@/components/sections/home/HomeHeroNew'
import { HomeMeetAgents } from '@/components/sections/home/HomeMeetAgents'
import { HomeShiftBand } from '@/components/sections/home/HomeShiftBand'
import { HomeThreePieces } from '@/components/sections/home/HomeThreePieces'
import {
  getAgentLibraryForMarketing,
  getMarketingVibeyPortraitUrl,
} from '@/lib/get-agent-library-for-marketing'

export const metadata = {
  title: 'Vibey Homepage v2 (Draft, do not link)',
  description:
    'Internal draft of a proposed Vibey homepage. Parked here while the real v2 is in design.',
  robots: { index: false, follow: false },
}

export default async function PreviewHomePageV2() {
  const [agents, vibeyPortraitUrl] = await Promise.all([
    getAgentLibraryForMarketing(),
    getMarketingVibeyPortraitUrl(),
  ])

  return (
    <>
      <main>
        <HomeHeroNew />
        <HomeShiftBand />
        <HomeThreePieces agents={agents} vibeyPortraitUrl={vibeyPortraitUrl} />
        <HomeMeetAgents agents={agents} />
        <HomeArchitecture />
        <HomeFounderNote />
        <HomeFinalCTA />
      </main>
      <Footer />
    </>
  )
}
