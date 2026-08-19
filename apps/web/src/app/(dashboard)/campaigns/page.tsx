import type { Metadata } from 'next'
import { AllProgramsHub } from './_components/AllProgramsHub'

export const metadata: Metadata = {
  title: 'All Programs | ROAS',
}

export default function CampaignsPage() {
  return <AllProgramsHub />
}
