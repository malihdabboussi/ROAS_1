'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { GraduationCap, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import type { TrainableBrainTarget } from '@/features/brain/hooks/use-trainable-brains'
import { dispatchBrainQueueRefresh } from '@/features/brain/lib/brain-training-modal.events'
import { cn } from '@/lib/utils/cn'
import { BRAIN_TOAST_ERRORS } from '../../config/brain-toast-errors.config'
import { RecurringTab } from './recurring/RecurringTab'
import { dispatchTrainingItemToBrain } from './training-queue-dispatch'
import { TrainingActivityTab } from './TrainingActivityTab'
import { TrainingOneTimeTab } from './TrainingOneTimeTab'
import { useTrainingModalIntegrations } from './use-training-modal-integrations'
import { useTrainingStagingState } from './use-training-staging-state'
import type { BrainQueueDispatchResult, SourceKey } from './types'

interface TrainingModalProps {
  brainId: string | null
  isAgentBrain: boolean
  agentName?: string
  /** Controlled open state. When provided, parent owns open/close. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** When true, the built-in "Train brain" trigger button is not rendered. */
  triggerless?: boolean
  trainableTargets?: TrainableBrainTarget[]
  selectedScopeIds?: string[]
  onSelectedScopeIdsChange?: (scopeIds: string[]) => void
}

