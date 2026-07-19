'use client'

import { useCallback, useEffect, useState } from 'react'
import { useOrgStore } from '@/lib/org'
import {
  createSlackTestProposal,
  fetchSlackPeople,
  fetchSlackShadowActions,
  patchSlackPersonDeliveryMode,
  reviewSlackShadowAction,
  sendSlackShadowAction,
  type SlackDeliveryMode,
  type SlackDiscoveredPerson,
  type SlackShadowAction,
} from '../services/slack-people.service'

export function useSlackPeople() {
  const activeOrgId = useOrgStore((state) => state.activeOrgId)
  const [connected, setConnected] = useState(false)
  const [people, setPeople] = useState<SlackDiscoveredPerson[]>([])
  const [actions, setActions] = useState<SlackShadowAction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [peopleResult, actionsResult] = await Promise.all([
        fetchSlackPeople(),
        fetchSlackShadowActions(),
      ])
      setConnected(peopleResult.connected)
      setPeople(peopleResult.people)
      setActions(actionsResult.actions)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load Slack people')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeOrgId) void reload()
  }, [activeOrgId, reload])

  const updateDeliveryMode = useCallback(
    async (id: string, mode: SlackDeliveryMode) => {
      const previous = people
      setPeople((current) =>
        current.map((person) => (person.id === id ? { ...person, delivery_mode: mode } : person)),
      )
      try {
        const result = await patchSlackPersonDeliveryMode(id, mode)
        setPeople((current) => current.map((person) => (person.id === id ? result.person : person)))
      } catch (cause) {
        setPeople(previous)
        throw cause
      }
    },
    [people],
  )

  const createTestProposal = useCallback(async (personId: string) => {
    const result = await createSlackTestProposal(personId)
    setActions((current) => [result.action, ...current])
  }, [])

  const reviewAction = useCallback(async (actionId: string, status: 'approved' | 'dismissed') => {
    const result = await reviewSlackShadowAction(actionId, status)
    setActions((current) =>
      current.map((action) => (action.id === actionId ? result.action : action)),
    )
  }, [])

  const sendAction = useCallback(async (actionId: string) => {
    const result = await sendSlackShadowAction(actionId)
    setActions((current) =>
      current.map((action) => (action.id === actionId ? result.action : action)),
    )
  }, [])

  return {
    connected,
    people,
    actions,
    loading,
    error,
    updateDeliveryMode,
    createTestProposal,
    reviewAction,
    sendAction,
    reload,
  }
}
