'use client'

import type { ReactNode } from 'react'
import type { Form } from '@/lib/forms/forms-api'
import { formatRelativeArtifactDate } from './artifact-display'

const VISIBILITY_LABEL: Record<string, string> = {
  public: 'Public',
  auth: 'Auth required',
  embed_only: 'Embed only',
}

function titleCase(value?: string | null): string {
  const s = String(value ?? '').trim()
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function publishedHostname(url?: string | null): string {
  if (!url) return '—'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function FormCardMetaRows({
  form,
  fieldIds,
  responsesCount,
  lastResponseAt,
  targetSpaceName,
}: {
  form: Form
  fieldIds: string[]
  responsesCount?: number | null
  lastResponseAt?: string | null
  targetSpaceName?: string | null
}) {
  if (fieldIds.length === 0) return null
  const questionCount = form.schema?.questions?.length ?? 0

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {fieldIds.map((id) => {
        let label: string | null = null
        let value: ReactNode = null

        switch (id) {
          case 'status':
            label = 'Status'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {titleCase(form.status)}
              </span>
            )
            break
          case 'visibility':
            label = 'Visibility'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {VISIBILITY_LABEL[form.visibility] ?? titleCase(form.visibility)}
              </span>
            )
            break
          case 'responses_count':
            label = 'Responses'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {responsesCount ?? 0}
              </span>
            )
            break
          case 'question_count':
            label = 'Questions'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">{questionCount}</span>
            )
            break
          case 'published_url':
            label = 'URL'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {publishedHostname(form.published_url)}
              </span>
            )
            break
          case 'target_space':
            label = 'Target space'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {targetSpaceName ?? (form.space_id ? 'This space' : '—')}
              </span>
            )
            break
          case 'created_at':
            label = 'Created'
            value = (
              <span className="truncate text-right text-[10px] text-[var(--foreground)]">
                {form.created_at ? formatRelativeArtifactDate(form.created_at) : '—'}
              </span>
            )
            break
          case 'updated_at':
            label = 'Updated'
            value = (
              <span className="truncate text-right text-[10px] text-[var(--foreground)]">
                {form.updated_at ? formatRelativeArtifactDate(form.updated_at) : '—'}
              </span>
            )
            break
          case 'last_response_at':
            label = 'Last response'
            value = (
              <span className="truncate text-right text-[10px] text-[var(--foreground)]">
                {lastResponseAt ? formatRelativeArtifactDate(lastResponseAt) : '—'}
              </span>
            )
            break
          case 'slug':
            label = 'Slug'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {form.slug ?? '—'}
              </span>
            )
            break
          default:
            return null
        }

        return (
          <div key={id} className="flex min-w-0 items-start justify-between gap-2 text-[10px]">
            <span className="shrink-0 text-[var(--color-muted-foreground)]">{label}</span>
            <div className="flex min-w-0 max-w-[65%] flex-1 justify-end">{value}</div>
          </div>
        )
      })}
    </div>
  )
}
