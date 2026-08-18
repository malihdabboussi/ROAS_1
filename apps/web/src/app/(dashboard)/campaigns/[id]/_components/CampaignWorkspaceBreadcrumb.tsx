'use client'

import { useEffect, useState } from 'react'
import { AgencyWorkspaceBreadcrumb } from '@/features/agency-clients/AgencyWorkspaceBreadcrumb'
import type { Campaign } from '@/lib/campaigns'
import { fetchProgram, programDisplayName } from '@/lib/programs'
import { buildCampaignWorkspaceBreadcrumbItems } from '../_lib/campaign-workspace-breadcrumb'

export function CampaignWorkspaceBreadcrumb({
  campaign,
  client = null,
}: {
  campaign: Campaign
  client?: { id: string; name: string; display_name?: string } | null
}) {
  const [program, setProgram] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    const programId = campaign.program_id?.trim()
    if (!programId || client) {
      setProgram(null)
      return
    }
    let cancelled = false
    void fetchProgram(programId)
      .then((row) => {
        if (!cancelled) setProgram({ id: row.id, name: programDisplayName(row) })
      })
      .catch(() => {
        if (!cancelled) setProgram(null)
      })
    return () => {
      cancelled = true
    }
  }, [campaign.program_id, client])

  const items = buildCampaignWorkspaceBreadcrumbItems({
    campaignName: campaign.name,
    campaignId: campaign.id,
    programId: program?.id ?? campaign.program_id,
    programName: program?.name,
    clientId: client?.id,
    clientName: client?.display_name || client?.name,
  })

  return <AgencyWorkspaceBreadcrumb items={items} />
}
