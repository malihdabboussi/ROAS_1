'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { AddEmailDomainDialog } from '@/features/email/components/domains/AddEmailDomainDialog'
import { DnsRecordsDialog } from '@/features/email/components/domains/DnsRecordsDialog'
import { EmailDomainsTable } from '@/features/email/components/domains/EmailDomainsTable'
import { AddSenderIdentityDialog } from '@/features/email/components/sender-identities/AddSenderIdentityDialog'
import { SenderIdentitiesTable } from '@/features/email/components/sender-identities/SenderIdentitiesTable'
import { useEmailDomains } from '@/features/email/providers/EmailDomainsProvider'
import { useSenderIdentities } from '@/features/email/providers/SenderIdentitiesProvider'
import type { EmailDomain } from '@/features/email/types/email.types'

export default function EmailDomainsAndSendersContent() {
  const { getVerifiedDomains, loadDomains, isLoading: domainsLoading } = useEmailDomains()
  const {
    loadSenderIdentities,
    syncFromSendGrid,
    isSyncing,
    isLoading: senderIdentitiesLoading,
  } = useSenderIdentities()
  const [showAddDomainDialog, setShowAddDomainDialog] = useState(false)
  const [showAddSenderDialog, setShowAddSenderDialog] = useState(false)
  const [newlyAddedDomain, setNewlyAddedDomain] = useState<EmailDomain | null>(null)
  const [loadStarted, setLoadStarted] = useState(false)

  useEffect(() => {
    setLoadStarted(true)
    loadDomains()
    loadSenderIdentities()
  }, [loadDomains, loadSenderIdentities])

  const allLoaded = !domainsLoading && !senderIdentitiesLoading
  const showLoading = !loadStarted || !allLoaded

  if (showLoading) {
    return (
      <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <VibeyLoadingOrb size="sm" state="processing" />
      </div>
    )
  }

  const verifiedDomains = getVerifiedDomains()

  return (
    <div className="space-y-spacing-6">
      {/* Domains Section */}
      <div className="section-card p-spacing-4 sm:p-spacing-6">
        <div className="space-y-spacing-6">
          <div className="gap-spacing-3 flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="title-h6 text-foreground">Sending Domains</h2>
              <p className="body-3 text-muted-foreground mt-spacing-1">
                Authenticate domains to send emails with better deliverability
              </p>
            </div>
            <button
              onClick={() => setShowAddDomainDialog(true)}
              className="button-glass-accent px-spacing-3 py-spacing-2 rounded-spacing-2 body-3 gap-spacing-1 flex shrink-0 items-center whitespace-nowrap font-medium"
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span className="hidden sm:inline">Add Domain</span>
            </button>
          </div>
          <EmailDomainsTable />
        </div>
      </div>

      {/* Sender Identities Section */}
      <div className="section-card p-spacing-4 sm:p-spacing-6">
        <div className="space-y-spacing-6">
          <div className="gap-spacing-3 flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="title-h6 text-foreground">Sender Emails</h2>
              <p className="body-3 text-muted-foreground mt-spacing-1">
                Specific email addresses to send from your verified domains
              </p>
            </div>
            <div className="gap-spacing-2 flex shrink-0 items-center">
              <button
                onClick={syncFromSendGrid}
                disabled={isSyncing || verifiedDomains.length === 0}
                className="button-glass-neutral px-spacing-3 py-spacing-2 rounded-spacing-2 body-3 gap-spacing-2 hidden items-center font-medium disabled:opacity-50 sm:flex"
              >
                <RefreshCw className={`icon-sm ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">
                  {isSyncing ? 'Syncing...' : 'Sync from my Domains'}
                </span>
              </button>
              <button
                onClick={() => setShowAddSenderDialog(true)}
                disabled={verifiedDomains.length === 0}
                className="button-glass-accent px-spacing-3 py-spacing-2 rounded-spacing-2 body-3 gap-spacing-1 flex items-center whitespace-nowrap font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span className="hidden sm:inline">Add Sender Email</span>
              </button>
            </div>
          </div>

          {verifiedDomains.length === 0 && (
            <div className="surface-bg border-border rounded-spacing-2 p-spacing-4 border">
              <p className="body-3 text-muted-foreground">
                Verify a sending domain above before adding sender emails.
              </p>
            </div>
          )}

          <SenderIdentitiesTable />
        </div>
      </div>

      {showAddDomainDialog && (
        <AddEmailDomainDialog
          isOpen={showAddDomainDialog}
          onClose={() => setShowAddDomainDialog(false)}
          onDomainAdded={(addedDomain) => setNewlyAddedDomain(addedDomain)}
        />
      )}
      {showAddSenderDialog && (
        <AddSenderIdentityDialog
          isOpen={showAddSenderDialog}
          onClose={() => setShowAddSenderDialog(false)}
        />
      )}
      <DnsRecordsDialog domain={newlyAddedDomain} onClose={() => setNewlyAddedDomain(null)} />
    </div>
  )
}
