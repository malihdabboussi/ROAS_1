'use client'

import dynamic from 'next/dynamic'
import type { ReactNode, RefObject } from 'react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import { useAccountContextGate } from '@/features/org/store/use-org-store'
import type { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
import { useSpacePermission } from '../../hooks/use-space-permission'
import type { CrmSort } from '../../services/contacts-view.service'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { Space } from '../../types'
import type {
  DocsDriveCardSize,
  DocsDriveGroupBy,
  FieldDef,
  SelectOption,
  SocialPlatform,
  SpaceSchema,
  ViewDef,
} from '../../types/space-schema'
import type { ArtifactPreviewSelection } from '../artifacts/artifact-preview-selection'
import { useArtifactDetailQuery } from '../artifacts/use-artifact-detail-query'
import type { MissionSendOptions } from '../cells/MissionSendDropdown'
import type { ContactCommunicationTab } from '../contacts/ContactCommunicationPanel'
import type { ContactsViewHandle } from '../contacts/ContactsView'
import type { MissionsViewHandle } from '../MissionsView'
import type { CampaignFinanceTabHandle } from '../reporting/FinanceOverviewView'
import type { ReportingToolbarApi } from '../reporting/shared/reporting-toolbar.types'
import { EmptySpaceCanvas } from './EmptySpaceCanvas'

function SpaceViewLoading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <VibeyLoadingOrb text="Getting everything ready..." state="processing" size="lg" />
    </div>
  )
}

