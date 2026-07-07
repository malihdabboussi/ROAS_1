'use client'

import { create } from 'zustand'
import { formatPresentationElementContext } from '../lib/presentation-element-trace'
import {
  listPresentationComments,
  savePresentationComment,
  updatePresentationComment,
} from '../services/artifact-preview.service'
import type { PresentationComment, PresentationElementTrace } from '../types'

type PresentationCommentsSession = {
  presentationId: string
  presentationName: string
}

type PendingPresentationComment = {
  id: string
  presentation_id: string
  slide_index: number | null
  body: string
  created_at: string
  element_trace: PresentationElementTrace | null
}

const OUTBOX_STORAGE_KEY = 'vibey:presentation-comments-outbox:v1'

function dispatchPresentationVibeRequest(detail: {
  presentationId: string
  presentationName: string
  content: string
  systemContext: string
  drawingDataUrl?: string
}) {
  window.dispatchEvent(new CustomEvent('presentation-editor:send-to-vibe', { detail }))
}

function readOutbox(): Record<string, PendingPresentationComment[]> {
  if (typeof window === 'undefined') return {}
  try {
    const parsed = JSON.parse(window.localStorage.getItem(OUTBOX_STORAGE_KEY) ?? '{}') as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, PendingPresentationComment[]>)
      : {}
  } catch {
    return {}
  }
}

function writeOutbox(outbox: Record<string, PendingPresentationComment[]>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(outbox))
}

function getPendingComments(presentationId: string): PendingPresentationComment[] {
  return readOutbox()[presentationId] ?? []
}

function upsertPendingComment(comment: PendingPresentationComment) {
  const outbox = readOutbox()
  const comments = outbox[comment.presentation_id] ?? []
  outbox[comment.presentation_id] = [...comments.filter((item) => item.id !== comment.id), comment]
  writeOutbox(outbox)
}

function removePendingComment(presentationId: string, commentId: string) {
  const outbox = readOutbox()
  const next = (outbox[presentationId] ?? []).filter((item) => item.id !== commentId)
  if (next.length > 0) outbox[presentationId] = next
  else delete outbox[presentationId]
  writeOutbox(outbox)
}

