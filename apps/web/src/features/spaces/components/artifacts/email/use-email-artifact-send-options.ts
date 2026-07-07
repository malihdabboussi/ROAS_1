import { useEffect, useState } from 'react'
import { senderIdentitiesApi, type EmailSenderIdentity } from '@/lib/email'
import { backendGet } from '@/lib/api/backend-client'
import { fetchContacts, type Contact } from '@/lib/contacts/contacts-api'
import type {
  AudienceOption,
  ProviderOption,
  SenderOption,
} from './EmailArtifactSendDialog.primitives'

export function useEmailArtifactSendOptions(open: boolean) {
  const [contactSearch, setContactSearch] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)

  const [senderIdentities, setSenderIdentities] = useState<EmailSenderIdentity[]>([])
  const [senderIdentitiesLoading, setSenderIdentitiesLoading] = useState(false)
  const [peopleSenderId, setPeopleSenderId] = useState('')

  const [, setProviders] = useState<ProviderOption[]>([])
  const [provider, setProvider] = useState('')
  const [providerSenders, setProviderSenders] = useState<SenderOption[]>([])
  const [providerSenderId, setProviderSenderId] = useState('')
  const [lists, setLists] = useState<AudienceOption[]>([])
  const [segments, setSegments] = useState<AudienceOption[]>([])
  const [listId, setListId] = useState('')
  const [segmentId, setSegmentId] = useState('')
  const [providerLoading, setProviderLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setSenderIdentitiesLoading(true)
    senderIdentitiesApi
      .list()
      .then((res) => {
        if (cancelled) return
        const verified = (res.senderIdentities ?? []).filter((sender) => sender.is_verified)
        setSenderIdentities(verified)
        const defaultSender = verified.find((sender) => sender.is_default) ?? verified[0]
        setPeopleSenderId(defaultSender?.id ?? '')
      })
      .catch(() => {
        if (!cancelled) setSenderIdentities([])
      })
      .finally(() => {
        if (!cancelled) setSenderIdentitiesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setContactsLoading(true)
    fetchContacts({ search: contactSearch.trim() || undefined, limit: 20, offset: 0 })
      .then((res) => {
        if (!cancelled) setContacts(res.data.filter((contact) => Boolean(contact.email)))
      })
      .catch(() => {
        if (!cancelled) setContacts([])
      })
      .finally(() => {
        if (!cancelled) setContactsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [contactSearch, open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    backendGet<{ success: boolean; providers: Array<Record<string, unknown>> }>(
      '/api/email-campaigns/providers',
    )
      .then((res) => {
        if (cancelled) return
        const next = (res.providers ?? [])
          .map((row) => {
            const id = typeof row.provider === 'string' ? row.provider : ''
            if (!id) return null
            const name =
              typeof row.display_name === 'string' && row.display_name.trim()
                ? row.display_name.trim()
                : id
            return {
              id,
              name,
              supports_broadcast: row.supports_broadcast !== false,
            }
          })
          .filter(
            (providerOption): providerOption is ProviderOption =>
              providerOption !== null &&
              Boolean(providerOption.id) &&
              providerOption.supports_broadcast === true,
          )
        setProviders(next)
        setProvider(next[0]?.id ?? '')
      })
      .catch(() => {
        if (!cancelled) setProviders([])
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open || !provider) return
    let cancelled = false
    setProviderLoading(true)
    Promise.all([
      backendGet<{
        success: boolean
        senders: SenderOption[]
      }>(`/api/email-campaigns/provider-senders?provider=${encodeURIComponent(provider)}`),
      backendGet<{
        success: boolean
        lists: AudienceOption[]
        segments: AudienceOption[]
      }>(`/api/email-campaigns/provider-audiences?provider=${encodeURIComponent(provider)}`),
    ])
      .then(([sendersRes, audiencesRes]) => {
        if (cancelled) return
        const nextSenders = sendersRes.senders ?? []
        setProviderSenders(nextSenders)
        setProviderSenderId(nextSenders[0]?.id ?? '')
        setLists(audiencesRes.lists ?? [])
        setSegments(audiencesRes.segments ?? [])
        setListId('')
        setSegmentId('')
      })
      .catch(() => {
        if (!cancelled) {
          setProviderSenders([])
          setProviderSenderId('')
          setLists([])
          setSegments([])
        }
      })
      .finally(() => {
        if (!cancelled) setProviderLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, provider])

  return {
    contactSearch,
    contacts,
    contactsLoading,
    lists,
    listId,
    peopleSenderId,
    provider,
    providerLoading,
    providerSenderId,
    providerSenders,
    segmentId,
    segments,
    senderIdentities,
    senderIdentitiesLoading,
    setContactSearch,
    setListId,
    setSegmentId,
  }
}
