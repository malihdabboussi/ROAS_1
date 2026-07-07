'use client'

import { createContext, ReactNode, useCallback, useContext, useState } from 'react'
import { toast } from 'sonner'
import { EMAIL_ERRORS } from '../config/email-errors.config'
import { EMAIL_MESSAGES } from '../config/email-messages.config'
import { senderIdentitiesApi } from '../services/email-backend-api'
import type { EmailSenderIdentity } from '../types/email.types'

interface SenderIdentitiesContextValue {
  senderIdentities: EmailSenderIdentity[]
  isLoading: boolean
  isSyncing: boolean
  loadSenderIdentities: () => Promise<void>
  addSenderIdentity: (data: {
    domainId: string
    nickname: string
    fromEmail: string
    fromName: string
    replyToEmail?: string
    replyToName?: string
    address: string
    address2?: string
    city: string
    state?: string
    zip?: string
    country: string
  }) => Promise<{ success: boolean; senderIdentity?: EmailSenderIdentity; error?: string }>
  updateSenderIdentity: (
    identityId: string,
    data: Record<string, unknown>,
  ) => Promise<{ success: boolean; error?: string }>
  removeSenderIdentity: (identityId: string) => Promise<void>
  setDefaultSenderIdentity: (identityId: string) => Promise<void>
  syncFromSendGrid: () => Promise<void>
  syncVerificationStatus: (identityId: string) => Promise<void>
  getDefaultSenderIdentity: () => EmailSenderIdentity | undefined
  getVerifiedSenderIdentities: () => EmailSenderIdentity[]
  getSenderIdentitiesByDomain: (domainId: string) => EmailSenderIdentity[]
}

const SenderIdentitiesContext = createContext<SenderIdentitiesContextValue | null>(null)

export function SenderIdentitiesProvider({ children }: { children: ReactNode }) {
  const [senderIdentities, setSenderIdentities] = useState<EmailSenderIdentity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const loadSenderIdentities = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await senderIdentitiesApi.list()
      if (res.success) setSenderIdentities(res.senderIdentities)
    } catch {
      // Silent fail on initial load — backend may not have data yet
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addSenderIdentity = useCallback(
    async (data: {
      domainId: string
      nickname: string
      fromEmail: string
      fromName: string
      replyToEmail?: string
      replyToName?: string
      address: string
      address2?: string
      city: string
      state?: string
      zip?: string
      country: string
    }) => {
      try {
        const res = await senderIdentitiesApi.create(data)
        if (res.success && res.senderIdentity) {
          setSenderIdentities((prev) => [res.senderIdentity, ...prev])
          return { success: true, senderIdentity: res.senderIdentity }
        }
        return { success: false, error: res.error || 'Failed to create sender identity' }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to create sender identity'
        return { success: false, error: msg }
      }
    },
    [],
  )

  const updateSenderIdentity = useCallback(
    async (identityId: string, data: Record<string, unknown>) => {
      try {
        const res = await senderIdentitiesApi.update(identityId, data)
        if (res.success && res.senderIdentity) {
          setSenderIdentities((prev) =>
            prev.map((s) => (s.id === identityId ? res.senderIdentity : s)),
          )
          return { success: true }
        }
        return { success: false, error: 'Failed to update' }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update',
        }
      }
    },
    [],
  )

  const removeSenderIdentity = useCallback(async (identityId: string) => {
    await senderIdentitiesApi.remove(identityId)
    setSenderIdentities((prev) => prev.filter((s) => s.id !== identityId))
  }, [])

  const setDefaultSenderIdentity = useCallback(async (identityId: string) => {
    await senderIdentitiesApi.setDefault(identityId)
    setSenderIdentities((prev) => prev.map((s) => ({ ...s, is_default: s.id === identityId })))
  }, [])

  const syncFromSendGrid = useCallback(async () => {
    setIsSyncing(true)
    try {
      await senderIdentitiesApi.syncFromSendGrid()
      await loadSenderIdentities()
      toast.success(EMAIL_MESSAGES.SUCCESS_SYNC_SENDGRID.message)
    } catch {
      toast.error(EMAIL_ERRORS.SYNC_SENDGRID_FAILED.userMessage)
    } finally {
      setIsSyncing(false)
    }
  }, [loadSenderIdentities])

  const syncVerificationStatus = useCallback(async (identityId: string) => {
    try {
      const res = await senderIdentitiesApi.syncStatus(identityId)
      if (res.success && res.senderIdentity) {
        setSenderIdentities((prev) =>
          prev.map((s) => (s.id === identityId ? res.senderIdentity : s)),
        )
      }
    } catch {
      toast.error(EMAIL_ERRORS.VERIFY_STATUS_FAILED.userMessage)
    }
  }, [])

  const getDefaultSenderIdentity = useCallback(() => {
    return (
      senderIdentities.find((s) => s.is_default && s.is_verified) ||
      senderIdentities.find((s) => s.is_verified)
    )
  }, [senderIdentities])

  const getVerifiedSenderIdentities = useCallback(() => {
    return senderIdentities.filter((s) => s.is_verified)
  }, [senderIdentities])

  const getSenderIdentitiesByDomain = useCallback(
    (domainId: string) => {
      return senderIdentities.filter((s) => s.domain_id === domainId)
    },
    [senderIdentities],
  )

  return (
    <SenderIdentitiesContext.Provider
      value={{
        senderIdentities,
        isLoading,
        isSyncing,
        loadSenderIdentities,
        addSenderIdentity,
        updateSenderIdentity,
        removeSenderIdentity,
        setDefaultSenderIdentity,
        syncFromSendGrid,
        syncVerificationStatus,
        getDefaultSenderIdentity,
        getVerifiedSenderIdentities,
        getSenderIdentitiesByDomain,
      }}
    >
      {children}
    </SenderIdentitiesContext.Provider>
  )
}

export function useSenderIdentities() {
  const context = useContext(SenderIdentitiesContext)
  if (!context) throw new Error('useSenderIdentities must be used within SenderIdentitiesProvider')
  return context
}