const ChannelsIndexView = dynamic(
  () => import('../channels/ChannelsIndexView').then((mod) => mod.ChannelsIndexView),
  { loading: SpaceViewLoading },
)
const SpaceChannelView = dynamic(
  () => import('../channels/SpaceChannelView').then((mod) => mod.SpaceChannelView),
  { loading: SpaceViewLoading },
)
const SpaceMediaView = dynamic(
  () => import('../../views/media/SpaceMediaView').then((mod) => mod.SpaceMediaView),
  { loading: SpaceViewLoading },
)
const InstagramResearchView = dynamic(
  () =>
    import('../instagram-research/InstagramResearchView').then((mod) => mod.InstagramResearchView),
  { loading: SpaceViewLoading },
)
const AdsResearchView = dynamic(
  () => import('../ads-research/AdsResearchView').then((mod) => mod.AdsResearchView),
  { loading: SpaceViewLoading },
)
const SpaceCalendarView = dynamic(
  () => import('../../views/calendar/SpaceCalendarView').then((mod) => mod.SpaceCalendarView),
  { loading: SpaceViewLoading },
)
const AllArtifactsSpaceView = dynamic(
  () => import('../artifacts/ArtifactViews').then((mod) => mod.AllArtifactsSpaceView),
  { loading: SpaceViewLoading },
)
const FunnelsSpaceView = dynamic(
  () => import('../artifacts/ArtifactViews').then((mod) => mod.FunnelsSpaceView),
  { loading: SpaceViewLoading },
)
const FormResponsesView = dynamic(
  () => import('./FormResponsesView').then((mod) => mod.FormResponsesView),
  { loading: SpaceViewLoading },
)
const FormsSpaceView = dynamic(
  () => import('../artifacts/ArtifactViews').then((mod) => mod.FormsSpaceView),
  { loading: SpaceViewLoading },
)
const EmailsSpaceView = dynamic(
  () => import('../artifacts/ArtifactViews').then((mod) => mod.EmailsSpaceView),
  { loading: SpaceViewLoading },
)
const WebsitesSpaceView = dynamic(
  () => import('../artifacts/ArtifactViews').then((mod) => mod.WebsitesSpaceView),
  { loading: SpaceViewLoading },
)
const OffersSpaceView = dynamic(
  () => import('../artifacts/ArtifactViews').then((mod) => mod.OffersSpaceView),
  { loading: SpaceViewLoading },
)
const AvatarsSpaceView = dynamic(
  () => import('../artifacts/ArtifactViews').then((mod) => mod.AvatarsSpaceView),
  { loading: SpaceViewLoading },
)
const PaidAdsSpaceView = dynamic(
  () => import('../artifacts/ArtifactViews').then((mod) => mod.PaidAdsSpaceView),
  { loading: SpaceViewLoading },
)
const SequencesSpaceView = dynamic(
  () => import('../artifacts/ArtifactViews').then((mod) => mod.SequencesSpaceView),
  { loading: SpaceViewLoading },
)
const PresentationsSpaceView = dynamic(
  () => import('../artifacts/ArtifactViews').then((mod) => mod.PresentationsSpaceView),
  { loading: SpaceViewLoading },
)
const SocialPostsSpaceView = dynamic(
  () => import('../artifacts/ArtifactViews').then((mod) => mod.SocialPostsSpaceView),
  { loading: SpaceViewLoading },
)
const CampaignOverviewView = dynamic(
  () => import('../reporting/CampaignOverviewView').then((mod) => mod.CampaignOverviewView),
  { loading: SpaceViewLoading },
)
const SocialReportingView = dynamic(
  () => import('../reporting/SocialReportingView').then((mod) => mod.SocialReportingView),
  { loading: SpaceViewLoading },
)
const FunnelAnalyticsView = dynamic(
  () => import('../reporting/FunnelAnalyticsView').then((mod) => mod.FunnelAnalyticsView),
  { loading: SpaceViewLoading },
)
const EmailAnalyticsView = dynamic(
  () => import('../reporting/EmailAnalyticsView').then((mod) => mod.EmailAnalyticsView),
  { loading: SpaceViewLoading },
)
const AdsPerformanceSpaceView = dynamic(
  () => import('../reporting/AdsPerformanceSpaceView').then((mod) => mod.AdsPerformanceSpaceView),
  { loading: SpaceViewLoading },
)
const KanbanView = dynamic(() => import('../KanbanView').then((mod) => mod.KanbanView), {
  loading: SpaceViewLoading,
})
const DocsView = dynamic(() => import('../DocsView').then((mod) => mod.DocsView), {
  loading: SpaceViewLoading,
})
const ListView = dynamic(() => import('../ListView').then((mod) => mod.ListView), {
  loading: SpaceViewLoading,
})
// These three carry imperative toolbar refresh handles. React 19 passes `ref` through
// next/dynamic to the underlying forwardRef components while deferring the chunks.
const ContactsView = dynamic(
  () => import('../contacts/ContactsView').then((mod) => mod.ContactsView),
  { loading: SpaceViewLoading },
)
const MissionsView = dynamic(() => import('../MissionsView').then((mod) => mod.MissionsView), {
  loading: SpaceViewLoading,
})
const FinanceOverviewView = dynamic(
  () => import('../reporting/FinanceOverviewView').then((mod) => mod.FinanceOverviewView),
  { loading: SpaceViewLoading },
)

type ItemHandlers = {
  onUpdateItem: (itemId: string, payload: Partial<import('../../types').SpaceItem>) => Promise<void>
  onDeleteItem: (itemId: string) => void | Promise<void>
  onPushToAgent: (itemId: string, options?: MissionSendOptions) => Promise<void>
  onCreateOption: (fieldId: string, option: SelectOption) => Promise<void>
  onUpdateOption: (
    fieldId: string,
    optionId: string,
    updates: Partial<SelectOption>,
  ) => Promise<void>
  onDeleteOption: (fieldId: string, optionId: string) => Promise<void>
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
}

