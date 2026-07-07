'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchForm,
  publishForm,
  unpublishForm,
  updateForm,
  type Form,
  type FormSettings,
} from '@/lib/forms'
import { SPACES_ARTIFACT_TOAST_SUCCESS } from '../../../config/spaces-toast-errors.config'
import { FormBuildTab } from './FormBuildTab'
import { FormMenuDropdown } from './FormMenuDropdown'
import { FormPreviewTab } from './FormPreviewTab'
import {
  FORM_PUBLISH_DROPDOWN_WIDTH_PX,
  FormPreviewPaneToolbarActions,
} from './FormPreviewPaneToolbarActions'
import { FormResponsesPanel } from './FormResponsesPanel'
import { FormSettingsPanel } from './FormSettingsPanel'

type TabId = 'build' | 'preview'

export function FormPreviewPane({
  formId,
  toolbarLeading,
  fullscreenButton,
  trailingAfterDivider,
  buildShowAddQuestionRail = true,
  onOpenFullView,
}: {
  formId: string
  toolbarLeading?: ReactNode
  fullscreenButton?: ReactNode
  trailingAfterDivider?: ReactNode
  buildShowAddQuestionRail?: boolean
  /** Spaces slide-over: jump to full in-place artifact view (`?artifact=`). */
  onOpenFullView?: () => void
}) {
  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('build')
  const [pagesRailCollapsed, setPagesRailCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [responsesOpen, setResponsesOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishDropdownOpen, setPublishDropdownOpen] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const publishBtnRef = useRef<HTMLButtonElement>(null)
  const kebabBtnRef = useRef<HTMLButtonElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchForm(formId)
      .then((nextForm) => {
        if (cancelled) return
        setForm(nextForm)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [formId])

  const publishedUrl = form?.published_url ?? null
  const isPublished = form?.status === 'published'

  useEffect(() => {
    if (!publishDropdownOpen || !publishBtnRef.current) return
    const rect = publishBtnRef.current.getBoundingClientRect()
    const padding = 8
    const unclampedLeft = rect.right - FORM_PUBLISH_DROPDOWN_WIDTH_PX
    const maxLeft = Math.max(
      padding,
      window.innerWidth - FORM_PUBLISH_DROPDOWN_WIDTH_PX - padding,
    )
    const left = Math.min(Math.max(unclampedLeft, padding), maxLeft)
    setDropdownPosition({ top: rect.bottom + 4, left })
  }, [publishDropdownOpen])

  useEffect(() => {
    if (!publishDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        !target.closest('[data-form-publish-dropdown]') &&
        !publishBtnRef.current?.contains(target)
      ) {
        setPublishDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [publishDropdownOpen])

  const savePatch = useMemo(
    () => async (patch: Partial<Form>) => {
      if (!form) return
      const next = { ...form, ...patch }
      setForm(next)
      await updateForm(form.id, {
        name: patch.name,
        schema: patch.schema,
        settings: patch.settings,
        visibility: patch.visibility,
        space_id: patch.space_id,
      })
    },
    [form],
  )

  const handlePublish = useCallback(async () => {
    if (!form) return
    setPublishing(true)
    try {
      const result = await publishForm(form.id)
      setForm({ ...form, status: 'published', published_url: result.url })
      setPublishDropdownOpen(false)
    } finally {
      setPublishing(false)
    }
  }, [form])

  const handleUnpublish = useCallback(async () => {
    if (!form) return
    setPublishing(true)
    try {
      await unpublishForm(form.id)
      setForm({ ...form, status: 'draft' })
      setPublishDropdownOpen(false)
    } finally {
      setPublishing(false)
    }
  }, [form])

  const handleCopyPublishedUrl = useCallback(async () => {
    if (!publishedUrl) return
    try {
      await navigator.clipboard.writeText(publishedUrl)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
      toast.success(SPACES_ARTIFACT_TOAST_SUCCESS.FORM_LINK_COPIED.userMessage)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = publishedUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
      toast.success(SPACES_ARTIFACT_TOAST_SUCCESS.FORM_LINK_COPIED.userMessage)
    }
  }, [publishedUrl])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb size="sm" text="Loading form..." />
      </div>
    )
  }

  if (!form) return null

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="gap-spacing-3 px-spacing-4 h-spacing-12 flex shrink-0 items-center justify-between">
        <div className="gap-spacing-2 flex min-w-0 items-center">
          {toolbarLeading}
          <input
            ref={titleInputRef}
            value={form.name}
            onChange={(event) => void savePatch({ name: event.target.value })}
            className="body-3 text-foreground bg-transparent font-medium outline-none"
          />
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as TabId)}>
          <TabsList variant="liquid">
            <TabsTrigger value="build" className="px-spacing-4">
              Build
            </TabsTrigger>
            <TabsTrigger value="preview" className="px-spacing-4">
              Preview
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <FormPreviewPaneToolbarActions
          trailingAfterDivider={trailingAfterDivider}
          fullscreenButton={fullscreenButton}
          publishButtonRef={publishBtnRef}
          menuButtonRef={kebabBtnRef}
          menuOpen={menuOpen}
          publishDropdownOpen={publishDropdownOpen}
          dropdownPosition={dropdownPosition}
          isPublished={isPublished}
          publishedUrl={publishedUrl}
          publishing={publishing}
          copiedUrl={copiedUrl}
          onOpenResponses={() => setResponsesOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleMenu={() => setMenuOpen((open) => !open)}
          onTogglePublishDropdown={() => setPublishDropdownOpen((open) => !open)}
          onPublish={() => void handlePublish()}
          onUnpublish={() => void handleUnpublish()}
          onCopyPublishedUrl={() => void handleCopyPublishedUrl()}
          onPublishedUrlOpen={() => setPublishDropdownOpen(false)}
        />
      </div>

      {menuOpen ? (
        <FormMenuDropdown
          form={{
            id: form.id,
            name: form.name,
            status: form.status,
            share_token: form.share_token,
            visibility: form.visibility,
            published_url: form.published_url ?? null,
            campaign_id: form.campaign_id ?? null,
            space_id: form.space_id ?? null,
            target_space_id:
              (typeof form.settings?.target_space_id === 'string' &&
                form.settings.target_space_id) ||
              null,
          }}
          anchorRef={kebabBtnRef}
          onClose={() => setMenuOpen(false)}
          onChanged={() => {
            void fetchForm(formId)
              .then((next) => setForm(next))
              .catch(() => {})
          }}
          onOpenSettings={() => {
            setMenuOpen(false)
            setSettingsOpen(true)
          }}
          onRequestRename={() => {
            setMenuOpen(false)
            requestAnimationFrame(() => {
              titleInputRef.current?.focus()
              titleInputRef.current?.select()
            })
          }}
          onOpenResponses={() => {
            setMenuOpen(false)
            setResponsesOpen(true)
          }}
          onOpenFullView={onOpenFullView}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {tab === 'build' ? (
          <FormBuildTab
            form={form}
            onChange={(patch) => void savePatch(patch)}
            showAddQuestionRail={buildShowAddQuestionRail}
            onOpenSettings={() => setSettingsOpen(true)}
            pagesRailCollapsed={pagesRailCollapsed}
            onPagesRailCollapsedChange={setPagesRailCollapsed}
          />
        ) : (
          <FormPreviewTab
            form={form}
            pagesRailCollapsed={pagesRailCollapsed}
            onPagesRailCollapsedChange={setPagesRailCollapsed}
          />
        )}
      </div>

      <FormSettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        form={form}
        settings={form.settings ?? {}}
        onChange={(settings: FormSettings) => void savePatch({ settings })}
      />
      <FormResponsesPanel
        open={responsesOpen}
        onClose={() => setResponsesOpen(false)}
        formId={form.id}
        questions={form.schema?.questions ?? []}
      />
    </div>
  )
}
