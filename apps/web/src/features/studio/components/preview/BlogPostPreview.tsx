'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { AlertCircle, Check, FolderOpen, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchBlogPost,
  updateBlogPost,
  type BlogPost,
} from '@/features/studio/services/artifact-preview.service'
import { backendUpload } from '@/lib/api/backend-client'
import type { MediaAsset } from '@/lib/services/media-api'
import { RETRY_CONFIGS, withRetry } from '@/lib/utils/retry'
import { BlogPreviewEditor, type BlogPreviewEditorRef } from './BlogPreviewEditor'

export type BlogPostPreviewHandle = {
  setPublishedFromToolbar: (published: boolean) => void
}

interface BlogPostPreviewProps {
  blogPostId: string
  /** Website funnel that owns the post; required to call the platform list-by-funnel API. */
  funnelId?: string
  onPostStatusChange?: (status: 'draft' | 'published' | 'archived') => void
  onSavePulseChange?: (pulse: SaveIndicatorStatus) => void
  onLoadStateChange?: (loading: boolean) => void
}

function blogContentToEditorHtml(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  const parts: string[] = []
  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    const b = block as Record<string, unknown>
    const text = b.text
    if (typeof text === 'string' && text.trim()) parts.push(text.trim())
    const items = b.items
    if (Array.isArray(items)) {
      const lines = items.filter((i): i is string => typeof i === 'string').map((i) => `- ${i}`)
      if (lines.length) parts.push(lines.join('\n'))
    }
  }
  return parts.join('\n\n')
}

function formPersistenceKey(
  title: string,
  slug: string,
  excerpt: string,
  author: string,
  bodyHtml: string,
  status: string,
): string {
  return JSON.stringify({ title, slug, excerpt, author, bodyHtml, status })
}

export type BlogPostSavePulse = 'idle' | 'saving' | 'saved' | 'error'

type SaveIndicatorStatus = BlogPostSavePulse

function SaveIndicator({ status }: { status: SaveIndicatorStatus }) {
  if (status === 'idle') return null
  return (
    <span className="flex items-center gap-1 text-[10px] transition-opacity">
      {status === 'saving' && (
        <>
          <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
          <span className="text-muted-foreground">Saving</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3 w-3 text-emerald-400" />
          <span className="text-emerald-400">Saved</span>
        </>
      )}
      {status === 'error' && <span className="text-red-400">Save failed</span>}
    </span>
  )
}