function mergeComments(comments: PresentationComment[]): PresentationComment[] {
  const byId = new Map<string, PresentationComment>()
  for (const comment of comments) {
    byId.set(comment.id, comment)
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

function pendingToComment(comment: PendingPresentationComment): PresentationComment {
  return {
    id: comment.id,
    presentation_id: comment.presentation_id,
    slide_index: comment.slide_index,
    body: comment.body,
    author_name: 'Sefy',
    created_at: comment.created_at,
    resolved: false,
    element_trace: comment.element_trace,
    replies: [],
    save_status: 'failed',
  }
}

interface PresentationCommentsChatState {
  session: PresentationCommentsSession | null
  commentsChatActive: boolean
  comments: PresentationComment[]
  registerSession: (session: PresentationCommentsSession) => void
  clearSession: () => void
  setCommentsChatActive: (active: boolean) => void
  addComment: (input: {
    body: string
    trace?: PresentationElementTrace | null
    slideIndex?: number | null
  }) => void
  resolveComment: (commentId: string, resolved: boolean) => void
  sendCommentsToVibe: (selectedComments: PresentationComment[]) => void
  loadComments: (presentationId: string) => Promise<void>
  retryPendingComments: (presentationId: string) => Promise<void>
}

export const usePresentationCommentsChatStore = create<PresentationCommentsChatState>()(
  (set, get) => ({
    session: null,
    commentsChatActive: false,
    comments: [],

    registerSession: (session) => {
      const previousPresentationId = get().session?.presentationId ?? null
      set((state) => {
        if (state.session?.presentationId === session.presentationId) {
          return {
            session: {
              presentationId: session.presentationId,
              presentationName: session.presentationName,
            },
          }
        }
        return {
          session,
          comments: getPendingComments(session.presentationId).map(pendingToComment),
          commentsChatActive: false,
        }
      })
      if (previousPresentationId !== session.presentationId) {
        void get().loadComments(session.presentationId)
      }
    },

    clearSession: () =>
      set({
        session: null,
        comments: [],
        commentsChatActive: false,
      }),

    setCommentsChatActive: (active) => set({ commentsChatActive: active }),

    loadComments: async (presentationId) => {
      const pending = getPendingComments(presentationId).map(pendingToComment)
      try {
        const saved = await listPresentationComments(presentationId)
        if (get().session?.presentationId !== presentationId) return
        set({
          comments: mergeComments([
            ...saved.map((comment) => ({ ...comment, save_status: 'saved' as const })),
            ...pending,
          ]),
        })
        void get().retryPendingComments(presentationId)
      } catch {
        if (get().session?.presentationId !== presentationId) return
        set({ comments: mergeComments([...get().comments, ...pending]) })
      }
    },

    retryPendingComments: async (presentationId) => {
      for (const pending of getPendingComments(presentationId)) {
        set((state) => ({
          comments: state.comments.map((comment) =>
            comment.id === pending.id ? { ...comment, save_status: 'saving' } : comment,
          ),
        }))
        try {
          const saved = await savePresentationComment(presentationId, {
            id: pending.id,
            body: pending.body,
            slide_index: pending.slide_index,
            element_trace: pending.element_trace,
          })
          removePendingComment(presentationId, pending.id)
          if (get().session?.presentationId !== presentationId) continue
          set((state) => ({
            comments: mergeComments([
              ...state.comments.filter((comment) => comment.id !== pending.id),
              { ...saved, save_status: 'saved' },
            ]),
          }))
        } catch {
          if (get().session?.presentationId !== presentationId) continue
          set((state) => ({
            comments: state.comments.map((comment) =>
              comment.id === pending.id ? { ...comment, save_status: 'failed' } : comment,
            ),
          }))
        }
      }
    },

    addComment: ({ body, trace = null, slideIndex = null }) => {
      const session = get().session
      if (!session) return
      const value = body.trim()
      if (!value) return
      const comment: PendingPresentationComment = {
        id: crypto.randomUUID(),
        presentation_id: session.presentationId,
        slide_index: trace?.slide_index ?? slideIndex,
        body: value,
        created_at: new Date().toISOString(),
        element_trace: trace,
      }
      upsertPendingComment(comment)
      set((state) => ({
        comments: mergeComments([
          ...state.comments,
          { ...pendingToComment(comment), save_status: 'saving' },
        ]),
        commentsChatActive: true,
      }))
      void get().retryPendingComments(session.presentationId)
    },

    resolveComment: (commentId, resolved) => {
      const session = get().session
      if (!session) return
      const previous = get().comments.find((comment) => comment.id === commentId)
      set((state) => ({
        comments: state.comments.map((comment) =>
          comment.id === commentId ? { ...comment, resolved } : comment,
        ),
      }))
      void updatePresentationComment(session.presentationId, commentId, { resolved })
        .then((updated) => {
          if (get().session?.presentationId !== session.presentationId) return
          set((state) => ({
            comments: mergeComments([
              ...state.comments.filter((comment) => comment.id !== commentId),
              { ...updated, save_status: 'saved' },
            ]),
          }))
        })
        .catch(() => {
          if (!previous || get().session?.presentationId !== session.presentationId) return
          set((state) => ({
            comments: state.comments.map((comment) =>
              comment.id === commentId ? previous : comment,
            ),
          }))
        })
    },

    sendCommentsToVibe: (selectedComments) => {
      const session = get().session
      if (!session || selectedComments.length === 0) return
      const context = selectedComments
        .map((comment) =>
          [
            `Comment: ${comment.body}`,
            comment.element_trace ? formatPresentationElementContext(comment.element_trace) : '',
          ]
            .filter(Boolean)
            .join('\n'),
        )
        .join('\n\n')
      dispatchPresentationVibeRequest({
        presentationId: session.presentationId,
        presentationName: session.presentationName,
        content: `Resolve these presentation comments:\n${selectedComments.map((c) => `- ${c.body}`).join('\n')}`,
        systemContext: context,
      })
    },
  }),
)

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const session = usePresentationCommentsChatStore.getState().session
    if (session) {
      void usePresentationCommentsChatStore.getState().retryPendingComments(session.presentationId)
    }
  })
}
