import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import {
  removeLastArtifactByConversation,
  resolveArtifactForConversationChange,
  stampArtifactConversation,
  trimLastArtifactByConversation,
  upsertLastArtifactByConversation,
} from './shell-artifact-conversation'

export interface ShellArtifactConversationSlice {
  /** Last open artifact per conversation (persisted). */
  lastArtifactByConversation: Record<string, ShellArtifactViewerTarget>
  /** When true, chat switches keep the current artifact open. */
  artifactPinned: boolean
  setArtifactPinned: (pinned: boolean) => void
  toggleArtifactPinned: () => void
  /** Apply restore/pin contract when the active chat changes. */
  syncArtifactViewerForConversation: (conversationId: string | null) => void
}

type ArtifactConversationHostState = ShellArtifactConversationSlice & {
  artifactViewer: { target: ShellArtifactViewerTarget | null; width: number }
  rightPanel: { open: boolean }
  workAreaOpen: boolean
}

type ArtifactConversationSet = (
  partial:
    | Partial<ArtifactConversationHostState>
    | ((state: ArtifactConversationHostState) => Partial<ArtifactConversationHostState>),
) => void

type ArtifactConversationPersist = (partial: {
  lastArtifactByConversation?: Record<string, ShellArtifactViewerTarget>
  artifactPinned?: boolean
  artifactViewerTarget?: ShellArtifactViewerTarget | null
  rightPanelOpen?: boolean
  workAreaOpen?: boolean
}) => void

export function createShellArtifactConversationSlice(
  set: ArtifactConversationSet,
  get: () => ArtifactConversationHostState,
  persist: ArtifactConversationPersist,
): ShellArtifactConversationSlice {
  return {
    lastArtifactByConversation: {},
    artifactPinned: false,
    setArtifactPinned: (pinned) => {
      if (get().artifactPinned === pinned) return
      persist({ artifactPinned: pinned })
      set({ artifactPinned: pinned })
    },
    toggleArtifactPinned: () => {
      get().setArtifactPinned(!get().artifactPinned)
    },
    syncArtifactViewerForConversation: (conversationId) => {
      const state = get()
      const nextTarget = resolveArtifactForConversationChange({
        artifactPinned: state.artifactPinned,
        currentTarget: state.artifactViewer.target,
        lastArtifactByConversation: state.lastArtifactByConversation,
        nextConversationId: conversationId,
      })
      const currentId = state.artifactViewer.target?.id ?? null
      const nextId = nextTarget?.id ?? null
      if (currentId === nextId) return

      if (nextTarget) {
        persist({
          artifactViewerTarget: nextTarget,
          rightPanelOpen: false,
          workAreaOpen: true,
        })
        set((s) => ({
          artifactViewer: { ...s.artifactViewer, target: nextTarget },
          rightPanel: { ...s.rightPanel, open: false },
          workAreaOpen: true,
        }))
        return
      }

      persist({ artifactViewerTarget: null })
      set((s) => ({ artifactViewer: { ...s.artifactViewer, target: null } }))
    },
  }
}

export function rememberOpenArtifact(
  map: Record<string, ShellArtifactViewerTarget>,
  conversationId: string | null | undefined,
  target: ShellArtifactViewerTarget,
): {
  target: ShellArtifactViewerTarget
  lastArtifactByConversation: Record<string, ShellArtifactViewerTarget>
} {
  const stamped = stampArtifactConversation(target, conversationId)
  const conversationKey =
    typeof stamped.conversationId === 'string' ? stamped.conversationId.trim() : ''
  if (!conversationKey) {
    return { target: stamped, lastArtifactByConversation: map }
  }
  return {
    target: stamped,
    lastArtifactByConversation: trimLastArtifactByConversation(
      upsertLastArtifactByConversation(map, conversationKey, stamped),
    ),
  }
}

export function forgetClosedArtifact(
  map: Record<string, ShellArtifactViewerTarget>,
  target: ShellArtifactViewerTarget | null,
  fallbackConversationId?: string | null,
): Record<string, ShellArtifactViewerTarget> {
  const conversationId = target?.conversationId ?? fallbackConversationId
  return removeLastArtifactByConversation(map, conversationId)
}
