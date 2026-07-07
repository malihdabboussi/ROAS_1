'use client'

import type { ComponentType, ReactNode } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Bot,
  Building,
  ClipboardList,
  Layers,
  Mail,
  MessageSquare,
  Plus,
  Search,
  SquareKanban,
  Telescope,
  User,
  Video,
  Webhook,
  X,
} from 'lucide-react'
import {
  getAtTokenAtCursor,
  getTextareaCaretViewportRect,
} from '@/features/studio/utils/textarea-caret-viewport'
import type { AutomationAction, AutomationTrigger, FieldDef } from '../../types/space-schema'
import { buildTemplateVarMenuGroups, type TemplateVarMenuGroup } from './automation-catalog'
import { PromptTemplateVarMenu } from './PromptTemplateVarMenu'

export type TokenSourceKey =
  | 'gmail'
  | 'outlook'
  | 'email'
  | 'slack'
  | 'fathom'
  | 'form'
  | 'contact'
  | 'task'
  | 'artifact'
  | 'social_research'
  | 'space'
  | 'mission'
  | 'webhook'

const SOURCE_ICON_MAP: Record<TokenSourceKey, ComponentType<{ className?: string }>> = {
  gmail: Mail,
  outlook: Mail,
  email: Mail,
  slack: MessageSquare,
  fathom: Video,
  form: ClipboardList,
  contact: User,
  task: SquareKanban,
  artifact: Layers,
  social_research: Telescope,
  space: Building,
  mission: Bot,
  webhook: Webhook,
}

function tokenSourceIcon(source?: TokenSourceKey): ComponentType<{ className?: string }> | null {
  if (!source) return null
  return SOURCE_ICON_MAP[source] ?? null
}

export type TokenKind =
  | 'email'
  | 'name'
  | 'title'
  | 'message'
  | 'date'
  | 'status'
  | 'priority'
  | 'phone'
  | 'tag'
  | 'id'

export interface VarItem {
  token: string
  label: string
  /** Plain-language hint, truncated in the menu */
  detail: string
  /** Field types this token can fill. When omitted the token is hidden when a tokenKind is set. */
  kinds?: TokenKind[]
  /** Source icon shown in the menu and in inserted chips. */
  source?: TokenSourceKey
}

interface PromptTemplateEditorProps {
  value: string
  onChange: (v: string) => void
  fields: FieldDef[]
  placeholder?: string
  extraVars?: VarItem[]
  rows?: number
  includeSystemVars?: boolean
  /** Limits the data picker menu to tokens whose kinds match this field. */
  tokenKind?: TokenKind
  /** When set, the insert menu groups variables by trigger step and prior flow steps. */
  stepContext?: {
    trigger: AutomationTrigger
    actions: AutomationAction[]
    beforeIndex: number
  }
}

interface TemplateSegment {
  kind: 'text' | 'token'
  raw: string
  display: string
  token?: string
  rawStart: number
  rawEnd: number
  displayStart: number
  displayEnd: number
}

interface TemplateView {
  display: string
  segments: TemplateSegment[]
}

function labelMenuText(label: string): string {
  const t = label.trim()
  if (!t) return t
  return t.charAt(0).toUpperCase() + t.slice(1)
}

const SYSTEM_VARS: VarItem[] = [
  {
    token: 'task.title',
    label: 'Title',
    detail: 'The task name shown in the list',
    kinds: ['title', 'message'],
    source: 'task',
  },
  {
    token: 'task.status',
    label: 'Status',
    detail: 'Current status (To do, In progress, …)',
    kinds: ['status', 'message'],
    source: 'task',
  },
  {
    token: 'task.priority',
    label: 'Priority',
    detail: 'Priority on this row',
    kinds: ['priority', 'message'],
    source: 'task',
  },
  {
    token: 'task.assignee',
    label: 'Assignee',
    detail: 'Who is assigned (name or agent)',
    kinds: ['name', 'message'],
    source: 'task',
  },
  {
    token: 'task.due_date',
    label: 'Due date',
    detail: 'Due date field value',
    kinds: ['date', 'message'],
    source: 'task',
  },
  {
    token: 'task.description',
    label: 'Description',
    detail: 'Body text from the task detail panel (notes)',
    kinds: ['message'],
    source: 'task',
  },
  {
    token: 'task.subtasks',
    label: 'Subtasks',
    detail: 'Subtasks list when the rule runs',
    kinds: ['message'],
    source: 'task',
  },
  {
    token: 'task.deliverables',
    label: 'Deliverables',
    detail: 'Files linked to this task',
    kinds: ['message'],
    source: 'task',
  },
  {
    token: 'task.activity',
    label: 'Activity',
    detail: 'Recent comments and activity',
    kinds: ['message'],
    source: 'task',
  },
  {
    token: 'space.title',
    label: 'Space name',
    detail: 'Name of this space',
    kinds: ['title', 'message'],
    source: 'space',
  },
  {
    token: 'mission.output',
    label: 'Mission output',
    detail: 'Agent output from the linked mission',
    kinds: ['message'],
    source: 'mission',
  },
  {
    token: 'mission.deliverables',
    label: 'Mission files',
    detail: 'Deliverables from the linked mission',
    kinds: ['message'],
    source: 'mission',
  },
]

