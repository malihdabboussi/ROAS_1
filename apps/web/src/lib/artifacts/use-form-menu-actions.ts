'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  copyArtifactToCampaign,
  fetchCampaigns,
  moveArtifactToCampaign,
  type Campaign,
} from '@/lib/campaigns'
import {
  deleteForm as deleteFormRequest,
  fetchFormResponses,
  publishForm,
  unpublishForm,
  updateForm,
  type FormResponse,
} from '@/lib/forms'
import type { FormMenuTarget } from './artifact-menu-contracts'
import {
  ARTIFACT_MENU_TOAST_ERRORS,
  ARTIFACT_MENU_TOAST_SUCCESS,
} from './artifact-menu-toast-messages'

const FORMS_TABLE = 'forms'
export type { FormMenuTarget } from './artifact-menu-contracts'

interface UseFormMenuActionsArgs {
  form: FormMenuTarget
  onChanged?: () => void
}

export interface FormMenuActions {
  campaigns: Campaign[]
  campaignsLoading: boolean
  isPublished: boolean
  liveUrl: string | null
  embedSnippet: string
  displayName: string
  copyLink(): Promise<void>
  copyId(): Promise<void>
  copyEmbedCode(): Promise<void>
  openInNewTab(): void
  rename(nextName?: string): Promise<void>
  publish(): Promise<void>
  unpublish(): Promise<void>
  duplicateInCurrentCampaign(): Promise<void>
  moveToCampaign(targetCampaignId: string): Promise<void>
  copyToCampaign(targetCampaignId: string): Promise<void>
  exportResponsesCsv(): Promise<void>
  deleteForm(): Promise<void>
}

