export type CampaignWorkspaceBreadcrumbItem = {
  href?: string
  label: string
}

function distinctName(value: string | null | undefined, other: string): string | null {
  const name = value?.trim()
  if (!name) return null
  if (name.toLowerCase() === other.trim().toLowerCase()) return null
  if (name.toLowerCase() === 'general') return null
  if (name.toLowerCase() === 'client spaces' || name.toLowerCase() === 'clients') return null
  return name
}

export function buildCampaignWorkspaceBreadcrumbItems(input: {
  campaignName: string
  campaignId: string
  programId?: string | null
  programName?: string | null
  clientId?: string | null
  clientName?: string | null
}): CampaignWorkspaceBreadcrumbItem[] {
  const campaignName = input.campaignName.trim() || 'Campaign'
  const items: CampaignWorkspaceBreadcrumbItem[] = [{ href: '/campaigns', label: 'Campaigns' }]
  const clientName = distinctName(input.clientName, campaignName)
  if (clientName && input.clientId) {
    items.push({ href: `/clients/${input.clientId}`, label: clientName })
  } else {
    const programName = distinctName(input.programName, campaignName)
    if (programName && input.programId) {
      items.push({ href: `/programs/${input.programId}`, label: programName })
    }
  }
  items.push({ href: `/campaigns/${input.campaignId}`, label: campaignName })
  return items
}
