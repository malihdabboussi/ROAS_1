'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { TransferEntityType, TransferMode } from '@/lib/transfer'
import { TransferDialog } from './TransferDialog'

export type OpenTransferOptions = {
  entityType: TransferEntityType
  entityId: string
  entityName: string
  mode: TransferMode
  targetOrgId: string | null
  targetCampaignId?: string | null
  targetSpaceId?: string | null
  artifactTable?: string
  onComplete?: () => void
}

type TransferDialogCtx = {
  open: (opts: OpenTransferOptions) => void
}

const Ctx = createContext<TransferDialogCtx | null>(null)

export function TransferDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<OpenTransferOptions | null>(null)

  const open = useCallback((opts: OpenTransferOptions) => {
    setPending(opts)
  }, [])

  const value = useMemo(() => ({ open }), [open])

  return (
    <Ctx.Provider value={value}>
      {children}
      {pending ? (
        <TransferDialog
          open
          onClose={() => setPending(null)}
          entityType={pending.entityType}
          entityId={pending.entityId}
          entityName={pending.entityName}
          artifactTable={pending.artifactTable}
          initialMode={pending.mode}
          initialTargetOrgId={pending.targetOrgId}
          executeOptions={{
            target_campaign_id: pending.targetCampaignId ?? undefined,
            target_space_id: pending.targetSpaceId ?? undefined,
          }}
          onTransferComplete={() => {
            const cb = pending.onComplete
            setPending(null)
            cb?.()
          }}
        />
      ) : null}
    </Ctx.Provider>
  )
}

export function useTransferDialog(): TransferDialogCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTransferDialog must be used within TransferDialogProvider')
  return ctx
}
