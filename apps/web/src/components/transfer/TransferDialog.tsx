'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Loader2, X } from 'lucide-react'
import { useOrgStore } from '@/lib/org'
import {
  transferService,
  type TransferContext,
  type TransferEntityType,
  type TransferMode,
  type TransferPreviewResult,
} from '@/lib/transfer'
import {
  buildTransferDestinations,
  getTransferEntityLabel,
  getTransferGroupCount,
  TRANSFER_DISPLAY_GROUPS,
} from './transfer-dialog.logic'
import {
  TransferDestinationSelector,
  TransferDialogStatus,
  TransferModeSelector,
  TransferPreviewChecklist,
} from './TransferDialogSections'

export interface TransferDialogProps {
  open: boolean
  onClose: () => void
  entityType: TransferEntityType
  entityId: string
  entityName: string
  artifactTable?: string
  initialMode?: TransferMode
  initialTargetOrgId?: string | null
  executeOptions?: {
    target_campaign_id?: string
    target_space_id?: string
  }
  onTransferComplete?: () => void
}

export function TransferDialog({
  open,
  onClose,
  entityType,
  entityId,
  entityName,
  artifactTable,
  initialMode = 'move',
  initialTargetOrgId,
  executeOptions,
  onTransferComplete,
}: TransferDialogProps) {
  const { activeOrgId, memberships } = useOrgStore()
  const [mode, setMode] = useState<TransferMode>(initialMode)
  const [targetOrgId, setTargetOrgId] = useState<string | null | undefined>(initialTargetOrgId)
  const [preview, setPreview] = useState<TransferPreviewResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [excludedGroups, setExcludedGroups] = useState<Set<string>>(new Set())

  const destinations = buildTransferDestinations(activeOrgId, memberships, mode)
  const entityLabel = getTransferEntityLabel(entityType)

  const visibleGroups = useMemo(() => {
    if (!preview) return []
    return TRANSFER_DISPLAY_GROUPS.filter(
      (group) => getTransferGroupCount(group, preview.children) > 0,
    )
  }, [preview])

  const allSelected = visibleGroups.length > 0 && excludedGroups.size === 0
  const noneSelected = visibleGroups.length > 0 && excludedGroups.size === visibleGroups.length
  const includedCount = visibleGroups
    .filter((group) => !excludedGroups.has(group.key))
    .reduce((sum, group) => sum + getTransferGroupCount(group, preview?.children ?? {}), 0)

  useEffect(() => {
    if (!open) {
      setMode(initialMode)
      setTargetOrgId(initialTargetOrgId)
      setPreview(null)
      setLoading(false)
      setExecuting(false)
      setError(null)
      setDone(false)
      setExcludedGroups(new Set())
    }
  }, [open, initialMode, initialTargetOrgId])

  const loadPreview = useCallback(
    async (target: TransferContext, nextMode: TransferMode) => {
      setLoading(true)
      setError(null)
      setPreview(null)
      setExcludedGroups(new Set())
      try {
        const response = await transferService.preview({
          entity_type: entityType,
          entity_id: entityId,
          artifact_table: artifactTable,
          target_context: target,
          mode: nextMode,
        })
        setPreview(response.preview)
      } catch (caught) {
        setError(messageFromUnknown(caught, 'Failed to load preview'))
      } finally {
        setLoading(false)
      }
    },
    [entityType, entityId, artifactTable],
  )

  useEffect(() => {
    if (!open || initialTargetOrgId === undefined) return
    void loadPreview({ org_id: initialTargetOrgId }, initialMode)
  }, [open, initialTargetOrgId, initialMode, loadPreview])

  const handleTargetSelect = (orgId: string | null) => {
    setTargetOrgId(orgId)
    void loadPreview({ org_id: orgId }, mode)
  }

  const handleModeChange = (nextMode: TransferMode) => {
    setMode(nextMode)
    if (targetOrgId !== undefined) {
      void loadPreview({ org_id: targetOrgId }, nextMode)
    }
  }

  const toggleGroup = (key: string) => {
    setExcludedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setExcludedGroups(new Set(visibleGroups.map((group) => group.key)))
      return
    }
    setExcludedGroups(new Set())
  }

  const handleExecute = async () => {
    if (targetOrgId === undefined) return
    setExecuting(true)
    setError(null)

    const excludeTables: string[] = []
    for (const group of visibleGroups) {
      if (excludedGroups.has(group.key)) excludeTables.push(...group.tables)
    }

    try {
      await transferService.execute({
        entity_type: entityType,
        entity_ids: [entityId],
        artifact_table: artifactTable,
        target_context: { org_id: targetOrgId },
        mode,
        options:
          excludeTables.length > 0 || executeOptions
            ? {
                ...executeOptions,
                ...(excludeTables.length > 0 ? { exclude_tables: excludeTables } : {}),
              }
            : undefined,
      })
      setDone(true)
      onTransferComplete?.()
      setTimeout(onClose, 1200)
    } catch (caught) {
      setError(messageFromUnknown(caught, 'Transfer failed'))
    } finally {
      setExecuting(false)
    }
  }

  const showReady =
    !!preview &&
    !loading &&
    (entityType !== 'campaign' || visibleGroups.length === 0) &&
    preview.warnings.length === 0

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(openState) => {
        if (!openState) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>
              {mode === 'move' ? 'Move' : 'Copy'} {entityLabel}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description>
              {mode === 'move' ? 'Move' : 'Duplicate'} {entityName} to another account or
              organization.
            </DialogPrimitive.Description>
          </VisuallyHidden.Root>

          <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[85vh] sm:max-w-lg">
            <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
              <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
                <div className="flex items-center justify-between">
                  <h2 className="title-h6">
                    {mode === 'move' ? 'Move' : 'Copy'} {entityLabel}
                  </h2>
                  <button type="button" onClick={onClose} className="btn-icon-bare">
                    <X className="icon-sm" />
                  </button>
                </div>
                <p className="body-3 text-muted-foreground mt-spacing-1">
                  {mode === 'move' ? 'Move' : 'Duplicate'}{' '}
                  <span className="text-foreground font-medium">{entityName}</span> to another
                  account or organization.
                </p>
              </div>

              <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
                <TransferModeSelector mode={mode} onModeChange={handleModeChange} />
                <TransferDestinationSelector
                  activeOrgId={activeOrgId}
                  destinations={destinations}
                  memberships={memberships}
                  targetOrgId={targetOrgId}
                  onTargetSelect={handleTargetSelect}
                />
                {preview && !loading && entityType === 'campaign' && visibleGroups.length > 0 && (
                  <TransferPreviewChecklist
                    allSelected={allSelected}
                    childrenByTable={preview.children}
                    excludedGroups={excludedGroups}
                    includedCount={includedCount}
                    onToggleAll={toggleAll}
                    onToggleGroup={toggleGroup}
                    visibleGroups={visibleGroups}
                  />
                )}
                <TransferDialogStatus
                  done={done}
                  error={error}
                  loading={loading}
                  mode={mode}
                  showReady={showReady}
                  warnings={!loading && preview ? preview.warnings : []}
                />
              </div>

              <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-between border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="button-default button-glass-neutral"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    targetOrgId === undefined ||
                    !preview ||
                    executing ||
                    done ||
                    loading ||
                    (noneSelected && entityType === 'campaign')
                  }
                  onClick={handleExecute}
                  className="button-default button-glass-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="relative z-10">
                    {executing ? (
                      <span className="gap-spacing-2 flex items-center">
                        <Loader2 className="icon-sm animate-spin" />
                        {mode === 'move' ? 'Moving...' : 'Copying...'}
                      </span>
                    ) : done ? (
                      'Done'
                    ) : (
                      `${mode === 'move' ? 'Move' : 'Copy'} ${entityLabel}`
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function messageFromUnknown(caught: unknown, fallback: string): string {
  return caught instanceof Error && caught.message ? caught.message : fallback
}
