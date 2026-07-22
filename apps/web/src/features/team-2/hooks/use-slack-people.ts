'use client'

import { useCallback, useEffect, useState } from 'react'
import { useOrgStore } from '@/lib/org'
import {
  confirmSlackPersonIdentity,
  createSlackPersonBrain,
  createSlackProposal,
  createSlackTestProposal,
  fetchSlackPeople,
  fetchSlackPersonActivity,
  fetchSlackShadowActions,
  patchSlackPersonDeliveryMode,
  patchSlackPersonIdentity,
  patchSlackPersonRelationshipKind,
  refreshSlackPeople,
  reviewSlackShadowAction,
  sendSlackShadowAction,
  trainSlackSignal,
  type SlackDeliveryMode,
  type SlackDiscoveredPerson,
  type SlackPortalUser,
  type SlackRelationshipKind,
  type SlackShadowAction,
} from '../services/slack-people.service'

export function useSlackPeople() {
  const activeOrgId = useOrgStore((state) => state.activeOrgId)
  const [connected, setConnected] = useState(false)
  const [people, setPeople] = useState<SlackDiscoveredPerson[]>([])
  const [portalUsers, setPortalUsers] = useState<SlackPortalUser[]>([])
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
      setPortalUsers(peopleResult.portal_users ?? [])
      setActions(actionsResult.actions)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load Slack people')
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await refreshSlackPeople()
      setConnected(result.connected)
      setPeople(result.people)
      setPortalUsers(result.portal_users ?? [])
      const actionsResult = await fetchSlackShadowActions()
      setActions(actionsResult.actions)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not refresh Slack people')
      throw cause
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
        setPeople((current) =>
          current.map((person) => (person.id === id ? { ...person, ...result.person } : person)),
        )
      } catch (cause) {
        setPeople(previous)
        throw cause
      }
    },
    [people],
  )

  const updateRelationshipKind = useCallback(
    async (id: string, relationshipKind: SlackRelationshipKind) => {
      const previous = people
      setPeople((current) =>
        current.map((person) =>
          person.id === id
            ? {
                ...person,
                relationship_kind: relationshipKind,
                relationship_source: 'manual',
              }
            : person,
        ),
      )
      try {
        const result = await patchSlackPersonRelationshipKind(id, relationshipKind)
        setPeople((current) =>
          current.map((person) => (person.id === id ? { ...person, ...result.person } : person)),
        )
      } catch (cause) {
        setPeople(previous)
        throw cause
      }
    },
    [people],
  )

  const confirmSuggestedIdentity = useCallback(async (id: string) => {
    const result = await confirmSlackPersonIdentity(id)
    setPeople((current) => current.map((person) => (person.id === id ? result.person : person)))
  }, [])

  const mapIdentity = useCallback(async (id: string, userId: string) => {
    const result = await patchSlackPersonIdentity(id, userId)
    setPeople((current) => current.map((person) => (person.id === id ? result.person : person)))
  }, [])

  const createPersonBrain = useCallback(async (id: string) => {
    const result = await createSlackPersonBrain(id)
    setPeople((current) => current.map((person) => (person.id === id ? result.person : person)))
    return result.person
  }, [])

  const loadPersonActivity = useCallback((id: string) => fetchSlackPersonActivity(id), [])

  const createTestProposal = useCallback(async (personId: string) => {
    const result = await createSlackTestProposal(personId)
    setActions((current) => [result.action, ...current])
    return result.action
  }, [])

  const createProposal = useCallback(async (personId: string, proposedContent: string) => {
    const result = await createSlackProposal(personId, proposedContent)
    setActions((current) => [result.action, ...current])
    return result.action
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

  const trainSignal = useCallback(
    async (signalId: string, instruction: string, saveAsRule: boolean) => {
      const result = await trainSlackSignal(signalId, instruction, saveAsRule)
      setActions((current) => [
        ...result.actions,
        ...current.map((action) =>
          action.id === signalId ? { ...action, status: 'approved' as const } : action,
        ),
      ])
      return result
    },
    [],
  )

  return {
    connected,
    people,
    portalUsers,
    actions,
    loading,
    error,
    updateDeliveryMode,
    updateRelationshipKind,
    confirmSuggestedIdentity,
    mapIdentity,
    createPersonBrain,
    loadPersonActivity,
    createTestProposal,
    createProposal,
    reviewAction,
    sendAction,
    trainSignal,
    reload,
    refresh,
  }
}
