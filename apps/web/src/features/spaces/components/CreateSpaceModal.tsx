'use client'

import { useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { IconColorId } from '@/components/ui/IconPicker'
import { CreateSpaceModalFooter } from './create-space-modal/CreateSpaceModalFooter'
import { CreateSpaceModalHeader } from './create-space-modal/CreateSpaceModalHeader'
import { CreateSpaceModalIdentityFields } from './create-space-modal/CreateSpaceModalIdentityFields'
import { CreateSpaceModalPermissionSection } from './create-space-modal/CreateSpaceModalPermissionSection'
import { CreateSpaceModalPrivacySection } from './create-space-modal/CreateSpaceModalPrivacySection'
import type { SpaceShareLevel } from '../services/spaces.service'

export interface CreateSpacePayload {
  title: string
  description?: string
  visibility: 'private' | 'team'
  default_share_level?: SpaceShareLevel
  schema?: { icon: string; icon_color?: string }
}

export function CreateSpaceModal({
  open,
  onOpenChange,
  onCreate,
  onBrowseTemplates,
  defaultPrivate = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (payload: CreateSpacePayload) => Promise<void>
  onBrowseTemplates?: () => void
  defaultPrivate?: boolean
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(defaultPrivate)
  const [level, setLevel] = useState<SpaceShareLevel>('admin')
  const [spaceIcon, setSpaceIcon] = useState('layout-grid')
  const [iconColor, setIconColor] = useState<IconColorId>('default')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setIsPrivate(defaultPrivate)
      setLevel('admin')
      setSpaceIcon('layout-grid')
      setIconColor('default')
      setSubmitting(false)
      setError(null)
      setNameError(null)
    }
  }, [open, defaultPrivate])

  const trimmed = useMemo(() => title.trim(), [title])

  const handleClose = (next: boolean) => {
    if (!next && submitting) return
    onOpenChange(next)
  }

  const handleSubmit = async () => {
    if (submitting) return
    if (!trimmed.length) {
      setNameError('Space name is required')
      setError(null)
      return
    }
    setNameError(null)
    setError(null)
    setSubmitting(true)
    try {
      await onCreate({
        title: trimmed,
        description: description.trim() ? description.trim() : undefined,
        visibility: isPrivate ? 'private' : 'team',
        default_share_level: isPrivate ? undefined : level,
        schema: {
          icon: spaceIcon,
          ...(iconColor !== 'default' ? { icon_color: iconColor } : {}),
        },
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create space.')
      setSubmitting(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0 bg-modal-overlay" />
        <DialogPrimitive.Content
          className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center"
          onPointerDownOutside={(e) => {
            if (submitting) e.preventDefault()
            const t = e.detail.originalEvent?.target
            if (
              t instanceof Element &&
              t.closest('[data-icon-picker-popup], [data-create-space-permission-menu]')
            ) {
              e.preventDefault()
            }
          }}
        >
          <div
            className="surface-card wizard-container-border rounded-spacing-4 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CreateSpaceModalHeader submitting={submitting} onClose={() => handleClose(false)} />

            <div className="px-spacing-6 py-spacing-4 space-y-spacing-5 flex min-h-0 flex-1 flex-col overflow-y-auto">
              {onBrowseTemplates ? (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    onBrowseTemplates()
                  }}
                  disabled={submitting}
                  className="body-3 text-muted-foreground hover:text-foreground w-fit text-left transition-colors disabled:opacity-50"
                >
                  Or browse templates →
                </button>
              ) : null}
              <CreateSpaceModalIdentityFields
                title={title}
                description={description}
                spaceIcon={spaceIcon}
                iconColor={iconColor}
                nameError={nameError}
                submitting={submitting}
                onTitleChange={(nextTitle) => {
                  setTitle(nextTitle)
                  setNameError(null)
                }}
                onDescriptionChange={setDescription}
                onSpaceIconChange={setSpaceIcon}
                onIconColorChange={setIconColor}
                onSubmit={() => void handleSubmit()}
              />

              <div className="border-border border-t" />

              <CreateSpaceModalPermissionSection
                level={level}
                disabled={isPrivate || submitting}
                onLevelChange={setLevel}
              />

              <CreateSpaceModalPrivacySection
                isPrivate={isPrivate}
                onPrivateChange={setIsPrivate}
              />

              {error && (
                <p role="alert" className="body-4 text-destructive">
                  {error}
                </p>
              )}
            </div>

            <CreateSpaceModalFooter
              submitting={submitting}
              onCancel={() => handleClose(false)}
              onSubmit={() => void handleSubmit()}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
