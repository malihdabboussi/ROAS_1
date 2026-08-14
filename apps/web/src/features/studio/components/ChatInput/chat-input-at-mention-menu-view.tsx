import { forwardRef, type CSSProperties, type MouseEvent, type MouseEventHandler } from 'react'
import { ChevronRight, Globe, Loader2 } from 'lucide-react'
import {
  StudioAtMentionLeading,
  StudioAtMentionTrailingType,
  StudioAtMoreRowLeadingSpacer,
  StudioComposerAtTabStrip,
} from './chat-input-at-menu'
import type {
  AtMentionItem,
  StudioArtifactNavRow,
  StudioAtMenuTabId,
  StudioMediaNavRow,
} from './chat-input-at-mentions'

export type ChatInputAtMentionNavSlice =
  | { kind: 'items'; items: AtMentionItem[]; crossCampaignId?: string }
  | { kind: 'campaigns'; items: Array<{ id: string; name: string }> }

export interface ChatInputAtMentionMenuViewProps {
  style: CSSProperties
  crossCampaignMode: boolean
  activeTab: StudioAtMenuTabId
  tabs: readonly { id: StudioAtMenuTabId; label: string }[]
  atQuery: string
  atHighlight: number
  crossCampaignLoading: boolean
  atDataLoading: boolean
  artifactRows: StudioArtifactNavRow[]
  mediaRows: StudioMediaNavRow[]
  navSlice: ChatInputAtMentionNavSlice
  showSpaceTaskMore: boolean
  showMissionMore: boolean
  onMouseDown: MouseEventHandler<HTMLDivElement>
  onBackFromCrossCampaign: () => void
  onTabChange: (id: StudioAtMenuTabId) => void
  onHighlight: (index: number) => void
  onCampaignSelect: (campaign: { id: string; name: string }) => void
  onAtSelect: (item: AtMentionItem, sourceCampaignId?: string) => void
  onToggleArtifactCollapsed: (typeKey: string) => void
  onShowAllArtifacts: (typeKey: string) => void
  onToggleMediaCollapsed: (typeKey: string) => void
  onShowAllMedia: (typeKey: string) => void
  onShowMoreSpaceTasks: () => void
  onShowMoreMissions: () => void
}

const rowCls = (active: boolean) =>
  `px-spacing-3 gap-spacing-2 flex h-8 w-full items-center text-left transition-colors ${
    active ? 'bg-hover-subtle' : 'hover:bg-hover-subtle'
  }`

export const ChatInputAtMentionMenuView = forwardRef<
  HTMLDivElement,
  ChatInputAtMentionMenuViewProps
