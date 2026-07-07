'use client'

import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import type { MissionAgentSkillResource } from '@/features/mission-control/types'
import { isLikelyImageSkillResource } from './skills-page.utils'

export function SkillResourceBody({ resource: r }: { resource: MissionAgentSkillResource }) {
  if (isLikelyImageSkillResource(r) && r.storage_url) {
    return (
      <div className="flex justify-center">
        <img
          src={r.storage_url}
          alt={r.file_path}
          className="border-border rounded-spacing-2 max-h-[min(70vh,560px)] w-auto max-w-full border object-contain"
        />
      </div>
    )
  }
  const text = r.content?.trim() ?? ''
  if (!text && r.storage_url) {
    return (
      <a
        href={r.storage_url}
        target="_blank"
        rel="noopener noreferrer"
        className="body-3 text-primary underline"
      >
        Open file
      </a>
    )
  }
  const mdLike =
    r.file_path.toLowerCase().endsWith('.md') ||
    (r.content_type?.includes('markdown') ?? false) ||
    (r.content_type?.includes('text/') ?? false)
  if (mdLike && text) {
    return (
      <div className="w-full min-w-0">
        <MarkdownRenderer className="body-3 w-full max-w-none">{text}</MarkdownRenderer>
      </div>
    )
  }
  return (
    <pre className="body-3 text-muted-foreground w-full min-w-0 overflow-x-auto whitespace-pre-wrap">
      {text || '—'}
    </pre>
  )
}