export const BlogPostPreview = forwardRef<BlogPostPreviewHandle, BlogPostPreviewProps>(
  function BlogPostPreview(
    { blogPostId, funnelId, onPostStatusChange, onSavePulseChange, onLoadStateChange },
    ref,
  ) {
    const [blogPost, setBlogPost] = useState<BlogPost | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [savePulse, setSavePulse] = useState<SaveIndicatorStatus>('idle')
    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [excerpt, setExcerpt] = useState('')
    const [author, setAuthor] = useState('')
    const [bodyHtml, setBodyHtml] = useState('')
    const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft')

    const [coverImage, setCoverImage] = useState<string | null>(null)
    const [coverImageLibraryOpen, setCoverImageLibraryOpen] = useState(false)
    const [coverImageUploading, setCoverImageUploading] = useState(false)
    const coverImageFileRef = useRef<HTMLInputElement>(null)
    const editorRef = useRef<BlogPreviewEditorRef>(null)
    const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)
    const blogPostRef = useRef<BlogPost | null>(null)
    const statusRef = useRef(status)
    const fieldsRef = useRef({ title, slug, excerpt, author, bodyHtml })
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const savingRef = useRef(false)
    const lastPersistedKeyRef = useRef<string | null>(null)
    const onPostStatusChangeRef = useRef(onPostStatusChange)
    const onLoadStateChangeRef = useRef(onLoadStateChange)
    const onSavePulseChangeRef = useRef(onSavePulseChange)

    useEffect(() => {
      onPostStatusChangeRef.current = onPostStatusChange
    }, [onPostStatusChange])
    useEffect(() => {
      onLoadStateChangeRef.current = onLoadStateChange
    }, [onLoadStateChange])
    useEffect(() => {
      onSavePulseChangeRef.current = onSavePulseChange
    }, [onSavePulseChange])

    useEffect(() => {
      blogPostRef.current = blogPost
    }, [blogPost])

    useEffect(() => {
      statusRef.current = status
    }, [status])

    useEffect(() => {
      fieldsRef.current = { title, slug, excerpt, author, bodyHtml }
    }, [title, slug, excerpt, author, bodyHtml])

    useEffect(() => {
      let cancelled = false
      setError(null)
      setBlogPost(null)
      lastPersistedKeyRef.current = null
      if (!funnelId) {
        setLoading(false)
        onLoadStateChangeRef.current?.(false)
        setError(
          'Missing website for this post. In Artifacts, open Websites → your site → Blog, then select the post again.',
        )
        return () => {
          cancelled = true
        }
      }
      setLoading(true)
      onLoadStateChangeRef.current?.(true)
      fetchBlogPost(funnelId, blogPostId)
        .then((data) => {
          if (cancelled) return
          setBlogPost(data)
          const t = data.title ?? ''
          const s = data.slug ?? ''
          const ex = data.excerpt ?? ''
          const au = data.author ?? ''
          const body = blogContentToEditorHtml(data.content)
          const st = data.status ?? 'draft'
          setTitle(t)
          setSlug(s)
          setExcerpt(ex)
          setAuthor(au)
          setBodyHtml(body)
          setStatus(st)
          setCoverImage(data.cover_image ?? null)
          onPostStatusChangeRef.current?.(st)
          lastPersistedKeyRef.current = formPersistenceKey(t, s, ex, au, body, st)
        })
        .catch((err) => {
          if (cancelled) return
          setError(err instanceof Error ? err.message : 'Failed to load blog post')
        })
        .finally(() => {
          if (cancelled) return
          setLoading(false)
          onLoadStateChangeRef.current?.(false)
        })
      return () => {
        cancelled = true
      }
    }, [blogPostId, funnelId])

    const performSave = useCallback(
      async (
        nextStatus: 'draft' | 'published' | 'archived',
        opts?: { publishedAt: string | null },
      ) => {
        setSaveError(null)
        const {
          title: rawTitle,
          slug: rawSlug,
          excerpt: rawExcerpt,
          author: rawAuthor,
          bodyHtml: html,
        } = fieldsRef.current
        const t = rawTitle.trim()
        const sl = rawSlug.trim()
        if (!t) {
          setSaveError('Title is required.')
          return
        }
        if (!sl) {
          setSaveError('Slug is required.')
          return
        }
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        if (savingRef.current) return
        savingRef.current = true
        setSavePulse('saving')
        const ex = rawExcerpt.trim() || null
        const au = rawAuthor.trim() || null
        let published_at: string | null
        if (nextStatus !== 'published') {
          published_at = null
        } else if (opts && 'publishedAt' in opts) {
          published_at = opts.publishedAt
        } else {
          published_at = blogPostRef.current?.published_at ?? new Date().toISOString()
        }
        try {
          const updated = await withRetry(
            () =>
              updateBlogPost(blogPostId, {
                title: t,
                slug: sl,
                excerpt: ex,
                author: au,
                content: [{ type: 'paragraph', text: html }],
                status: nextStatus,
                published_at,
              }),
            RETRY_CONFIGS.API_CALL,
          )
          setBlogPost(updated)
          setStatus(updated.status)
          statusRef.current = updated.status
          onPostStatusChangeRef.current?.(updated.status)
          lastPersistedKeyRef.current = formPersistenceKey(
            t,
            sl,
            rawExcerpt,
            rawAuthor,
            html,
            updated.status,
          )
          setSavePulse('saved')
          savedTimerRef.current = setTimeout(() => setSavePulse('idle'), 2000)
        } catch {
          setSaveError('Failed to save blog post')
          toast.error("Couldn't save blog post. Try again.")
          setSavePulse('error')
        } finally {
          savingRef.current = false
        }
      },
      [blogPostId],
    )

    useImperativeHandle(
      ref,
      () => ({
        setPublishedFromToolbar: (published: boolean) => {
          void performSave(
            published ? 'published' : 'draft',
            published ? { publishedAt: new Date().toISOString() } : { publishedAt: null },
          )
        },
      }),
      [performSave],
    )

    const insertImageIntoEditor = useCallback((url: string) => {
      const editor = editorRef.current?.getEditor()
      if (!editor) return
      editor.chain().focus().setImage({ src: url }).run()
    }, [])

    const handleImageUpload = useCallback(
      async (file: File) => {
        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('name', file.name)
          formData.append('category', 'blog')
          const result = await backendUpload<{ asset?: MediaAsset; url?: string }>(
            '/api/media/upload',
            formData,
          )
          const url = result.asset?.public_url ?? result.url
          if (url) insertImageIntoEditor(url)
          else toast.error('Upload succeeded but no URL was returned')
        } catch {
          toast.error('Failed to upload image')
        }
      },
      [insertImageIntoEditor],
    )

    const handleMediaLibrarySelect = useCallback(
      (url: string) => {
        insertImageIntoEditor(url)
        setMediaLibraryOpen(false)
      },
      [insertImageIntoEditor],
    )

    const handleMediaLibrarySelectAsset = useCallback(
      (asset: MediaAsset) => {
        const url = asset.public_url
        if (url) insertImageIntoEditor(url)
        setMediaLibraryOpen(false)
      },
      [insertImageIntoEditor],
    )

    const saveCoverImage = useCallback(
      async (url: string | null) => {
        setCoverImage(url)
        try {
          await withRetry(
            () => updateBlogPost(blogPostId, { cover_image: url }),
            RETRY_CONFIGS.API_CALL,
          )
        } catch {
          toast.error('Failed to save cover image')
        }
      },
      [blogPostId],
    )

    const handleCoverImageUpload = useCallback(
      async (file: File) => {
        setCoverImageUploading(true)
        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('name', file.name)
          formData.append('category', 'blog')
          const result = await backendUpload<{ asset?: MediaAsset; url?: string }>(
            '/api/media/upload',
            formData,
          )
          const url = result.asset?.public_url ?? result.url
          if (url) void saveCoverImage(url)
          else toast.error('Upload succeeded but no URL was returned')
        } catch {
          toast.error('Failed to upload cover image')
        } finally {
          setCoverImageUploading(false)
        }
      },
      [saveCoverImage],
    )

    const handleCoverImageFileChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) void handleCoverImageUpload(file)
        if (coverImageFileRef.current) coverImageFileRef.current.value = ''
      },
      [handleCoverImageUpload],
    )

    const handleCoverImageFromLibrary = useCallback(
      (asset: MediaAsset) => {
        const url = asset.public_url
        if (url) void saveCoverImage(url)
        setCoverImageLibraryOpen(false)
      },
      [saveCoverImage],
    )

    useEffect(() => {
      onSavePulseChangeRef.current?.(savePulse)
    }, [savePulse])

    useEffect(() => {
      if (!blogPost || loading) return
      const nextKey = formPersistenceKey(
        title.trim(),
        slug.trim(),
        excerpt,
        author,
        bodyHtml,
        statusRef.current,
      )
      if (lastPersistedKeyRef.current === nextKey) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      setSavePulse('idle')
      saveTimerRef.current = setTimeout(() => {
        void performSave(statusRef.current)
      }, 1000)
      return () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      }
    }, [blogPost, loading, title, slug, excerpt, author, bodyHtml, performSave])

    useEffect(() => {
      return () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      }
    }, [])

    if (loading) {
      return (
        <div className="flex h-full items-center justify-center">
          <VibeyLoadingOrb size="sm" text="Loading blog post..." />
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-destructive p-spacing-6 flex h-full flex-col items-center justify-center gap-2">
          <AlertCircle className="text-muted-foreground/40 h-8 w-8" />
          <p className="body-3 text-center">{error}</p>
        </div>
      )
    }

    if (!blogPost) {
      return (
        <div className="text-muted-foreground p-spacing-6 body-3 flex h-full items-center justify-center">
          Blog post not found.
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="gap-spacing-3 py-spacing-3 md:px-spacing-4 flex min-h-0 flex-1 flex-col overflow-y-auto px-3">
          <div className="gap-spacing-3 flex flex-shrink-0 items-center">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-glass body-1 text-foreground h-spacing-10 placeholder:text-muted-foreground rounded-spacing-2 px-spacing-3 w-full"
              placeholder="Blog post title"
            />
            <div className="flex shrink-0 items-center">
              <SaveIndicator status={savePulse} />
            </div>
          </div>
          <div className="card-glass rounded-spacing-2 flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1">
              <BlogPreviewEditor
                ref={editorRef}
                content={bodyHtml}
                onContentChange={setBodyHtml}
                placeholder="Write your post…"
                className="h-full rounded-none border-0 bg-transparent"
                onImageUpload={handleImageUpload}
                onOpenMediaLibrary={() => setMediaLibraryOpen(true)}
              />
            </div>
          </div>

          <div className="gap-spacing-3 pb-spacing-3 flex flex-shrink-0 flex-col">
            <div className="gap-spacing-3 grid md:grid-cols-2">
              <div>
                <label className="body-3 text-muted-foreground mb-spacing-1 block font-medium">
                  Slug
                </label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="input-glass body-3 text-foreground h-spacing-10 placeholder:text-muted-foreground rounded-spacing-2 px-spacing-3 w-full"
                  placeholder="url-slug"
                />
              </div>
              <div>
                <label className="body-3 text-muted-foreground mb-spacing-1 block font-medium">
                  Author
                </label>
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="input-glass body-3 text-foreground h-spacing-10 placeholder:text-muted-foreground rounded-spacing-2 px-spacing-3 w-full"
                  placeholder="Author name"
                />
              </div>
            </div>

            <div>
              <label className="body-3 text-muted-foreground mb-spacing-1 block font-medium">
                Excerpt
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                className="input-glass body-3 text-muted-foreground placeholder:text-muted-foreground rounded-spacing-2 px-spacing-3 py-spacing-2 min-h-[76px] w-full"
                placeholder="Short summary for listings and SEO"
              />
            </div>

            <div>
              <label className="body-3 text-muted-foreground mb-spacing-1 block font-medium">
                Cover Image
              </label>
              {coverImage ? (
                <div className="rounded-spacing-2 border-border group relative overflow-hidden border">
                  <img
                    src={coverImage}
                    alt={title || ''}
                    className="max-h-48 w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => coverImageFileRef.current?.click()}
                      className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/30"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveCoverImage(null)}
                      className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500/60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => coverImageFileRef.current?.click()}
                    disabled={coverImageUploading}
                    className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded-spacing-2 border-border flex items-center gap-1.5 border px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
                  >
                    {coverImageUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverImageLibraryOpen(true)}
                    className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded-spacing-2 border-border flex items-center gap-1.5 border px-3 py-1.5 text-xs transition-colors"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Media Library
                  </button>
                </div>
              )}
              <input
                ref={coverImageFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverImageFileChange}
              />
            </div>

            {saveError ? <p className="text-destructive body-4">{saveError}</p> : null}
          </div>
        </div>

        <MediaPickerModal
          open={mediaLibraryOpen}
          onClose={() => setMediaLibraryOpen(false)}
          onSelect={handleMediaLibrarySelect}
          onSelectAsset={handleMediaLibrarySelectAsset}
        />
        <MediaPickerModal
          open={coverImageLibraryOpen}
          onClose={() => setCoverImageLibraryOpen(false)}
          onSelect={(url) => {
            void saveCoverImage(url)
            setCoverImageLibraryOpen(false)
          }}
          onSelectAsset={handleCoverImageFromLibrary}
        />
      </div>
    )
  },
)

BlogPostPreview.displayName = 'BlogPostPreview'
