'use client'

import { createContext, ReactNode, useCallback, useContext, useState } from 'react'
import { emailDomainsApi } from '../services/email-backend-api'
import type { EmailDnsRecord, EmailDomain } from '../types/email.types'

interface EmailDomainsContextValue {
  domains: EmailDomain[]
  isLoading: boolean
  loadDomains: () => Promise<void>
  addDomain: (
    domain: string,
    subdomain?: string,
    customDkimSelector?: string,
  ) => Promise<{
    success: boolean
    domain?: EmailDomain
    dnsRecords?: EmailDnsRecord[]
    error?: string
  }>
  verifyDomain: (domainId: string) => Promise<{ isValid: boolean; records?: EmailDnsRecord[] }>
  removeDomain: (domainId: string) => Promise<void>
  setDefaultDomain: (domainId: string) => Promise<void>
  enableReplyTracking: (
    domainId: string,
  ) => Promise<{ success: boolean; mxRecord?: EmailDnsRecord }>
  disableReplyTracking: (domainId: string) => Promise<void>
  verifyMxRecord: (domainId: string) => Promise<{ valid: boolean; error?: string }>
  getDefaultDomain: () => EmailDomain | undefined
  getVerifiedDomains: () => EmailDomain[]
}

const EmailDomainsContext = createContext<EmailDomainsContextValue | null>(null)

export function EmailDomainsProvider({ children }: { children: ReactNode }) {
  const [domains, setDomains] = useState<EmailDomain[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadDomains = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await emailDomainsApi.list()
      if (res.success) setDomains(res.domains)
    } catch {
      // Silent fail on initial load — backend may not have data yet
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addDomain = useCallback(
    async (domain: string, subdomain?: string, customDkimSelector?: string) => {
      try {
        const res = await emailDomainsApi.add({ domain, subdomain, customDkimSelector })
        if (res.success && res.domain) {
          setDomains((prev) => [res.domain, ...prev])
          return { success: true, domain: res.domain, dnsRecords: res.dnsRecords }
        }
        return { success: false, error: res.error || 'Failed to add domain' }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to add domain'
        return { success: false, error: msg }
      }
    },
    [],
  )

  const verifyDomain = useCallback(async (domainId: string) => {
    try {
      const res = await emailDomainsApi.verify(domainId)
      if (res.success) {
        setDomains((prev) => prev.map((d) => (d.id === domainId ? { ...d, ...res.domain } : d)))
        return { isValid: res.isValid, records: res.records }
      }
      return { isValid: false }
    } catch {
      return { isValid: false }
    }
  }, [])

  const removeDomain = useCallback(async (domainId: string) => {
    await emailDomainsApi.remove(domainId)
    setDomains((prev) => prev.filter((d) => d.id !== domainId))
  }, [])

  const setDefaultDomain = useCallback(async (domainId: string) => {
    await emailDomainsApi.setDefault(domainId)
    setDomains((prev) => prev.map((d) => ({ ...d, is_default: d.id === domainId })))
  }, [])

  const enableReplyTracking = useCallback(async (domainId: string) => {
    try {
      const res = await emailDomainsApi.enableReplyTracking(domainId)
      if (res.success) {
        setDomains((prev) => prev.map((d) => (d.id === domainId ? { ...d, ...res.domain } : d)))
        return { success: true, mxRecord: res.mxRecord }
      }
      return { success: false }
    } catch {
      return { success: false }
    }
  }, [])

  const disableReplyTracking = useCallback(async (domainId: string) => {
    const res = await emailDomainsApi.disableReplyTracking(domainId)
    if (res.success) {
      setDomains((prev) => prev.map((d) => (d.id === domainId ? { ...d, ...res.domain } : d)))
    }
  }, [])

  const verifyMxRecord = useCallback(async (domainId: string) => {
    try {
      const res = await emailDomainsApi.verifyMx(domainId)
      return { valid: res.valid, error: res.error }
    } catch {
      return { valid: false, error: 'Failed to verify MX record' }
    }
  }, [])

  const getDefaultDomain = useCallback(() => {
    return (
      domains.find((d) => d.is_default && d.status === 'verified') ||
      domains.find((d) => d.status === 'verified')
    )
  }, [domains])

  const getVerifiedDomains = useCallback(() => {
    return domains.filter((d) => d.status === 'verified')
  }, [domains])

  return (
    <EmailDomainsContext.Provider
      value={{
        domains,
        isLoading,
        loadDomains,
        addDomain,
        verifyDomain,
        removeDomain,
        setDefaultDomain,
        enableReplyTracking,
        disableReplyTracking,
        verifyMxRecord,
        getDefaultDomain,
        getVerifiedDomains,
      }}
    >
      {children}
    </EmailDomainsContext.Provider>
  )
}

export function useEmailDomains() {
  const context = useContext(EmailDomainsContext)
  if (!context) throw new Error('useEmailDomains must be used within EmailDomainsProvider')
  return context
}
