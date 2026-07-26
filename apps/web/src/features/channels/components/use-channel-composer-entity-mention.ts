'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { Editor } from '@tiptap/react'
import type { ChannelMember } from '@/lib/channels'
import { buildMentionCandidates } from '../lib/mention-parser'
import { searchEntities, type EntitySearchResult } from '../services/entity-search.service'
import { ENTITY_MENTION_TAB_TYPES, type EntityMentionUiTab } from './TabbedEntityMentionMenu'

interface EntityMentionState {
  items: EntitySearchResult[]
  selectedIndex: number
  range: { from: number; to: number } | null
  query: string
  tab: EntityMentionUiTab
  loading: boolean
  hasMore: boolean
}

const EMPTY_ENTITY_MENTION: EntityMentionState = {
  items: [],
  selectedIndex: 0,
  range: null,
  query: '',
  tab: 'tasks',
  loading: false,
  hasMore: false,
}

const ENTITY_PAGE_SIZE = 15

const ENTITY_TAB_CYCLE: EntityMentionUiTab[] = [
  'people',
  'agents',
  'tasks',
  'docs',
  'channels',
  'spaces',
  'missions',
  'conversations',
]

function cycleEntityTab(current: EntityMentionUiTab, dir: -1 | 1): EntityMentionUiTab {
  const i = ENTITY_TAB_CYCLE.indexOf(current)
  const idx = i === -1 ? 0 : (i + dir + ENTITY_TAB_CYCLE.length) % ENTITY_TAB_CYCLE.length
  return ENTITY_TAB_CYCLE[idx]!
}

function buildEntityMentionPeopleItems(
  members: ChannelMember[],
  rosterAvatars?: Map<string, string>,
): EntitySearchResult[] {
  const seen = new Set<string>()
  return buildMentionCandidates(members, rosterAvatars).flatMap((candidate) => {
    const kind = candidate.type === 'agent' ? 'agent' : 'person'
    const id = candidate.type === 'agent' ? candidate.agent_key : candidate.user_id
    if (!id) return []
    const key = `${kind}:${id}`
    if (seen.has(key)) return []
    seen.add(key)
    return [
      {
        kind,
        id,
        label: candidate.label,
        subtitle: candidate.type === 'agent' ? 'Agent' : 'Person',
        iconUrl: candidate.avatarUrl ?? null,
        url: null,
        ...(candidate.type === 'user' ? { personKind: 'portal_user' as const } : {}),
      },
    ]
  })
}

function filterEntityMentionItems(
  items: EntitySearchResult[],
  query: string,
  limit: number,
  offset: number,
): { items: EntitySearchResult[]; hasMore: boolean } {
  const q = query.trim().toLowerCase()
  const filtered = q
    ? items.filter((item) => `${item.label} ${item.subtitle ?? ''}`.toLowerCase().includes(q))
    : items
  return {
    items: filtered.slice(offset, offset + limit),
    hasMore: offset + limit < filtered.length,
  }
}

