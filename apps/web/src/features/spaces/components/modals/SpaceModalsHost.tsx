'use client'

import dynamic from 'next/dynamic'
import { useState, type RefObject } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { useSpaceProgramPrivacy } from '../../hooks/use-space-program-privacy'
import { updateSpace } from '../../services/spaces.service'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { Space, SpaceItem } from '../../types'
import type { FieldDef, SelectOption, SpaceSchema, ViewDef } from '../../types/space-schema'
import { AssigneeFilterSlideOver } from '../AssigneeFilterSlideOver'
import { CategoryEditorModal } from '../CategoryEditorModal'
import type { ContactsViewHandle } from '../contacts/ContactsView'
import { StatusEditorModal } from '../StatusEditorModal'

/** Shown while a heavy modal chunk loads after the user already asked to open it. */
function ModalChunkLoading() {
  return (
    <div className="fixed inset-0 z-[50] flex items-center justify-center">
      <VibeyLoadingOrb state="processing" size="md" />
    </div>
  )
}

function NullLoading() {
  return null
}

// Heavy modal stacks are loaded on demand so TipTap/ProseMirror, the customize
// sub-views, automations flows, the task-detail stack and the contacts import
// dialogs stay out of the /spaces route-entry chunk (perf-optimize pattern 7).
const DocEditorPanel = dynamic(
  () => import('../docs/DocEditorPanel').then((mod) => mod.DocEditorPanel),
  { loading: ModalChunkLoading },
)
const TaskDetailModal = dynamic(
  () => import('../task-detail/TaskDetailModal').then((mod) => mod.TaskDetailModal),
  { loading: ModalChunkLoading },
)
const AutomationsPanel = dynamic(
  () => import('../automations/AutomationsPanel').then((mod) => mod.AutomationsPanel),
  { loading: NullLoading },
)
const CustomizeViewPanel = dynamic(
  () => import('../CustomizeViewPanel').then((mod) => mod.CustomizeViewPanel),
  { loading: NullLoading },
)
const ShareModal = dynamic(() => import('../ShareModal').then((mod) => mod.ShareModal), {
  loading: NullLoading,
})
const ViewShareModal = dynamic(
  () => import('../ViewShareModal').then((mod) => mod.ViewShareModal),
  { loading: NullLoading },
)
const ContactsSegmentPanel = dynamic(
  () => import('../contacts/ContactsSegmentPanel').then((mod) => mod.ContactsSegmentPanel),
  { loading: NullLoading },
)
const AllContactsAddManualDialog = dynamic(
  () =>
    import('@/features/studio/components/preview/AllContactsAddManualDialog').then(
      (mod) => mod.AllContactsAddManualDialog,
    ),
  { loading: NullLoading },
)
const AllContactsImportCsvDialog = dynamic(
  () =>
    import('@/features/studio/components/preview/AllContactsImportCsvDialog').then(
      (mod) => mod.AllContactsImportCsvDialog,
    ),
  { loading: NullLoading },
)
const AllContactsImportGhlDialog = dynamic(
  () =>
    import('@/components/contacts').then((mod) => mod.AllContactsImportGhlDialog),
  { loading: NullLoading },
)
const AllContactsImportAcDialog = dynamic(
  () =>
    import('@/features/studio/components/preview/AllContactsImportAcDialog').then(
      (mod) => mod.AllContactsImportAcDialog,
    ),
  { loading: NullLoading },
)

/**
 * Latches true on first open so always-mounted `open`-prop panels only load
 * their chunk when first used, while staying mounted afterwards (close/exit
 * animations and internal state behave exactly as before).
 */
function useMountOnFirstOpen(open: boolean): boolean {
  const [mounted, setMounted] = useState(open)
  if (open && !mounted) setMounted(true)
  return mounted || open
}

