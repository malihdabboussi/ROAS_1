'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronRight, FolderKanban, Grid, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ChatInputPlusMenuSpacePickerConfig } from './chat-input-plus-menu-space.types'

export function ChatInputPlusMenuSpacePanel({
  spacePicker,
  onCloseMenu,
}: {
  spacePicker: ChatInputPlusMenuSpacePickerConfig
  onCloseMenu: () => void
}) {
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const activeCampaignId =
      spacePicker.groups.find((group) =>
        group.spaces.some((space) => space.id === spacePicker.selectedSpaceId),
      )?.campaignId ??
      spacePicker.selectedCampaignId ??
      spacePicker.groups[0]?.campaignId ??
      null
    setExpandedCampaignId(activeCampaignId)
    const activeGroup = spacePicker.groups.find((group) => group.campaignId === activeCampaignId)
    setExpandedProgramId(activeGroup?.programId ?? '__general__')
  }, [spacePicker.groups, spacePicker.selectedCampaignId, spacePicker.selectedSpaceId])

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleGroups = normalizedQuery
    ? spacePicker.groups
        .map((group) => ({
          ...group,
          spaces: group.spaces.filter((space) =>
            `${group.campaignName} ${space.title}`.toLocaleLowerCase().includes(normalizedQuery),
          ),
        }))
        .filter(
          (group) =>
            group.campaignName.toLocaleLowerCase().includes(normalizedQuery) ||
            group.spaces.length > 0,
        )
    : spacePicker.groups
  const programGroups = Object.values(
    visibleGroups.reduce<
      Record<string, { id: string; name: string; campaigns: typeof visibleGroups }>
    >((acc, campaign) => {
      const id = campaign.programId ?? '__general__'
      const current = acc[id] ?? { id, name: campaign.programName, campaigns: [] }
      current.campaigns.push({
        ...campaign,
        spaces: [...campaign.spaces].sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
        ),
      })
      acc[id] = current
      return acc
    }, {}),
  ).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

  return (
    <>
      <p className="body-4 text-muted-foreground px-spacing-3 pb-spacing-1 pt-spacing-2 font-medium uppercase tracking-wide">
        Choose a program, campaign, or space
      </p>
      <div className="px-spacing-2 pb-spacing-2">
        <div className="relative">
          <Search className="icon-left-center icon-sm text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search programs, campaigns, and spaces…"
            aria-label="Search programs, campaigns, and spaces"
            className="input-glass input-leading body-4 h-spacing-8 rounded-spacing-2 w-full"
          />
        </div>
      </div>
      {!spacePicker.isOrgOnly ? (
        <button
          type="button"
          onClick={() => {
            spacePicker.onSelect(null)
            onCloseMenu()
          }}
          className={cn(
            'body-3 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 gap-spacing-2 flex w-full items-center text-left transition-colors',
            spacePicker.selectedSpaceId === null && 'bg-primary/10',
          )}
        >
          <Grid className="icon-sm text-muted-foreground shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {spacePicker.defaultSpaceTitle ?? 'New Workspace'}
          </span>
          {spacePicker.selectedSpaceId === null ? <Check className="icon-sm shrink-0" /> : null}
        </button>
      ) : null}
      {programGroups.map((program) => {
        const programExpanded = normalizedQuery.length > 0 || expandedProgramId === program.id
        return (
          <div key={program.id}>
            <button
              type="button"
              onClick={() => setExpandedProgramId(programExpanded ? null : program.id)}
              className="body-3 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 gap-spacing-2 flex w-full items-center text-left font-semibold transition-colors"
              aria-label={`${programExpanded ? 'Collapse' : 'Expand'} ${program.name} Program`}
              aria-expanded={programExpanded}
            >
              <ChevronRight
                className={cn('icon-xs transition-transform', programExpanded && 'rotate-90')}
                aria-hidden
              />
              <Grid className="icon-sm text-muted-foreground shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{program.name}</span>
            </button>
            {programExpanded
              ? program.campaigns.map((group) => {
                  const expanded =
                    normalizedQuery.length > 0 || expandedCampaignId === group.campaignId
                  const campaignSelected =
                    spacePicker.selectedCampaignId === group.campaignId &&
                    !spacePicker.selectedSpaceId
                  return (
                    <div key={group.campaignId} className="pl-spacing-3">
                      <div className={cn('flex items-center', campaignSelected && 'bg-primary/10')}>
                        <button
                          type="button"
                          onClick={() => {
                            spacePicker.onSelectCampaign?.(group.campaignId)
                            onCloseMenu()
                          }}
                          className="body-3 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 gap-spacing-2 flex min-w-0 flex-1 items-center text-left transition-colors"
                        >
                          <FolderKanban
                            className="icon-sm text-muted-foreground shrink-0"
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {group.campaignName}
                          </span>
                          {campaignSelected ? <Check className="icon-sm shrink-0" /> : null}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCampaignId((previous) =>
                              previous === group.campaignId ? null : group.campaignId,
                            )
                          }
                          className="text-muted-foreground hover:text-foreground px-spacing-3 py-spacing-2"
                          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${group.campaignName}`}
                          aria-expanded={expanded}
                        >
                          <ChevronRight
                            className={cn('icon-xs transition-transform', expanded && 'rotate-90')}
                            aria-hidden
                          />
                        </button>
                      </div>
                      {expanded
                        ? group.spaces.map((space) => {
                            const isSelected = spacePicker.selectedSpaceId === space.id
                            return (
                              <button
                                key={space.id}
                                type="button"
                                onClick={() => {
                                  spacePicker.onSelect(space.id)
                                  onCloseMenu()
                                }}
                                className={cn(
                                  'body-3 text-foreground hover:bg-hover-subtle py-spacing-2 gap-spacing-2 pl-spacing-8 pr-spacing-3 flex w-full items-center text-left transition-colors',
                                  isSelected && 'bg-primary/10',
                                )}
                              >
                                <span className="min-w-0 flex-1 truncate">{space.title}</span>
                                {isSelected ? <Check className="icon-sm shrink-0" /> : null}
                              </button>
                            )
                          })
                        : null}
                    </div>
                  )
                })
              : null}
          </div>
        )
      })}
      {programGroups.length === 0 ? (
        <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-3">
          No campaigns or spaces found.
        </p>
      ) : null}
      {spacePicker.onCreateSpace ? (
        <div className="border-border mt-spacing-1 p-spacing-2 border-t">
          <button
            type="button"
            onClick={() => {
              spacePicker.onCreateSpace?.(
                expandedCampaignId ?? spacePicker.selectedCampaignId ?? null,
              )
              onCloseMenu()
            }}
            className="body-3 text-foreground hover:bg-hover-subtle rounded-spacing-2 gap-spacing-2 px-spacing-2 py-spacing-2 flex w-full items-center text-left transition-colors"
          >
            <Plus className="icon-sm" aria-hidden />
            New space
          </button>
        </div>
      ) : null}
    </>
  )
}