function customFieldKinds(type: FieldDef['type']): TokenKind[] {
  switch (type) {
    case 'email':
      return ['email', 'message']
    case 'phone':
      return ['phone', 'message']
    case 'date':
      return ['date', 'message']
    default:
      return ['message']
  }
}

function buildVarList(fields: FieldDef[]): VarItem[] {
  const customFields = fields.filter((f) => !f.system && f.id !== 'title')
  return [
    ...SYSTEM_VARS,
    ...customFields.map<VarItem>((f) => ({
      token: `task.custom.${f.id}`,
      label: f.name,
      detail: `Custom field “${f.name}” on this row`,
      kinds: customFieldKinds(f.type),
      source: 'task',
    })),
  ]
}

function matchesKind(item: VarItem, tokenKind?: TokenKind): boolean {
  if (!tokenKind) return true
  if (!item.kinds || item.kinds.length === 0) return false
  return item.kinds.includes(tokenKind)
}

function matchesQuery(item: VarItem, q: string): boolean {
  if (!q) return true
  const s = q.toLowerCase()
  return (
    item.label.toLowerCase().includes(s) ||
    item.token.toLowerCase().includes(s) ||
    item.detail.toLowerCase().includes(s)
  )
}

/** Maps task template tokens to Space field ids for display labels. */
const TASK_TOKEN_FIELD_IDS: Record<string, string> = {
  'task.title': 'title',
  'task.status': 'status',
  'task.priority': 'priority',
  'task.assignee': 'assignee',
  'task.due_date': 'due_date',
  'task.description': 'notes',
}

function taskTokenDisplayLabel(token: string, fields: FieldDef[], mapped?: VarItem): string | null {
  if (!token.startsWith('task.')) return null

  const fieldId = token.startsWith('task.custom.')
    ? token.slice('task.custom.'.length)
    : TASK_TOKEN_FIELD_IDS[token]

  if (fieldId) {
    const field = fields.find((item) => item.id === fieldId)
    if (field?.name) return `Task ${field.name}`
  }

  if (mapped?.label) return `Task ${mapped.label}`
  return null
}

const STEP_TOKEN_RE = /^steps\.(\d+)\.(.+)$/

function normalizeStepTokenLookup(token: string): string[] {
  const match = token.match(STEP_TOKEN_RE)
  if (!match) return [token]
  const index = Number(match[1])
  const field = match[2]
  if (index === 0) return [token, `steps.1.${field}`]
  return [token]
}

function stepTokenDisplayLabel(token: string, vars: VarItem[]): string | null {
  const match = token.match(STEP_TOKEN_RE)
  if (!match) return null
  const rawIndex = Number(match[1] ?? 0)
  const field = (match[2] ?? '').replace(/_/g, ' ')
  const stepNum = rawIndex === 0 ? 1 : rawIndex
  for (const candidate of normalizeStepTokenLookup(token)) {
    const mapped = vars.find((item) => item.token === candidate)
    if (mapped) return mapped.label
  }
  return `Step ${stepNum} ${field}`
}

function previewForInsertedToken(inner: string, fields: FieldDef[], vars: VarItem[]): string {
  const k = inner.trim()
  const mapped = vars.find((v) => v.token === k)
  const taskLabel = taskTokenDisplayLabel(k, fields, mapped)
  if (taskLabel) return taskLabel
  const stepLabel = stepTokenDisplayLabel(k, vars)
  if (stepLabel) return stepLabel
  if (mapped) return mapped.label
  return k
}

