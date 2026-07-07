'use client'

import { useCallback, useRef, useState } from 'react'
import {
  createPublicConversation,
  prewarmPublicAgent,
  prewarmPublicConversation,
} from '../services/public-agent.service'

export type PublicAgentPreparationStatus = 'idle' | 'preparing' | 'ready' | 'failed'

export interface EnsureConversationOptions {
  silent?: boolean
}

export function usePublicAgentConversationPreparation(userSlug: string, agentKey: string) {
  const [conversationId, setConversationIdState] = useState<string | null>(null)
  const [preparationStatus, setPreparationStatus] = useState<PublicAgentPreparationStatus>('idle')
  const conversationIdRef = useRef<string | null>(null)
  const conversationPromiseRef = useRef<Promise<string | null> | null>(null)
  const visitorIdRef = useRef<string>('')
  const prewarmPromiseRef = useRef<{ conversationId: string; promise: Promise<boolean> } | null>(
    null,
  )
  const agentPrewarmPromiseRef = useRef<Promise<boolean> | null>(null)
  const agentPrewarmedRef = useRef(false)
  const prewarmedConversationRef = useRef<string | null>(null)
  const identityStorageKey = `vibey-public-visitor-identity-${agentKey}`

  const setActiveConversation = useCallback((nextConversationId: string | null) => {
    conversationIdRef.current = nextConversationId
    setConversationIdState(nextConversationId)
  }, [])

  const getVisitorId = useCallback(() => {
    if (visitorIdRef.current) return visitorIdRef.current
    const key = 'vibey-public-visitor-id'
    let id = localStorage.getItem(key)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(key, id)
    }
    visitorIdRef.current = id
    return id
  }, [])

  const readVisitorIdentity = useCallback(() => {
    const identityRaw = localStorage.getItem(identityStorageKey)
    if (!identityRaw) return undefined
    try {
      const parsed = JSON.parse(identityRaw) as { email?: string; name?: string }
      return {
        ...(typeof parsed.email === 'string' ? { email: parsed.email } : {}),
        ...(typeof parsed.name === 'string' ? { name: parsed.name } : {}),
      }
    } catch {
      return undefined
    }
  }, [identityStorageKey])

  const ensureConversation = useCallback(
    async (options?: EnsureConversationOptions): Promise<string | null> => {
      if (conversationIdRef.current) return conversationIdRef.current
      if (conversationPromiseRef.current) return conversationPromiseRef.current

      const visitorId = getVisitorId()
      const identity = readVisitorIdentity()
      const promise = createPublicConversation(userSlug, agentKey, visitorId, identity)
        .then((conv) => {
          if (!conv) return null
          setActiveConversation(conv.id)
          return conv.id
        })
        .catch(() => null)
        .finally(() => {
          if (conversationPromiseRef.current === promise) conversationPromiseRef.current = null
        })
      conversationPromiseRef.current = promise
      const convId = await promise
      if (!convId && !options?.silent) setPreparationStatus('failed')
      return convId
    },
    [agentKey, getVisitorId, readVisitorIdentity, setActiveConversation, userSlug],
  )

  const prewarmAgent = useCallback(async (): Promise<boolean> => {
    if (agentPrewarmedRef.current) return true
    if (agentPrewarmPromiseRef.current) return agentPrewarmPromiseRef.current

    const visitorId = getVisitorId()
    const promise = prewarmPublicAgent(userSlug, agentKey, { visitor_id: visitorId })
      .then((ok) => {
        agentPrewarmedRef.current = ok
        return ok
      })
      .catch(() => false)
      .finally(() => {
        if (agentPrewarmPromiseRef.current === promise) agentPrewarmPromiseRef.current = null
      })
    agentPrewarmPromiseRef.current = promise
    return promise
  }, [agentKey, getVisitorId, userSlug])

  const prewarmConversation = useCallback(
    async (targetConversationId?: string): Promise<boolean> => {
      const agentPromise = prewarmAgent()
      const convId = targetConversationId ?? (await ensureConversation({ silent: true }))
      if (!convId) {
        setPreparationStatus('failed')
        return false
      }
      if (prewarmedConversationRef.current === convId) {
        setPreparationStatus('ready')
        return true
      }
      if (prewarmPromiseRef.current?.conversationId === convId) {
        return prewarmPromiseRef.current.promise
      }

      setPreparationStatus('preparing')
      const visitorId = getVisitorId()
      const promise = prewarmPublicConversation(userSlug, agentKey, {
        visitor_id: visitorId,
        conversation_id: convId,
      })
        .then(async (ok) => {
          await agentPromise
          if (ok) {
            prewarmedConversationRef.current = convId
            setPreparationStatus('ready')
            return true
          }
          setPreparationStatus('failed')
          return false
        })
        .catch(() => {
          setPreparationStatus('failed')
          return false
        })
        .finally(() => {
          if (prewarmPromiseRef.current?.conversationId === convId) prewarmPromiseRef.current = null
        })

      prewarmPromiseRef.current = { conversationId: convId, promise }
      return promise
    },
    [agentKey, ensureConversation, getVisitorId, prewarmAgent, userSlug],
  )

  const prepareConversation = useCallback(
    async (targetConversationId?: string): Promise<string | null> => {
      setPreparationStatus('preparing')
      const agentPromise = prewarmAgent()
      const convId = targetConversationId ?? (await ensureConversation({ silent: true }))
      if (!convId) {
        setPreparationStatus('failed')
        return null
      }
      await Promise.all([agentPromise, prewarmConversation(convId)])
      return convId
    },
    [ensureConversation, prewarmAgent, prewarmConversation],
  )

  const prepareConversationForSend = useCallback(async (): Promise<string | null> => {
    const agentPromise = prewarmAgent()
    const convId = await ensureConversation()
    if (!convId) return null
    if (prewarmedConversationRef.current !== convId) {
      await prewarmConversation(convId)
    } else {
      await agentPromise
    }
    return convId
  }, [ensureConversation, prewarmAgent, prewarmConversation])

  const adoptConversation = useCallback(
    (nextConversationId: string) => {
      setActiveConversation(nextConversationId)
      if (prewarmedConversationRef.current !== nextConversationId) setPreparationStatus('idle')
    },
    [setActiveConversation],
  )

  const saveVisitorIdentity = useCallback(
    (payload: { email: string; name?: string }) => {
      localStorage.setItem(identityStorageKey, JSON.stringify(payload))
    },
    [identityStorageKey],
  )

  return {
    conversationId,
    preparationStatus,
    isPreparingContext: preparationStatus === 'preparing',
    ensureConversation,
    prepareConversation,
    prepareConversationForSend,
    prewarmAgent,
    prewarmConversation,
    adoptConversation,
    getVisitorId,
    saveVisitorIdentity,
  }
}