export type SpaceContentRouterProps = {
  activeView: ViewDef | null
  activeSchema: SpaceSchema
  activeSpace: Space
  isContactsView: boolean
  isIgResearchView: boolean
  isTiktokResearchView: boolean
  isYoutubeResearchView: boolean
  isTwitterResearchView: boolean
  isAllSocialResearchView: boolean
  isAdsResearchView: boolean
  socialPlatform: SocialPlatform | null
  isMissionsView: boolean
  isDocsView: boolean
  isReportingView: boolean
  items: import('../../types').SpaceItem[]
  campaignName: string | null
  fieldsById: Map<string, FieldDef>
  fieldsForUi: FieldDef[]
  visibleFields: FieldDef[]
  roster: TeamRosterEntry[]
  currentUserId: string | null
  filteredRegularItems: import('../../types').SpaceItem[]
  docItems: import('../../types').SpaceItem[]
  docsCloud: ReturnType<typeof useCloudAttach>
  docsLoading: boolean
  includeCampaignArtifacts: boolean
  driveMappingsSyncing: boolean
  hasDriveDocs: boolean
  artifactPreviewSelection: ArtifactPreviewSelection | null
  setArtifactPreviewSelection: (next: ArtifactPreviewSelection | null) => void
  contactsSearch: string
  contactsScope: 'campaign' | 'all'
  contactsStatusFilter: 'all' | 'lead' | 'customer'
  contactsSort: CrmSort
  contactsLoading: boolean
  activeContactsSegmentId: string | null
  contactCommunicationTab: ContactCommunicationTab
  spaceToolbarSearch: string
  setSpaceToolbarSearch: (value: string) => void
  financeToolbarSearch: string
  contactsViewRef: RefObject<ContactsViewHandle | null>
  missionsViewRef: RefObject<MissionsViewHandle | null>
  financeOverviewRef: RefObject<CampaignFinanceTabHandle | null>
  handleViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  openCustomizeFromToolbar: (initial?: 'main' | 'fields' | 'people' | 'ig_format') => void
  setContactsLoading: (v: boolean) => void
  setContactDetailOpen: (v: boolean) => void
  resetContactCommunicationTab: () => void
  handleContactDetailLayout: (
    layout: import('../contacts/ContactsView').ContactDetailLayoutSizes | null,
  ) => void
  handleCommunicationLoaded: () => void
  setArtifactDetailOpen: (v: boolean) => void
  setArtifactDeepDetail: (meta: { id: string; title: string } | null) => void
  setMediaDeepDetail: (meta: { id: string; title: string } | null) => void
  /** True while TaskDetailModal is open — Media composer must stay under it. */
  taskModalOpen?: boolean
  setReportingToolbarApi: (api: ReportingToolbarApi | null) => void
  setSelectedItem: (item: import('../../types').SpaceItem | null) => void
  /** Open task modal with correct parent stack for subtasks (list/kanban/calendar). */
  openSpaceItemModal: (item: import('../../types').SpaceItem) => void
  setDocEditorItem: (item: import('../../types').SpaceItem | null) => void
  reloadCampaignDocs: () => void
  setCategoryEditorOpen: (v: boolean) => void
  setStatusEditorOpen: (v: boolean) => void
  /** Shown on artifact preview toolbars in deep-work mode (e.g. Save). Funnels/websites/presentations only. */
  artifactDeepToolbarExtras?: ReactNode
  /** DocsView inline Drive grouping (controlled by toolbar). */
  docsDriveGroupBy: DocsDriveGroupBy
  /** DocsView inline Drive card density (controlled by toolbar). */
  docsDriveCardSize: DocsDriveCardSize
  /** Mirror DocsView inline Drive browse state up so the toolbar can react. */
  onDocsDriveBrowseActiveChange: (active: boolean) => void
} & ItemHandlers

