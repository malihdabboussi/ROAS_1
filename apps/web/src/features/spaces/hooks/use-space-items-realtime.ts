'use client'

import { useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { SpaceItem, SpaceItemRealtimeChange } from '../types'
import { useSpacesStore } from '../store/use-spaces-store'

type SpaceItemRealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown> | null
  old: Record<string, unknown> | null
}

type SpaceRealtimePayload = {
  eventType: 'UPDATE'
  new: Record<string, unknown> | null
  old: Record<string, unknown> | null
}

function toRealtimeChange(payload: SpaceItemRealtimePayload): SpaceItemRealtimeChange | null {
  if (payload.eventType === 'DELETE') {
    const itemId = typeof payload.old?.id === 'string' ? payload.old.id : null
    return itemId ? { type: 'delete', itemId } : null
  }
  if (!payload.new || typeof payload.new.id !== 'string') return null
  return { type: 'upsert', item: payload.new as unknown as SpaceItem }
}

function applyRealtimeSpaceSchema(spaceId: string, payload: SpaceRealtimePayload) {
  if (payload.eventType !== 'UPDATE') return
  if (payload.new?.id !== spaceId) return
  const schema = payload.new.schema
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) return
  useSpacesStore.getState().patchActiveSpaceSchema(schema as Record<string, unknown>)
}

/**
 * Subscribes to live rows for a single space and forwards item-level changes.
 * The store merges item events so local optimistic mutations are not replaced
 * by full-list refetches. Space row updates keep schema changes from agents or
 * other users in sync without a manual refresh.
 *
 * Mirrors the existing artifact realtime pattern in `use-artifact-rows.ts`. The
 * server-side publication membership is set up by:
 *   - supabase/migrations/20260413100000_lists_mvp.sql (space_items, via the
 *     `list_items` rename carry-over)
 *   - supabase/migrations/20260422120000_spaces_rename_and_schema.sql (spaces)
 */
export function useSpaceItemsRealtime(
  spaceId: string | null,
  onChange: (change: SpaceItemRealtimeChange) => void,
): void {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!spaceId) return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const channel = supabase.channel(`space_items:${spaceId}`).on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'space_items',
        filter: `space_id=eq.${spaceId}`,
      },
      (payload) => {
        const change = toRealtimeChange(payload as SpaceItemRealtimePayload)
        if (change) onChangeRef.current(change)
      },
    )
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'spaces',
        filter: `id=eq.${spaceId}`,
      },
      (payload) => {
        applyRealtimeSpaceSchema(spaceId, payload as SpaceRealtimePayload)
      },
    )

    const subscribed = channel.subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn(
          `[Realtime] space live channel disconnected for ${spaceId}`,
          err instanceof Error ? err.message : err,
        )
      }
    })

    return () => {
      void supabase.removeChannel(subscribed)
    }
  }, [spaceId])
}
