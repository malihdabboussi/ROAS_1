'use client'

import type { RefObject } from 'react'
import { Check, ChevronRight, Loader2, Search } from 'lucide-react'
import type { Campaign } from '@/lib/campaigns'
import type { ConversationScopeProgramRow } from './conversation-scope-groups'
import { CONVERSATION_SCOPE_MENU_WIDTH } from './conversation-scope-picker-layout'
import type {
  ConversationScopeMenuGeom,
  ConversationScopeSpace,
} from './conversation-scope-picker-layout'
import { CONVERSATION_SCOPE_PICKER_MESSAGES as M } from './conversation-scope-picker.messages.config'

export type ConversationScopeSubmenu =
  | { type: 'program'; programId: string }
  | { type: 'spaces'; campaignId: string }

export function ConversationScopePickerMenus({
  campaignMenuRef,
  spacesMenuRef,
  menuLayout,
  programs,
  ungroupedCampaigns,
  clients,
  clientSearch,
  onClientSearchChange,
  generalCampaign,
  selectedCampaignId,
  selectedSpaceId,
  submenu,
  loadingCampaignId,
  programCampaigns,
  activeSpaces,
  allowClear = false,
  onSelectAll,
  onSelectGeneral,
  onSelectCampaign,
  onOpenProgram,
  onOpenCampaignSpaces,
  onSelectSpace,
}: {
  campaignMenuRef: RefObject<HTMLDivElement | null>
  spacesMenuRef: RefObject<HTMLDivElement | null>
  menuLayout: {
    campaign: ConversationScopeMenuGeom
    spaces: ConversationScopeMenuGeom | null
  } | null
  programs: ConversationScopeProgramRow[]
  ungroupedCampaigns: Campaign[]
  clients: Campaign[]
  clientSearch: string
  onClientSearchChange: (value: string) => void
  generalCampaign: Campaign | undefined
  selectedCampaignId: string | null
  selectedSpaceId: string | null
  submenu: ConversationScopeSubmenu | null
  loadingCampaignId: string | null
  programCampaigns: Campaign[]
  activeSpaces: ConversationScopeSpace[] | undefined
  allowClear?: boolean
  onSelectAll?: () => void
  onSelectGeneral: () => void
  onSelectCampaign: (campaignId: string) => void
  onOpenProgram: (programId: string, row: HTMLElement) => void
  onOpenCampaignSpaces: (campaignId: string, row: HTMLElement) => void
  onSelectSpace: (campaignId: string, spaceId: string) => void
}) {
  const allSelected = allowClear && !selectedCampaignId && !selectedSpaceId
  const searching = clientSearch.trim().length > 0
  const showPrograms = !searching && (programs.length > 0 || ungroupedCampaigns.length > 0)
  const programSubmenu = submenu?.type === 'program'
  const spacesSubmenu = submenu?.type === 'spaces'
  const spacesCampaignId = spacesSubmenu ? submenu.campaignId : null

  return (
    <>
      <div
        ref={campaignMenuRef}
        data-conversation-scope-menu=""
        className="dropdown-menu-solid z-dropdown fixed flex flex-col overflow-hidden py-1"
        style={{
          top: menuLayout?.campaign.top ?? 0,
          left: menuLayout?.campaign.left ?? 0,
          width: CONVERSATION_SCOPE_MENU_WIDTH,
          maxHeight: menuLayout?.campaign.maxHeight ?? 420,
          visibility: menuLayout ? 'visible' : 'hidden',
        }}
      >
        <div className="border-border border-b">
          <div className="gap-spacing-2 bg-background p-spacing-2 group flex items-center">
            <Search className="icon-sm text-muted-foreground group-focus-within:text-foreground shrink-0" />
            <input
              type="search"
              value={clientSearch}
              onChange={(event) => onClientSearchChange(event.target.value)}
              placeholder={M.searchClients}
              className="typo-caption placeholder:text-muted-foreground flex-1 bg-transparent outline-none"
              aria-label={M.searchClients}
            />
          </div>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          {allowClear && onSelectAll ? (
            <ScopeTextButton selected={allSelected} onClick={onSelectAll}>
              All
            </ScopeTextButton>
          ) : null}
          <ScopeTextButton
            selected={
              !selectedSpaceId &&
              selectedCampaignId != null &&
              selectedCampaignId === generalCampaign?.id
            }
            onClick={onSelectGeneral}
          >
            General
          </ScopeTextButton>
          {showPrograms ? (
            <>
              <p className="hub-menu-section-label !mb-0 px-3 pt-2">{M.programs}</p>
              {programs.map((program) => (
                <ScopeFlyoutRow
                  key={program.id}
                  label={program.name}
                  selected={program.campaigns.some((row) => row.id === selectedCampaignId)}
                  ariaLabel={`Show campaigns in ${program.name}`}
                  onHover={(row) => onOpenProgram(program.id, row)}
                />
              ))}
              {ungroupedCampaigns.map((campaign) => (
                <ScopeCampaignRow
                  key={campaign.id}
                  campaign={campaign}
                  selected={campaign.id === selectedCampaignId}
                  onSelectCampaign={onSelectCampaign}
                  onOpenCampaignSpaces={onOpenCampaignSpaces}
                />
              ))}
            </>
          ) : null}
          <p className="hub-menu-section-label !mb-0 px-3 pt-2">{M.clients}</p>
          {clients.length > 0 ? (
            clients.map((client) => (
              <ScopeFlyoutRow
                key={client.id}
                label={client.name}
                selected={client.id === selectedCampaignId}
                ariaLabel={`Show campaigns in ${client.name}`}
                onHover={(row) => onOpenCampaignSpaces(client.id, row)}
                onSelect={() => onSelectCampaign(client.id)}
              />
            ))
          ) : (
            <p className="body-3 text-muted-foreground px-3 py-2">
              {searching ? M.noMatchingClients : M.noCampaigns}
            </p>
          )}
        </div>
      </div>
      {submenu && menuLayout?.spaces ? (
        <div
          ref={spacesMenuRef}
          data-conversation-scope-menu=""
          className="dropdown-menu-solid z-dropdown fixed flex flex-col overflow-hidden py-1"
          style={{
            top: menuLayout.spaces.top,
            left: menuLayout.spaces.left,
            width: CONVERSATION_SCOPE_MENU_WIDTH,
            maxHeight: menuLayout.spaces.maxHeight,
          }}
        >
          {programSubmenu ? (
            <ProgramCampaignList
              campaigns={programCampaigns}
              selectedCampaignId={selectedCampaignId}
              onSelectCampaign={onSelectCampaign}
            />
          ) : loadingCampaignId === spacesCampaignId ? (
            <div className="body-3 text-muted-foreground flex items-center gap-2 px-3 py-2">
              <Loader2 className="icon-xs animate-spin" aria-hidden />
              {M.loadingSpaces}
            </div>
          ) : activeSpaces && activeSpaces.length > 0 ? (
            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
              {activeSpaces.map((space) => (
                <ScopeTextButton
                  key={space.id}
                  selected={selectedSpaceId === space.id}
                  onClick={() => onSelectSpace(spacesCampaignId ?? '', space.id)}
                >
                  {space.title}
                </ScopeTextButton>
              ))}
            </div>
          ) : (
            <div className="body-3 text-muted-foreground px-3 py-2">{M.noSpaces}</div>
          )}
        </div>
      ) : null}
    </>
  )
}

