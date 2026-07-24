'use client'

import { ConfirmDialog } from '@/components/ui/dialogs/ConfirmDialog'
import type { Program } from '@/lib/programs'

export function SidebarDeleteProgramDialog({
  program,
  busy,
  onClose,
  onConfirm,
}: {
  program: Program | null
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <ConfirmDialog
      open={!!program}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="DELETE PROGRAM?"
      description={program ? `Delete “${program.name}”? Campaigns move to Ungrouped.` : undefined}
      confirmText={busy ? 'Deleting…' : 'Delete'}
      confirmingText="Deleting…"
      confirmDisabled={busy}
      onConfirm={onConfirm}
    />
  )
}
