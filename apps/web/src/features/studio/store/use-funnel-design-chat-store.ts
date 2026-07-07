'use client'

import { toast } from 'sonner'
import { create } from 'zustand'
import { saveFunnelFile, type FunnelPageBundle } from '../services/artifact-preview.service'
import type { FunnelElementTrace } from '../types'

type FunnelDesignSession = {
  funnelId: string
  funnelName: string
}

type FunnelDesignHistoryEntry = {
  path: string
  content: string
  funnelPageId: string | null
  domPath: string | null
  undoStyles: Record<string, string> | null
  redoStyles: Record<string, string> | null
}

const MAX_HISTORY = 50
/** Rapid undo/redo bursts collapse into one save per file. */
const HISTORY_PERSIST_DEBOUNCE_MS = 400

const historyPersistTimers: Record<string, ReturnType<typeof setTimeout>> = {}

export type FunnelDesignSaveOptions = {
  funnelPageId?: string | null
  domPath?: string | null
  undoStyles?: Record<string, string> | null
  redoStyles?: Record<string, string> | null
}

interface FunnelDesignChatState {
  session: FunnelDesignSession | null
  designChatActive: boolean
  bundle: FunnelPageBundle | null
  selectedTrace: FunnelElementTrace | null
  undoStack: FunnelDesignHistoryEntry[]
  redoStack: FunnelDesignHistoryEntry[]
  registerSession: (session: FunnelDesignSession) => void
  clearSession: () => void
  setDesignChatActive: (active: boolean) => void
  setBundle: (bundle: FunnelPageBundle | null) => void
  setSelectedTrace: (trace: FunnelElementTrace | null) => void
  saveFile: (path: string, content: string, options?: FunnelDesignSaveOptions) => void
  undo: () => void
  redo: () => void
}

function dispatchLiveStyleUpdate(
  funnelId: string,
  entry: Pick<FunnelDesignHistoryEntry, 'domPath'>,
  styles: Record<string, string> | null,
) {
  if (!styles || Object.keys(styles).length === 0) return
  window.dispatchEvent(
    new CustomEvent('funnel-editor:apply-live-styles', {
      detail: {
        funnelId,
        domPath: entry.domPath,
        styles,
      },
    }),
  )
}

function updateBundleFile(
  bundle: FunnelPageBundle,
  path: string,
  file: { path: string; content: string },
): FunnelPageBundle {
  const inPage = bundle.files.some((item) => item.path === path)
  if (inPage) {
    return {
      ...bundle,
      files: bundle.files.map((item) => (item.path === path ? { ...item, ...file } : item)),
    }
  }
  return {
    ...bundle,
    shared_files: bundle.shared_files.map((item) =>
      item.path === path ? { ...item, ...file } : item,
    ),
  }
}

function findBundleFile(bundle: FunnelPageBundle | null, path: string) {
  return (
    [...(bundle?.files ?? []), ...(bundle?.shared_files ?? [])].find(
      (file) => file.path === path,
    ) ?? null
  )
}

/** Local bundle content is authoritative; the network catches up in the background. */
function setBundleFileContent(path: string, content: string) {
  useFunnelDesignChatStore.setState((state) =>
    state.bundle ? { bundle: updateBundleFile(state.bundle, path, { path, content }) } : state,
  )
}

/** Adopt the server copy only if no newer local content landed while the save was in flight. */
function adoptServerFile(
  path: string,
  sentContent: string,
  saved: { path: string; content: string },
) {
  useFunnelDesignChatStore.setState((state) => {
    if (!state.bundle) return state
    const current = findBundleFile(state.bundle, path)
    if (!current || current.content !== sentContent) return state
    return { bundle: updateBundleFile(state.bundle, path, saved) }
  })
}