function buildTemplateView(value: string, fields: FieldDef[], vars: VarItem[]): TemplateView {
  const re = /\{\{([^}]*)\}\}/g
  const segments: TemplateSegment[] = []
  let rawLast = 0
  let displayCursor = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(value)) !== null) {
    if (m.index > rawLast) {
      const rawText = value.slice(rawLast, m.index)
      segments.push({
        kind: 'text',
        raw: rawText,
        display: rawText,
        rawStart: rawLast,
        rawEnd: m.index,
        displayStart: displayCursor,
        displayEnd: displayCursor + rawText.length,
      })
      displayCursor += rawText.length
    }
    const raw = m[0]
    const inner = (m[1] ?? '').trim()
    const display = inner ? previewForInsertedToken(inner, fields, vars) : raw
    const rawEnd = m.index + m[0].length
    segments.push({
      kind: 'token',
      token: inner || undefined,
      raw,
      display,
      rawStart: m.index,
      rawEnd,
      displayStart: displayCursor,
      displayEnd: displayCursor + display.length,
    })
    displayCursor += display.length
    rawLast = rawEnd
  }
  if (rawLast < value.length) {
    const rawText = value.slice(rawLast)
    segments.push({
      kind: 'text',
      raw: rawText,
      display: rawText,
      rawStart: rawLast,
      rawEnd: value.length,
      displayStart: displayCursor,
      displayEnd: displayCursor + rawText.length,
    })
    displayCursor += rawText.length
  }
  return {
    display: segments.map((s) => s.display).join(''),
    segments,
  }
}

function buildHighlightNodes(segments: TemplateSegment[]): ReactNode {
  const parts: ReactNode[] = []
  let key = 0
  for (const segment of segments) {
    if (segment.kind === 'text') {
      parts.push(<span key={`t-${key++}`}>{segment.display}</span>)
      continue
    }
    parts.push(
      <span
        key={`v-${key++}`}
        className="prompt-token-chip"
        title={segment.token ? `Runs as: ${segment.display}` : undefined}
      >
        {segment.display}
      </span>,
    )
  }
  return parts.length > 0 ? parts : null
}

function mapDisplayIndexToRaw(
  segments: TemplateSegment[],
  displayIndex: number,
  affinity: 'start' | 'end',
): number {
  const idx = Math.max(0, displayIndex)
  const last = segments[segments.length - 1]
  if (!last) return 0
  if (idx >= last.displayEnd) return last.rawEnd

  for (const segment of segments) {
    if (idx < segment.displayStart) return segment.rawStart
    if (idx > segment.displayEnd) continue

    if (segment.kind === 'text') {
      return (
        segment.rawStart + Math.min(segment.raw.length, Math.max(0, idx - segment.displayStart))
      )
    }
    if (idx === segment.displayStart) return segment.rawStart
    if (idx === segment.displayEnd) return segment.rawEnd
    return affinity === 'end' ? segment.rawEnd : segment.rawStart
  }
  return last.rawEnd
}

function applyDisplayEditToRaw(
  rawValue: string,
  oldDisplay: string,
  nextDisplay: string,
  view: TemplateView,
): string {
  if (oldDisplay === nextDisplay) return rawValue

  let prefix = 0
  const maxPrefix = Math.min(oldDisplay.length, nextDisplay.length)
  while (prefix < maxPrefix && oldDisplay[prefix] === nextDisplay[prefix]) {
    prefix += 1
  }

  let suffix = 0
  const maxSuffix = Math.min(oldDisplay.length - prefix, nextDisplay.length - prefix)
  while (
    suffix < maxSuffix &&
    oldDisplay[oldDisplay.length - 1 - suffix] === nextDisplay[nextDisplay.length - 1 - suffix]
  ) {
    suffix += 1
  }

  const oldEnd = oldDisplay.length - suffix
  const nextEnd = nextDisplay.length - suffix
  const insertRaw = nextDisplay.slice(prefix, nextEnd)
  const rawStart = mapDisplayIndexToRaw(view.segments, prefix, 'start')
  const rawEnd = mapDisplayIndexToRaw(view.segments, oldEnd, 'end')
  return rawValue.slice(0, rawStart) + insertRaw + rawValue.slice(rawEnd)
}