export function SpaceContentRouter(p: SpaceContentRouterProps) {
  const perm = useSpacePermission(p.activeSpace)
  const { isAccountContextReady, isPersonalAccountContext } = useAccountContextGate()
  const { setArtifactQuery } = useArtifactDetailQuery()
  const {
    activeView,
    activeSchema,
    activeSpace,
    isContactsView,
    isIgResearchView,
    isTiktokResearchView,
    isYoutubeResearchView,
    isTwitterResearchView,
    isAllSocialResearchView,
    isAdsResearchView,
    socialPlatform,
    isMissionsView,
    isDocsView,
    isReportingView,
    items,
    campaignName,
    fieldsById,
    fieldsForUi,
    visibleFields,
    roster,
    currentUserId,
    filteredRegularItems,
    docItems,
    docsCloud,
    docsLoading,
    includeCampaignArtifacts,
    driveMappingsSyncing,
    hasDriveDocs,
    artifactPreviewSelection,
    setArtifactPreviewSelection,
    contactsSearch,
    contactsScope,
    contactsStatusFilter,
    contactsSort,
    contactsLoading,
    activeContactsSegmentId,
    contactCommunicationTab,
    spaceToolbarSearch,
    setSpaceToolbarSearch,
    financeToolbarSearch,
    contactsViewRef,
    missionsViewRef,
    financeOverviewRef,
    handleViewPatch,
    openCustomizeFromToolbar,
    setContactsLoading,
    setContactDetailOpen,
    resetContactCommunicationTab,
    handleContactDetailLayout,
    handleCommunicationLoaded,
    setArtifactDetailOpen,
    setArtifactDeepDetail,
    setMediaDeepDetail,
    setReportingToolbarApi,
    taskModalOpen = false,
    onUpdateItem: updateItem,
    onDeleteItem: deleteItem,
    onPushToAgent: pushToAgent,
    onCreateOption: handleCreateFieldOption,
    onUpdateOption: handleUpdateFieldOption,
    onDeleteOption: handleDeleteFieldOption,
    onTagCustomSwatchesChange: handleTagCustomSwatchesChange,
    openSpaceItemModal,
    setDocEditorItem,
    reloadCampaignDocs,
    setCategoryEditorOpen,
    setStatusEditorOpen,
    artifactDeepToolbarExtras,
    docsDriveGroupBy,
    docsDriveCardSize,
    onDocsDriveBrowseActiveChange,
  } = p

  if (!activeView) {
    return <EmptySpaceCanvas />
  }

  if (
    (!isAccountContextReady || isPersonalAccountContext) &&
    (activeView.type === 'channels' || activeView.type === 'channel')
  ) {
    return <EmptySpaceCanvas />
  }

  return (
    <>
      {activeView?.type === 'channels' ? (
        <ChannelsIndexView
          view={activeView}
          spaceId={activeSpace.id}
          campaignId={activeSpace.campaign_id ?? null}
          onViewPatch={handleViewPatch}
        />
      ) : activeView?.type === 'channel' ? (
        <SpaceChannelView
          view={activeView}
          spaceId={activeSpace.id}
          campaignId={activeSpace.campaign_id ?? null}
        />
      ) : activeView?.type === 'media' ? (
        <SpaceMediaView
          spaceId={activeSpace.id}
          campaignId={activeSpace.campaign_id ?? null}
          view={activeView}
          onMediaDeepMetaChange={setMediaDeepDetail}
          taskModalOpen={taskModalOpen}
        />
      ) : isContactsView ? (
        activeSpace.campaign_id || contactsScope === 'all' ? (
          <ContactsView
            ref={contactsViewRef}
            campaignId={activeSpace.campaign_id ?? null}
            contactsScope={contactsScope}
            view={activeView!}
            onViewPatch={handleViewPatch}
            onOpenAddColumn={() => {
              openCustomizeFromToolbar('fields')
            }}
            search={contactsSearch}
            statusFilter={contactsStatusFilter}
            sort={contactsSort}
            loading={contactsLoading}
            onLoadingChange={setContactsLoading}
            onDetailChange={setContactDetailOpen}
            activeSegmentId={activeContactsSegmentId}
            communicationTab={contactCommunicationTab}
            onDetailContactIdChange={resetContactCommunicationTab}
            onContactDetailLayout={handleContactDetailLayout}
            onCommunicationLoaded={handleCommunicationLoaded}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <p className="body-3 text-muted-foreground">
              This space is not linked to a campaign. Contacts require a campaign.
            </p>
          </div>
        )
      ) : isAdsResearchView ? (
        <AdsResearchView
          key={activeView!.id}
          view={activeView!}
          items={items}
          researchContext={{ spaceId: activeSpace.id, campaignId: activeSpace.campaign_id ?? null }}
        />
      ) : isIgResearchView ||
        isTiktokResearchView ||
        isYoutubeResearchView ||
        isTwitterResearchView ||
        isAllSocialResearchView ? (
        <InstagramResearchView
          key={activeView!.id}
          view={activeView!}
          items={items}
          spaceId={activeSpace.id}
          schema={activeSchema}
          onViewPatch={handleViewPatch}
          onOpenPeopleCustomize={() => openCustomizeFromToolbar('people')}
          platform={isAllSocialResearchView ? 'instagram' : (socialPlatform ?? 'instagram')}
        />
      ) : activeView?.type === 'calendar' ? (
        <SpaceCalendarView
          view={activeView}
          items={filteredRegularItems}
          fieldsById={fieldsById}
          visibleFields={visibleFields}
          allFields={fieldsForUi}
          roster={roster}
          currentUserId={currentUserId}
          campaignId={activeSpace.campaign_id ?? null}
          readOnly={!perm.canEdit}
          onUpdateItem={updateItem}
          onCreateItem={(title, extra) => useSpacesStore.getState().createItem(title, extra)}
          onDeleteItem={deleteItem}
          onPushToAgent={pushToAgent}
          onViewChange={handleViewPatch}
          onOpenDetail={openSpaceItemModal}
          onAddField={() => {
            openCustomizeFromToolbar('fields')
          }}
          onCreateOption={handleCreateFieldOption}
          onUpdateOption={handleUpdateFieldOption}
          onDeleteOption={handleDeleteFieldOption}
          onTagCustomSwatchesChange={handleTagCustomSwatchesChange}
          onEditStatuses={() => setStatusEditorOpen(true)}
          onEditCategories={() => setCategoryEditorOpen(true)}
          onOpenSocialPost={(id) => {
            setArtifactPreviewSelection(null)
            setArtifactQuery(id)
          }}
        />
      ) : isMissionsView ? (
        activeSpace.campaign_id ? (
          <MissionsView
            ref={missionsViewRef}
            campaignId={activeSpace.campaign_id}
            campaignName={campaignName ?? activeSpace.campaign_id}
            spaceId={activeSpace.id}
            activeView={activeView!}
            onViewPatch={handleViewPatch}
            currentUserId={currentUserId}
            toolbarSearchQuery={spaceToolbarSearch}
            onAddColumn={() => {
              openCustomizeFromToolbar('fields')
            }}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <p className="body-3 text-muted-foreground">
              This space is not linked to a campaign. Missions require a campaign.
            </p>
          </div>
        )
      ) : activeView?.type === 'all_artifacts' ? (
        <AllArtifactsSpaceView
          campaignId={activeSpace.campaign_id ?? null}
          activeView={activeView}
          selection={artifactPreviewSelection}
          onSelectionChange={setArtifactPreviewSelection}
          onDetailChange={setArtifactDetailOpen}
          onArtifactDeepMetaChange={setArtifactDeepDetail}
          artifactDeepToolbarExtras={artifactDeepToolbarExtras}
          includeCampaignArtifacts={includeCampaignArtifacts}
        />
      ) : activeView?.type === 'funnels' ? (
        <FunnelsSpaceView
          campaignId={activeSpace.campaign_id ?? null}
          activeView={activeView}
          selection={artifactPreviewSelection}
          onSelectionChange={setArtifactPreviewSelection}
          onDetailChange={setArtifactDetailOpen}
          onArtifactDeepMetaChange={setArtifactDeepDetail}
          artifactDeepToolbarExtras={artifactDeepToolbarExtras}
          includeCampaignArtifacts={includeCampaignArtifacts}
        />
      ) : activeView?.type === 'form_responses' ? (
        <FormResponsesView
          view={activeView}
          items={items}
          visibleFields={visibleFields}
          allFields={fieldsForUi}
          roster={roster}
          currentUserId={currentUserId}
          readOnly={!perm.canEdit}
          onUpdateItem={updateItem}
          onDeleteItem={deleteItem}
          onPushToAgent={pushToAgent}
          onOpenDetail={openSpaceItemModal}
          onViewChange={handleViewPatch}
          onCreateOption={handleCreateFieldOption}
          onUpdateOption={handleUpdateFieldOption}
          onDeleteOption={handleDeleteFieldOption}
          onTagCustomSwatchesChange={handleTagCustomSwatchesChange}
          onAddField={() => {
            openCustomizeFromToolbar('fields')
          }}
          onEditStatuses={() => setStatusEditorOpen(true)}
          onEditCategories={() => setCategoryEditorOpen(true)}
        />
      ) : activeView?.type === 'forms' ? (
        <FormsSpaceView
          campaignId={activeSpace.campaign_id ?? null}
          activeView={activeView}
          selection={artifactPreviewSelection}
          onSelectionChange={setArtifactPreviewSelection}
          onDetailChange={setArtifactDetailOpen}
          onArtifactDeepMetaChange={setArtifactDeepDetail}
          artifactDeepToolbarExtras={artifactDeepToolbarExtras}
          includeCampaignArtifacts={includeCampaignArtifacts}
        />
      ) : activeView?.type === 'emails' ? (
        <EmailsSpaceView
          campaignId={activeSpace.campaign_id ?? null}
          activeView={activeView}
          selection={artifactPreviewSelection}
          onSelectionChange={setArtifactPreviewSelection}
          onDetailChange={setArtifactDetailOpen}
          onArtifactDeepMetaChange={setArtifactDeepDetail}
          artifactDeepToolbarExtras={artifactDeepToolbarExtras}
          includeCampaignArtifacts={includeCampaignArtifacts}
        />
      ) : activeView?.type === 'websites' ? (
        <WebsitesSpaceView
          campaignId={activeSpace.campaign_id ?? null}
          activeView={activeView}
          selection={artifactPreviewSelection}
          onSelectionChange={setArtifactPreviewSelection}
          onDetailChange={setArtifactDetailOpen}
          onArtifactDeepMetaChange={setArtifactDeepDetail}
          artifactDeepToolbarExtras={artifactDeepToolbarExtras}
          includeCampaignArtifacts={includeCampaignArtifacts}
        />
      ) : activeView?.type === 'offers' ? (
        <OffersSpaceView
          campaignId={activeSpace.campaign_id ?? null}
          activeView={activeView}
          selection={artifactPreviewSelection}
          onSelectionChange={setArtifactPreviewSelection}
          onDetailChange={setArtifactDetailOpen}
          onArtifactDeepMetaChange={setArtifactDeepDetail}
          includeCampaignArtifacts={includeCampaignArtifacts}
        />
      ) : activeView?.type === 'avatars' ? (
        <AvatarsSpaceView
          campaignId={activeSpace.campaign_id ?? null}
          activeView={activeView}
          selection={artifactPreviewSelection}
          onSelectionChange={setArtifactPreviewSelection}
          onDetailChange={setArtifactDetailOpen}
          onArtifactDeepMetaChange={setArtifactDeepDetail}
          includeCampaignArtifacts={includeCampaignArtifacts}
        />
      ) : activeView?.type === 'ads' || activeView?.type === 'ad_campaigns' ? (
        <PaidAdsSpaceView
          campaignId={activeSpace.campaign_id ?? null}
          spaceId={activeSpace.id}
          activeView={activeView}
          selection={artifactPreviewSelection}
          onSelectionChange={setArtifactPreviewSelection}
          onDetailChange={setArtifactDetailOpen}
          onArtifactDeepMetaChange={setArtifactDeepDetail}
          artifactDeepToolbarExtras={artifactDeepToolbarExtras}
          includeCampaignArtifacts={includeCampaignArtifacts}
        />
      ) : activeView?.type === 'sequences' ? (
        <SequencesSpaceView
          campaignId={activeSpace.campaign_id ?? null}
          activeView={activeView}
          selection={artifactPreviewSelection}
          onSelectionChange={setArtifactPreviewSelection}
          onDetailChange={setArtifactDetailOpen}
          onArtifactDeepMetaChange={setArtifactDeepDetail}
          artifactDeepToolbarExtras={artifactDeepToolbarExtras}
          includeCampaignArtifacts={includeCampaignArtifacts}
        />
      ) : activeView?.type === 'presentations' ? (
        <PresentationsSpaceView
          campaignId={activeSpace.campaign_id ?? null}
          activeView={activeView}
          selection={artifactPreviewSelection}
          onSelectionChange={setArtifactPreviewSelection}
          onDetailChange={setArtifactDetailOpen}
          onArtifactDeepMetaChange={setArtifactDeepDetail}
          artifactDeepToolbarExtras={artifactDeepToolbarExtras}
          includeCampaignArtifacts={includeCampaignArtifacts}
        />
      ) : activeView?.type === 'social_posts' ? (
        <SocialPostsSpaceView
          campaignId={activeSpace.campaign_id ?? null}
          activeView={activeView}
          selection={artifactPreviewSelection}
          onSelectionChange={setArtifactPreviewSelection}
          onDetailChange={setArtifactDetailOpen}
          onArtifactDeepMetaChange={setArtifactDeepDetail}
          includeCampaignArtifacts={includeCampaignArtifacts}
        />
      ) : isReportingView ? (
        activeSpace.campaign_id ? (
          (() => {
            const rProps = {
              campaignId: activeSpace.campaign_id,
              campaignName: campaignName ?? activeSpace.campaign_id,
              activeView: activeView!,
              onViewPatch: handleViewPatch,
              onRegisterReportingToolbar: setReportingToolbarApi,
            }
            switch (activeView!.type) {
              case 'campaign_overview':
                return <CampaignOverviewView {...rProps} />
              case 'social_reporting':
                return <SocialReportingView {...rProps} />
              case 'funnel_analytics':
                return <FunnelAnalyticsView {...rProps} />
              case 'email_analytics':
                return <EmailAnalyticsView {...rProps} />
              case 'ads_performance':
                return <AdsPerformanceSpaceView {...rProps} />
              case 'finance_overview':
                return (
                  <FinanceOverviewView
                    ref={financeOverviewRef}
                    {...rProps}
                    financeSearchQuery={financeToolbarSearch}
                  />
                )
              default:
                return null
            }
          })()
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <p className="body-3 text-muted-foreground">
              This space is not linked to a campaign. Reporting views require a campaign.
            </p>
          </div>
        )
      ) : activeView?.type === 'kanban' ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <KanbanView
            view={activeView}
            items={filteredRegularItems}
            fieldsById={fieldsById}
            roster={roster}
            currentUserId={currentUserId}
            onUpdateItem={updateItem}
            onCreateOption={handleCreateFieldOption}
            onUpdateOption={handleUpdateFieldOption}
            onDeleteOption={handleDeleteFieldOption}
            onTagCustomSwatchesChange={handleTagCustomSwatchesChange}
            onPushToAgent={pushToAgent}
            onOpenDetail={openSpaceItemModal}
            onCreateSubtask={async (parentId, title, extras) => {
              try {
                await useSpacesStore
                  .getState()
                  .createItem(title, { ...extras, parent_item_id: parentId })
              } catch (err) {
                console.error('[kanban subtask] create failed:', err)
                toast.error('Failed to create subtask')
              }
            }}
            onAddItemInGroup={async (title, groupFieldId, groupKey, fieldExtras) => {
              const extra: Record<string, unknown> = { ...(fieldExtras ?? {}) }
              if (groupFieldId === 'status') extra.status = groupKey
              else if (groupFieldId === 'priority') extra.priority = groupKey
              else if (groupFieldId === 'category') {
                const base =
                  extra.custom_data &&
                  typeof extra.custom_data === 'object' &&
                  !Array.isArray(extra.custom_data)
                    ? { ...(extra.custom_data as Record<string, unknown>) }
                    : {}
                if (groupKey === '__none__' || groupKey === '') base.category = null
                else base.category = groupKey
                extra.custom_data = base
              } else if (groupFieldId === 'assignee') {
                if (groupKey === '__unassigned__') {
                  extra.assignee_type = 'unassigned'
                  extra.assignee_id = null
                  extra.assignees = []
                } else {
                  const entry =
                    roster.find((r) => r.participant_id === groupKey) ??
                    roster.find(
                      (r) =>
                        (r.kind === 'human' && r.user_id === groupKey) ||
                        (r.kind === 'agent' && r.agent_key === groupKey),
                    )
                  if (entry) {
                    extra.assignee_type = entry.kind === 'agent' ? 'agent' : 'human'
                    extra.assignee_id = entry.kind === 'agent' ? entry.agent_key! : entry.user_id!
                    extra.assignees = [{ type: extra.assignee_type, id: extra.assignee_id }]
                  }
                }
              }
              await useSpacesStore.getState().createItem(title, extra)
            }}
          />
        </div>
      ) : isDocsView ? (
        docsLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <VibeyLoadingOrb
              text={
                driveMappingsSyncing && !hasDriveDocs
                  ? 'Syncing Drive folders...'
                  : 'Loading docs...'
              }
              state="processing"
              size="lg"
            />
          </div>
        ) : (
          <DocsView
            view={activeView!}
            items={docItems}
            fieldsById={fieldsById}
            allFields={fieldsForUi}
            visibleFields={visibleFields}
            roster={roster}
            currentUserId={currentUserId}
            onOpenDetail={setDocEditorItem}
            onViewPatch={handleViewPatch}
            onUpdateItem={updateItem}
            onDeleteItem={deleteItem}
            onPushToAgent={pushToAgent}
            onCreateOption={handleCreateFieldOption}
            onUpdateOption={handleUpdateFieldOption}
            onDeleteOption={handleDeleteFieldOption}
            onTagCustomSwatchesChange={handleTagCustomSwatchesChange}
            onEditCategories={() => setCategoryEditorOpen(true)}
            onEditStatuses={() => setStatusEditorOpen(true)}
            onAddField={() => {
              openCustomizeFromToolbar('fields')
            }}
            campaignId={activeSpace?.campaign_id ?? null}
            onCampaignDocsRefresh={reloadCampaignDocs}
            driveGroupBy={docsDriveGroupBy}
            driveCardSize={docsDriveCardSize}
            onDriveBrowseActiveChange={onDocsDriveBrowseActiveChange}
            toolbarSearchQuery={spaceToolbarSearch}
            onToolbarSearchQueryChange={setSpaceToolbarSearch}
            docsCloud={docsCloud}
          />
        )
      ) : (
        <ListView
          items={filteredRegularItems}
          visibleFields={visibleFields}
          roster={roster}
          currentUserId={currentUserId}
          readOnly={!perm.canEdit}
          onUpdateItem={updateItem}
          onDeleteItem={deleteItem}
          onPushToAgent={pushToAgent}
          onOpenDetail={openSpaceItemModal}
          activeView={activeView!}
          allFields={fieldsForUi}
          onViewChange={handleViewPatch}
          surface={activeView?.type === 'table' ? 'table' : 'list'}
          onCreateOption={handleCreateFieldOption}
          onUpdateOption={handleUpdateFieldOption}
          onDeleteOption={handleDeleteFieldOption}
          onTagCustomSwatchesChange={handleTagCustomSwatchesChange}
          onAddItemInGroup={async (title, groupFieldId, groupKey, fieldExtras) => {
            const extra: Record<string, unknown> = { ...(fieldExtras ?? {}) }
            if (groupFieldId === 'status') extra.status = groupKey
            else if (groupFieldId === 'priority') extra.priority = groupKey
            else if (groupFieldId === 'category') {
              const base =
                extra.custom_data &&
                typeof extra.custom_data === 'object' &&
                !Array.isArray(extra.custom_data)
                  ? { ...(extra.custom_data as Record<string, unknown>) }
                  : {}
              if (groupKey === '__none__' || groupKey === '') base.category = null
              else base.category = groupKey
              extra.custom_data = base
            } else if (groupFieldId === 'assignee') {
              if (groupKey === '__unassigned__') {
                extra.assignee_type = 'unassigned'
                extra.assignee_id = null
                extra.assignees = []
              } else {
                const entry =
                  roster.find((r) => r.participant_id === groupKey) ??
                  roster.find(
                    (r) =>
                      (r.kind === 'human' && r.user_id === groupKey) ||
                      (r.kind === 'agent' && r.agent_key === groupKey),
                  )
                if (entry) {
                  extra.assignee_type = entry.kind === 'agent' ? 'agent' : 'human'
                  extra.assignee_id = entry.kind === 'agent' ? entry.agent_key! : entry.user_id!
                  extra.assignees = [{ type: extra.assignee_type, id: extra.assignee_id }]
                }
              }
            }
            await useSpacesStore.getState().createItem(title, extra)
          }}
          onEditStatuses={() => setStatusEditorOpen(true)}
          onEditCategories={() => setCategoryEditorOpen(true)}
          onAddField={() => {
            openCustomizeFromToolbar('fields')
          }}
        />
      )}
    </>
  )
}
