'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { cachedSpaces } from '../../hooks/use-cached-spaces'
import {
  getSpaceTemplate,
  instantiateSpaceTemplate,
  type SpaceTemplate,
  type SpaceTemplateDetail,
} from '../../services/space-templates.service'
import type { SpaceShareLevel } from '../../services/spaces.service'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { Space } from '../../types'
import { TemplateIncludedItemsSection } from './use-template-confirm-dialog/TemplateIncludedItemsSection'
import { TemplatePrivacySection } from './use-template-confirm-dialog/TemplatePrivacySection'
import type { PermissionMenuPosition } from './use-template-confirm-dialog/use-template-confirm-dialog-options'

export interface UseTemplateConfirmDialogProps {
  open: boolean
  template: SpaceTemplate | null
  campaignId: string | null
  onClose: () => void
  onCreated?: (space: Space) => void
}

export function UseTemplateConfirmDialog({
  open,
  template,
  campaignId,
  onClose,
  onCreated,
}: UseTemplateConfirmDialogProps) {
  const router = useRouter()
  const [detail, setDetail] = useState<SpaceTemplateDetail | null>(null)
  const [title, setTitle] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [level, setLevel] = useState<SpaceShareLevel>('admin')
  const [includeTasks, setIncludeTasks] = useState(true)
  const [includeDocs, setIncludeDocs] = useState(true)
  const [includeChannel, setIncludeChannel] = useState(true)
  const [includeAutomations, setIncludeAutomations] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionOpen, setPermissionOpen] = useState(false)
  const permissionTriggerRef = useRef<HTMLButtonElement>(null)
  const [permissionMenuPos, setPermissionMenuPos] = useState<PermissionMenuPosition | null>(null)

  useEffect(() => {
    if (!open || !template) {
      setDetail(null)
      return
    }
    setTitle(template.title)
    setIsPrivate(false)
    setLevel('admin')
    setIncludeTasks(true)
    setIncludeDocs(true)
    setIncludeChannel(!!template.channel_name)
    setIncludeAutomations(true)
    setError(null)
    setSubmitting(false)
    setPermissionOpen(false)
    void getSpaceTemplate(template.slug)
      .then(setDetail)
      .catch(() => setDetail(null))
  }, [open, template])

  useEffect(() => {
    if (isPrivate) setPermissionOpen(false)
  }, [isPrivate])

  useLayoutEffect(() => {
    if (!permissionOpen || isPrivate) {
      setPermissionMenuPos(null)
      return
    }
    const el = permissionTriggerRef.current
    if (!el) return
    const menuHeight = 220
    const margin = 8
    const compute = () => {
      const rect = el.getBoundingClientRect()
      const menuWidth = Math.max(rect.width, 192)
      let left = rect.right - menuWidth
      if (left < margin) left = margin
      if (left + menuWidth > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - menuWidth - margin)
      }
      let top = rect.bottom + 4
      if (top + menuHeight > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - menuHeight - 4)
      }
      setPermissionMenuPos({ top, left, width: menuWidth })
    }
    compute()
    window.addEventListener('scroll', compute, true)
    window.addEventListener('resize', compute)
    return () => {
      window.removeEventListener('scroll', compute, true)
      window.removeEventListener('resize', compute)
    }
  }, [permissionOpen, isPrivate])

  useEffect(() => {
    if (!permissionOpen) return
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (
        el.closest('[data-create-space-permission-dropdown]') ||
        el.closest('[data-create-space-permission-menu]')
      ) {
        return
      }
      setPermissionOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [permissionOpen])

  const trimmed = useMemo(() => title.trim(), [title])

  const handleCreate = async () => {
    if (!template || submitting || !trimmed.length) return
    setSubmitting(true)
    setError(null)
    try {
      const space = await instantiateSpaceTemplate(template.slug, {
        title: trimmed,
        campaign_id: campaignId,
        visibility: isPrivate ? 'private' : 'team',
        default_share_level: isPrivate ? undefined : level,
        include_tasks: includeTasks,
        include_docs: includeDocs,
        include_channel: includeChannel,
        include_automations: includeAutomations,
      })
      cachedSpaces.mutate((prev) => [space, ...(prev ?? [])])
      useSpacesStore.setState((s) => ({ spaces: [space, ...s.spaces] }))
      useSpacesStore.getState().setActiveSpace(space.id)
      if (template.slug === 'agency-client-webinar') {
        useGlobalChatStore.getState().seedComposer({
          content: [
            `You just opened the Agency Client (Webinar) Space "${space.title}".`,
            'Guide me through kickoff in plain English:',
            '1) Confirm what this client bought and any links/transcripts I should use',
            '2) Tell me to click Playbook (or start Webinar Fulfillment for me)',
            '3) Explain that Phase A builds strategy docs, then I approve at Gate 1 before copy/creative',
            'Keep it short. Do not invent a different workflow.',
          ].join('\n'),
          workContext: {
            surface: 'spaces',
            spaceId: space.id,
            campaignId: space.campaign_id ?? null,
          },
        })
        if (typeof window !== 'undefined') {
          window.setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent('space:open-missions-view', {
                detail: { spaceId: space.id, openPlaybook: true },
              }),
            )
          }, 400)
        }
      }
      toast.success(`Created "${space.title}" from template`)
      router.push('/spaces')
      onCreated?.(space)
      onClose()
    } catch (e) {
      toast.error(sanitizeUserError(e, 'Could not create space from template'))
      setError(sanitizeUserError(e, 'Could not create space from template'))
      setSubmitting(false)
    }
  }

  if (!template) return null

  const taskCount = detail?.task_count ?? 0
  const docCount = detail?.doc_count ?? 0
  const automationCount = detail?.automation_count ?? 0
  const hasChannel = detail?.has_channel ?? !!template.channel_name

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        if (!o && !submitting) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content
          className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center"
          onPointerDownOutside={(e) => {
            if (submitting) e.preventDefault()
            const t = e.detail.originalEvent?.target
            if (t instanceof Element && t.closest('[data-create-space-permission-menu]')) {
              e.preventDefault()
            }
          }}
        >
          <div
            className="surface-card wizard-container-border rounded-spacing-4 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-spacing-6 pt-spacing-5 pb-spacing-3 shrink-0">
              <div className="gap-spacing-3 flex items-start justify-between">
                <div className="gap-spacing-2 flex min-w-0 flex-1 items-center">
                  <div className="min-w-0">
                    <DialogPrimitive.Title className="title-h6 text-foreground truncate">
                      {template.title}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">
                      {template.description}
                    </DialogPrimitive.Description>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="btn-icon-bare shrink-0 disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="icon-xs" />
                </button>
              </div>
            </div>

            <div className="px-spacing-6 py-spacing-4 space-y-spacing-5 flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="space-y-spacing-2">
                <label htmlFor="template-space-name" className="body-2 text-foreground font-medium">
                  Space name
                </label>
                <input
                  id="template-space-name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={500}
                  className="border-border bg-background body-3 text-foreground placeholder:text-muted-foreground focus:ring-ring rounded-spacing-2 px-spacing-3 h-9 w-full border outline-none focus:ring-2"
                />
              </div>

              <TemplateIncludedItemsSection
                taskCount={taskCount}
                docCount={docCount}
                automationCount={automationCount}
                hasChannel={hasChannel}
                includeTasks={includeTasks}
                includeDocs={includeDocs}
                includeChannel={includeChannel}
                includeAutomations={includeAutomations}
                onIncludeTasksChange={setIncludeTasks}
                onIncludeDocsChange={setIncludeDocs}
                onIncludeChannelChange={setIncludeChannel}
                onIncludeAutomationsChange={setIncludeAutomations}
              />

              <TemplatePrivacySection
                isPrivate={isPrivate}
                level={level}
                submitting={submitting}
                permissionOpen={permissionOpen}
                permissionTriggerRef={permissionTriggerRef}
                permissionMenuPos={permissionMenuPos}
                onPermissionOpenChange={setPermissionOpen}
                onLevelChange={setLevel}
                onPrivateChange={setIsPrivate}
              />

              {error ? (
                <p className="body-4 text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="border-border px-spacing-6 py-spacing-4 gap-spacing-3 flex shrink-0 justify-end border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="button-default button-glass-neutral"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={submitting || !trimmed.length}
                className="button-default button-glass-primary disabled:opacity-40"
              >
                {submitting ? 'Creating…' : 'Create space'}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