function ProgramCampaignList({
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
}: {
  campaigns: Campaign[]
  selectedCampaignId: string | null
  onSelectCampaign: (campaignId: string) => void
}) {
  if (campaigns.length === 0) {
    return <div className="body-3 text-muted-foreground px-3 py-2">{M.noCampaigns}</div>
  }
  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
      {campaigns.map((campaign) => (
        <ScopeTextButton
          key={campaign.id}
          selected={campaign.id === selectedCampaignId}
          onClick={() => onSelectCampaign(campaign.id)}
        >
          {campaign.name ?? 'Untitled campaign'}
        </ScopeTextButton>
      ))}
    </div>
  )
}

function ScopeTextButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      className="body-3 hover:bg-hover-subtle text-foreground flex w-full items-center gap-2 px-3 py-2 text-left transition-colors"
      onClick={onClick}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {selected ? <Check className="icon-xs shrink-0" aria-hidden /> : null}
    </button>
  )
}

function ScopeFlyoutRow({
  label,
  selected,
  ariaLabel,
  onHover,
  onSelect,
}: {
  label: string
  selected: boolean
  ariaLabel: string
  onHover: (row: HTMLElement) => void
  onSelect?: () => void
}) {
  return (
    <div
      className="hover:bg-hover-subtle flex w-full items-center"
      onMouseEnter={(event) => onHover(event.currentTarget)}
    >
      <button
        type="button"
        className="body-3 text-foreground flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left transition-colors"
        onClick={
          onSelect ?? ((event) => onHover(event.currentTarget.parentElement ?? event.currentTarget))
        }
        onFocus={(event) => {
          const row = event.currentTarget.parentElement
          if (row) onHover(row)
        }}
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {selected ? <Check className="icon-xs shrink-0" aria-hidden /> : null}
      </button>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground px-3 py-2"
        aria-label={ariaLabel}
        onClick={(event) => {
          const row = event.currentTarget.parentElement
          if (row) onHover(row)
        }}
      >
        <ChevronRight className="icon-xs shrink-0" aria-hidden />
      </button>
    </div>
  )
}

function ScopeCampaignRow({
  campaign,
  selected,
  onSelectCampaign,
  onOpenCampaignSpaces,
}: {
  campaign: Campaign
  selected: boolean
  onSelectCampaign: (campaignId: string) => void
  onOpenCampaignSpaces: (campaignId: string, row: HTMLElement) => void
}) {
  return (
    <ScopeFlyoutRow
      label={campaign.name ?? 'Untitled campaign'}
      selected={selected}
      ariaLabel={`Show spaces in ${campaign.name ?? 'Untitled campaign'}`}
      onHover={(row) => onOpenCampaignSpaces(campaign.id, row)}
      onSelect={() => onSelectCampaign(campaign.id)}
    />
  )
}
