import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import type { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
import type { CreateFunnelType } from '../components/artifacts/funnels/CreateFunnelTypeModal'
import type { ContactsViewHandle } from '../components/contacts/ContactsView'
import type { MissionsViewHandle } from '../components/MissionsView'
import type { CampaignFinanceTabHandle } from '../components/reporting/FinanceOverviewView'
import type { ReportingToolbarApi } from '../components/reporting/shared/reporting-toolbar.types'
import type { CrmSort } from '../services/contacts-view.service'
import type { Space } from '../types'
import type {
  ArtifactViewBaseConfig,
  DocsConfig,
  DocsDriveCardSize,
  DocsDriveGroupBy,
  FieldDef,
  MediaViewConfig,
  MissionsConfig,
  SocialPlatform,
  SocialResearchConfig,
  SpaceSchema,
  ViewDef,
} from '../types/space-schema'

/**
 * Single bundle every per-view toolbar consumes.
 * Built once in SpaceItemsContainer and passed through the registry dispatcher.
 *
 * Per-view toolbars destructure only what they use; this object is intentionally wide
 * so adding a new view = create a folder + add an entry to the registry.
 */
export type SpaceToolbarContext = {
  // ─── Active state ────────────────────────────────────────────────
  activeSpace: Space
  activeView: ViewDef | null
  activeSchema: SpaceSchema
  activeViewId: string | null
  activeSpaceId: string | null

  // ─── Booleans (derived once in container) ────────────────────────
  isMissionsView: boolean
  isIgResearchView: boolean
  isTiktokResearchView: boolean
  isYoutubeResearchView: boolean
  isTwitterResearchView: boolean
  isAllSocialResearchView: boolean
  isAllArtifactsView: boolean
  isSocialResearchView: boolean
  /** Active platform when a single-platform social research view is active; otherwise null. */
  socialPlatform: SocialPlatform | null
  /** ViewDef config key for the active platform; null when not a social research view. */
  socialResearchConfigKey:
    | 'ig_research_config'
    | 'tiktok_research_config'
    | 'youtube_research_config'
    | 'twitter_research_config'
    | 'all_social_research_config'
    | null
  isDocsView: boolean
  isContactsView: boolean
  isChannelsSurface: boolean
  isReportingView: boolean
  isArtifactView: boolean
  isMediaView: boolean
  isFinanceOverviewView: boolean
  isAdsPerformanceView: boolean
  isSocialReportingView: boolean
  docsIsTreeLayout: boolean
  showGroupByInToolbar: boolean
  showSubtasksToolbar: boolean
  showAddColumnsToolbar: boolean
  showSpaceItemQuickFilters: boolean

  // ─── Roster + user ──────────────────────────────────────────────
  roster: TeamRosterEntry[]
  currentUserId: string | null

  // ─── Fields + view-specific configs ─────────────────────────────
  fieldsById: Map<string, FieldDef>
  groupableFields: FieldDef[]
  groupByField: FieldDef | undefined
  /** Resolved social-research config (Instagram or TikTok), merged with defaults. */
  igConfig: SocialResearchConfig
  igGroupByLabel: string | null
  missionsMc: MissionsConfig
  missionsGroupByLabel: string | null
  contactsGroupByLabel: string | null
  mediaGroupByLabel: string | null
  artifactConfig: ArtifactViewBaseConfig
  artifactGroupByLabel: string | null
  artifactPrimaryLabel: string
  artifactSlidePreviewOpen: boolean
  artifactCampaignId: string | null
  includeCampaignArtifacts: boolean
  loadCampaignArtifacts: () => void
  mediaViewConfig: MediaViewConfig
  handleMediaViewConfigPatch: (patch: Partial<MediaViewConfig>) => void | Promise<void>
  docsConfigToolbar: DocsConfig
  docsPreTreeDisplayModeRef: RefObject<'grid' | 'list'>

  /** True while DocsView grid is in inline Drive browse mode. */
  docsDriveBrowseActive: boolean
  /** Active grouping inside inline Drive browse. */
  docsDriveGroupBy: DocsDriveGroupBy
  /** Persists `drive_group_by` on the docs view config. */
  setDocsDriveGroupBy: (next: DocsDriveGroupBy) => void
  /** Inline Drive card density. */
  docsDriveCardSize: DocsDriveCardSize
  /** Persists `drive_card_size` on the docs view config. */
  setDocsDriveCardSize: (next: DocsDriveCardSize) => void

  schemaEditorOpen: boolean
  closeCustomizePanel: () => void
  openCustomizeFromToolbar: (initial?: 'main' | 'fields' | 'people' | 'ig_format') => void

  // ─── Toolbar UI state ───────────────────────────────────────────
  groupByOpen: boolean
  setGroupByOpen: Dispatch<SetStateAction<boolean>>
  groupByBtnRef: RefObject<HTMLSpanElement | null>

  subtasksMenuOpen: boolean
  setSubtasksMenuOpen: Dispatch<SetStateAction<boolean>>
  subtasksBtnRef: RefObject<HTMLButtonElement | null>

  docsDisplayMenuOpen: boolean
  setDocsDisplayMenuOpen: Dispatch<SetStateAction<boolean>>
  docsDisplayBtnRef: RefObject<HTMLButtonElement | null>
  docsDisplayMenuRef: RefObject<HTMLDivElement | null>

  igDisplayMenuOpen: boolean
  setIgDisplayMenuOpen: Dispatch<SetStateAction<boolean>>
  igDisplayBtnRef: RefObject<HTMLButtonElement | null>
  igDisplayMenuRef: RefObject<HTMLDivElement | null>

  igSortMenuOpen: boolean
  setIgSortMenuOpen: Dispatch<SetStateAction<boolean>>
  igSortBtnRef: RefObject<HTMLButtonElement | null>

  igOutlierMenuOpen: boolean
  setIgOutlierMenuOpen: Dispatch<SetStateAction<boolean>>
  igOutlierBtnRef: RefObject<HTMLButtonElement | null>

  docsSourceFilterOpen: boolean
  setDocsSourceFilterOpen: Dispatch<SetStateAction<boolean>>
  docsSourceFilterBtnRef: RefObject<HTMLButtonElement | null>
  docsSourceFilterWrapRef: RefObject<HTMLDivElement | null>
  docsSourceFilterDropdownRef: RefObject<HTMLDivElement | null>

  docsListSourceMenuOpen: boolean
  setDocsListSourceMenuOpen: Dispatch<SetStateAction<boolean>>
  docsListSourceWrapRef: RefObject<HTMLDivElement | null>

  // Search field (default views + artifact view share)
  spaceToolbarSearch: string
  setSpaceToolbarSearch: Dispatch<SetStateAction<string>>
  spaceToolbarSearchOpen: boolean
  setSpaceToolbarSearchOpen: Dispatch<SetStateAction<boolean>>

  // Finance search
  financeSearchOpen: boolean
  setFinanceSearchOpen: Dispatch<SetStateAction<boolean>>
  financeToolbarSearch: string
  setFinanceToolbarSearch: Dispatch<SetStateAction<string>>

  // Contacts toolbar state
  contactsSearch: string
  setContactsSearch: Dispatch<SetStateAction<string>>
  contactsSearchOpen: boolean
  setContactsSearchOpen: Dispatch<SetStateAction<boolean>>
  contactsSort: CrmSort
  setContactsSort: Dispatch<SetStateAction<CrmSort>>
  contactsSortOpen: boolean
  setContactsSortOpen: Dispatch<SetStateAction<boolean>>
  contactsLoading: boolean
  contactsAddOpen: boolean
  setContactsAddOpen: Dispatch<SetStateAction<boolean>>
  contactsAddRootRef: RefObject<HTMLDivElement | null>
  setContactsManualOpen: (v: boolean) => void
  setContactsCsvOpen: (v: boolean) => void
  setContactsGhlOpen: (v: boolean) => void
  setContactsAcOpen: (v: boolean) => void
  contactsSegmentPanelOpen: boolean
  setContactsSegmentPanelOpen: (v: boolean) => void
  activeContactsSegmentName: string | null
  setActiveContactsSegmentId: (id: string | null) => void
  setActiveContactsSegmentName: (name: string | null) => void

  // Contacts detail toolbar strip
  contactDetailOpen: boolean
  contactDetailColumnLayout:
    | import('../components/contacts/ContactsView').ContactDetailLayoutSizes
    | null
  contactsDetailToolbarLeftRef: RefObject<HTMLDivElement | null>
  contactsDetailToolbarLeftPx: number
  contactCommsLoaded: boolean
  contactCommunicationTab: import('../components/contacts/ContactCommunicationPanel').ContactCommunicationTab
  setContactCommunicationTab: (
    tab: import('../components/contacts/ContactCommunicationPanel').ContactCommunicationTab,
  ) => void

  // Artifact deep-work (full in-place preview)
  artifactDetailOpen: boolean
  artifactDeepDetail: { id: string; title: string } | null

  /** Full-screen media (`?media=`); toolbar swaps to **MediaDetailToolbar** like artifact deep mode. */
  mediaDetailOpen: boolean
  mediaDeepDetail: { id: string; title: string } | null

  // Save view dropdown
  hasDraft: boolean
  handleSaveViewDraft: () => Promise<void> | void
  handleEnableAutosaveAndFlush: () => Promise<void> | void
  handleSaveAsNewView: () => Promise<void> | void
  handleRevertViewDraft: () => void

  // Reporting
  reportingToolbarApi: ReportingToolbarApi | null
  openIntegrationsLibrary: () => void

  // Plus menus (already-extracted leaf components)
  financePlusOpen: boolean
  setFinancePlusOpen: Dispatch<SetStateAction<boolean>>
  financePlusRootRef: RefObject<HTMLDivElement | null>
  docsPlusOpen: boolean
  setDocsPlusOpen: Dispatch<SetStateAction<boolean>>
  docsPlusRootRef: RefObject<HTMLDivElement | null>
  docsCloud: ReturnType<typeof useCloudAttach>

  // Quick-filter dock callbacks
  toggleToolbarShowCompleted: () => void
  toggleToolbarAssignedToMe: () => void
  clearToolbarAssigneeFilter: () => void
  setAssigneeFilterOpen: (v: boolean) => void
  toolbarMeAvatarUrl: string | null
  toolbarMeInitials: string
  toolbarAssigneeAvatars: {
    participant_id: string
    display_name: string
    avatar_url: string | null
  }[]

  // Drive folders / docs sync
  setDriveMappingsSyncing: Dispatch<SetStateAction<boolean>>
  refresh: () => Promise<void>

  /** Linked campaign on the active space; null hides campaign-docs toolbar control. */
  docsCampaignId: string | null
  /** User opted in to sync campaign docs into this Docs view. */
  campaignDocsIncludeRequested: boolean
  campaignDocsLoading: boolean
  campaignDocsSynced: boolean
  loadCampaignDocs: () => void

  // Refs to inner views (used by primary action buttons)
  contactsViewRef: RefObject<ContactsViewHandle | null>
  missionsViewRef: RefObject<MissionsViewHandle | null>
  financeOverviewRef: RefObject<CampaignFinanceTabHandle | null>

  // View patches + actions
  handleViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  handleArtifactConfigPatch: (patch: Partial<ArtifactViewBaseConfig>) => Promise<void> | void
  handleCreateArtifact: () => Promise<void> | void
  handleCreatePresentationFromHtml: (file: File) => Promise<void> | void
  handleCreateFunnel: (funnelType: CreateFunnelType) => Promise<void> | void
  createItem: (title: string, extras?: Record<string, unknown>) => Promise<unknown>
}

/** Per-view toolbar component contract. */
export type SpaceToolbarComponent = (props: { ctx: SpaceToolbarContext }) => React.ReactNode
