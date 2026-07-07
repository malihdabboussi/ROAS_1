import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { backendGet } from '@/lib/api/backend-client'
import type { SettingsSection } from './settings-tab.types'

export type SettingsDomainStatus =
  | 'pending'
  | 'dns_verifying'
  | 'dns_verified'
  | 'ssl_pending'
  | 'verified'
  | 'ssl_failed'
  | 'error'

export type SettingsDnsRecord = {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT'
  name: string
  value: string
  ttl?: number
}

export type SettingsCustomDomain = {
  id: string
  domain_name: string
  domain: string
  user_id: string
  domain_type?: 'generated' | 'custom'
  environment?: 'production' | 'staging'
  landing_page_id: string | null
  funnel_id: string | null
  status: SettingsDomainStatus
  verification_records?: SettingsDnsRecord[] | null
  last_verification_check?: string | null
  error_message?: string | null
  created_at: string
  updated_at: string
}

interface UseSettingsTabDomainControlsOptions {
  activeSection: SettingsSection
  activePresentationId: string | null
  activePresentationDomainId: string | null
}

export function useSettingsTabDomainControls({
  activeSection,
  activePresentationId,
  activePresentationDomainId,
}: UseSettingsTabDomainControlsOptions) {
  const [domains, setDomains] = useState<SettingsCustomDomain[]>([])
  const [domainsLoading, setDomainsLoading] = useState(false)
  const [selectedDomainId, setSelectedDomainId] = useState('')
  const [addDomainOpen, setAddDomainOpen] = useState(false)
  const [dnsDialogDomain, setDnsDialogDomain] = useState<SettingsCustomDomain | null>(null)
  const [lmDomainActionLoading, setLmDomainActionLoading] = useState(false)
  const [lmSelectedDomainId, setLmSelectedDomainId] = useState('')
  const [lmDomainDropdownOpen, setLmDomainDropdownOpen] = useState(false)
  const lmDomainDropdownTriggerRef = useRef<HTMLButtonElement>(null)
  const [lmDomainDropdownPos, setLmDomainDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  })

  useLayoutEffect(() => {
    if (!lmDomainDropdownOpen || !lmDomainDropdownTriggerRef.current) return
    const rect = lmDomainDropdownTriggerRef.current.getBoundingClientRect()
    setLmDomainDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [lmDomainDropdownOpen])

  useEffect(() => {
    if (!lmDomainDropdownOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        !target.closest('[data-dropdown]') &&
        !lmDomainDropdownTriggerRef.current?.contains(target)
      ) {
        setLmDomainDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [lmDomainDropdownOpen])

  const loadDomains = useCallback(async () => {
    setDomainsLoading(true)
    try {
      const result = await backendGet<{ domains?: SettingsCustomDomain[] }>('/api/domains')
      setDomains(result.domains ?? [])
    } catch {
      setDomains([])
    } finally {
      setDomainsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeSection !== 'funnel' && activeSection !== 'presentation') return
    void loadDomains()
  }, [activeSection, loadDomains])

  useEffect(() => {
    if (!activePresentationId) return
    setLmSelectedDomainId(activePresentationDomainId ?? '')
  }, [activePresentationId, activePresentationDomainId])

  const handleDomainUpdated = useCallback(
    (update: {
      id: string
      status?: SettingsDomainStatus
      verification_records?: SettingsCustomDomain['verification_records']
    }) => {
      setDomains((prev) =>
        prev.map((domain) =>
          domain.id === update.id
            ? {
                ...domain,
                ...(update.status ? { status: update.status } : {}),
                ...(update.verification_records !== undefined
                  ? { verification_records: update.verification_records }
                  : {}),
                last_verification_check: new Date().toISOString(),
              }
            : domain,
        ),
      )
    },
    [],
  )

  const handleDomainAdded = useCallback(
    (domain: SettingsCustomDomain) => {
      setDomains((prev) => [domain, ...prev])
      if (activeSection === 'presentation') {
        setLmSelectedDomainId(domain.id)
      } else {
        setSelectedDomainId(domain.id)
      }
      setAddDomainOpen(false)
      setDnsDialogDomain(domain)
    },
    [activeSection],
  )

  return {
    domains,
    setDomains,
    domainsLoading,
    selectedDomainId,
    setSelectedDomainId,
    addDomainOpen,
    setAddDomainOpen,
    dnsDialogDomain,
    setDnsDialogDomain,
    lmDomainActionLoading,
    setLmDomainActionLoading,
    lmSelectedDomainId,
    setLmSelectedDomainId,
    lmDomainDropdownOpen,
    setLmDomainDropdownOpen,
    lmDomainDropdownTriggerRef,
    lmDomainDropdownPos,
    handleDomainUpdated,
    handleDomainAdded,
  }
}