export function PromptTemplateEditor({
  value,
  onChange,
  fields,
  placeholder,
  extraVars = [],
  rows = 4,
  includeSystemVars = true,
  tokenKind,
  stepContext,
}: PromptTemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuSearchInputRef = useRef<HTMLInputElement>(null)
  const insertButtonRef = useRef<HTMLButtonElement>(null)
  const [caret, setCaret] = useState(0)
  const activeIndexRef = useRef(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [manualMenuOpen, setManualMenuOpen] = useState(false)
  const [menuSearchQuery, setMenuSearchQuery] = useState('')

  const dynamicVars = useMemo(() => extraVars, [extraVars])
  const internalVars = useMemo(
    () => (includeSystemVars ? buildVarList(fields) : []),
    [fields, includeSystemVars],
  )
  const allVars = useMemo(() => [...dynamicVars, ...internalVars], [dynamicVars, internalVars])
  const templateView = useMemo(
    () => buildTemplateView(value, fields, allVars),
    [value, fields, allVars],
  )
  const displayValue = templateView.display

  const atToken = useMemo(() => getAtTokenAtCursor(displayValue, caret), [displayValue, caret])
  const effectiveMenuQuery = atToken?.query ?? menuSearchQuery

  const filterVar = useCallback(
    (item: VarItem) => {
      return matchesQuery(item, effectiveMenuQuery) && matchesKind(item, tokenKind)
    },
    [effectiveMenuQuery, tokenKind],
  )

  const menuGroups = useMemo((): TemplateVarMenuGroup[] => {
    if (!manualMenuOpen && !atToken) return []
    if (!stepContext) return []
    const groups = buildTemplateVarMenuGroups({
      trigger: stepContext.trigger,
      actions: stepContext.actions,
      beforeIndex: stepContext.beforeIndex,
      internalVars: internalVars,
    })
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(filterVar),
      }))
      .filter((group) => group.items.length > 0)
  }, [atToken, filterVar, internalVars, manualMenuOpen, stepContext])

  const sections = useMemo(() => {
    if (!manualMenuOpen && !atToken) return []
    if (stepContext) return []
    const filterFn = (v: VarItem) => matchesQuery(v, effectiveMenuQuery)

    const usedTokens = new Set<string>()
    const out: Array<{ label: string; items: VarItem[] }> = []

    if (tokenKind) {
      const suggested = allVars.filter((v) => matchesKind(v, tokenKind) && filterFn(v))
      if (suggested.length > 0) {
        out.push({ label: 'Suggested', items: suggested })
        for (const item of suggested) usedTokens.add(item.token)
      }
    }

    const dynamicItems = dynamicVars.filter((v) => filterFn(v) && !usedTokens.has(v.token))
    if (dynamicItems.length > 0) {
      out.push({ label: 'From this run', items: dynamicItems })
      for (const item of dynamicItems) usedTokens.add(item.token)
    }

    const internalItems = internalVars.filter((v) => filterFn(v) && !usedTokens.has(v.token))
    if (internalItems.length > 0) {
      out.push({ label: 'From your space', items: internalItems })
    }

    return out
  }, [
    allVars,
    dynamicVars,
    effectiveMenuQuery,
    internalVars,
    atToken,
    manualMenuOpen,
    stepContext,
    tokenKind,
  ])

  const filtered = useMemo(() => {
    if (stepContext) return menuGroups.flatMap((group) => group.items)
    return sections.flatMap((section) => section.items)
  }, [menuGroups, sections, stepContext])

  const mentionOpen = atToken !== null
  const menuOpen = mentionOpen || manualMenuOpen

  const applyInsert = useCallback(
    (token: string, opts?: { from: number; endDisplay: number }) => {
      const ta = textareaRef.current
      if (!ta) return
      const from = opts?.from ?? atToken?.from ?? caret
      const endDisplay = opts?.endDisplay ?? (atToken ? ta.selectionStart : from)
      const rawFrom = mapDisplayIndexToRaw(templateView.segments, from, 'start')
      const rawEnd = mapDisplayIndexToRaw(templateView.segments, endDisplay, 'end')
      const before = value.slice(0, rawFrom)
      const after = value.slice(rawEnd)
      const insert = `{{${token}}}`
      onChange(before + insert + after)
      setManualMenuOpen(false)
      setMenuSearchQuery('')
      const insertedDisplay = previewForInsertedToken(token, fields, allVars)
      const nextCaret = from + insertedDisplay.length
      requestAnimationFrame(() => {
        ta.focus()
        ta.selectionStart = ta.selectionEnd = nextCaret
        setCaret(nextCaret)
      })
    },
    [allVars, atToken, caret, fields, onChange, templateView.segments, value],
  )

  const dismissMention = useCallback(
    (opts?: { refocus?: boolean; from?: number; query?: string }) => {
      const ta = textareaRef.current
      const from = opts?.from ?? atToken?.from
      const query = opts?.query ?? atToken?.query
      if (!ta || from === undefined || query === undefined) return
      const segmentEnd = from + 1 + query.length
      const rawFrom = mapDisplayIndexToRaw(templateView.segments, from, 'start')
      const rawEnd = mapDisplayIndexToRaw(templateView.segments, segmentEnd, 'end')
      const before = value.slice(0, rawFrom)
      const after = value.slice(rawEnd)
      onChange(before + after)
      const nextCaret = from
      const refocus = opts?.refocus !== false
      requestAnimationFrame(() => {
        if (refocus) {
          ta.focus()
          ta.selectionStart = ta.selectionEnd = nextCaret
        }
        setCaret(nextCaret)
      })
    },
    [atToken, onChange, templateView.segments, value],
  )

  useLayoutEffect(() => {
    if (!menuOpen || (!atToken && !manualMenuOpen) || !textareaRef.current) {
      setMenuPos(null)
      return
    }
    const ta = textareaRef.current
    const caretRect = atToken
      ? getTextareaCaretViewportRect(ta, atToken.from)
      : insertButtonRef.current?.getBoundingClientRect()
    if (!caretRect) {
      setMenuPos(null)
      return
    }
    const w = 320
    const pad = 8
    let left = caretRect.left
    left = Math.max(pad, Math.min(left, window.innerWidth - w - pad))
    const top = Math.min(caretRect.top + caretRect.height + 4, window.innerHeight - 280)
    setMenuPos({ top: Math.max(pad, top), left })
  }, [menuOpen, mentionOpen, manualMenuOpen, atToken, displayValue, caret, filtered.length])

  useEffect(() => {
    activeIndexRef.current = 0
    setActiveIndex(0)
  }, [atToken?.from, effectiveMenuQuery, menuOpen])

  useEffect(() => {
    if (!manualMenuOpen || mentionOpen) return
    requestAnimationFrame(() => menuSearchInputRef.current?.focus())
  }, [manualMenuOpen, mentionOpen])

  useEffect(() => {
    setActiveIndex((i) => {
      const next = Math.min(i, Math.max(0, filtered.length - 1))
      activeIndexRef.current = next
      return next
    })
  }, [filtered.length])

  useLayoutEffect(() => {
    if (!menuOpen || !menuRef.current) return
    const row = menuRef.current.querySelector(`[data-mention-idx="${activeIndex}"]`)
    row?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, menuOpen, filtered.length])

  const dismissMentionRef = useRef(dismissMention)
  dismissMentionRef.current = dismissMention

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t)) return
      if (textareaRef.current?.contains(t)) return
      if (insertButtonRef.current?.contains(t)) return
      setManualMenuOpen(false)
      setMenuSearchQuery('')
      if (mentionOpen) dismissMentionRef.current({ refocus: false })
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen, mentionOpen])

  useEffect(() => {
    if (!mentionOpen) return
    const ta = textareaRef.current
    if (!ta) return
    const onScroll = () => {
      if (!atToken) return
      const caretRect = getTextareaCaretViewportRect(ta, atToken.from)
      if (!caretRect) return
      const w = 320
      const pad = 8
      let left = caretRect.left
      left = Math.max(pad, Math.min(left, window.innerWidth - w - pad))
      const top = Math.min(caretRect.top + caretRect.height + 4, window.innerHeight - 280)
      setMenuPos({ top: Math.max(pad, top), left })
    }
    ta.addEventListener('scroll', onScroll)
    return () => ta.removeEventListener('scroll', onScroll)
  }, [mentionOpen, atToken])

  const syncCaretFromEvent = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCaret(e.currentTarget.selectionStart)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const changeT0 = performance.now()
    const nextDisplay = e.target.value
    const nextRaw = applyDisplayEditToRaw(value, displayValue, nextDisplay, templateView)
    const transformMs = performance.now() - changeT0
    // #region agent log
    fetch('http://127.0.0.1:7839/ingest/973bb75b-1c39-437d-a840-d2b78f7741fd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '9bfce5' },
      body: JSON.stringify({
        sessionId: '9bfce5',
        location: 'PromptTemplateEditor.tsx:handleChange',
        message: 'PromptTemplateEditor keystroke transform',
        hypothesisId: 'H-C',
        data: {
          displayLen: nextDisplay.length,
          rawLen: nextRaw.length,
          segmentCount: templateView.segments.length,
          transformMs: Math.round(transformMs * 100) / 100,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    onChange(nextRaw)
    setCaret(e.target.selectionStart)
  }

  const highlightNodes = useMemo(
    () => buildHighlightNodes(templateView.segments),
    [templateView.segments],
  )

  const handleMentionKeyCapture = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return
    const el = e.currentTarget
    const text = el.value
    const pos = el.selectionStart
    const token = getAtTokenAtCursor(text, pos)
    if (!token) return

    const items =
      filtered.length > 0 ? filtered : allVars.filter((v) => matchesQuery(v, token.query))
    const isDown = e.key === 'ArrowDown' || e.key === 'Down'
    const isUp = e.key === 'ArrowUp' || e.key === 'Up'

    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setCaret(pos)
      dismissMention({ refocus: true, from: token.from, query: token.query })
      return
    }

    if (isDown) {
      e.preventDefault()
      e.stopPropagation()
      setCaret(pos)
      if (items.length === 0) return
      setActiveIndex((i) => {
        const next = (i + 1) % items.length
        activeIndexRef.current = next
        return next
      })
      return
    }
    if (isUp) {
      e.preventDefault()
      e.stopPropagation()
      setCaret(pos)
      if (items.length === 0) return
      setActiveIndex((i) => {
        const next = (i - 1 + items.length) % items.length
        activeIndexRef.current = next
        return next
      })
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      setCaret(pos)
      if (items.length === 0) return
      const boundedIndex = Math.min(Math.max(0, activeIndexRef.current), items.length - 1)
      const item = items[boundedIndex]
      if (item) applyInsert(item.token, { from: token.from, endDisplay: pos })
    }
  }

  const selectFilteredItem = useCallback(
    (item: VarItem) => {
      const ta = textareaRef.current
      const end = ta?.selectionStart ?? caret
      const text = ta?.value ?? displayValue
      const tok = getAtTokenAtCursor(text, end)
      if (tok) applyInsert(item.token, { from: tok.from, endDisplay: end })
      else applyInsert(item.token)
    },
    [applyInsert, caret, displayValue],
  )

  const handleMenuSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (filtered.length === 0) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setManualMenuOpen(false)
          setMenuSearchQuery('')
          if (mentionOpen) dismissMentionRef.current({ refocus: true })
        }
        return
      }
      const isDown = e.key === 'ArrowDown' || e.key === 'Down'
      const isUp = e.key === 'ArrowUp' || e.key === 'Up'
      if (isDown) {
        e.preventDefault()
        setActiveIndex((i) => {
          const next = (i + 1) % filtered.length
          activeIndexRef.current = next
          return next
        })
        return
      }
      if (isUp) {
        e.preventDefault()
        setActiveIndex((i) => {
          const next = (i - 1 + filtered.length) % filtered.length
          activeIndexRef.current = next
          return next
        })
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = filtered[Math.min(Math.max(0, activeIndexRef.current), filtered.length - 1)]
        if (item) selectFilteredItem(item)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setManualMenuOpen(false)
        setMenuSearchQuery('')
        if (mentionOpen) dismissMentionRef.current({ refocus: true })
      }
    },
    [filtered, mentionOpen, selectFilteredItem],
  )

  return (
    <div className="relative w-full">
      <div className="gap-spacing-2 flex w-full items-start">
        <div className="surface-bg border-border rounded-spacing-2 relative min-w-0 flex-1 overflow-hidden border">
          <div
            className="rounded-spacing-2 pointer-events-none absolute inset-0 z-0 overflow-hidden"
            aria-hidden
          >
            <div
              className="body-2 text-foreground px-spacing-3 py-spacing-2 whitespace-pre-wrap break-words"
              style={{ transform: `translateY(-${scrollTop}px)` }}
            >
              {highlightNodes ?? <span className="text-transparent">.</span>}
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={displayValue}
            onChange={handleChange}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            onSelect={syncCaretFromEvent}
            onKeyUp={syncCaretFromEvent}
            onClick={syncCaretFromEvent}
            onKeyDownCapture={handleMentionKeyCapture}
            placeholder={placeholder ?? 'Write your prompt… Type @ to insert task data'}
            rows={rows}
            className="body-2 placeholder:text-muted-foreground/60 rounded-spacing-2 px-spacing-3 py-spacing-2 caret-foreground relative z-10 block w-full resize-y border-0 bg-transparent text-transparent outline-none focus:ring-0 focus-visible:ring-0"
            spellCheck={false}
          />
        </div>
        <button
          ref={insertButtonRef}
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const ta = textareaRef.current
            if (ta) setCaret(ta.selectionStart)
            setManualMenuOpen((open) => {
              const next = !open
              if (next) setMenuSearchQuery('')
              return next
            })
          }}
          className="btn-icon-glass shrink-0"
          aria-label="Insert data"
          title="Insert data"
        >
          <Plus className="icon-sm" />
        </button>
      </div>

      {menuOpen &&
        menuPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="z-dropdown fixed w-80 max-w-[min(320px,calc(100vw-16px))] overflow-hidden"
            style={{ top: menuPos.top, left: menuPos.left }}
            data-dropdown=""
          >
            <div className="dropdown-menu-solid flex max-h-64 flex-col overflow-hidden">
              <div className="border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex shrink-0 items-center border-b">
                <Search className="icon-sm text-muted-foreground shrink-0" aria-hidden />
                <input
                  ref={menuSearchInputRef}
                  type="text"
                  value={mentionOpen ? (atToken?.query ?? '') : menuSearchQuery}
                  readOnly={mentionOpen}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  onKeyDown={handleMenuSearchKeyDown}
                  placeholder="Search variables…"
                  className="body-3 placeholder:text-muted-foreground/60 text-foreground min-w-0 flex-1 bg-transparent outline-none"
                  aria-label="Search variables"
                />
                {!mentionOpen && menuSearchQuery ? (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setMenuSearchQuery('')}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="icon-sm" />
                  </button>
                ) : null}
              </div>
              <div className="px-spacing-2 pb-spacing-2 max-h-56 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="body-3 text-muted-foreground py-spacing-2 text-center">
                    No matches — keep typing or press Esc
                  </p>
                ) : stepContext ? (
                  <PromptTemplateVarMenu
                    groups={menuGroups}
                    activeIndex={activeIndex}
                    tokenSourceIcon={tokenSourceIcon}
                    onHoverIndex={(index) => {
                      setActiveIndex(index)
                      activeIndexRef.current = index
                    }}
                    onSelect={selectFilteredItem}
                  />
                ) : (
                  <div
                    role="listbox"
                    aria-label="Insert variable"
                    className="px-spacing-2 py-spacing-1"
                  >
                    {(() => {
                      let runningIdx = 0
                      return sections.map((section, sIdx) => {
                        const items = section.items.map((v) => {
                          const flatIdx = runningIdx++
                          return { v, flatIdx }
                        })
                        return (
                          <div
                            key={section.label}
                            className={
                              sIdx > 0
                                ? 'border-border mt-spacing-3 pt-spacing-3 border-t'
                                : undefined
                            }
                          >
                            <div className="typo-caption text-muted-foreground mb-spacing-2 font-semibold">
                              {section.label}
                            </div>
                            {items.map(({ v, flatIdx }) => {
                              const Icon = tokenSourceIcon(v.source)
                              return (
                                <button
                                  key={v.token}
                                  type="button"
                                  role="option"
                                  aria-selected={flatIdx === activeIndex}
                                  data-mention-idx={flatIdx}
                                  onMouseEnter={() => {
                                    setActiveIndex(flatIdx)
                                    activeIndexRef.current = flatIdx
                                  }}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => selectFilteredItem(v)}
                                  className={`gap-x-spacing-2 rounded-spacing-1 px-spacing-2 py-spacing-1 grid w-full grid-cols-[16px_minmax(0,7rem)_minmax(0,1fr)] items-center text-left transition-colors ${
                                    flatIdx === activeIndex
                                      ? 'bg-hover-subtle'
                                      : 'hover:bg-hover-subtle'
                                  }`}
                                >
                                  <span className="text-muted-foreground inline-flex h-4 w-4 items-center justify-center">
                                    {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                                  </span>
                                  <span className="body-3 text-muted-foreground min-w-0 truncate font-medium">
                                    {labelMenuText(v.label)}
                                  </span>
                                  <span className="typo-caption text-muted-foreground min-w-0 truncate text-left leading-snug">
                                    {v.detail}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )
                      })
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