export type SpaceModalsHostProps = {
  activeSpace: Space
  activeView: ViewDef | null
  activeSchema: SpaceSchema
  roster: TeamRosterEntry[]
  fieldsForUi: FieldDef[]
  fieldsById: Map<string, FieldDef>
  currentUserId: string | null
  customizePanelTargetView: ViewDef | null
  panelInitialView: 'main' | 'fields' | 'people' | 'ig_format'
  schemaEditorOpen: boolean
  canCustomizeViews: boolean
  customizeDropdownAnchorRef: RefObject<HTMLElement | null>
  customizeStageBounds: { top: number; height: number } | null
  viewOverrides: Record<string, unknown>
  isTeamSpace: boolean
  canSaveForEveryone: boolean
  statusEditorOpen: boolean
  categoryEditorOpen: boolean
  automationsOpen: boolean
  assigneeFilterOpen: boolean
  spaceShareOpen: boolean
  spaceShareDualNavigator: boolean
  docEditorItem: SpaceItem | null
  selectedItem: SpaceItem | null
  taskHistory: SpaceItem[]
  pushTaskAndOpen: (next: SpaceItem) => void
  popTask: () => boolean
  isContactsView: boolean
  contactsSegmentPanelOpen: boolean
  activeContactsSegmentId: string | null
  contactsManualOpen: boolean
  contactsCsvOpen: boolean
  contactsGhlOpen: boolean
  contactsAcOpen: boolean
  contactsViewRef: RefObject<ContactsViewHandle | null>
  setAssigneeFilterOpen: (v: boolean) => void
  closeCustomizePanel: () => void
  handleViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  handleViewPinToStart: (pinned: boolean) => Promise<void>
  handleDeleteActiveView: () => Promise<void>
  handleIgAddAccount: (handle: string) => Promise<void>
  handleIgSyncAccount: (handle: string) => Promise<void>
  handleIgRemoveAccount: (handle: string) => Promise<void>
  handleAllSocialAddAccount: (
    platform: import('../../types/space-schema').SocialPlatform,
    handle: string,
  ) => Promise<void>
  handleAllSocialSyncAccount: (
    platform: import('../../types/space-schema').SocialPlatform,
    handle: string,
  ) => Promise<void>
  handleAllSocialRemoveAccount: (
    platform: import('../../types/space-schema').SocialPlatform,
    handle: string,
  ) => Promise<void>
  handleSaveForEveryone: () => Promise<void>
  handleResetViewToDefault: () => Promise<void>
  setSpaceShareDualNavigator: (v: boolean) => void
  setSpaceShareOpen: (v: boolean) => void
  setStatusEditorOpen: (v: boolean) => void
  setCategoryEditorOpen: (v: boolean) => void
  setAutomationsOpen: (v: boolean) => void
  setDocEditorItem: (v: SpaceItem | null) => void
  setSelectedItem: (v: SpaceItem | null) => void
  setContactsSegmentPanelOpen: (v: boolean) => void
  setActiveContactsSegmentId: (id: string | null) => void
  setActiveContactsSegmentName: (name: string | null) => void
  setContactsManualOpen: (v: boolean) => void
  setContactsCsvOpen: (v: boolean) => void
  setContactsGhlOpen: (v: boolean) => void
  setContactsAcOpen: (v: boolean) => void
  refresh: () => Promise<void>
  reloadCampaignDocs: () => void
  toggleToolbarAssigneeParticipant: (participantId: string, checked: boolean) => void
  toggleToolbarMissionAgent: (agentKey: string, checked: boolean) => void
  handleCreateFieldOption: (fieldId: string, option: SelectOption) => Promise<void>
  handleUpdateFieldOption: (
    fieldId: string,
    optionId: string,
    updates: Partial<SelectOption>,
  ) => Promise<void>
  handleDeleteFieldOption: (fieldId: string, optionId: string) => Promise<void>
  handleTagCustomSwatchesChange: (fieldId: string, swatches: string[]) => Promise<void>
  onDocEditorDismiss?: () => void
}

