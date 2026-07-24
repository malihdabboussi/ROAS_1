'use client'

import { useEffect, useRef } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { SettingsSelect } from '@/components/ui/forms/SettingsSelect'
import { Tooltip } from '@/components/ui/tooltip'
import {
  PROGRAM_VISIBILITY_OPTIONS,
  useOrgResourceSharing,
  type ShareResourceType,
} from '@/lib/org'
import type { ProgramVisibility } from '@/lib/programs'
import { ShareModalPeopleList } from './ShareModalPeopleList'

export interface ShareModalProps {
  open: boolean
  onClose: () => void
  resourceType: ShareResourceType
  resourceId: string
  resourceName: string
}

export function ShareModal({
  open,
  onClose,
  resourceType,
  resourceId,
  resourceName,
}: ShareModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const sharing = useOrgResourceSharing({ open, resourceType, resourceId })

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 150)
    return () => window.clearTimeout(timer)
  }, [open])

  if (!open || !sharing.activeOrgId) return null

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div className="surface-card wizard-container-border rounded-spacing-4 border-border bg-card flex max-h-dvh w-full max-w-lg flex-col overflow-hidden border shadow-2xl">
            <div className="px-spacing-6 pt-spacing-6 pb-spacing-2 shrink-0">
              <div className="flex items-center justify-between">
                <DialogPrimitive.Title className="title-h6 text-foreground font-semibold uppercase tracking-wide">
                  Share this {sharing.ownerLabel}
                </DialogPrimitive.Title>
                <Tooltip label="Close" side="top" delayMs={200}>
                  <button type="button" onClick={onClose} className="btn-icon-bare shrink-0">
                    <X className="icon-sm" />
                  </button>
                </Tooltip>
              </div>
              <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1">
                Sharing {sharing.ownerLabel.toLowerCase()}{' '}
                <span className="text-foreground font-medium">{resourceName}</span>
              </DialogPrimitive.Description>
            </div>

            {resourceType === 'program' ? (
              <div className="px-spacing-6 pt-spacing-3 shrink-0">
                <label className="body-3 text-muted-foreground mb-spacing-1 block">
                  Who can access
                </label>
                <SettingsSelect
                  value={sharing.programVisibility}
                  options={PROGRAM_VISIBILITY_OPTIONS}
                  onChange={(visibility) =>
                    void sharing.handleVisibilityChange(visibility as ProgramVisibility)
                  }
                  disabled={sharing.visibilitySaving || !sharing.canManageShares}
                  triggerClassName="gap-spacing-1 h-spacing-9 px-spacing-3 input-glass rounded-spacing-2 body-3 flex w-full items-center justify-between transition-colors disabled:opacity-60"
                />
                <p className="body-3 text-muted-foreground mt-spacing-1">
                  Workspace is everyone in the org. Private and Selected use the people list below.
                  ACL rows are kept when switching back to Workspace.
                </p>
              </div>
            ) : null}

            <div className="px-spacing-6 pt-spacing-3 shrink-0">
              <div className="gap-spacing-2 flex items-center">
                <input
                  ref={inputRef}
                  type="email"
                  value={sharing.inviteEmail}
                  onChange={(event) => sharing.setInviteEmail(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void sharing.handleInvite()
                  }}
                  placeholder="Invite by email"
                  className="input-glass body-3 text-foreground h-spacing-9 rounded-spacing-2 px-spacing-3 min-w-0 flex-1"
                />
                <button
                  type="button"
                  disabled={sharing.inviting || !sharing.inviteEmail.includes('@')}
                  onClick={() => void sharing.handleInvite()}
                  className="button-default button-glass-accent shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sharing.inviting ? '...' : 'Invite'}
                </button>
              </div>
            </div>

            <ShareModalPeopleList
              loading={sharing.loading}
              memberStates={sharing.memberStates}
              ownerAvatarSrc={sharing.ownerAvatarSrc}
              ownerLabel={sharing.ownerLabel}
              peopleOpen={sharing.peopleOpen}
              permissionOptions={sharing.permissionOptions}
              setPeopleOpen={sharing.setPeopleOpen}
              sharedCount={sharing.sharedCount}
              onOwnerAvatarError={() => sharing.setOwnerAvatarIndex((index) => index + 1)}
              onPermissionChange={(memberId, permission) =>
                void sharing.handlePermissionChange(memberId, permission)
              }
              onToggle={(memberId, checked) => void sharing.handleToggle(memberId, checked)}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
