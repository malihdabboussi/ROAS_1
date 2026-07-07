'use client'

import { useCallback, useEffect, useState } from 'react'
import { DomainSetupCard } from '../components/DomainSetupCard'
import { PlatformEmailStatus } from '../components/PlatformEmailStatus'
import { SenderIdentityCard } from '../components/SenderIdentityCard'
import {
  fetchPlatformEmail,
  setPlatformDomain,
  setPlatformSender,
  syncPlatformSender,
  verifyPlatformDomain,
} from '../services/platform-email.service'
import type { PlatformEmailConfig } from '../types/platform-email.types'

type DnsRow = { type: string; host: string; data: string; valid: boolean }

function parseDns(records: unknown): DnsRow[] {
  if (!Array.isArray(records)) return []
  return records.filter(
    (r): r is DnsRow =>
      typeof r === 'object' && r !== null && 'host' in r && 'data' in r && 'type' in r,
  ) as DnsRow[]
}

export function PlatformEmailContainer() {
  const [config, setConfig] = useState<PlatformEmailConfig | null>(null)
  const [dnsPreview, setDnsPreview] = useState<DnsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchPlatformEmail()
      const c = res.config as PlatformEmailConfig | null
      setConfig(c)
      setDnsPreview(parseDns(c?.dns_records))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onSubmitDomain = async (domain: string, subdomain: string) => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await setPlatformDomain({
        domain,
        subdomain: subdomain || undefined,
      })
      setDnsPreview(parseDns((res as { dnsRecords?: unknown }).dnsRecords))
      setMessage('Domain authentication created. Add DNS records, then click Verify DNS.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const onVerify = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await verifyPlatformDomain()
      const allValid = (res as { allValid?: boolean }).allValid
      setMessage(
        allValid ? 'Domain verified.' : 'DNS not fully verified yet. Check records and try again.',
      )
      setDnsPreview(parseDns((res as { records?: unknown }).records))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verify failed')
    } finally {
      setBusy(false)
    }
  }

  const onSubmitSender = async (body: {
    email: string
    name: string
    replyTo: string
    address: string
    city: string
    country: string
    state: string
    zip: string
  }) => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await setPlatformSender({
        email: body.email,
        name: body.name,
        replyTo: body.replyTo || undefined,
        address: body.address,
        city: body.city,
        country: body.country,
        state: body.state || undefined,
        zip: body.zip || undefined,
      })
      setMessage(
        'Sender created. Complete verification in SendGrid if required, then Refresh status.',
      )
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const onSync = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await syncPlatformSender()
      const ok = (res as { senderVerified?: boolean }).senderVerified
      setMessage(ok ? 'Sender is verified.' : 'Sender still pending verification in SendGrid.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !config) {
    return <div className="body-3 text-muted-foreground">Loading…</div>
  }

  const domainVerified = config?.domain_status === 'verified'

  return (
    <div className="space-y-spacing-6 w-full max-w-4xl">
      {message && <p className="body-2 text-emerald-600 dark:text-emerald-400">{message}</p>}
      {error && <p className="body-2 text-destructive">{error}</p>}
      <PlatformEmailStatus config={config} />
      <DomainSetupCard
        dnsRecords={dnsPreview}
        onSubmitDomain={onSubmitDomain}
        onVerify={onVerify}
        busy={busy}
      />
      <SenderIdentityCard
        domainVerified={domainVerified}
        onSubmit={onSubmitSender}
        onSync={onSync}
        busy={busy}
      />
    </div>
  )
}
