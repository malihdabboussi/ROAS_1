'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { AddCustomDomainDialog } from '@/components/domains/AddCustomDomainDialog'
import { CustomDomainsTable } from '@/components/domains/CustomDomainsTable'
import { customDomainsApi } from '@/lib/domains/custom-domains-api'
import type { CustomDomain, DomainStatus } from '@/lib/domains/domains.types'

export default function DomainsPageContent() {
  const [domains, setDomains] = useState<CustomDomain[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [dnsAutoOpenDomain, setDnsAutoOpenDomain] = useState<CustomDomain | null>(null)

  const loadDomains = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await customDomainsApi.list()
      setDomains(result.domains ?? [])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDomains()
  }, [loadDomains])

  useEffect(() => {
    if (!isLoading && !initialLoadComplete) setInitialLoadComplete(true)
  }, [isLoading, initialLoadComplete])

  if (!initialLoadComplete) {
    return (
      <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <VibeyLoadingOrb state="processing" size="sm" />
      </div>
    )
  }

  return (
    <div className="p-spacing-4 sm:p-spacing-8 space-y-spacing-6">
      <div className="gap-spacing-4 flex items-start justify-between">
        <div className="min-w-0">
          <h1 className="title-h5 text-foreground">Domains</h1>
          <p className="body-3 text-muted-foreground mt-spacing-1">
            Manage your custom domains and DNS verification.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddDialogOpen(true)}
          className="button-glass-accent gap-spacing-2 flex items-center rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus className="icon-sm" />
          <span className="hidden md:inline">Add Domain</span>
          <span className="md:hidden">Add</span>
        </button>
      </div>

      <CustomDomainsTable
        domains={domains}
        openDnsForDomain={dnsAutoOpenDomain}
        onDnsAutoOpenConsumed={() => setDnsAutoOpenDomain(null)}
        onDomainUpdated={(update: {
          id: string
          status?: DomainStatus
          verification_records?: CustomDomain['verification_records']
        }) => {
          setDomains((prev) =>
            prev.map((d) =>
              d.id === update.id
                ? {
                    ...d,
                    ...(update.status ? { status: update.status } : {}),
                    ...(update.verification_records !== undefined
                      ? { verification_records: update.verification_records }
                      : {}),
                    last_verification_check: new Date().toISOString(),
                  }
                : d,
            ),
          )
        }}
        onDomainDeleted={(domainId) => {
          setDomains((prev) => prev.filter((d) => d.id !== domainId))
        }}
      />

      <AddCustomDomainDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onDomainAdded={(domain) => {
          setDomains((prev) => [domain, ...prev])
          setDnsAutoOpenDomain(domain)
          setAddDialogOpen(false)
        }}
      />
    </div>
  )
}
