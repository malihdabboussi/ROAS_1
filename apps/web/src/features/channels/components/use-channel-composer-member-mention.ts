'use client'

import { useEffect, useRef, useState } from 'react'
import { Mention } from '@tiptap/extension-mention'
import type { ChannelMember } from '@/lib/channels'
import type { TeamRosterEntry } from '@/lib/team'
import { buildMentionCandidates } from '../lib/mention-parser'

interface MemberMentionItem {
  id: string
  label: string
  handle: string
  type: 'user' | 'agent'
  avatarUrl: string | null
}

interface MemberMentionState {
  items: MemberMentionItem[]
  selectedIndex: number
  clientRect: (() => DOMRect | null) | null
  command: ((item: { id: string; label: string }) => void) | null
}

const EMPTY_MEMBER_MENTION: MemberMentionState = {
  items: [],
  selectedIndex: 0,
  clientRect: null,
  command: null,
}

export function useChannelComposerMemberMention({
  members,
  rosterAvatars,
  roster,
}: {
  members: ChannelMember[]
  rosterAvatars?: Map<string, string>
  roster?: TeamRosterEntry[]
}) {
  const [mention, setMention] = useState<MemberMentionState>(EMPTY_MEMBER_MENTION)
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 })
  const mentionRef = useRef<HTMLDivElement>(null)
  const candidatesRef = useRef(buildMentionCandidates(members, rosterAvatars, roster))
  const mentionStateRef = useRef<MemberMentionState>(EMPTY_MEMBER_MENTION)

  useEffect(() => {
    candidatesRef.current = buildMentionCandidates(members, rosterAvatars, roster)
  }, [members, rosterAvatars, roster])

  useEffect(() => {
    mentionStateRef.current = mention
  }, [mention])

  const MemberMentionExtension = Mention.configure({
    HTMLAttributes: { class: 'channel-mention' },
    renderText({ node }) {
      const label =
        (node.attrs as { label?: string; id?: string }).label ??
        (node.attrs as { id?: string }).id ??
        ''
      return `@${label}`
    },
    suggestion: {
      char: '@',
      items({ query }: { query: string }) {
        const candidates = candidatesRef.current
        const q = query.toLowerCase()
        const matches = (c: (typeof candidates)[number]) =>
          !q || c.handle.toLowerCase().includes(q) || c.label.toLowerCase().includes(q)
        const people = candidates.filter((c) => c.type === 'user' && matches(c))
        const agents = candidates.filter((c) => c.type === 'agent' && matches(c))
        return [...people, ...agents].slice(0, 12).map((c) => ({
          id: c.key,
          label: c.label,
          handle: c.handle,
          type: c.type,
          avatarUrl: c.avatarUrl ?? null,
        }))
      },
      render() {
        return {
          onStart(props: {
            items: MemberMentionItem[]
            clientRect?: (() => DOMRect | null) | null
            command: (item: { id: string; label: string }) => void
          }) {
            setMention({
              items: props.items,
              selectedIndex: 0,
              clientRect: props.clientRect ?? null,
              command: props.command,
            })
          },
          onUpdate(props: {
            items: MemberMentionItem[]
            clientRect?: (() => DOMRect | null) | null
            command: (item: { id: string; label: string }) => void
          }) {
            setMention((prev) => {
              const items = props.items
              const nextIdx =
                items.length === 0 ? 0 : Math.min(prev.selectedIndex, items.length - 1)
              return {
                ...prev,
                items,
                selectedIndex: Math.max(0, nextIdx),
                clientRect: props.clientRect ?? null,
                command: props.command,
              }
            })
          },
          onExit() {
            setMention(EMPTY_MEMBER_MENTION)
          },
          onKeyDown({ event }: { event: KeyboardEvent }) {
            if (event.key === 'Escape') {
              setMention(EMPTY_MEMBER_MENTION)
              event.stopPropagation()
              return true
            }
            if (event.key === 'ArrowUp') {
              const current = mentionStateRef.current
              if (current.items.length === 0) return false
              setMention((prev) => ({
                ...prev,
                selectedIndex: (prev.selectedIndex - 1 + prev.items.length) % prev.items.length,
              }))
              return true
            }
            if (event.key === 'ArrowDown') {
              const current = mentionStateRef.current
              if (current.items.length === 0) return false
              setMention((prev) => ({
                ...prev,
                selectedIndex: (prev.selectedIndex + 1) % prev.items.length,
              }))
              return true
            }
            if (event.key === 'Enter' || event.key === 'Tab') {
              const current = mentionStateRef.current
              if (current.items.length === 0) return false
              const idx = Math.min(Math.max(0, current.selectedIndex), current.items.length - 1)
              const item = current.items[idx]
              if (item) {
                try {
                  current.command?.(item)
                } catch {
                  // range can be stale if doc mutated between onUpdate and keydown
                }
                setMention(EMPTY_MEMBER_MENTION)
                return true
              }
              return false
            }
            return false
          },
        }
      },
    },
  })

  useEffect(() => {
    if (!mention.clientRect) return
    const rect = mention.clientRect()
    if (!rect) return
    setMentionPos({ top: rect.top - 8, left: rect.left })
  }, [mention.clientRect, mention.items])

  const selectMemberMention = (item: MemberMentionItem) => {
    mention.command?.(item)
    setMention(EMPTY_MEMBER_MENTION)
  }

  const setMemberMentionHoverIndex = (index: number) => {
    setMention((current) => ({ ...current, selectedIndex: index }))
  }

  return {
    mention,
    mentionRef,
    mentionPos,
    candidatesRef,
    MemberMentionExtension,
    selectMemberMention,
    setMemberMentionHoverIndex,
  }
}
