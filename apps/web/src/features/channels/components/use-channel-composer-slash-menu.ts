'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { AtSign, Bot, Puzzle, Square } from 'lucide-react'
import type { SlashItem, SlashItemSection } from './slash-command-types'
import type { SlashSkillEntry } from './use-channel-composer-slash-skills'

export interface ChannelComposerCommandContext {
  kind: 'task'
  onRunAgent?: () => void
  onAssignToMe?: () => void
  onSetStatus?: (status: string) => void
}

export interface SlashState {
  items: SlashItem[]
  selectedIndex: number
  range: { from: number; to: number } | null
  query: string
  section: SlashItemSection
  availableSections: SlashItemSection[]
}

const ALL_SLASH_SECTIONS: SlashItemSection[] = ['actions', 'skills']

const EMPTY_SLASH: SlashState = {
  items: [],
  selectedIndex: 0,
  range: null,
  query: '',
  section: 'actions',
  availableSections: ['actions'],
}

export function useChannelComposerSlashMenu({
  commandContext,
  slashSkillItems,
}: {
  commandContext?: ChannelComposerCommandContext
  slashSkillItems: SlashSkillEntry[]
}) {
  const [slash, setSlash] = useState<SlashState>(EMPTY_SLASH)
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 })
  const slashRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const slashStateRef = useRef<SlashState>(EMPTY_SLASH)
  const runSlashItemRef = useRef((_: SlashItem) => {})

  useEffect(() => {
    slashStateRef.current = slash
  }, [slash])

  const setSlashEditor = useCallback((editor: Editor | null) => {
    editorRef.current = editor
  }, [])

  const buildSlashItems = useCallback((): SlashItem[] => {
    const editor = editorRef.current
    if (!editor) return []
    return [
      ...(commandContext?.kind === 'task' && commandContext.onRunAgent
        ? [
            {
              id: 'task-run-agent',
              label: 'Send task to agent',
              section: 'actions' as const,
              keywords: ['agent', 'ai', 'run'],
              icon: Bot,
              run: commandContext.onRunAgent,
            },
          ]
        : []),
      ...(commandContext?.kind === 'task' && commandContext.onAssignToMe
        ? [
            {
              id: 'task-assign-me',
              label: 'Assign to me',
              section: 'actions' as const,
              keywords: ['assign', 'me', 'owner'],
              icon: AtSign,
              run: commandContext.onAssignToMe,
            },
          ]
        : []),
      ...(commandContext?.kind === 'task' && commandContext.onSetStatus
        ? [
            {
              id: 'task-status-todo',
              label: 'Set status: To Do',
              section: 'actions' as const,
              keywords: ['status', 'todo', 'open'],
              icon: Square,
              run: () => commandContext.onSetStatus?.('todo'),
            },
            {
              id: 'task-status-progress',
              label: 'Set status: In Progress',
              section: 'actions' as const,
              keywords: ['status', 'progress', 'live'],
              icon: Square,
              run: () => commandContext.onSetStatus?.('in_progress'),
            },
            {
              id: 'task-status-review',
              label: 'Set status: In Review',
              section: 'actions' as const,
              keywords: ['status', 'review'],
              icon: Square,
              run: () => commandContext.onSetStatus?.('in_review'),
            },
            {
              id: 'task-status-done',
              label: 'Set status: Done',
              section: 'actions' as const,
              keywords: ['status', 'done', 'close', 'complete'],
              icon: Square,
              run: () => commandContext.onSetStatus?.('done'),
            },
          ]
        : []),
      ...slashSkillItems.map((skill) => ({
        id: skill.id,
        label: `/${skill.key}`,
        section: 'skills' as const,
        keywords: [
          skill.key.toLowerCase(),
          skill.name.toLowerCase(),
          skill.description.toLowerCase(),
        ].filter(Boolean),
        icon: Puzzle,
        run: () => {},
        insertText: `/${skill.key} `,
        description: skill.description,
      })),
    ]
  }, [commandContext, slashSkillItems])

  const syncSlashMenu = useCallback(
    (editor: Editor) => {
      const { from } = editor.state.selection
      const before = editor.state.doc.textBetween(Math.max(0, from - 80), from, '\n', '\n')
      const slashIndex = before.lastIndexOf('/')
      if (slashIndex === -1) {
        setSlash(EMPTY_SLASH)
        return
      }
      const beforeSlash = slashIndex > 0 ? (before[slashIndex - 1] ?? ' ') : ' '
      if (!/\s/.test(beforeSlash) && beforeSlash !== '\n') {
        setSlash(EMPTY_SLASH)
        return
      }
      const query = before.slice(slashIndex + 1)
      if (/\s/.test(query) || query.length > 50) {
        setSlash(EMPTY_SLASH)
        return
      }
      const all = buildSlashItems()
      const availableSections = ALL_SLASH_SECTIONS.filter((section) =>
        all.some((item) => item.section === section),
      )
      const q = query.toLowerCase()
      const items = all.filter(
        (item) =>
          !q ||
          item.label.toLowerCase().includes(q) ||
          item.keywords.some((keyword) => keyword.includes(q)),
      )
      const matchingSections = ALL_SLASH_SECTIONS.filter((section) =>
        items.some((item) => item.section === section),
      )
      const rect = editor.view.coordsAtPos(from)
      setSlashPos({ top: rect.top - 8, left: rect.left })
      setSlash((prev) => {
        const wasClosed = prev.range === null
        let section: SlashItemSection = prev.section
        if (wasClosed || !matchingSections.includes(section)) {
          section = matchingSections[0] ?? availableSections[0] ?? 'actions'
        }
        if (!availableSections.includes(section)) section = availableSections[0] ?? 'actions'
        return {
          items,
          selectedIndex: 0,
          range: { from: from - query.length - 1, to: from },
          query,
          section,
          availableSections,
        }
      })
    },
    [buildSlashItems],
  )

  const runSlashItem = useCallback((item: SlashItem) => {
    const editor = editorRef.current
    if (!editor) return
    const range = slashStateRef.current.range
    if (item.insertText) {
      const chain = editor.chain().focus()
      if (range) chain.deleteRange(range)
      chain.insertContent(item.insertText).run()
      setSlash(EMPTY_SLASH)
      return
    }
    if (range) editor.chain().focus().deleteRange(range).run()
    setSlash(EMPTY_SLASH)
    item.run()
  }, [])

  useEffect(() => {
    runSlashItemRef.current = runSlashItem
  }, [runSlashItem])

  const handleSlashKeyDown = useCallback((event: KeyboardEvent) => {
    const slashState = slashStateRef.current
    if (!slashState.range) return false
    const visible = slashState.items.filter((item) => item.section === slashState.section)
    const tabs = slashState.availableSections
    const tabPos = Math.max(0, tabs.indexOf(slashState.section))

    if (event.key === 'Escape') {
      setSlash(EMPTY_SLASH)
      event.stopPropagation()
      return true
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      if (tabs.length === 0) return true
      const nextSection = tabs[(tabPos - 1 + tabs.length) % tabs.length]!
      setSlash((prev) => ({ ...prev, section: nextSection, selectedIndex: 0 }))
      return true
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      if (tabs.length === 0) return true
      const nextSection = tabs[(tabPos + 1) % tabs.length]!
      setSlash((prev) => ({ ...prev, section: nextSection, selectedIndex: 0 }))
      return true
    }
    if (event.key === 'ArrowUp' && visible.length > 0) {
      setSlash((prev) => {
        const nextVisible = prev.items.filter((item) => item.section === prev.section)
        return {
          ...prev,
          selectedIndex:
            nextVisible.length === 0
              ? 0
              : (prev.selectedIndex - 1 + nextVisible.length) % nextVisible.length,
        }
      })
      return true
    }
    if (event.key === 'ArrowDown' && visible.length > 0) {
      setSlash((prev) => {
        const nextVisible = prev.items.filter((item) => item.section === prev.section)
        return {
          ...prev,
          selectedIndex:
            nextVisible.length === 0 ? 0 : (prev.selectedIndex + 1) % nextVisible.length,
        }
      })
      return true
    }
    if ((event.key === 'Enter' || event.key === 'Tab') && visible.length > 0) {
      event.preventDefault()
      const item = visible[Math.min(slashState.selectedIndex, visible.length - 1)] ?? visible[0]
      if (item) runSlashItemRef.current(item)
      return true
    }
    return false
  }, [])

  const setSlashSection = useCallback((section: SlashItemSection) => {
    setSlash((prev) => ({ ...prev, section, selectedIndex: 0 }))
  }, [])

  const setSlashHoverIndex = useCallback((index: number) => {
    setSlash((prev) => ({ ...prev, selectedIndex: index }))
  }, [])

  const refreshSlashMenu = useCallback(
    (editor: Editor | null) => {
      if (!editor || !slashStateRef.current.range) return
      syncSlashMenu(editor)
    },
    [syncSlashMenu],
  )

  return {
    slash,
    slashRef,
    slashPos,
    setSlashEditor,
    syncSlashMenu,
    refreshSlashMenu,
    handleSlashKeyDown,
    runSlashItem,
    setSlashSection,
    setSlashHoverIndex,
  }
}
