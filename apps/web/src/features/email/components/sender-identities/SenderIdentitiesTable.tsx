'use client'

import { useState } from 'react'
import { Mail, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { EMAIL_ERRORS } from '../../config/email-errors.config'
import { EMAIL_MESSAGES } from '../../config/email-messages.config'
import { useSenderIdentities } from '../../providers/SenderIdentitiesProvider'
import type { EmailSenderIdentity } from '../../types/email.types'

export function SenderIdentitiesTable() {
  const {
    senderIdentities,
    removeSenderIdentity,
    setDefaultSenderIdentity,
    syncVerificationStatus,
  } = useSenderIdentities()
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)

  const handleRemove = async (identity: EmailSenderIdentity) => {
    try {
      await removeSenderIdentity(identity.id)
      toast.success(EMAIL_MESSAGES.SUCCESS_SENDER_DELETED.message)
    } catch {
      toast.error(EMAIL_ERRORS.DELETE_SENDER_FAILED.userMessage)
    }
  }

  return (
    <>
      <div className="surface-card border-border rounded-spacing-3 border">
        {senderIdentities.length === 0 ? (
          <div className="py-spacing-12 px-spacing-6 flex flex-col items-center justify-center">
            <Mail className="icon-lg text-muted-foreground mb-spacing-3" />
            <p className="body-1 text-foreground font-medium">No sender emails yet</p>
            <p className="body-3 text-muted-foreground mt-spacing-1 max-w-sm text-center">
              Add a sender email address to start sending. You'll need a verified domain first.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="divide-y divide-[var(--color-border)] md:hidden">
              {senderIdentities.map((identity) => (
                <div key={identity.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <span className="body-2 text-foreground block truncate font-medium">
                      {identity.from_email}
                    </span>
                    <span className="body-3 text-muted-foreground block truncate">
                      {identity.from_name}
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      {identity.is_verified ? (
                        <span className="badge-glass badge-glass-green">Verified</span>
                      ) : (
                        <span className="badge-glass badge-glass-orange">Pending</span>
                      )}
                      {identity.is_default && (
                        <span className="badge-glass badge-glass-blue">Default</span>
                      )}
                    </div>
                  </div>
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() =>
                        setActionMenuId(actionMenuId === identity.id ? null : identity.id)
                      }
                      aria-label="Sender actions"
                      title="Sender actions"
                      className="btn-icon-glass"
                    >
                      <MoreHorizontal className="icon-sm" />
                    </button>
                    {actionMenuId === identity.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActionMenuId(null)} />
                        <div className="z-dropdown rounded-spacing-2 border-border bg-card absolute right-0 top-full mt-1 w-48 overflow-hidden border shadow-lg">
                          {!identity.is_verified && (
                            <button
                              onClick={() => {
                                setActionMenuId(null)
                                syncVerificationStatus(identity.id)
                              }}
                              className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 hover:bg-hover-subtle w-full text-left transition-colors"
                            >
                              Refresh Verification
                            </button>
                          )}
                          {identity.is_verified && !identity.is_default && (
                            <button
                              onClick={async () => {
                                setActionMenuId(null)
                                try {
                                  await setDefaultSenderIdentity(identity.id)
                                } catch {
                                  toast.error(
                                    EMAIL_ERRORS.SET_DEFAULT_SENDER_FAILED?.userMessage ??
                                      'Failed to set default sender',
                                  )
                                }
                              }}
                              className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 hover:bg-hover-subtle w-full text-left transition-colors"
                            >
                              Set as Default
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setActionMenuId(null)
                              handleRemove(identity)
                            }}
                            className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 text-destructive hover:bg-hover-subtle w-full text-left transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <table className="hidden w-full md:table">
              <thead>
                <tr className="border-border bg-muted/30 border-b">
                  <th className="px-spacing-4 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Email
                  </th>
                  <th className="px-spacing-4 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Display Name
                  </th>
                  <th className="px-spacing-4 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Status
                  </th>
                  <th className="px-spacing-4 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                    Default
                  </th>
                  <th className="px-spacing-4 py-spacing-2 body-4 text-muted-foreground text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {senderIdentities.map((identity) => (
                  <tr
                    key={identity.id}
                    className="border-border hover:bg-hover-subtle border-b transition-colors last:border-b-0"
                  >
                    <td className="px-spacing-4 py-spacing-3">
                      <span className="body-2 text-foreground font-medium">
                        {identity.from_email}
                      </span>
                    </td>
                    <td className="px-spacing-4 py-spacing-3">
                      <span className="body-3 text-muted-foreground">{identity.from_name}</span>
                    </td>
                    <td className="px-spacing-4 py-spacing-3">
                      {identity.is_verified ? (
                        <span className="badge-glass badge-glass-green">Verified</span>
                      ) : (
                        <span className="badge-glass badge-glass-orange">Pending</span>
                      )}
                    </td>
                    <td className="px-spacing-4 py-spacing-3">
                      {identity.is_default && (
                        <span className="badge-glass badge-glass-blue">Default</span>
                      )}
                    </td>
                    <td className="px-spacing-4 py-spacing-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setActionMenuId(actionMenuId === identity.id ? null : identity.id)
                          }
                          aria-label="Sender actions"
                          title="Sender actions"
                          className="btn-icon-glass"
                        >
                          <MoreHorizontal className="icon-sm" />
                        </button>
                        {actionMenuId === identity.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setActionMenuId(null)}
                            />
                            <div className="z-dropdown rounded-spacing-2 border-border bg-card absolute right-0 top-full mt-1 w-48 overflow-hidden border shadow-lg">
                              {!identity.is_verified && (
                                <button
                                  onClick={() => {
                                    setActionMenuId(null)
                                    syncVerificationStatus(identity.id)
                                  }}
                                  className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 hover:bg-hover-subtle w-full text-left transition-colors"
                                >
                                  Refresh Verification
                                </button>
                              )}
                              {identity.is_verified && !identity.is_default && (
                                <button
                                  onClick={async () => {
                                    setActionMenuId(null)
                                    try {
                                      await setDefaultSenderIdentity(identity.id)
                                    } catch {
                                      toast.error(
                                        EMAIL_ERRORS.SET_DEFAULT_SENDER_FAILED?.userMessage ??
                                          'Failed to set default sender',
                                      )
                                    }
                                  }}
                                  className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 hover:bg-hover-subtle w-full text-left transition-colors"
                                >
                                  Set as Default
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setActionMenuId(null)
                                  handleRemove(identity)
                                }}
                                className="rounded-spacing-1 px-spacing-3 py-spacing-2 body-3 text-destructive hover:bg-hover-subtle w-full text-left transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  )
}
