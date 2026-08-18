'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  clientCampaignClientHref,
  clientCampaignMappingLabel,
  clientCampaignSpaceHref,
  parseClientCampaignMapping,
  toClientCampaignMapping,
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
}

export function ClientCampaignCell({
  value,
  onChange,
  readonly,
  fieldRowVariant = 'default',
  openOnMount,
  spaceItem,
  onOpenDetail,
}: ClientCampaignCellProps) {
  const mapping = parseClientCampaignMapping(value)
  const [open, setOpen] = useState(!!openOnMount)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const { groups, failed } = useClientCampaignGroups(open && !readonly)

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

  const label = clientCampaignMappingLabel(mapping) || 'Map'
  const clientHref = mapping ? clientCampaignClientHref(mapping) : null
  const campaignHref = mapping ? clientCampaignSpaceHref(mapping) : null
  const showAgenda = Boolean(spaceItem && onOpenDetail && isCallItem(spaceItem))

  return (
    <div
      data-cell
      className="gap-spacing-2 flex min-w-0 items-center"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {mapping && !readonly ? (
        <MappedLinks mapping={mapping} clientHref={clientHref} campaignHref={campaignHref} />
      ) : null}
      {readonly ? (
        <span
          className={cn(
            'typo-caption min-w-0 truncate',
            mapping ? 'text-foreground' : 'text-muted-foreground',
            fieldRowVariant === 'kanban' && 'text-xs',
          )}
        >
          {mapping ? label : '—'}
        </span>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={toggle}
          className={cn(
            'typo-caption hover:bg-hover-subtle hover:text-foreground',
            'border-border rounded-spacing-2 flex min-w-0 items-center gap-1 border',
            'px-1.5 py-0.5 transition-colors',
            mapping ? 'text-foreground' : 'text-muted-foreground',
            fieldRowVariant === 'kanban' && 'text-xs',
          )}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={
            mapping ? `Change client and campaign — currently ${label}` : 'Map client and campaign'
          }
        >
          <span className="min-w-0 truncate">{mapping ? 'Change' : 'Map'}</span>
          <ChevronDown className="text-muted-foreground h-3 w-3 shrink-0" aria-hidden />
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
              onExpand={setExpandedId}
              onPick={pick}
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

function MappedLinks({
  mapping,
  clientHref,
  campaignHref,
}: {
  mapping: ClientCampaignMapping
  clientHref: string | null
  campaignHref: string | null
}) {
  const client = mapping.client_name.trim()
  const campaign = mapping.campaign_name.trim()
  return (
    <span className="typo-caption text-foreground flex min-w-0 items-center truncate">
      {client ? (
        clientHref ? (
          <Link href={clientHref} className="hover:text-primary min-w-0 truncate">
            {client}
          </Link>
        ) : (
          <span className="min-w-0 truncate">{client}</span>
        )
      ) : null}
      {client && campaign ? <span className="text-muted-foreground px-0.5">·</span> : null}
      {campaign ? (
        campaignHref ? (
          <Link href={campaignHref} className="hover:text-primary min-w-0 truncate">
            {campaign}
          </Link>
        ) : (
          <span className="min-w-0 truncate">{campaign}</span>
        )
      ) : null}
    </span>
  )
}

function ClientCampaignMenu({
  panelRef,
  position,
  groups,
  mapping,
  expandedId,
  onExpand,
  onPick,
  onClear,
}: {
  panelRef: React.RefObject<HTMLDivElement | null>
  position: { top: number; left: number }
  groups: ClientCampaignGroup[] | null
  mapping: ClientCampaignMapping | null
  expandedId: string | null
  onExpand: (id: string | null) => void
  onPick: (group: ClientCampaignGroup, campaign: ClientCampaignOption) => void
  onClear: () => void
}) {
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
        Map to client campaign
      </p>
      {groups === null ? (
        <p className="px-spacing-2 py-spacing-1 body-3 text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="px-spacing-2 py-spacing-1 body-3 text-muted-foreground">No clients to map</p>
      ) : (
        groups.map((group) => {
          const expanded = expandedId === group.clientId
          return (
            <div key={group.clientId} className="mb-spacing-1">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => onExpand(expanded ? null : group.clientId)}
                className="body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full min-w-0 items-center font-semibold transition-colors"
              >
                <ChevronRight
                  className={cn(
                    'text-muted-foreground h-3 w-3 shrink-0 transition-transform duration-150',
                    expanded && 'rotate-90',
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-left">{group.clientName}</span>
                <span className="typo-caption text-muted-foreground shrink-0">
                  {group.campaigns.length}
                </span>
              </button>
              {expanded ? (
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
                        <span className="min-w-0 truncate">{campaign.name}</span>
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
        })
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
