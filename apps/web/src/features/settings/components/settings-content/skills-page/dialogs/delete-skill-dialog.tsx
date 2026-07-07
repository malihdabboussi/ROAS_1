'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AlertTriangle } from 'lucide-react'
import type { MissionAgent, MissionAgentSkill } from '@/features/mission-control/types'
import { formatSkillName } from '@/features/team/constants/team.constants'

export function DeleteSkillDialog({
  deleteTarget,
  setDeleteTarget,
  deleting,
  onConfirmDelete,
  selectedAgent,
}: {
  deleteTarget: MissionAgentSkill | null
  setDeleteTarget: (s: MissionAgentSkill | null) => void
  deleting: boolean
  onConfirmDelete: () => void
  selectedAgent: MissionAgent | null
}) {
  return (
    <DialogPrimitive.Root
      open={!!deleteTarget}
      onOpenChange={(open) => {
        if (!open && !deleting) setDeleteTarget(null)
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content
          className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteTarget(null)
          }}
        >
          {deleteTarget ? (
            <div
              className="surface-card wizard-container-border container-modal-md rounded-spacing-4 border-destructive/20 bg-destructive/5 p-spacing-6 w-full border shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="bg-destructive/10 mb-spacing-3 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                  <AlertTriangle className="text-destructive h-6 w-6" />
                </div>
                <DialogPrimitive.Title className="title-h5">Delete skill?</DialogPrimitive.Title>
                <DialogPrimitive.Description className="body-2 text-muted-foreground mt-spacing-6">
                  Are you sure you want to delete{' '}
                  <span className="font-semibold">
                    &quot;{formatSkillName(deleteTarget.name)}&quot;
                  </span>{' '}
                  from {selectedAgent?.name ?? 'this agent'}? This cannot be undone.
                </DialogPrimitive.Description>
              </div>
              <div className="gap-spacing-3 pt-spacing-2">
                <div className="gap-spacing-2 pt-spacing-2 flex">
                  <button
                    type="button"
                    onClick={() => !deleting && setDeleteTarget(null)}
                    disabled={deleting}
                    className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirmDelete()}
                    disabled={deleting}
                    className="button-glass-destructive flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="relative z-10">{deleting ? 'Deleting…' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
