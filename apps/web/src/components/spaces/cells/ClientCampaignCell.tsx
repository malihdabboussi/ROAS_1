'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, Search } from 'lucide-react'
import { toast } from 'sonner'
import {
  clientCampaignMappingLabel,
  parseClientCampaignMapping,
  toClientCampaignMapping,
  toClientOnlyMapping,
  useClientCampaignGroups,
  type ClientCampaignGroup,
  type ClientCampaignMapping,
  type ClientCampaignOption,
} from '@/lib/agency-clients'
import { SPACES_CELL_TOAST_ERRORS } from '@/lib/config/spaces-toast-errors.config'
import type { SpaceItem } from '@/lib/spaces'
import { cn } from '@/lib/utils/cn'
import type { BaseCellProps } from './cell-types'

const MENU_WIDTH = 280

function isCallItem(item?: SpaceItem): boolean {
  return item?.custom_data?.entry_type === 'call'
}

type ClientCampaignCellProps = BaseCellProps & {
  spaceItem?: SpaceItem
  fieldRowVariant?: 'default' | 'kanban'
  onOpenDetail?: (item: SpaceItem) => void
  displayMode?: 'combined' | 'client' | 'space'
  groupsOverride?: ClientCampaignGroup[]
}

export function ClientCampaignCell({
  value,
  onChange,
  readonly,
  fieldRowVariant = 'default',
  openOnMount,
  spaceItem,
  onOpenDetail,
  displayMode = 'combined',
  groupsOverride,
}: ClientCampaignCellProps) {
  const mapping = parseClientCampaignMapping(value)
  const [open, setOpen] = useState(!!openOnMount)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const loaded = useClientCampaignGroups(open && !readonly && groupsOverride === undefined)
  const groups = groupsOverride ?? loaded.groups
  const failed = groupsOverride === undefined && loaded.failed

  useEffect(() => {
    if (failed) toast.error(SPACES_CELL_TOAST_ERRORS.CLIENT_CAMPAIGN_LOAD_FAILED.userMessage)
  }, [failed])

  useEffect(() => {
    const mappedClient = mapping?.client_id
    const first = groups?.[0]
    if (open && expandedId === null && groups) {
      const match = mappedClient ? groups.find((group) => group.clientId === mappedClient) : first
      if (match) setExpandedId(match.clientId)
    }
  }, [open, expandedId, groups, mapping?.client_id])

  const toggle = useCallback(() => {
    setOpen((current) => {
      if (!current && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setPosition({
          top: rect.bottom + 4,
          left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
        })
      }
      return !current
    })
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const pick = (group: ClientCampaignGroup, campaign: ClientCampaignOption) => {
    onChange(toClientCampaignMapping(group, campaign))
    setOpen(false)
  }

  const pickClient = (group: ClientCampaignGroup) => {
    onChange(toClientOnlyMapping(group))
    setOpen(false)
    setQuery('')
  }

  const label = clientCampaignMappingLabel(mapping)
  const displayLabel = mapping
    ? displayMode === 'client'
      ? mapping.client_name.trim()
      : displayMode === 'space'
        ? mapping.campaign_name.trim()
        : label
    : ''
  const showAgenda = Boolean(spaceItem && onOpenDetail && isCallItem(spaceItem))
  const selectLabel =
    displayMode === 'client'
      ? 'Select client workspace'
      : displayMode === 'space'
        ? 'Select campaign space'
        : 'Map client and campaign'
  const changeLabel =
    displayMode === 'client'
      ? 'Change client workspace'
      : displayMode === 'space'
        ? 'Change campaign space'
        : `Change client and campaign — currently ${label}`

  return (
    <div
      data-cell
      className="gap-spacing-2 flex min-w-0 items-center"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {readonly ? (
        <span
          className={cn(
            'typo-caption min-w-0 truncate',
            mapping ? 'text-foreground' : 'text-muted-foreground',
            fieldRowVariant === 'kanban' && 'text-xs',
          )}
        >
          {mapping ? displayLabel : '—'}
        </span>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={toggle}
          className={cn(
            'typo-caption hover:bg-hover-subtle hover:text-foreground',
            'rounded-spacing-2 flex min-h-6 min-w-0 flex-1 items-center text-left',
            'px-spacing-1 transition-colors',
            mapping ? 'text-foreground' : 'text-muted-foreground',
            fieldRowVariant === 'kanban' && 'text-xs',
          )}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={mapping ? changeLabel : selectLabel}
        >
          <span className="min-w-0 truncate">{displayLabel}</span>
        </button>
      )}
      {showAgenda && spaceItem && onOpenDetail ? (
        <button
          type="button"
          onClick={() => onOpenDetail(spaceItem)}
          className="typo-caption text-foreground hover:text-primary min-w-0 shrink-0 truncate"
          aria-label={`Open agenda for ${spaceItem.title.trim() || 'meeting'}`}
        >
          Agenda
        </button>
      ) : null}
      {open && position
        ? createPortal(
            <ClientCampaignMenu
              panelRef={panelRef}
              position={position}
              groups={groups}
              mapping={mapping}
              expandedId={expandedId}
              displayMode={displayMode}
              query={query}
              onQueryChange={setQuery}
              onExpand={setExpandedId}
              onPick={pick}
              onPickClient={pickClient}
              onClear={() => {
                onChange(null)
                setOpen(false)
              }}
            />,
            document.body,
          )
        : null}
    </div>
  )
}

function ClientCampaignMenu({
  panelRef,
  position,
  groups,
  mapping,
  expandedId,
  displayMode,
  query,
  onQueryChange,
  onExpand,
  onPick,
  onPickClient,
  onClear,
}: {
  panelRef: React.RefObject<HTMLDivElement | null>
  position: { top: number; left: number }
  groups: ClientCampaignGroup[] | null
  mapping: ClientCampaignMapping | null
  expandedId: string | null
  displayMode: 'combined' | 'client' | 'space'
  query: string
  onQueryChange: (query: string) => void
  onExpand: (id: string | null) => void
  onPick: (group: ClientCampaignGroup, campaign: ClientCampaignOption) => void
  onPickClient: (group: ClientCampaignGroup) => void
  onClear: () => void
}) {
  const filteredGroups = (groups ?? []).filter((group) =>
    `${group.clientName} ${group.campaigns.map((campaign) => campaign.name).join(' ')}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )
  const activeGroups = filteredGroups.filter((group) => !group.inactive)
  const inactiveGroups = filteredGroups.filter((group) => group.inactive)

  return (
    <div
      ref={panelRef}
      role="menu"
      onClick={(event) => event.stopPropagation()}
      className="z-dropdown rounded-spacing-2 border-border surface-card py-spacing-2 px-spacing-3 gap-spacing-1 fixed flex flex-col overflow-y-auto border shadow-lg"
      style={{
        top: position.top,
        left: position.left,
        width: MENU_WIDTH,
        maxHeight: `calc(100vh - ${position.top + 8}px)`,
      }}
    >
      <p className="typo-caption text-muted-foreground px-spacing-2 pt-spacing-1">
        {displayMode === 'client' ? 'Client workspace' : 'Map to client campaign'}
      </p>
      <label className="border-border px-spacing-2 py-spacing-2 gap-spacing-2 flex items-center border-y">
        <Search className="icon-sm text-muted-foreground shrink-0" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search clients"
          className="input-glass body-4 placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none"
          autoFocus
        />
      </label>
      {groups === null ? (
        <p className="px-spacing-2 py-spacing-1 body-3 text-muted-foreground">Loading…</p>
      ) : filteredGroups.length === 0 ? (
        <p className="px-spacing-2 py-spacing-1 body-3 text-muted-foreground">No clients to map</p>
      ) : (
        <>
          {activeGroups.map((group) => {
            const expanded = expandedId === group.clientId
            return (
              <div key={group.clientId} className="mb-spacing-1">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() =>
                    displayMode === 'client'
                      ? onPickClient(group)
                      : onExpand(expanded ? null : group.clientId)
                  }
                  className="body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full min-w-0 items-center font-semibold transition-colors"
                >
                  {displayMode !== 'client' ? (
                    <ChevronRight
                      className={cn(
                        'text-muted-foreground h-3 w-3 shrink-0 transition-transform duration-150',
                        expanded && 'rotate-90',
                      )}
                      aria-hidden
                    />
                  ) : null}
                  <span className="min-w-0 flex-1 truncate text-left">{group.clientName}</span>
                  {displayMode !== 'client' ? (
                    <span className="typo-caption text-muted-foreground shrink-0">
                      {group.campaigns.length}
                    </span>
                  ) : null}
                </button>
                {expanded && displayMode !== 'client' ? (
                  <div className="border-border mt-spacing-1 ml-spacing-1 pl-spacing-2 flex flex-col border-l">
                    {group.campaigns.map((campaign) => {
                      const selected = mapping?.campaign_id === campaign.id
                      return (
                        <button
                          key={campaign.id}
                          type="button"
                          onClick={() => onPick(group, campaign)}
                          className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full min-w-0 items-center transition-colors"
                        >
                          <span className="min-w-0 truncate" title={campaign.name}>
                            {campaign.name}
                          </span>
                          {selected ? (
                            <span className="typo-caption text-muted-foreground shrink-0">
                              Mapped
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
          {inactiveGroups.length > 0 ? (
            <div className="border-border mt-spacing-1 border-t">
              <p className="typo-caption text-muted-foreground px-spacing-2 pb-spacing-1 pt-spacing-3">
                Inactive Clients
              </p>
              {inactiveGroups.map((group) => (
                <div key={group.clientId}>
                  <button
                    type="button"
                    onClick={() =>
                      displayMode === 'client'
                        ? onPickClient(group)
                        : onExpand(expandedId === group.clientId ? null : group.clientId)
                    }
                    className="body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full min-w-0 items-center font-semibold transition-colors"
                  >
                    <span className="min-w-0 flex-1 truncate text-left">{group.clientName}</span>
                  </button>
                  {displayMode !== 'client' && expandedId === group.clientId ? (
                    <div className="border-border mt-spacing-1 ml-spacing-1 pl-spacing-2 flex flex-col border-l">
                      {group.campaigns.map((campaign) => (
                        <button
                          key={campaign.id}
                          type="button"
                          onClick={() => onPick(group, campaign)}
                          className="body-3 text-foreground hover:bg-hover-subtle rounded-spacing-2 px-spacing-2 py-spacing-1 w-full min-w-0 text-left transition-colors"
                        >
                          <span className="block min-w-0 truncate">{campaign.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
      {mapping ? (
        <button
          type="button"
          onClick={onClear}
          className="typo-caption text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-spacing-2 px-spacing-2 py-spacing-1 mt-spacing-1 w-full text-left"
        >
          Clear mapping
        </button>
      ) : null}
    </div>
  )
}