function buildEmbedSnippet(liveUrl: string | null): string {
  if (!liveUrl) return ''
  const sep = liveUrl.includes('?') ? '&' : '?'
  return `<iframe src="${liveUrl}${sep}embed=1" width="100%" height="640" frameborder="0" style="border:0"></iframe>`
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function downloadBlob(filename: string, content: string, mime: string): void {
  if (typeof window === 'undefined') return
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function buildCsvFromResponses(_form: FormMenuTarget, responses: FormResponse[]): string {
  const answerKeys = new Set<string>()
  for (const r of responses) {
    for (const key of Object.keys(r.answers ?? {})) answerKeys.add(key)
  }
  const orderedKeys = [...answerKeys].sort()
  const header = ['submitted_at', 'submitter_email', ...orderedKeys].map(csvEscape).join(',')
  const rows = responses.map((r) => {
    const cells: unknown[] = [r.submitted_at, r.submitter_email ?? '']
    for (const key of orderedKeys) cells.push(r.answers?.[key] ?? '')
    return cells.map(csvEscape).join(',')
  })
  return [header, ...rows].join('\n')
}

export function useFormMenuActions({ form, onChanged }: UseFormMenuActionsArgs): FormMenuActions {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setCampaignsLoading(true)
    fetchCampaigns()
      .then((cs) => {
        if (!cancelled) setCampaigns(cs)
      })
      .catch(() => {
        if (!cancelled) setCampaigns([])
      })
      .finally(() => {
        if (!cancelled) setCampaignsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const isPublished = form.status === 'published'
  const liveUrl = form.published_url ?? null
  const embedSnippet = buildEmbedSnippet(liveUrl)
  const displayName = form.name?.trim() || 'Untitled Form'

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`)
    }
  }, [])

  const copyLink = useCallback(async () => {
    if (!liveUrl) return
    await copyToClipboard(liveUrl, 'Link')
  }, [liveUrl, copyToClipboard])

  const copyId = useCallback(async () => {
    await copyToClipboard(form.id, 'ID')
  }, [form.id, copyToClipboard])

  const copyEmbedCode = useCallback(async () => {
    await copyToClipboard(embedSnippet, 'Embed code')
  }, [embedSnippet, copyToClipboard])

  const openInNewTab = useCallback(() => {
    if (!liveUrl) return
    window.open(liveUrl, '_blank', 'noopener,noreferrer')
  }, [liveUrl])

  const rename = useCallback(
    async (nextName?: string) => {
      const candidate =
        nextName !== undefined
          ? nextName
          : typeof window !== 'undefined'
            ? window.prompt('Rename form', form.name)
            : null
      if (candidate === null || candidate === undefined) return
      const trimmed = candidate.trim()
      if (!trimmed || trimmed === form.name) return
      try {
        await updateForm(form.id, { name: trimmed })
        toast.success(ARTIFACT_MENU_TOAST_SUCCESS.RENAMED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Rename form failed:', err)
        toast.error(ARTIFACT_MENU_TOAST_ERRORS.RENAME_FAILED.userMessage)
      }
    },
    [form.id, form.name, onChanged],
  )

  const publish = useCallback(async () => {
    try {
      await publishForm(form.id)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.PUBLISHED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Publish form failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.PUBLISH_FAILED.userMessage)
    }
  }, [form.id, onChanged])

  const unpublish = useCallback(async () => {
    try {
      await unpublishForm(form.id)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.UNPUBLISHED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Unpublish form failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.UNPUBLISH_FAILED.userMessage)
    }
  }, [form.id, onChanged])

  const duplicateInCurrentCampaign = useCallback(async () => {
    if (!form.campaign_id) return
    try {
      await copyArtifactToCampaign(FORMS_TABLE, form.id, form.campaign_id)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.DUPLICATED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Duplicate form failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.DUPLICATE_FAILED.userMessage)
    }
  }, [form.id, form.campaign_id, onChanged])

  const moveToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === form.campaign_id) return
      try {
        await moveArtifactToCampaign(FORMS_TABLE, form.id, targetCampaignId)
        toast.success(ARTIFACT_MENU_TOAST_SUCCESS.MOVED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Move form failed:', err)
        toast.error(ARTIFACT_MENU_TOAST_ERRORS.MOVE_FAILED.userMessage)
      }
    },
    [form.id, form.campaign_id, onChanged],
  )

  const copyToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === form.campaign_id) return
      try {
        await copyArtifactToCampaign(FORMS_TABLE, form.id, targetCampaignId)
        toast.success(ARTIFACT_MENU_TOAST_SUCCESS.COPIED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Copy form failed:', err)
        toast.error(ARTIFACT_MENU_TOAST_ERRORS.COPY_FAILED.userMessage)
      }
    },
    [form.id, form.campaign_id, onChanged],
  )

  const exportResponsesCsv = useCallback(async () => {
    try {
      const responses = await fetchFormResponses(form.id)
      if (responses.length === 0) {
        toast.info(ARTIFACT_MENU_TOAST_ERRORS.FORM_NO_RESPONSES.userMessage)
        return
      }
      const csv = buildCsvFromResponses(form, responses)
      const safeName = (form.name || 'form').replace(/[^a-z0-9-_]+/gi, '-').slice(0, 60) || 'form'
      downloadBlob(`${safeName}-responses.csv`, csv, 'text/csv;charset=utf-8')
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.RESPONSES_EXPORTED.userMessage)
    } catch (err) {
      console.error('Export responses failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.EXPORT_RESPONSES_FAILED.userMessage)
    }
  }, [form])

  const deleteForm = useCallback(async () => {
    try {
      await deleteFormRequest(form.id)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.DELETED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Delete form failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.DELETE_FAILED.userMessage)
    }
  }, [form.id, onChanged])

  return {
    campaigns,
    campaignsLoading,
    isPublished,
    liveUrl,
    embedSnippet,
    displayName,
    copyLink,
    copyId,
    copyEmbedCode,
    openInNewTab,
    rename,
    publish,
    unpublish,
    duplicateInCurrentCampaign,
    moveToCampaign,
    copyToCampaign,
    exportResponsesCsv,
    deleteForm,
  }
}
