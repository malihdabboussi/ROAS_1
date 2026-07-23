'use client'

import Link from 'next/link'
import { ChevronRight, Plus } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import type { Space } from '@/features/spaces/types'
import type { Campaign } from '@/lib/campaigns'
import type { Program } from '@/lib/programs'
import { cn } from '@/lib/utils/cn'
import type { ProgramCampaignGroup } from '../_lib/group-campaigns-by-program'
import { CampaignsHubCampaignCard } from './CampaignsHubCampaignCard'

export function CampaignsHubProgramSection({
  group,
  spacesByCampaignId,
  expandedIds,
  programExpanded,
  menuOpenId,
  creatingSpaceFor,
  creatingInProgram,
  newCampaignName,
  showShare,
  programs,
  onToggleProgram,
  onToggleCampaign,
  onOpenOverview,
  onOpenWork,
  onCreateSpace,
  onOpenSpace,
  onMenuOpenChange,
  onShare,
  onDelete,
  onMoveToProgram,
  onStartCreateInProgram,
  onChangeNewName,
  onSubmitCreate,
}: {
  group: ProgramCampaignGroup
  spacesByCampaignId: Map<string, Space[]>
  expandedIds: Set<string>
  programExpanded: boolean
  menuOpenId: string | null
  creatingSpaceFor: string | null
  creatingInProgram: string | null
  newCampaignName: string
  showShare: boolean
  programs: Program[]
  onToggleProgram: () => void
  onToggleCampaign: (campaignId: string) => void
  onOpenOverview: (campaign: Campaign) => void
  onOpenWork: (campaign: Campaign) => void
  onCreateSpace: (campaignId: string) => void
  onOpenSpace: (spaceId: string) => void
  onMenuOpenChange: (campaignId: string | null) => void
  onShare: (campaign: Campaign) => void
  onDelete: (campaign: Campaign) => void
  onMoveToProgram: (campaign: Campaign, programId: string | null) => void
  onStartCreateInProgram: () => void
  onChangeNewName: (value: string) => void
  onSubmitCreate: () => void
}) {
  const program = group.program
  const icon = program?.icon ?? 'folder-kanban'
  const iconColor = getIconColor(program?.icon_color ?? undefined).textColor
  const isCreatingHere = creatingInProgram === group.key

  return (
    <li className="gap-spacing-2 flex flex-col">
      <div className="gap-spacing-2 flex items-center">
        <button
          type="button"
          onClick={onToggleProgram}
          className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          aria-expanded={programExpanded}
          aria-label={programExpanded ? `Collapse ${group.label}` : `Expand ${group.label}`}
        >
          <ChevronRight
            className={cn(
              'h-4 w-4 transition-transform duration-150',
              programExpanded && 'rotate-90',
            )}
          />
        </button>
        <LucideIcon name={icon} className={cn('h-4 w-4 shrink-0', iconColor)} />
        <div className="min-w-0 flex-1">
          {program ? (
            <Link
              href={`/programs/${program.id}`}
              className="body-2 text-foreground hover:text-foreground font-medium transition-colors"
            >
              {group.label}
            </Link>
          ) : (
            <p className="body-2 text-foreground font-medium">{group.label}</p>
          )}
          <p className="body-4 text-muted-foreground">
            {group.campaigns.length === 0
              ? 'No campaigns'
              : `${group.campaigns.length} campaign${group.campaigns.length === 1 ? '' : 's'}`}
          </p>
        </div>
        {program ? (
          <button
            type="button"
            onClick={onStartCreateInProgram}
            className="chip-glass-neutral body-4 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Campaign
          </button>
        ) : null}
      </div>

      {programExpanded ? (
        <ul className="gap-spacing-2 border-border ml-4 flex flex-col border-l pl-3">
          {isCreatingHere ? (
            <li className="gap-spacing-2 flex items-center">
              <input
                autoFocus
                value={newCampaignName}
                onChange={(e) => onChangeNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSubmitCreate()
                }}
                placeholder="Campaign name"
                className="input-glass body-3 text-foreground placeholder:text-muted-foreground min-w-0 flex-1 rounded-lg px-3 py-2 outline-none"
              />
              <button
                type="button"
                disabled={!newCampaignName.trim()}
                onClick={onSubmitCreate}
                className="button-glass-accent body-3 shrink-0 rounded-lg px-3 py-2 font-medium disabled:opacity-50"
              >
                Create
              </button>
            </li>
          ) : null}

          {group.campaigns.map((campaign) => (
            <CampaignsHubCampaignCard
              key={campaign.id}
              campaign={campaign}
              spaces={spacesByCampaignId.get(campaign.id) ?? []}
              expanded={expandedIds.has(campaign.id)}
              menuOpen={menuOpenId === campaign.id}
              creatingSpace={creatingSpaceFor === campaign.id}
              showShare={showShare}
              programs={programs}
              onToggleExpanded={() => onToggleCampaign(campaign.id)}
              onOpenOverview={() => onOpenOverview(campaign)}
              onOpenWork={() => onOpenWork(campaign)}
              onCreateSpace={() => onCreateSpace(campaign.id)}
              onOpenSpace={onOpenSpace}
              onMenuOpenChange={(open) => onMenuOpenChange(open ? campaign.id : null)}
              onShare={() => onShare(campaign)}
              onDelete={() => onDelete(campaign)}
              onMoveToProgram={(programId) => onMoveToProgram(campaign, programId)}
            />
          ))}

          {group.campaigns.length === 0 && !isCreatingHere ? (
            <li className="body-3 text-muted-foreground px-2 py-3">
              No campaigns in this program yet.
            </li>
          ) : null}
        </ul>
      ) : null}
    </li>
  )
}
