'use client'

import { create } from 'zustand'
import { formatFunnelElementContext } from '../lib/funnel-element-trace'
import type { FunnelComment, FunnelElementTrace } from '../types'

type FunnelCommentsSession = {
  funnelId: string
  funnelName: string
}

function dispatchFunnelVibeRequest(detail: {
  funnelId: string
  funnelName: string
  content: string
  systemContext: string
  drawingDataUrl?: string
}) {
  window.dispatchEvent(new CustomEvent('funnel-editor:send-to-vibe', { detail }))
}

interface FunnelCommentsChatState {
  session: FunnelCommentsSession | null
  commentsChatActive: boolean
  comments: FunnelComment[]
  registerSession: (session: FunnelCommentsSession) => void
  clearSession: () => void
  setCommentsChatActive: (active: boolean) => void
  addComment: (input: {
    body: string
    trace?: FunnelElementTrace | null
    pageId?: string | null
  }) => void
  resolveComment: (commentId: string, resolved: boolean) => void
  sendCommentsToVibe: (selectedComments: FunnelComment[]) => void
}

export const useFunnelCommentsChatStore = create<FunnelCommentsChatState>()((set, get) => ({
  session: null,
  commentsChatActive: false,
  comments: [],

  registerSession: (session) =>
    set((state) => {
      if (state.session?.funnelId === session.funnelId) {
        return {
          session: {
            funnelId: session.funnelId,
            funnelName: session.funnelName,
          },
        }
      }
      return {
        session,
        comments: [],
        commentsChatActive: false,
      }
    }),

  clearSession: () =>
    set({
      session: null,
      comments: [],
      commentsChatActive: false,
    }),

  setCommentsChatActive: (active) => set({ commentsChatActive: active }),

  addComment: ({ body, trace = null, pageId = null }) => {
    const session = get().session
    if (!session) return
    const value = body.trim()
    if (!value) return
    set((state) => ({
      comments: [
        ...state.comments,
        {
          id: crypto.randomUUID(),
          funnel_id: session.funnelId,
          funnel_page_id: trace?.funnel_page_id ?? pageId,
          body: value,
          author_name: 'Sefy',
          created_at: new Date().toISOString(),
          resolved: false,
          element_trace: trace,
          replies: [],
        },
      ],
      commentsChatActive: true,
    }))
  },

  resolveComment: (commentId, resolved) =>
    set((state) => ({
      comments: state.comments.map((comment) =>
        comment.id === commentId ? { ...comment, resolved } : comment,
      ),
    })),

  sendCommentsToVibe: (selectedComments) => {
    const session = get().session
    if (!session || selectedComments.length === 0) return
    const context = selectedComments
      .map((comment) =>
        [
          `Comment: ${comment.body}`,
          comment.element_trace ? formatFunnelElementContext(comment.element_trace) : '',
        ]
          .filter(Boolean)
          .join('\n'),
      )
      .join('\n\n')
    dispatchFunnelVibeRequest({
      funnelId: session.funnelId,
      funnelName: session.funnelName,
      content: `Resolve these funnel comments:\n${selectedComments.map((c) => `- ${c.body}`).join('\n')}`,
      systemContext: context,
    })
  },
}))
