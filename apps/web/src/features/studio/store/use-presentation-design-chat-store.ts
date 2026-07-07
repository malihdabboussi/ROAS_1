'use client'

import { toast } from 'sonner'
import { create } from 'zustand'
import { savePresentationFile } from '../services/artifact-preview.service'
import type { PresentationBundle, PresentationElementTrace } from '../types'

type PresentationDesignSession = {
  presentationId: string
  presentationName: string
}

type PresentationDesignHistoryEntry = {
  path: string
  content: string
  domPath: string | null
  undoStyles: Record<string, string> | null
  redoStyles: Record<string, string> | null
}

const MAX_HISTORY = 50
/** Rapid undo/redo bursts collapse into one save per file. */
const HISTORY_PERSIST_DEBOUNCE_MS = 400

const historyPersistTimers: Record<string, ReturnType<typeof setTimeout>> = {}

export type PresentationDesignSaveOptions = {
  domPath?: string | null
  undoStyles?: Record<string, string> | null
  redoStyles?: Record<string, string> | null
}

interface PresentationDesignChatState {
  session: PresentationDesignSession | null
  designChatActive: boolean
  bundle: PresentationBundle | null
  selectedTrace: PresentationElementTrace | null
  undoStack: PresentationDesignHistoryEntry[]
  redoStack: PresentationDesignHistoryEntry[]
  registerSession: (session: PresentationDesignSession) => void
  clearSession: () => void
  setDesignChatActive: (active: boolean) => void
  setBundle: (bundle: PresentationBundle | null) => void
  setSelectedTrace: (trace: PresentationElementTrace | null) => void
  saveFile: (path: string, content: string, options?: PresentationDesignSaveOptions) => void
  undo: () => void
  redo: () => void
}

function dispatchLiveStyleUpdate(
  presentationId: string,
  entry: Pick<PresentationDesignHistoryEntry, 'domPath'>,
  styles: Record<string, string> | null,
) {
  if (!styles || Object.keys(styles).length === 0) return
  window.dispatchEvent(
    new CustomEvent('presentation-editor:apply-live-styles', {
      detail: {
        presentationId,
        domPath: entry.domPath,
        styles,
      },
    }),
  )
}

/** Local bundle content is authoritative; the network catches up in the background. */
function setBundleFileContent(path: string, content: string) {
  usePresentationDesignChatStore.setState((state) =>
    state.bundle
      ? {
          bundle: {
            ...state.bundle,
            files: state.bundle.files.map((item) =>
              item.path === path ? { ...item, content } : item,
            ),
          },
        }
      : state,
  )
}

/** Adopt the server copy only if no newer local content landed while the save was in flight. */
function adoptServerFile(
  path: string,
  sentContent: string,
  saved: PresentationBundle['files'][number],
) {
  usePresentationDesignChatStore.setState((state) =>
    state.bundle
      ? {
          bundle: {
            ...state.bundle,
            files: state.bundle.files.map((item) =>
              item.path === path && item.content === sentContent ? saved : item,
            ),
          },
        }
      : state,
  )
}

function persistPresentationFile(
  path: string,
  content: string,
  options: { recordHistory: boolean } & PresentationDesignSaveOptions,
) {
  const session = usePresentationDesignChatStore.getState().session
  if (!session) return

  const bundle = usePresentationDesignChatStore.getState().bundle
  const currentFile = bundle?.files.find((file) => file.path === path)
  if (options.recordHistory && currentFile && currentFile.content !== content) {
    usePresentationDesignChatStore.setState((state) => ({
      undoStack: [
        ...state.undoStack,
        {
          path,
          content: currentFile.content,
          domPath: options.domPath ?? null,
          undoStyles: options.undoStyles ?? null,
          redoStyles: options.redoStyles ?? null,
        },
      ].slice(-MAX_HISTORY),
      redoStack: [],
    }))
  }

  setBundleFileContent(path, content)
  void savePresentationFile(session.presentationId, path, content)
    .then((file) => {
      adoptServerFile(path, content, file)
    })
    .catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Could not save edit')
    })
}

function queueHistoryPersist(path: string) {
  const existing = historyPersistTimers[path]
  if (existing) clearTimeout(existing)
  historyPersistTimers[path] = setTimeout(() => {
    delete historyPersistTimers[path]
    const { session, bundle } = usePresentationDesignChatStore.getState()
    if (!session) return
    const file = bundle?.files.find((item) => item.path === path)
    if (!file) return
    void savePresentationFile(session.presentationId, path, file.content)
      .then((saved) => {
        adoptServerFile(path, file.content, saved)
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Could not save edit')
      })
  }, HISTORY_PERSIST_DEBOUNCE_MS)
}

export const usePresentationDesignChatStore = create<PresentationDesignChatState>()((set, get) => ({
  session: null,
  designChatActive: false,
  bundle: null,
  selectedTrace: null,
  undoStack: [],
  redoStack: [],

  registerSession: (session) =>
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
    persistPresentationFile(path, content, {
      recordHistory: true,
      ...options,
    })
  },

  undo: () => {
    const { session, undoStack, bundle } = get()
    const entry = undoStack.at(-1)
    if (!entry || !session) return
    const currentFile = bundle?.files.find((file) => file.path === entry.path)
    if (!currentFile) return

    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [
        ...state.redoStack,
        {
          path: entry.path,
          content: currentFile.content,
          domPath: entry.domPath,
          undoStyles: entry.undoStyles,
          redoStyles: entry.redoStyles,
        },
      ].slice(-MAX_HISTORY),
    }))
    dispatchLiveStyleUpdate(session.presentationId, entry, entry.undoStyles)
    setBundleFileContent(entry.path, entry.content)
    queueHistoryPersist(entry.path)
  },

  redo: () => {
    const { session, redoStack, bundle } = get()
    const entry = redoStack.at(-1)
    if (!entry || !session) return
    const currentFile = bundle?.files.find((file) => file.path === entry.path)
    if (!currentFile) return

    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [
        ...state.undoStack,
        {
          path: entry.path,
          content: currentFile.content,
          domPath: entry.domPath,
          undoStyles: entry.undoStyles,
          redoStyles: entry.redoStyles,
        },
      ].slice(-MAX_HISTORY),
    }))
    dispatchLiveStyleUpdate(session.presentationId, entry, entry.redoStyles)
    setBundleFileContent(entry.path, entry.content)
    queueHistoryPersist(entry.path)
  },
}))