>(function ChatInputAtMentionMenuView(
  {
    style,
    crossCampaignMode,
    activeTab,
    tabs,
    atQuery,
    atHighlight,
    crossCampaignLoading,
    atDataLoading,
    artifactRows,
    mediaRows,
    navSlice,
    showSpaceTaskMore,
    showMissionMore,
    onMouseDown,
    onBackFromCrossCampaign,
    onTabChange,
    onHighlight,
    onCampaignSelect,
    onAtSelect,
    onToggleArtifactCollapsed,
    onShowAllArtifacts,
    onToggleMediaCollapsed,
    onShowAllMedia,
    onShowMoreSpaceTasks,
    onShowMoreMissions,
  },
  ref,
) {
  const sourceCampaignId = navSlice.kind === 'items' ? navSlice.crossCampaignId : undefined
  const atMentionListLoading = crossCampaignLoading || (atDataLoading && !crossCampaignMode)
  const navCount =
    navSlice.kind === 'campaigns'
      ? navSlice.items.length
      : activeTab === 'artifacts'
        ? artifactRows.length
        : activeTab === 'media'
          ? mediaRows.length
          : navSlice.items.length

  const listViewportProps = {
    className: 'scrollbar-thin shrink-0 overflow-x-hidden overflow-y-auto',
    style: { height: 'min(18rem, 45vh)' } satisfies CSSProperties,
    onMouseLeave: () => onHighlight(-1),
  }

  const preventAndRun = (event: MouseEvent, action: () => void) => {
    event.preventDefault()
    action()
  }

  const scrollInner = atMentionListLoading ? (
    <div className="body-3 text-muted-foreground px-spacing-3 py-spacing-6 gap-spacing-2 flex h-full min-h-0 flex-col items-center justify-center text-center">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      Loading…
    </div>
  ) : navCount === 0 ? (
    <div className="body-3 text-muted-foreground px-spacing-3 py-spacing-6 flex h-full min-h-0 flex-col items-center justify-center text-center">
      {atQuery.length === 0 ? 'Nothing here yet.' : 'No matches in this category.'}
    </div>
  ) : navSlice.kind === 'campaigns' ? (
    <div className="py-1">
      {navSlice.items.map((campaign, index) => (
        <button
          key={campaign.id}
          type="button"
          onMouseDown={(event) => preventAndRun(event, () => onCampaignSelect(campaign))}
          onMouseEnter={() => onHighlight(index)}
          className={rowCls(index === atHighlight)}
        >
          <Globe className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <span className="body-3 text-foreground min-w-0 flex-1 truncate">
            {campaign.name}
          </span>
          <ChevronRight aria-hidden className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        </button>
      ))}
    </div>
  ) : activeTab === 'artifacts' ? (
    <div className="py-1">
      {artifactRows.map((nav, index) => {
        if (nav.kind === 'header') {
          return (
            <button
              key={`artifact-h:${nav.typeKey}`}
              type="button"
              onMouseDown={(event) =>
                preventAndRun(event, () => onToggleArtifactCollapsed(nav.typeKey))
              }
              onMouseEnter={() => onHighlight(index)}
              className={`group/at-art-heading ${rowCls(index === atHighlight)}`}
            >
              <ChevronRight
                aria-hidden
                className={`text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform ${
                  nav.collapsed ? '' : 'rotate-90'
                }`}
              />
              <span className="body-3 text-foreground min-w-0 flex-1 truncate text-left font-medium">
                {nav.heading}
              </span>
              <span
                aria-hidden
                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover/at-art-heading:opacity-100 ${
                  index === atHighlight ? 'opacity-100' : ''
                }`}
              >
                <ChevronRight
                  className={`text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform ${
                    nav.collapsed ? '' : 'rotate-90'
                  }`}
                />
              </span>
            </button>
          )
        }
        if (nav.kind === 'artifact-more') {
          return (
            <button
              key={`artifact-m:${nav.typeKey}:${String(index)}`}
              type="button"
              onMouseDown={(event) => preventAndRun(event, () => onShowAllArtifacts(nav.typeKey))}
              onMouseEnter={() => onHighlight(index)}
              className={`${rowCls(index === atHighlight)} pl-spacing-6`}
            >
              <span className="body-4 text-muted-foreground min-w-0 flex-1 truncate text-left">
                Show {nav.remaining} more
              </span>
            </button>
          )
        }
        return (
          <button
            key={`${nav.item.section}:${nav.item.id}:${String(index)}`}
            type="button"
            onMouseDown={(event) =>
              preventAndRun(event, () => onAtSelect(nav.item, sourceCampaignId))
            }
            onMouseEnter={() => onHighlight(index)}
            className={`${rowCls(index === atHighlight)} pl-spacing-6`}
          >
            <StudioAtMentionLeading item={nav.item} />
            <span className="body-3 text-foreground min-w-0 flex-1 truncate">
              {nav.item.label}
            </span>
            <StudioAtMentionTrailingType item={nav.item} />
          </button>
        )
      })}
    </div>
  ) : activeTab === 'media' ? (
    <div className="py-1">
      {mediaRows.map((nav, index) => {
        if (nav.kind === 'header') {
          return (
            <button
              key={`media-h:${nav.typeKey}`}
              type="button"
              onMouseDown={(event) =>
                preventAndRun(event, () => onToggleMediaCollapsed(nav.typeKey))
              }
              onMouseEnter={() => onHighlight(index)}
              className={`group/at-media-heading ${rowCls(index === atHighlight)}`}
            >
              <ChevronRight
                aria-hidden
                className={`text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform ${
                  nav.collapsed ? '' : 'rotate-90'
                }`}
              />
              <span className="body-3 text-foreground min-w-0 flex-1 truncate text-left font-medium">
                {nav.heading}
              </span>
              <span
                aria-hidden
                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover/at-media-heading:opacity-100 ${
                  index === atHighlight ? 'opacity-100' : ''
                }`}
              >
                <ChevronRight
                  className={`text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform ${
                    nav.collapsed ? '' : 'rotate-90'
                  }`}
                />
              </span>
            </button>
          )
        }
        if (nav.kind === 'media-more') {
          return (
            <button
              key={`media-m:${nav.typeKey}:${String(index)}`}
              type="button"
              onMouseDown={(event) => preventAndRun(event, () => onShowAllMedia(nav.typeKey))}
              onMouseEnter={() => onHighlight(index)}
              className={`${rowCls(index === atHighlight)} pl-spacing-6`}
            >
              <StudioAtMoreRowLeadingSpacer variant="thumbnail-slot" />
              <span className="body-4 text-muted-foreground min-w-0 flex-1 truncate text-left">
                Show {nav.remaining} more
              </span>
            </button>
          )
        }
        return (
          <button
            key={`${nav.item.section}:${nav.item.id}:${String(index)}`}
            type="button"
            onMouseDown={(event) =>
              preventAndRun(event, () => onAtSelect(nav.item, sourceCampaignId))
            }
            onMouseEnter={() => onHighlight(index)}
            className={`${rowCls(index === atHighlight)} pl-spacing-6`}
          >
            <StudioAtMentionLeading item={nav.item} />
            <span className="body-3 text-foreground min-w-0 flex-1 truncate">
              {nav.item.label}
            </span>
            <StudioAtMentionTrailingType item={nav.item} />
          </button>
        )
      })}
    </div>
  ) : (
    <div className="py-1">
      {navSlice.kind === 'items'
        ? navSlice.items.map((item, index) => (
            <button
              key={`${item.section}:${item.id}`}
              type="button"
              onMouseDown={(event) => preventAndRun(event, () => onAtSelect(item, sourceCampaignId))}
              onMouseEnter={() => onHighlight(index)}
              className={rowCls(index === atHighlight)}
            >
              <StudioAtMentionLeading item={item} />
              <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                {item.label}
              </span>
              <StudioAtMentionTrailingType item={item} />
            </button>
          ))
        : null}
      {activeTab === 'tasks' && showSpaceTaskMore ? (
        <button
          type="button"
          onMouseDown={(event) => preventAndRun(event, onShowMoreSpaceTasks)}
          className={rowCls(false)}
        >
          <StudioAtMoreRowLeadingSpacer variant="status-dot-slot" />
          <span className="body-4 text-muted-foreground min-w-0 flex-1 truncate text-left">
            Show more
          </span>
        </button>
      ) : null}
      {activeTab === 'missions' && showMissionMore ? (
        <button
          type="button"
          onMouseDown={(event) => preventAndRun(event, onShowMoreMissions)}
          className={rowCls(false)}
        >
          <span className="body-4 text-muted-foreground min-w-0 flex-1 truncate text-left">
            Show more
          </span>
        </button>
      ) : null}
    </div>
  )

  return (
    <div
      ref={ref}
      data-vibey-mention-suggestions
      className="dropdown-menu-solid z-dropdown rounded-spacing-2 flex min-h-0 flex-col overflow-hidden"
      style={style}
      onMouseDown={onMouseDown}
    >
      {crossCampaignMode ? (
        <>
          <button
            type="button"
            onMouseDown={(event) => preventAndRun(event, onBackFromCrossCampaign)}
            className="body-4 text-muted-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-1 flex w-full shrink-0 items-center gap-1 text-left transition-colors"
          >
            <ChevronRight className="h-3 w-3 rotate-180" /> Back
          </button>
          <div className="border-border shrink-0 border-t" />
        </>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <StudioComposerAtTabStrip tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
        <div {...listViewportProps}>{scrollInner}</div>
      </div>
    </div>
  )
})
