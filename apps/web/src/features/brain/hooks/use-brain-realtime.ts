'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBrainStore } from '../store/use-brain-store'
import type { BrainMemory } from '../types'

interface UseBrainRealtimeOptions {
  brainId?: string | null
  campaignId?: string | null
  enabled?: boolean
}

function dbRowToNode(
  row: Record<string, unknown>,
  nodeType: BrainMemory['node_type'],
): BrainMemory {
  return {
    id: String(row.id ?? ''),
    content: String(row.content ?? row.core ?? ''),
    memory_type: String(row.memory_type ?? row.type ?? row.entry_type ?? row.node_type ?? 'fact'),
    source_type: String(row.source_type ?? ''),
    source_id: row.source_id as string | undefined,
    source_title: (row.source_title ?? row.title ?? row.name) as string | undefined,
    significance: Number(row.significance ?? row.significance_score ?? 0.6),
    confidence: Number(row.confidence ?? 0.8),
    tags: Array.isArray(row.tags) ? row.tags : [],
    recalled_count: 0,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    node_type: nodeType,
    name: row.name as string | undefined,
    core: row.core as string | undefined,
    one_liner: row.one_liner as string | undefined,
    snapshot_type: row.type as string | undefined,
  }
}

export function useBrainRealtime(options?: UseBrainRealtimeOptions) {
  const enabled = options?.enabled !== false
  const brainId = options?.brainId ?? null
  const campaignId = options?.campaignId ?? null
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    let mounted = true

    const subscribe = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!mounted || !user) return

      const channel = supabase.channel(
        `brain-realtime-${user.id}-${brainId ?? campaignId ?? 'default'}`,
      )

      const memoriesFilter = brainId
        ? {
            event: 'INSERT' as const,
            schema: 'public',
            table: 'ns_memories',
            filter: `brain_id=eq.${brainId}`,
          }
        : { event: 'INSERT' as const, schema: 'public', table: 'ns_memories' }

      channel.on('postgres_changes', memoriesFilter, (payload) => {
        const row = payload.new as Record<string, unknown>
        if (!brainId && campaignId) return
        const node = dbRowToNode(row, 'memory')
        appendNodeToGraph(node)
      })

      const snapshotsFilter = brainId
        ? {
            event: 'INSERT' as const,
            schema: 'public',
            table: 'ns_snapshots',
            filter: `brain_id=eq.${brainId}`,
          }
        : { event: 'INSERT' as const, schema: 'public', table: 'ns_snapshots' }

      channel.on('postgres_changes', snapshotsFilter, (payload) => {
        const row = payload.new as Record<string, unknown>
        if (!brainId && campaignId) return
        const node = dbRowToNode(row, 'snapshot')
        appendNodeToGraph(node)
      })

      if (brainId) {
        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ns_sk_entries',
            filter: `brain_id=eq.${brainId}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>
            const node = dbRowToNode(row, 'sk_entry')
            appendNodeToGraph(node)
          },
        )
      }

      if (campaignId) {
        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'campaign_nodes',
            filter: `campaign_id=eq.${campaignId}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>
            const node = dbRowToNode(row, 'memory')
            appendNodeToGraph(node)
          },
        )
      }

      channel.subscribe()
      channelRef.current = channel
    }

    void subscribe()

    return () => {
      mounted = false
      if (channelRef.current) {
        void createClient().removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enabled, brainId, campaignId])
}

function appendNodeToGraph(node: BrainMemory) {
  const store = useBrainStore.getState()
  const current = store.graphData
  if (!current) return
  if (current.nodes.some((n) => n.id === node.id)) return

  useBrainStore.setState({
    graphData: {
      ...current,
      nodes: [...current.nodes, node],
      stats: {
        ...current.stats,
        total_memories: (current.stats.total_memories ?? 0) + 1,
      },
    },
  })
}
