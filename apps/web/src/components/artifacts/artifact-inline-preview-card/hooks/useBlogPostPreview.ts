'use client'

import { useEffect, useState } from 'react'
import { fetchBlogPostById } from '@/lib/artifacts'
import {
  blogContentToPlainText,
  htmlEmailBodyToPreviewPlain,
} from '../artifact-inline-preview.utils'

export function useBlogPostPreview(artifactId: string): {
  title?: string
  preview?: string
} | null {
  const [fallback, setFallback] = useState<{
    title?: string
    preview?: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchBlogPostById(artifactId).then((row) => {
      if (cancelled || !row) return
      const data = row as {
        title?: string | null
        excerpt?: string | null
        content?: unknown
      }
      const rawPreview = (data.excerpt ?? '').trim() || blogContentToPlainText(data.content)
      const preview = rawPreview ? htmlEmailBodyToPreviewPlain(rawPreview, 260) : undefined
      setFallback({
        title: data.title ?? undefined,
        preview,
      })
    })
    return () => {
      cancelled = true
    }
  }, [artifactId])

  return fallback
}
