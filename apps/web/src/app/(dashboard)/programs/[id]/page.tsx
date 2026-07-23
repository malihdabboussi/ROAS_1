'use client'

import { useParams } from 'next/navigation'
import { CampaignsHub } from '../../campaigns/_components/CampaignsHub'

export default function ProgramOverviewPage() {
  const { id } = useParams<{ id: string }>()
  if (!id) return null
  return <CampaignsHub focusProgramId={id} />
}