export function SpaceModalsHost(p: SpaceModalsHostProps) {
  const { isOrgContext, hasMinRole } = useOrgStore()
  const [viewShareTarget, setViewShareTarget] = useState<{ id: string; name: string } | null>(null)
  const spaceProgramPrivacy = useSpaceProgramPrivacy(p.activeSpace ?? null)

  const {
    activeSpace,
    activeView,
    activeSchema,
    roster,
    fieldsForUi,
    fieldsById,
    currentUserId,
    customizePanelTargetView,
    panelInitialView,
    schemaEditorOpen,
    canCustomizeViews,
    customizeDropdownAnchorRef,
    customizeStageBounds,
    viewOverrides,
    isTeamSpace,
    canSaveForEveryone,
    statusEditorOpen,
    categoryEditorOpen,
    automationsOpen,
    assigneeFilterOpen,
    spaceShareOpen,
    spaceShareDualNavigator,
    docEditorItem,
    selectedItem,
    taskHistory,
    pushTaskAndOpen,
    popTask,
    isContactsView,
    contactsSegmentPanelOpen,
    activeContactsSegmentId,
    contactsManualOpen,
    contactsCsvOpen,
    contactsGhlOpen,
    contactsAcOpen,
    contactsViewRef,
    setAssigneeFilterOpen,
    closeCustomizePanel,
    handleViewPatch,
    handleViewPinToStart,
    handleDeleteActiveView,
    handleIgAddAccount,
    handleIgSyncAccount,
    handleIgRemoveAccount,
    handleAllSocialAddAccount,
    handleAllSocialSyncAccount,
    handleAllSocialRemoveAccount,
    handleSaveForEveryone,
    handleResetViewToDefault,
    setSpaceShareDualNavigator,
    setSpaceShareOpen,
    setStatusEditorOpen,
    setCategoryEditorOpen,
    setAutomationsOpen,
    setDocEditorItem,
    setSelectedItem,
    setContactsSegmentPanelOpen,
    setActiveContactsSegmentId,
    setActiveContactsSegmentName,
    setContactsManualOpen,
    setContactsCsvOpen,
    setContactsGhlOpen,
    setContactsAcOpen,
    refresh,
    reloadCampaignDocs,
    toggleToolbarAssigneeParticipant,
    toggleToolbarMissionAgent,
    handleCreateFieldOption,
    handleUpdateFieldOption,
    handleDeleteFieldOption,
    handleTagCustomSwatchesChange,
    onDocEditorDismiss,
  } = p

  const customizeResolvedView = customizePanelTargetView ?? activeView

  // Defer each heavy chunk until its panel is first opened; afterwards keep it
  // mounted so close behavior (exit animations, internal state) is unchanged.
  const customizeMounted = useMountOnFirstOpen(schemaEditorOpen && canCustomizeViews)
  const automationsMounted = useMountOnFirstOpen(automationsOpen)
  const shareMounted = useMountOnFirstOpen(spaceShareOpen)
  const contactsSegmentMounted = useMountOnFirstOpen(contactsSegmentPanelOpen)
  const contactsManualMounted = useMountOnFirstOpen(contactsManualOpen)
  const contactsCsvMounted = useMountOnFirstOpen(contactsCsvOpen)
  const contactsGhlMounted = useMountOnFirstOpen(contactsGhlOpen)
  const contactsAcMounted = useMountOnFirstOpen(contactsAcOpen)

  return (
    <>
      <AssigneeFilterSlideOver
        open={assigneeFilterOpen}
        onClose={() => setAssigneeFilterOpen(false)}
        mode={activeView?.type === 'missions' ? 'missions' : 'space'}
        roster={roster}
        selectedParticipantIds={activeView?.toolbar_filter_assignee_participant_ids ?? []}
        selectedAgentKeys={activeView?.missions_config?.toolbar_filter_agent_keys ?? []}
        onToggleSpaceParticipant={toggleToolbarAssigneeParticipant}
        onToggleMissionAgent={toggleToolbarMissionAgent}
      />

      {customizeResolvedView && customizeMounted ? (
        <CustomizeViewPanel
          open={schemaEditorOpen && canCustomizeViews}
          stageBounds={customizeDropdownAnchorRef.current != null ? null : customizeStageBounds}
          dropdownAnchorRef={customizeDropdownAnchorRef}
          schema={activeSchema}
          activeView={customizeResolvedView}
          initialSubView={panelInitialView}
          onClose={closeCustomizePanel}
          onViewPatch={handleViewPatch}
          onViewPinToStart={handleViewPinToStart}
          canDeleteView={activeSchema.views.length > 1}
          onDeleteView={handleDeleteActiveView}
          onAddAccount={
            customizePanelTargetView?.type === 'instagram_research' ||
            customizePanelTargetView?.type === 'tiktok_research' ||
            customizePanelTargetView?.type === 'youtube_research' ||
            customizePanelTargetView?.type === 'twitter_research'
              ? handleIgAddAccount
              : undefined
          }
          onSyncAccount={
            customizePanelTargetView?.type === 'instagram_research' ||
            customizePanelTargetView?.type === 'tiktok_research' ||
            customizePanelTargetView?.type === 'youtube_research' ||
            customizePanelTargetView?.type === 'twitter_research'
              ? handleIgSyncAccount
              : undefined
          }
          onRemoveAccount={
            customizePanelTargetView?.type === 'instagram_research' ||
            customizePanelTargetView?.type === 'tiktok_research' ||
            customizePanelTargetView?.type === 'youtube_research' ||
            customizePanelTargetView?.type === 'twitter_research'
              ? handleIgRemoveAccount
              : undefined
          }
          onAddAllSocialAccount={
            customizePanelTargetView?.type === 'all_social_research'
              ? handleAllSocialAddAccount
              : undefined
          }
          onSyncAllSocialAccount={
            customizePanelTargetView?.type === 'all_social_research'
              ? handleAllSocialSyncAccount
              : undefined
          }
          onRemoveAllSocialAccount={
            customizePanelTargetView?.type === 'all_social_research'
              ? handleAllSocialRemoveAccount
              : undefined
          }
          reportingCampaignId={activeSpace.campaign_id ?? null}
          artifactCampaignId={activeSpace.campaign_id ?? null}
          isTeamSpace={isTeamSpace}
          canSaveForEveryone={canSaveForEveryone}
          hasViewOverride={
            !!customizePanelTargetView && !!viewOverrides[customizePanelTargetView.id]
          }
          onSaveForEveryone={handleSaveForEveryone}
          onResetToDefault={handleResetViewToDefault}
          onOpenSharingPermissions={() => {
            // Per-view internal share modal (spaces.schema.views[viewId] →
            // space_view_shares). The dual-navigator public-link share is paused.
            const target = customizePanelTargetView ?? activeView
            if (!target) return
            setViewShareTarget({ id: target.id, name: target.name })
          }}
          onOpenStatusEditor={() => setStatusEditorOpen(true)}
        />
      ) : null}

      {viewShareTarget ? (
        <ViewShareModal
          open={true}
          onClose={() => setViewShareTarget(null)}
          spaceId={activeSpace.id}
          viewId={viewShareTarget.id}
          viewName={viewShareTarget.name}
          roster={roster}
        />
      ) : null}

      <StatusEditorModal
        open={statusEditorOpen}
        schema={activeSchema}
        onClose={() => setStatusEditorOpen(false)}
        onSchemaChange={async (nextSchema: SpaceSchema) => {
          const updated = await updateSpace(activeSpace.id, { schema: nextSchema })
          useSpacesStore
            .getState()
            .patchActiveSpaceSchema(updated.schema as unknown as Record<string, unknown>)
          await refresh()
        }}
      />

      <CategoryEditorModal
        open={categoryEditorOpen}
        schema={activeSchema}
        fieldId="category"
        title="Edit categories"
        onClose={() => setCategoryEditorOpen(false)}
        onSchemaChange={async (nextSchema: SpaceSchema) => {
          useSpacesStore
            .getState()
            .patchActiveSpaceSchema(nextSchema as unknown as Record<string, unknown>)
          await updateSpace(activeSpace.id, { schema: nextSchema })
        }}
      />

      {automationsMounted ? (
        <AutomationsPanel
          spaceId={activeSpace.id}
          open={automationsOpen}
          onClose={() => setAutomationsOpen(false)}
          roster={roster}
        />
      ) : null}

      {docEditorItem && (
        <DocEditorPanel
          item={docEditorItem}
          view={activeView ?? undefined}
          categoryField={
            fieldsById.get('category') ?? fieldsForUi.find((f) => f.id === 'category') ?? null
          }
          allFields={fieldsForUi}
          roster={roster}
          currentUserId={currentUserId}
          campaignId={activeSpace?.campaign_id ?? null}
          onClose={() => {
            setDocEditorItem(null)
            onDocEditorDismiss?.()
          }}
          onUpdated={() => void refresh()}
          onCampaignDocsRefresh={reloadCampaignDocs}
          onSelectChildDoc={(itemId: string) => {
            const next = useSpacesStore.getState().items.find((i) => i.id === itemId)
            if (next) setDocEditorItem(next)
          }}
          onEditCategories={() => setCategoryEditorOpen(true)}
          onEditStatuses={() => setStatusEditorOpen(true)}
          onCreateOption={handleCreateFieldOption}
          onUpdateOption={handleUpdateFieldOption}
          onDeleteOption={handleDeleteFieldOption}
          onTagCustomSwatchesChange={handleTagCustomSwatchesChange}
        />
      )}

      {selectedItem && (
        <TaskDetailModal
          item={selectedItem}
          allFields={fieldsForUi}
          activeView={activeView!}
          spaceSchema={activeSchema}
          onViewPatch={handleViewPatch}
          roster={roster}
          currentUserId={currentUserId}
          campaignId={activeSpace?.campaign_id ?? null}
          onNavigateToSpace={() => setSelectedItem(null)}
          onNavigateToView={() => setSelectedItem(null)}
          breadcrumbParentCrumb={
            taskHistory.length > 0 && taskHistory[taskHistory.length - 1]
              ? {
                  committedTitle:
                    (taskHistory[taskHistory.length - 1]!.title ?? '').trim() || 'Parent task',
                  onNavigate: () => {
                    popTask()
                  },
                }
              : null
          }
          canGoBack={taskHistory.length > 0}
          onBack={() => popTask()}
          onOpenTaskByItem={pushTaskAndOpen}
          onClose={() => setSelectedItem(null)}
          onUpdated={() => void refresh()}
          onEditStatuses={() => setStatusEditorOpen(true)}
          onEditCategories={() => setCategoryEditorOpen(true)}
          onCreateOption={handleCreateFieldOption}
          onUpdateOption={handleUpdateFieldOption}
          onDeleteOption={handleDeleteFieldOption}
          onTagCustomSwatchesChange={handleTagCustomSwatchesChange}
        />
      )}

      {shareMounted ? (
        <ShareModal
          open={spaceShareOpen}
          onClose={() => {
            setSpaceShareOpen(false)
            setSpaceShareDualNavigator(false)
          }}
          entityType="space"
          spaceId={activeSpace.id}
          entityId={activeSpace.id}
          entityName={activeSpace.title}
          spaceVisibility={activeSpace.visibility}
          spaceShareLinkEnabled={activeSpace.share_link_enabled ?? false}
          spaceShareToken={activeSpace.share_token ?? null}
          roster={roster}
          dualSpaceShareNavigator={spaceShareDualNavigator}
          dualNavigatorInitialScope="view"
          activeViewId={activeView?.id ?? null}
          activeViewName={activeView?.name ?? null}
          canManageSharing={isOrgContext() ? hasMinRole('admin') : true}
          programPrivacyNotice={
            spaceProgramPrivacy.restricted
              ? { programName: spaceProgramPrivacy.programName }
              : null
          }
          onSpacePatch={(patch: Partial<Space>) => {
            useSpacesStore.setState((s) => ({
              spaces: s.spaces.map((sp) => (sp.id === activeSpace.id ? { ...sp, ...patch } : sp)),
            }))
          }}
        />
      ) : null}
      {isContactsView && activeSpace?.campaign_id ? (
        <>
          {contactsSegmentMounted ? (
            <ContactsSegmentPanel
              open={contactsSegmentPanelOpen}
              onClose={() => setContactsSegmentPanelOpen(false)}
              activeSegmentId={activeContactsSegmentId}
              onApplySegment={(id: string | null, name: string | null) => {
                setActiveContactsSegmentId(id)
                setActiveContactsSegmentName(name)
              }}
              stageBounds={customizeStageBounds}
            />
          ) : null}
          {contactsManualMounted ? (
            <AllContactsAddManualDialog
              open={contactsManualOpen}
              onClose={() => setContactsManualOpen(false)}
              onCreated={() => contactsViewRef.current?.refresh()}
              campaignId={activeSpace.campaign_id}
            />
          ) : null}
          {contactsCsvMounted ? (
            <AllContactsImportCsvDialog
              open={contactsCsvOpen}
              onClose={() => setContactsCsvOpen(false)}
              onImported={() => contactsViewRef.current?.refresh()}
              campaignId={activeSpace.campaign_id}
            />
          ) : null}
          {contactsGhlMounted ? (
            <AllContactsImportGhlDialog
              open={contactsGhlOpen}
              onClose={() => setContactsGhlOpen(false)}
              onImported={() => contactsViewRef.current?.refresh()}
              campaignId={activeSpace.campaign_id}
            />
          ) : null}
          {contactsAcMounted ? (
            <AllContactsImportAcDialog
              open={contactsAcOpen}
              onClose={() => setContactsAcOpen(false)}
              onImported={() => contactsViewRef.current?.refresh()}
              campaignId={activeSpace.campaign_id}
            />
          ) : null}
        </>
      ) : null}
    </>
  )
}
