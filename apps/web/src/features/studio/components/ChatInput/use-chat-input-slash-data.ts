import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import { backendGet } from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { QUICK_MISSION_PLAYBOOKS } from '@/lib/spaces'
import { getSlashTokenAtCursor } from '../../utils/textarea-caret-viewport'
import type { SlashItem } from './chat-input-slash-menu'

type ChatInputSlashDataFetch = (path: string) => Promise<unknown>
type ChatInputSlashCachedFetch = (
  key: string,
  fetcher: () => Promise<unknown>,
  opts?: { ttlMs?: number },
) => Promise<unknown>

const defaultSlashDataFetch: ChatInputSlashDataFetch = (path) => backendGet<unknown>(path)

interface AgentWorkflowRow {
  id: string
  workflow_key: string
  name: string
  description: string
  is_enabled?: boolean
}

interface AgentSkillRow {
  id: string
  skill_key: string
  name: string
  description: string
  is_enabled?: boolean
}

export interface UseChatInputSlashDataOptions {
  agentKey: string
  valueRef: MutableRefObject<string>
  fetchJson?: ChatInputSlashDataFetch
  loadCached?: ChatInputSlashCachedFetch
}

export function useChatInputSlashData({
  agentKey,
  valueRef,
  fetchJson = defaultSlashDataFetch,
  loadCached = cachedFetch,
}: UseChatInputSlashDataOptions) {
  const [slashMenuOpen, setSlashMenuOpen] = useState(false)
  const [, setSlashQuery] = useState('')
  const [slashItems, setSlashItems] = useState<SlashItem[]>([])
  const [slashHighlight, setSlashHighlight] = useState(0)
  const allSlashItemsRef = useRef<SlashItem[]>([])
  const [allSlashItems, setAllSlashItems] = useState<SlashItem[]>([])

  const syncSlashMenuFromComposer = useCallback((text: string, cursor: number) => {
    const token = getSlashTokenAtCursor(text, cursor)
    if (token) {
      const query = token.query.toLowerCase()
      setSlashQuery(query)
      const filtered = allSlashItemsRef.current.filter(
        (item) =>
          item.is_enabled !== false &&
          (item.key.toLowerCase().includes(query) || item.name.toLowerCase().includes(query)),
      )
      setSlashItems((prev) => (sameSlashItems(prev, filtered) ? prev : filtered))
      setSlashMenuOpen(true)
      setSlashHighlight(0)
      return
    }

    setSlashMenuOpen(false)
  }, [])

  useEffect(() => {
    Promise.allSettled([
      loadCached(
        `agent-workflows:${agentKey}`,
        () => fetchJson(`/api/agents/${agentKey}/workflows`),
        { ttlMs: 300_000 },
      ),
      // Account/org catalog — every skill in scope, not only this agent's copies.
      loadCached(`skill-catalog:skills`, () => fetchJson(`/api/agents/skill-catalog/skills`), {
        ttlMs: 300_000,
      }),
    ]).then(([workflowsResult, skillsResult]) => {
      const items: SlashItem[] = [
        ...QUICK_MISSION_PLAYBOOKS.map((playbook) => ({
          id: `playbook:${playbook.id}`,
          key: playbook.key,
          name: playbook.name,
          description: playbook.description,
          is_enabled: true,
          type: 'playbook' as const,
        })),
      ]
      if (skillsResult.status === 'fulfilled') {
        items.push(
          ...asSkillRows(skillsResult.value).map((skill) => ({
            id: skill.id,
            key: skill.skill_key,
            name: skill.name,
            description: skill.description,
            is_enabled: skill.is_enabled,
            type: 'skill' as const,
          })),
        )
      }
      if (workflowsResult.status === 'fulfilled') {
        items.push(
          ...asWorkflowRows(workflowsResult.value).map((workflow) => ({
            id: workflow.id,
            key: workflow.workflow_key,
            name: workflow.name,
            description: workflow.description,
            is_enabled: workflow.is_enabled,
            type: 'workflow' as const,
          })),
        )
      }
      allSlashItemsRef.current = items
      setAllSlashItems((prev) => (sameSlashItems(prev, items) ? prev : items))
      const text = valueRef.current
      syncSlashMenuFromComposer(text, text.length)
    })
  }, [agentKey, syncSlashMenuFromComposer])

  return {
    slashMenuOpen,
    setSlashMenuOpen,
    slashItems,
    slashHighlight,
    setSlashHighlight,
    allSlashItems,
    allSlashItemsRef,
    syncSlashMenuFromComposer,
  }
}

function asWorkflowRows(value: unknown): AgentWorkflowRow[] {
  return Array.isArray(value) ? (value as AgentWorkflowRow[]) : []
}

function asSkillRows(value: unknown): AgentSkillRow[] {
  return Array.isArray(value) ? (value as AgentSkillRow[]) : []
}

function sameSlashItems(a: SlashItem[], b: SlashItem[]): boolean {
  if (a.length !== b.length) return false
  return a.every((item, index) => item.id === b[index]?.id)
}
