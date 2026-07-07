'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LuChevronLeft as ChevronLeft } from 'react-icons/lu'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { ContactInfoPanel } from '@/features/contacts/components/ContactInfoPanel'
import { fetchContact, type Contact } from '@/features/contacts/services/contacts-api'

export default function ContactDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : ''

  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    if (!id) {
      setError('Invalid contact')
      setLoading(false)
      return
    }
    fetchContact(id)
      .then((c) => {
        if (cancelled) return
        setContact(c)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text="Loading Contact..." state="processing" size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="surface-card border-border rounded-spacing-2 p-spacing-6 max-w-[600px] border">
          <div className="title-h6">Error</div>
          <div className="body-3 text-muted-foreground mt-spacing-2 break-words">{error}</div>
          <button
            type="button"
            onClick={() => router.push('/contacts')}
            className="button-glass-neutral mt-spacing-4 rounded-lg px-4 py-2 text-sm font-medium"
          >
            Back to Contacts
          </button>
        </div>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="surface-card border-border rounded-spacing-2 p-spacing-6 border">
          <div className="title-h6">Contact not found</div>
          <button
            type="button"
            onClick={() => router.push('/contacts')}
            className="button-glass-neutral mt-spacing-4 rounded-lg px-4 py-2 text-sm font-medium"
          >
            Back to Contacts
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="p-spacing-3 sm:p-spacing-6 gap-spacing-4 flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/contacts')}
          className="badge-glass badge-glass-muted typo-caption gap-spacing-2 flex items-center font-medium"
        >
          <ChevronLeft className="icon-sm" />
          Back to Contacts
        </button>
      </div>

      <div className="min-h-0 flex-1">
        <ContactInfoPanel
          contact={contact}
          onContactUpdated={(updated) => setContact(updated)}
          onClose={() => router.push('/contacts')}
        />
      </div>
    </main>
  )
}
