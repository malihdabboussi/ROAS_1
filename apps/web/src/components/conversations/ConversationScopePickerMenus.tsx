'use client'

import type { RefObject } from 'react'
import { Check, ChevronRight, Loader2 } from 'lucide-react'
import type { Campaign } from '@/lib/campaigns'
import type { ConversationScopeCampaignGroup } from './conversation-scope-groups'
import { CONVERSATION_SCOPE_MENU_WIDTH } from './conversation-scope-picker-layout'
import type {
  ConversationScopeMenuGeom,
  ConversationScopeSpace,
} from './conversation-scope-picker-layout'

export function ConversationScopePickerMenus({
  campaignMenuRef,
  spacesMenuRef,
  menuLayout,
  campaignGroups,
  generalCampaign,
  selectedCampaignId,
  selectedSpaceId,
  activeCampaignId,
  loadingCampaignId,
  activeSpaces,
  onSelectGeneral,
  onOpenCampaignSpaces,
  onSelectSpace,
}: {
  campaignMenuRef: RefObject<HTMLDivElement | null>
  spacesMenuRef: RefObject<HTMLDivElement | null>
  menuLayout: {
    campaign: ConversationScopeMenuGeom
    spaces: ConversationScopeMenuGeom | null
  } | null
  campaignGroups: ConversationScopeCampaignGroup[]
  generalCampaign: Campaign | undefined
  selectedCampaignId: string | null
  selectedSpaceId: string | null
  activeCampaignId: string | null
  loadingCampaignId: string | null
  activeSpaces: ConversationScopeSpace[] | undefined
  onSelectGeneral: () => void
  onOpenCampaignSpaces: (campaignId: string, row: HTMLButtonElement) => void
  onSelectSpace: (campaignId: string, spaceId: string) => void
}) {
  return (
    <>
      <div
        ref={campaignMenuRef}
        className="dropdown-menu-solid z-dropdown fixed flex flex-col overflow-hidden py-1"
        style={{
          top: menuLayout?.campaign.top ?? 0,
          left: menuLayout?.campaign.left ?? 0,
          width: CONVERSATION_SCOPE_MENU_WIDTH,
          maxHeight: menuLayout?.campaign.maxHeight ?? 420,
          visibility: menuLayout ? 'visible' : 'hidden',
        }}
      >
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          <button
            type="button"
            className="body-3 hover:bg-hover-subtle text-foreground flex w-full items-center gap-2 px-3 py-2 text-left transition-colors"
            onClick={onSelectGeneral}
          >
            <span className="min-w-0 flex-1 truncate">General</span>
            {!selectedSpaceId && selectedCampaignId === (generalCampaign?.id ?? null) ? (
              <Check className="icon-xs shrink-0" aria-hidden />
            ) : null}
          </button>
          {campaignGroups.map((group) => (
            <div key={group.key}>
              {group.label ? (
                <p className="hub-menu-section-label !mb-0 px-3 pt-2">{group.label}</p>
              ) : null}
              {group.campaigns.map((campaign) => {
                const selected = campaign.id === selectedCampaignId
                return (
                  <button
                    key={campaign.id}
                    type="button"
                    className="body-3 hover:bg-hover-subtle text-foreground flex w-full items-center gap-2 px-3 py-2 text-left transition-colors"
                    onClick={(event) => onOpenCampaignSpaces(campaign.id, event.currentTarget)}
                    onFocus={(event) => onOpenCampaignSpaces(campaign.id, event.currentTarget)}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {campaign.name ?? 'Untitled campaign'}
                    </span>
                    {selected ? <Check className="icon-xs shrink-0" aria-hidden /> : null}
                    <ChevronRight className="icon-xs text-muted-foreground shrink-0" aria-hidden />
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {activeCampaignId && menuLayout?.spaces ? (
        <div
          ref={spacesMenuRef}
          className="dropdown-menu-solid z-dropdown fixed flex flex-col overflow-hidden py-1"
          style={{
            top: menuLayout.spaces.top,
            left: menuLayout.spaces.left,
            width: CONVERSATION_SCOPE_MENU_WIDTH,
            maxHeight: menuLayout.spaces.maxHeight,
          }}
        >
          {loadingCampaignId === activeCampaignId ? (
            <div className="body-3 text-muted-foreground flex items-center gap-2 px-3 py-2">
              <Loader2 className="icon-xs animate-spin" aria-hidden />
              Loading spaces...
            </div>
          ) : activeSpaces && activeSpaces.length > 0 ? (
            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
              {activeSpaces.map((space) => (
                <button
                  key={space.id}
                  type="button"
                  className="body-3 hover:bg-hover-subtle text-foreground flex w-full items-center justify-between gap-4 px-3 py-2 text-left transition-colors"
                  onClick={() => onSelectSpace(activeCampaignId, space.id)}
                >
                  <span className="min-w-0 flex-1 truncate">{space.title}</span>
                  {selectedSpaceId === space.id ? (
                    <Check className="icon-xs shrink-0" aria-hidden />
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="body-3 text-muted-foreground px-3 py-2">No spaces here yet</div>
          )}
        </div>
      ) : null}
    </>
  )
}