export default function TrainingModal({
  brainId: brainIdProp,
  isAgentBrain: isAgentBrainProp,
  agentName: agentNameProp,
  open: openProp,
  onOpenChange,
  triggerless,
  trainableTargets,
  selectedScopeIds,
  onSelectedScopeIdsChange,
}: TrainingModalProps) {
  const [openInternal, setOpenInternal] = useState(false)
  const open = openProp ?? openInternal
  const setOpen = useCallback(
    (next: boolean) => {
      if (onOpenChange) onOpenChange(next)
      else setOpenInternal(next)
    },
    [onOpenChange],
  )
  const pickerTargets = trainableTargets ?? []
  const showBrainPicker = pickerTargets.length > 0 && !!onSelectedScopeIdsChange
  const activeScopeIds = useMemo(
    () =>
      selectedScopeIds && selectedScopeIds.length > 0
        ? selectedScopeIds
        : pickerTargets[0]
          ? [pickerTargets[0].scopeId]
          : [],
    [selectedScopeIds, pickerTargets],
  )
  const targetsByScopeId = useMemo(() => {
    const m = new Map<string, TrainableBrainTarget>()
    for (const t of pickerTargets) m.set(t.scopeId, t)
    return m
  }, [pickerTargets])
  const targetsByBrainId = useMemo(() => {
    const m = new Map<string, TrainableBrainTarget>()
    for (const t of pickerTargets) m.set(t.brainId, t)
    return m
  }, [pickerTargets])
  const activeTargets = useMemo(
    () =>
      activeScopeIds
        .map((id) => targetsByScopeId.get(id))
        .filter((t): t is TrainableBrainTarget => !!t),
    [activeScopeIds, targetsByScopeId],
  )
  const activeBrainIds = useMemo(() => activeTargets.map((t) => t.brainId), [activeTargets])
  const primaryTarget = activeTargets[0] ?? null
  const brainId = primaryTarget?.brainId ?? brainIdProp
  const isAgentBrain = primaryTarget?.isAgentBrain ?? isAgentBrainProp
  const agentName = primaryTarget?.agentName ?? agentNameProp

  const [modalTab, setModalTab] = useState<'one-time' | 'recurring' | 'activity'>('one-time')
  const [activeSource, setActiveSource] = useState<SourceKey>('add')
  const [modalDragOver, setModalDragOver] = useState(false)
  const dragDepth = useRef(0)

  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)
  const {
    skSources,
    fathomConnected,
    firefliesConnected,
    integrationsStatusReady,
    connectedIntegrationRailItems,
    openIntegrationsLibraryFromTraining,
  } = useTrainingModalIntegrations({
    open,
    brainId,
    activeSource,
    onActiveSourceChange: setActiveSource,
  })
  const {
    staged,
    setStaged,
    selectedStagedIds,
    setSelectedStagedIds,
    submitting,
    setSubmitting,
    bulkSourceType,
    bulkDomain,
    bulkOpenMenu,
    setBulkSourceType,
    setBulkDomain,
    setBulkOpenMenu,
    pushDraft,
    setItemTargets,
    removeStaged,
    updateMetadata,
    toggleSelectStaged,
    selectAllStaged,
    applyBulk,
    stageFile,
    stageLink,
    stageText,
    stageMediaAssets,
  } = useTrainingStagingState({
    open,
    activeBrainIds,
    skSources,
  })

  useEffect(() => {
    if (!brainId) return
    const openFromMobile = () => setOpen(true)
    window.addEventListener('mobile-brain-add-info', openFromMobile)
    return () => window.removeEventListener('mobile-brain-add-info', openFromMobile)
  }, [brainId])

  useEffect(() => {
    if (open) return
    setActiveSource('add')
    setModalTab('one-time')
  }, [open])

  // ---- Global modal drop zone ----
  const handleModalDragEnter = (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return
    dragDepth.current += 1
    setModalDragOver(true)
  }
  const handleModalDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setModalDragOver(false)
  }
  const handleModalDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
    }
  }
  const handleModalDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.files.length) return
    e.preventDefault()
    dragDepth.current = 0
    setModalDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    files.forEach(stageFile)
    setActiveSource('add')
  }

  const handleAddAll = useCallback(async () => {
    if (staged.length === 0) return
    const fallbackBrain = brainId
    const fallbackIsAgent = isAgentBrain
    if (!fallbackBrain && staged.every((item) => (item.targetBrainIds?.length ?? 0) === 0)) {
      toast.error(BRAIN_TOAST_ERRORS.NO_BRAIN_SELECTED.userMessage)
      return
    }
    setSubmitting(true)
    try {
      const dispatches: Array<Promise<BrainQueueDispatchResult>> = []
      for (const item of staged) {
        const itemTargets = (item.targetBrainIds ?? []).filter(Boolean)
        const targets =
          itemTargets.length > 0
            ? itemTargets.map((bid) => ({
                brainId: bid,
                isAgentBrain: targetsByBrainId.get(bid)?.isAgentBrain ?? false,
              }))
            : fallbackBrain
              ? [{ brainId: fallbackBrain, isAgentBrain: fallbackIsAgent }]
              : []
        for (const t of targets) {
          dispatches.push(
            dispatchTrainingItemToBrain({
              item,
              targetBrainId: t.brainId,
              targetIsAgentBrain: t.isAgentBrain,
            }),
          )
        }
      }
      const results = await Promise.all(dispatches)
      const ok = results.filter((r) => r.ok)
      const failed = results.filter((r) => !r.ok)
      if (ok.length > 0) {
        toast.success(`${ok.length} item${ok.length === 1 ? '' : 's'} added to queue.`)
        dispatchBrainQueueRefresh()
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} item${failed.length === 1 ? '' : 's'} failed.`)
      }
      const failedIds = new Set(failed.map((f) => f.id))
      setStaged((prev) => prev.filter((s) => failedIds.has(s.id)))
      setSelectedStagedIds((prev) => {
        const next = new Set<string>()
        prev.forEach((id) => {
          if (failedIds.has(id)) next.add(id)
        })
        return next
      })
      if (failed.length === 0) {
        setOpen(false)
      }
    } finally {
      setSubmitting(false)
    }
  }, [brainId, isAgentBrain, staged, targetsByBrainId])

  if (!brainId && !showBrainPicker) return null

  const stagedCount = staged.length
  const trainTriggerLabel = isAgentBrain ? `Train ${agentName ?? 'Agent'}` : 'Train brain'
  const selectedCount = selectedStagedIds.size

  return (
    <>
      {!triggerless ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="surface-card border-border px-spacing-3 py-spacing-2 body-3 text-foreground hover:bg-muted/20 flex w-full items-center justify-center gap-2 rounded-lg border font-medium transition-colors"
        >
          <GraduationCap className="icon-xs" />
          {trainTriggerLabel}
        </button>
      ) : null}

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
          <DialogPrimitive.Content
            className="z-modal-layer-3 fixed inset-0 flex items-center justify-center"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false)
            }}
          >
            <VisuallyHidden.Root>
              <DialogPrimitive.Title>{trainTriggerLabel}</DialogPrimitive.Title>
            </VisuallyHidden.Root>
            <div
              className={cn(
                'surface-card card-elevated border-border container-modal-task-detail rounded-spacing-4 wizard-container-border relative flex flex-col overflow-hidden border shadow-xl',
              )}
              onDragEnter={handleModalDragEnter}
              onDragLeave={handleModalDragLeave}
              onDragOver={handleModalDragOver}
              onDrop={handleModalDrop}
            >
              <Tabs
                value={modalTab}
                onValueChange={(value) =>
                  setModalTab(value as 'one-time' | 'recurring' | 'activity')
                }
                className="gap-spacing-0 flex min-h-0 flex-1 flex-col"
              >
                {/* Header */}
                <div className="px-spacing-5 py-spacing-3 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center">
                  <div className="flex min-w-0 items-center gap-2">
                    <GraduationCap className="icon-sm text-muted-foreground shrink-0" />
                    <h2 className="title-h6 min-w-0 truncate">
                      {isAgentBrain
                        ? `TRAIN ${(agentName ?? 'AGENT').toUpperCase()}`
                        : 'TRAIN BRAIN'}
                    </h2>
                  </div>
                  <TabsList variant="liquid" className="w-auto shrink-0">
                    <TabsTrigger value="one-time" className="px-spacing-4">
                      One-time
                    </TabsTrigger>
                    <TabsTrigger value="recurring" className="px-spacing-4">
                      Recurring
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="px-spacing-4">
                      Activity
                    </TabsTrigger>
                  </TabsList>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setOpen(false)} className="btn-icon-bare">
                      <X className="icon-xs" />
                    </button>
                  </div>
                </div>

                <TabsContent value="one-time" className="min-h-0 flex-1 overflow-hidden">
                  <TrainingOneTimeTab
                    showBrainPicker={showBrainPicker}
                    pickerTargets={pickerTargets}
                    activeScopeIds={activeScopeIds}
                    onSelectedScopeIdsChange={onSelectedScopeIdsChange}
                    activeSource={activeSource}
                    onActiveSourceChange={setActiveSource}
                    integrationsStatusReady={integrationsStatusReady}
                    connectedIntegrationRailItems={connectedIntegrationRailItems}
                    onOpenIntegrationsLibrary={openIntegrationsLibraryFromTraining}
                    open={open}
                    onStageText={stageText}
                    onStageLink={stageLink}
                    onPickFile={stageFile}
                    onOpenMediaLibrary={() => setMediaLibraryOpen(true)}
                    fathomConnected={fathomConnected}
                    firefliesConnected={firefliesConnected}
                    onPushDraft={pushDraft}
                    staged={staged}
                    skSources={skSources}
                    stagedCount={stagedCount}
                    selectedCount={selectedCount}
                    selectedStagedIds={selectedStagedIds}
                    onClearStaged={() => setStaged([])}
                    onSelectAllStaged={selectAllStaged}
                    onToggleStaged={toggleSelectStaged}
                    onRemoveStaged={removeStaged}
                    onUpdateMetadata={updateMetadata}
                    onSetItemTargets={setItemTargets}
                    fallbackBrainId={brainId ?? null}
                    fallbackBrainTarget={primaryTarget ?? null}
                    bulkSourceType={bulkSourceType}
                    bulkDomain={bulkDomain}
                    bulkOpenMenu={bulkOpenMenu}
                    onBulkSourceTypeChange={setBulkSourceType}
                    onBulkDomainChange={setBulkDomain}
                    onBulkOpenMenuChange={setBulkOpenMenu}
                    onApplyBulk={applyBulk}
                    submitting={submitting}
                    canAdd={!!brainId}
                    onAddAll={handleAddAll}
                  />
                </TabsContent>

                <TabsContent
                  value="recurring"
                  className="flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                  <RecurringTab
                    open={open && modalTab === 'recurring'}
                    onOpenIntegrations={openIntegrationsLibraryFromTraining}
                  />
                </TabsContent>

                <TabsContent
                  value="activity"
                  className="flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                  <TrainingActivityTab open={open && modalTab === 'activity'} />
                </TabsContent>
              </Tabs>

              {/* Modal drop overlay */}
              {modalDragOver ? (
                <div className="rounded-spacing-3 border-primary bg-primary/10 pointer-events-none absolute inset-2 z-20 flex items-center justify-center border-2 border-dashed">
                  <div className="text-foreground body-2 flex items-center gap-2">
                    <Upload className="icon-sm" />
                    Drop files to stage
                  </div>
                </div>
              ) : null}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <MediaPickerModal
        open={mediaLibraryOpen}
        onClose={() => setMediaLibraryOpen(false)}
        onSelect={() => {}}
        onSelectAssets={stageMediaAssets}
        multiSelect
        keepOpenAfterImport
      />
    </>
  )
}
