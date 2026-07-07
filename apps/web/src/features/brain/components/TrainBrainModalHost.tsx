'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTrainableBrains } from '@/features/brain/hooks/use-trainable-brains'
import {
  BRAIN_TRAIN_MODAL_EVENT,
  type BrainTrainModalDetail,
} from '@/features/brain/lib/brain-training-modal.events'
import TrainingModal from './training/TrainingModal'

export function TrainBrainModalHost() {
  const { trainable, loading } = useTrainableBrains()
  const [open, setOpen] = useState(false)
  const [scopeIds, setScopeIds] = useState<string[]>([])

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<BrainTrainModalDetail>).detail
      setScopeIds(detail?.scopeId ? [detail.scopeId] : [])
      setOpen(true)
    }
    window.addEventListener(BRAIN_TRAIN_MODAL_EVENT, onOpen)
    return () => window.removeEventListener(BRAIN_TRAIN_MODAL_EVENT, onOpen)
  }, [])

  const validScopeIds = useMemo(
    () => scopeIds.filter((id) => trainable.some((t) => t.scopeId === id)),
    [scopeIds, trainable],
  )

  useEffect(() => {
    if (!open || loading) return
    if (validScopeIds.length === 0 && trainable.length > 0) {
      setScopeIds([trainable[0]!.scopeId])
    }
  }, [open, loading, validScopeIds.length, trainable])

  const primary = useMemo(
    () => trainable.find((t) => t.scopeId === validScopeIds[0]) ?? trainable[0] ?? null,
    [trainable, validScopeIds],
  )

  if (!open) return null
  if (loading) return null
  if (!primary) return null

  return (
    <TrainingModal
      brainId={primary.brainId}
      isAgentBrain={primary.isAgentBrain}
      agentName={primary.agentName}
      open={open}
      onOpenChange={setOpen}
      triggerless
      trainableTargets={trainable}
      selectedScopeIds={validScopeIds.length > 0 ? validScopeIds : [primary.scopeId]}
      onSelectedScopeIdsChange={setScopeIds}
    />
  )
}