export function useChannelComposerEntityMention({
  campaignId,
  rosterAvatars,
  entityMentionPeopleMembers,
  composerRootRef,
}: {
  campaignId?: string | null
  rosterAvatars?: Map<string, string>
  entityMentionPeopleMembers?: ChannelMember[]
  composerRootRef: RefObject<HTMLDivElement | null>
}) {
  const editorRef = useRef<Editor | null>(null)
  const [entityMention, setEntityMention] = useState<EntityMentionState>(EMPTY_ENTITY_MENTION)
  const [entityMentionPos, setEntityMentionPos] = useState({ top: 0, left: 0 })
  const [composerRect, setComposerRect] = useState({ left: 0, width: 0 })
  const entityMentionRef = useRef<HTMLDivElement>(null)
  const entityMentionStateRef = useRef<EntityMentionState>(EMPTY_ENTITY_MENTION)
  const insertEntityMentionRef = useRef((_: EntitySearchResult) => {})

  const entityMentionPeopleItems = useMemo(
    () =>
      entityMentionPeopleMembers
        ? buildEntityMentionPeopleItems(entityMentionPeopleMembers, rosterAvatars)
        : null,
    [entityMentionPeopleMembers, rosterAvatars],
  )
  const getLocalEntityMentionItems = useCallback(
    (query: string, tab: EntityMentionUiTab, offset: number) => {
      if ((tab !== 'people' && tab !== 'agents') || !entityMentionPeopleItems) return null
      const kind = tab === 'agents' ? 'agent' : 'person'
      return filterEntityMentionItems(
        entityMentionPeopleItems.filter((item) => item.kind === kind),
        query,
        ENTITY_PAGE_SIZE,
        offset,
      )
    },
    [entityMentionPeopleItems],
  )

  useEffect(() => {
    entityMentionStateRef.current = entityMention
  }, [entityMention])

  useEffect(() => {
    if (!entityMention.range || typeof window === 'undefined') return
    const measure = () => {
      const el = composerRootRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setComposerRect({ left: r.left, width: r.width })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [composerRootRef, entityMention.range])

  const setEntityMentionEditor = useCallback((editor: Editor | null) => {
    editorRef.current = editor
  }, [])

  const syncEntityMention = useCallback((ed: Editor) => {
    const { from } = ed.state.selection
    const before = ed.state.doc.textBetween(Math.max(0, from - 120), from, '\n', '\n')
    const atAt = before.lastIndexOf('@@')
    if (atAt === -1) {
      setEntityMention(EMPTY_ENTITY_MENTION)
      return
    }
    const query = before.slice(atAt + 2)
    if (/\s/.test(query) || query.length > 80) {
      setEntityMention(EMPTY_ENTITY_MENTION)
      return
    }
    const range = { from: from - query.length - 2, to: from }
    const rect = ed.view.coordsAtPos(from)
    setEntityMentionPos({ top: rect.top - 8, left: rect.left })
    setEntityMention((prev) => ({
      ...prev,
      query,
      range,
      selectedIndex: 0,
    }))
  }, [])

  useEffect(() => {
    if (!entityMention.range) return
    let cancelled = false
    const q = entityMention.query
    const tab = entityMention.tab
    const types = ENTITY_MENTION_TAB_TYPES[tab]
    setEntityMention((prev) =>
      prev.range && prev.query === q && prev.tab === tab ? { ...prev, loading: true } : prev,
    )
    const local = getLocalEntityMentionItems(q, tab, 0)
    if (local) {
      setEntityMention((prev) =>
        prev.range && prev.query === q && prev.tab === tab
          ? {
              ...prev,
              items: local.items,
              selectedIndex: 0,
              loading: false,
              hasMore: local.hasMore,
            }
          : prev,
      )
      return
    }
    const delay = q.length === 0 ? 0 : 120
    const timer = window.setTimeout(() => {
      searchEntities(q, {
        types,
        limit: ENTITY_PAGE_SIZE,
        offset: 0,
        campaignId,
      })
        .then((items) => {
          if (cancelled) return
          setEntityMention((prev) =>
            prev.range && prev.query === q && prev.tab === tab
              ? {
                  ...prev,
                  items,
                  selectedIndex: 0,
                  loading: false,
                  hasMore: items.length >= ENTITY_PAGE_SIZE,
                }
              : prev,
          )
        })
        .catch(() => {
          if (cancelled) return
          setEntityMention((prev) =>
            prev.range && prev.query === q && prev.tab === tab
              ? { ...prev, items: [], loading: false, hasMore: false }
              : prev,
          )
        })
    }, delay)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [
    entityMention.query,
    entityMention.range,
    entityMention.tab,
    campaignId,
    getLocalEntityMentionItems,
  ])

  const loadMoreEntities = useCallback(() => {
    const cur = entityMentionStateRef.current
    if (!cur.range || cur.loading || !cur.hasMore) return
    const q = cur.query
    const tab = cur.tab
    const offset = cur.items.length
    const types = ENTITY_MENTION_TAB_TYPES[tab]
    setEntityMention((prev) => ({ ...prev, loading: true }))
    const local = getLocalEntityMentionItems(q, tab, offset)
    if (local) {
      setEntityMention((prev) => {
        if (!prev.range || prev.query !== q || prev.tab !== tab) return prev
        const seen = new Set(prev.items.map((i) => `${i.kind}:${i.id}`))
        const merged = [
          ...prev.items,
          ...local.items.filter((item) => !seen.has(`${item.kind}:${item.id}`)),
        ]
        return {
          ...prev,
          items: merged,
          loading: false,
          hasMore: local.hasMore,
        }
      })
      return
    }
    searchEntities(q, { types, limit: ENTITY_PAGE_SIZE, offset, campaignId })
      .then((more) => {
        setEntityMention((prev) => {
          if (!prev.range || prev.query !== q || prev.tab !== tab) return prev
          const seen = new Set(prev.items.map((i) => `${i.kind}:${i.id}`))
          const merged = [...prev.items, ...more.filter((m) => !seen.has(`${m.kind}:${m.id}`))]
          return {
            ...prev,
            items: merged,
            loading: false,
            hasMore: more.length >= ENTITY_PAGE_SIZE,
          }
        })
      })
      .catch(() => {
        setEntityMention((prev) =>
          prev.range && prev.query === q && prev.tab === tab
            ? { ...prev, loading: false, hasMore: false }
            : prev,
        )
      })
  }, [campaignId, getLocalEntityMentionItems])

  const insertEntityMention = useCallback((item: EntitySearchResult) => {
    const editor = editorRef.current
    if (!editor) return
    const range = entityMentionStateRef.current.range
    if (!range) return
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertEntityChip({
        kind: item.kind,
        entityId: item.id,
        label: item.label,
        status: item.kind === 'task' ? (item.status ?? null) : null,
        statusColor: item.kind === 'task' ? (item.statusColor ?? null) : null,
        statusLabel: item.kind === 'task' ? (item.statusLabel ?? null) : null,
      })
      .run()
    setEntityMention(EMPTY_ENTITY_MENTION)
  }, [])

  useEffect(() => {
    insertEntityMentionRef.current = insertEntityMention
  }, [insertEntityMention])

  const handleEntityMentionKeyDown = useCallback((event: KeyboardEvent) => {
    const entityState = entityMentionStateRef.current
    if (!entityState.range) return false
    if (event.key === 'Escape') {
      setEntityMention(EMPTY_ENTITY_MENTION)
      event.stopPropagation()
      return true
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setEntityMention((prev) => ({
        ...prev,
        tab: cycleEntityTab(prev.tab, -1),
        selectedIndex: 0,
        items: [],
        loading: false,
        hasMore: false,
      }))
      return true
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setEntityMention((prev) => ({
        ...prev,
        tab: cycleEntityTab(prev.tab, 1),
        selectedIndex: 0,
        items: [],
        loading: false,
        hasMore: false,
      }))
      return true
    }
    if (entityState.items.length === 0) return false
    if (event.key === 'ArrowUp') {
      setEntityMention((prev) => ({
        ...prev,
        selectedIndex:
          prev.items.length === 0
            ? 0
            : (prev.selectedIndex - 1 + prev.items.length) % prev.items.length,
      }))
      return true
    }
    if (event.key === 'ArrowDown') {
      setEntityMention((prev) => ({
        ...prev,
        selectedIndex: prev.items.length === 0 ? 0 : (prev.selectedIndex + 1) % prev.items.length,
      }))
      return true
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      const item =
        entityState.items[Math.min(entityState.selectedIndex, entityState.items.length - 1)]
      if (item) insertEntityMentionRef.current(item)
      return true
    }
    return false
  }, [])

  const setEntityMentionTab = useCallback((tab: EntityMentionUiTab) => {
    setEntityMention((prev) => ({
      ...prev,
      tab,
      selectedIndex: 0,
      items: [],
      loading: false,
      hasMore: false,
    }))
  }, [])

  const setEntityMentionHoverIndex = useCallback((index: number) => {
    setEntityMention((prev) => ({ ...prev, selectedIndex: index }))
  }, [])

  return {
    entityMention,
    entityMentionRef,
    entityMentionPos,
    composerRect,
    setEntityMentionEditor,
    syncEntityMention,
    handleEntityMentionKeyDown,
    loadMoreEntities,
    insertEntityMention,
    setEntityMentionTab,
    setEntityMentionHoverIndex,
  }
}