function persistFunnelFile(
  path: string,
  content: string,
  options: { recordHistory: boolean } & FunnelDesignSaveOptions,
) {
  const session = useFunnelDesignChatStore.getState().session
  if (!session) return

  const bundle = useFunnelDesignChatStore.getState().bundle
  const currentFile = findBundleFile(bundle, path)
  if (options.recordHistory && currentFile && currentFile.content !== content) {
    useFunnelDesignChatStore.setState((state) => ({
      undoStack: [
        ...state.undoStack,
        {
          path,
          content: currentFile.content,
          funnelPageId: currentFile.funnel_page_id,
          domPath: options.domPath ?? null,
          undoStyles: options.undoStyles ?? null,
          redoStyles: options.redoStyles ?? null,
        },
      ].slice(-MAX_HISTORY),
      redoStack: [],
    }))
  }

  setBundleFileContent(path, content)
  void saveFunnelFile(session.funnelId, path, content, {
    funnelPageId: options.funnelPageId ?? currentFile?.funnel_page_id ?? undefined,
  })
    .then((file) => {
      adoptServerFile(path, content, file)
    })
    .catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Could not save edit')
    })
}

function queueHistoryPersist(path: string, funnelPageId: string | null) {
  const existing = historyPersistTimers[path]
  if (existing) clearTimeout(existing)
  historyPersistTimers[path] = setTimeout(() => {
    delete historyPersistTimers[path]
    const { session, bundle } = useFunnelDesignChatStore.getState()
    if (!session) return
    const file = findBundleFile(bundle, path)
    if (!file) return
    void saveFunnelFile(session.funnelId, path, file.content, {
      funnelPageId: file.funnel_page_id ?? funnelPageId ?? undefined,
    })
      .then((saved) => {
        adoptServerFile(path, file.content, saved)
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Could not save edit')
      })
  }, HISTORY_PERSIST_DEBOUNCE_MS)
}

export const useFunnelDesignChatStore = create<FunnelDesignChatState>()((set, get) => ({
  session: null,
  designChatActive: false,
  bundle: null,
  selectedTrace: null,
  undoStack: [],
  redoStack: [],

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
        bundle: null,
        selectedTrace: null,
        designChatActive: false,
        undoStack: [],
        redoStack: [],
      }
    }),

  clearSession: () =>
    set({
      session: null,
      bundle: null,
      selectedTrace: null,
      designChatActive: false,
      undoStack: [],
      redoStack: [],
    }),

  setDesignChatActive: (active) => set({ designChatActive: active }),

  setBundle: (bundle) => set({ bundle }),

  setSelectedTrace: (trace) => set({ selectedTrace: trace }),

  saveFile: (path, content, options) => {
    persistFunnelFile(path, content, {
      recordHistory: true,
      ...options,
    })
  },

  undo: () => {
    const { session, undoStack, bundle } = get()
    const entry = undoStack.at(-1)
    if (!entry || !session) return
    const currentFile = findBundleFile(bundle, entry.path)
    if (!currentFile) return

    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [
        ...state.redoStack,
        {
          path: entry.path,
          content: currentFile.content,
          funnelPageId: entry.funnelPageId,
          domPath: entry.domPath,
          undoStyles: entry.undoStyles,
          redoStyles: entry.redoStyles,
        },
      ].slice(-MAX_HISTORY),
    }))
    dispatchLiveStyleUpdate(session.funnelId, entry, entry.undoStyles)
    setBundleFileContent(entry.path, entry.content)
    queueHistoryPersist(entry.path, entry.funnelPageId)
  },

  redo: () => {
    const { session, redoStack, bundle } = get()
    const entry = redoStack.at(-1)
    if (!entry || !session) return
    const currentFile = findBundleFile(bundle, entry.path)
    if (!currentFile) return

    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [
        ...state.undoStack,
        {
          path: entry.path,
          content: currentFile.content,
          funnelPageId: entry.funnelPageId,
          domPath: entry.domPath,
          undoStyles: entry.undoStyles,
          redoStyles: entry.redoStyles,
        },
      ].slice(-MAX_HISTORY),
    }))
    dispatchLiveStyleUpdate(session.funnelId, entry, entry.redoStyles)
    setBundleFileContent(entry.path, entry.content)
    queueHistoryPersist(entry.path, entry.funnelPageId)
  },
}))
