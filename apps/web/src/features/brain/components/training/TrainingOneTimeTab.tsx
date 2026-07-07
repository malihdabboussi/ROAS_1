'use client'

import { DriveFileBrowserPanel } from '@/components/media/DriveFileBrowserPanel'
import { DropboxFileBrowserModal } from '@/components/media/DropboxFileBrowserModal'
import type { TrainableBrainTarget } from '@/features/brain/hooks/use-trainable-brains'
import { cn } from '@/lib/utils/cn'
import type { SkDomain, SkSource, SkSourceType } from '../../services/sk.service'
import { TrainingAddPane } from './TrainingAddPane'
import {
  TrainingFathomPane,
  TrainingFirefliesPane,
} from './TrainingIntegrationPanes'
import {
  buildDraftPreview,
  fathomLikelyAlreadyIngested,
  firefliesLikelyAlreadyIngested,
  makeSignature,
} from './training-staging-helpers'
import { TrainingSourceRail, type SourceRailIntegrationItem } from './TrainingSourceRail'
import { TrainingStagingPanel } from './TrainingStagingPanel'
import type { SourceKey, StagedDraft, StagedItem, StagedPayload } from './types'

export function TrainingOneTimeTab({
  showBrainPicker,
  pickerTargets,
  activeScopeIds,
  onSelectedScopeIdsChange,
  activeSource,
  onActiveSourceChange,
  integrationsStatusReady,
  connectedIntegrationRailItems,
  onOpenIntegrationsLibrary,
  open,
  onStageText,
  onStageLink,
  onPickFile,
  onOpenMediaLibrary,
  fathomConnected,
  firefliesConnected,
  onPushDraft,
  staged,
  skSources,
  stagedCount,
  selectedCount,
  selectedStagedIds,
  onClearStaged,
  onSelectAllStaged,
  onToggleStaged,
  onRemoveStaged,
  onUpdateMetadata,
  onSetItemTargets,
  fallbackBrainId,
  fallbackBrainTarget,
  bulkSourceType,
  bulkDomain,
  bulkOpenMenu,
  onBulkSourceTypeChange,
  onBulkDomainChange,
  onBulkOpenMenuChange,
  onApplyBulk,
  submitting,
  canAdd,
  onAddAll,
}: {
  showBrainPicker: boolean
  pickerTargets: TrainableBrainTarget[]
  activeScopeIds: string[]
  onSelectedScopeIdsChange?: (scopeIds: string[]) => void
  activeSource: SourceKey
  onActiveSourceChange: (source: SourceKey) => void
  integrationsStatusReady: boolean
  connectedIntegrationRailItems: SourceRailIntegrationItem[]
  onOpenIntegrationsLibrary: () => void
  open: boolean
  onStageText: (title: string, body: string) => boolean
  onStageLink: (url: string) => boolean
  onPickFile: (file: File) => void
  onOpenMediaLibrary: () => void
  fathomConnected: boolean
  firefliesConnected: boolean
  onPushDraft: (draft: StagedDraft) => void
  staged: StagedItem[]
  skSources: SkSource[]
  stagedCount: number
  selectedCount: number
  selectedStagedIds: Set<string>
  onClearStaged: () => void
  onSelectAllStaged: (select: boolean) => void
  onToggleStaged: (id: string) => void
  onRemoveStaged: (id: string) => void
  onUpdateMetadata: (id: string, patch: Partial<StagedItem['metadata']>) => void
  onSetItemTargets: (id: string, brainIds: string[]) => void
  fallbackBrainId: string | null
  fallbackBrainTarget: TrainableBrainTarget | null
  bulkSourceType: SkSourceType | ''
  bulkDomain: SkDomain | ''
  bulkOpenMenu: 'type' | 'domain' | null
  onBulkSourceTypeChange: (value: SkSourceType | '') => void
  onBulkDomainChange: (value: SkDomain | '') => void
  onBulkOpenMenuChange: (value: 'type' | 'domain' | null) => void
  onApplyBulk: () => void
  submitting: boolean
  canAdd: boolean
  onAddAll: () => void
}) {
  return (
    <div className="gap-spacing-2 grid h-full min-h-0 grid-cols-[220px_minmax(0,1fr)_340px] overflow-hidden">
      <TrainingSourceRail
        showBrainPicker={showBrainPicker}
        pickerTargets={pickerTargets}
        activeScopeIds={activeScopeIds}
        onSelectedScopeIdsChange={onSelectedScopeIdsChange}
        activeSource={activeSource}
        onActiveSourceChange={onActiveSourceChange}
        integrationsStatusReady={integrationsStatusReady}
        connectedIntegrationRailItems={connectedIntegrationRailItems}
        onOpenIntegrationsLibrary={onOpenIntegrationsLibrary}
      />

      <div className="p-spacing-2 flex h-full min-h-0 flex-col">
        <section
          className={cn(
            'relative h-full min-h-0',
            activeSource === 'add' || activeSource === 'drive' || activeSource === 'dropbox'
              ? 'flex min-h-0 flex-col overflow-hidden'
              : 'overflow-y-auto',
          )}
        >
          {activeSource === 'add' ? (
            <TrainingAddPane
              onStageText={onStageText}
              onStageLink={onStageLink}
              onPickFile={onPickFile}
              onOpenMediaLibrary={onOpenMediaLibrary}
            />
          ) : null}
          {activeSource === 'drive' ? (
            <DriveFileBrowserPanel
              layout="embedded"
              open={open && activeSource === 'drive'}
              onClose={() => {}}
              context="brain"
              onSelectFileForChat={onPickFile}
              keepOpenAfterImport
            />
          ) : null}
          {activeSource === 'dropbox' ? (
            <DropboxFileBrowserModal
              embedded
              open={open && activeSource === 'dropbox'}
              onClose={() => {}}
              context="brain"
              onSelectFileForChat={onPickFile}
              keepOpenAfterImport
            />
          ) : null}
          {activeSource === 'fathom' ? (
            <TrainingFathomPane
              connected={fathomConnected}
              onAddMeeting={(meeting) => {
                const payload: StagedPayload = { kind: 'fathom', meeting }
                onPushDraft({
                  source: 'fathom',
                  payload,
                  preview: buildDraftPreview(payload),
                })
              }}
              isStaged={(meeting) => {
                const payload: StagedPayload = { kind: 'fathom', meeting }
                const signature = makeSignature(payload)
                return staged.some((item) => item.signature === signature)
              }}
              isInBrain={(meeting) => fathomLikelyAlreadyIngested(meeting, skSources)}
            />
          ) : null}
          {activeSource === 'fireflies' ? (
            <TrainingFirefliesPane
              connected={firefliesConnected}
              onAddTranscript={(transcript) => {
                const payload: StagedPayload = { kind: 'fireflies', transcript }
                onPushDraft({
                  source: 'fireflies',
                  payload,
                  preview: buildDraftPreview(payload),
                })
              }}
              isStaged={(transcript) => {
                const payload: StagedPayload = { kind: 'fireflies', transcript }
                const signature = makeSignature(payload)
                return staged.some((item) => item.signature === signature)
              }}
              isInBrain={(transcript) => firefliesLikelyAlreadyIngested(transcript, skSources)}
            />
          ) : null}
        </section>
      </div>

      <div className="p-spacing-2 min-h-0">
        <TrainingStagingPanel
          staged={staged}
          stagedCount={stagedCount}
          selectedCount={selectedCount}
          selectedStagedIds={selectedStagedIds}
          onClear={onClearStaged}
          onSelectAll={onSelectAllStaged}
          onToggle={onToggleStaged}
          onRemove={onRemoveStaged}
          onUpdateMetadata={onUpdateMetadata}
          targets={pickerTargets}
          onSetItemTargets={onSetItemTargets}
          fallbackBrainId={fallbackBrainId}
          fallbackBrainTarget={fallbackBrainTarget}
          bulkSourceType={bulkSourceType}
          bulkDomain={bulkDomain}
          bulkOpenMenu={bulkOpenMenu}
          onBulkSourceTypeChange={onBulkSourceTypeChange}
          onBulkDomainChange={onBulkDomainChange}
          onBulkOpenMenuChange={onBulkOpenMenuChange}
          onApplyBulk={onApplyBulk}
          submitting={submitting}
          canAdd={canAdd}
          onAddAll={onAddAll}
        />
      </div>
    </div>
  )
}
