'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, KeyRound, Plus, Save, Trash2, Webhook } from 'lucide-react'
import { toast } from 'sonner'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import {
  createFlowWebhookEndpoint,
  deleteFlowWebhookEndpoint,
  fetchFlowWebhookEndpoints,
  fetchFlowWebhookEvents,
  rotateFlowWebhookSecret,
  updateFlowWebhookEndpoint,
  type FlowWebhookEndpoint,
  type FlowWebhookEvent,
  type FlowWebhookFieldMapping,
} from '@/lib/flows/webhook-endpoints-api'
import { cn } from '@/lib/utils/cn'
import {
  collectWebhookSampleMappings,
  EMPTY_WEBHOOK_SAMPLE,
  formatWebhookDate,
  formatWebhookJson,
  parseWebhookSample,
} from './flows-webhooks-view.helpers'
import { FlowsWebhookEventsPanel } from './FlowsWebhookEventsPanel'
import { FlowsWebhookMappingsEditor } from './FlowsWebhookMappingsEditor'

export function FlowsWebhooksView({ spaceId }: { spaceId: string | null }) {
  const [endpoints, setEndpoints] = useState<FlowWebhookEndpoint[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [events, setEvents] = useState<FlowWebhookEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [name, setName] = useState('New webhook')
  const [sampleText, setSampleText] = useState(EMPTY_WEBHOOK_SAMPLE)
  const [mappings, setMappings] = useState<FlowWebhookFieldMapping[]>([])
  const [latestSecret, setLatestSecret] = useState<string | null>(null)

  const selected = useMemo(
    () => endpoints.find((endpoint) => endpoint.id === selectedId) ?? null,
    [endpoints, selectedId],
  )

  const loadEndpoints = async () => {
    if (!spaceId) return
    setLoading(true)
    try {
      const rows = await fetchFlowWebhookEndpoints(spaceId)
      setEndpoints(rows)
      setSelectedId((current) => current ?? rows[0]?.id ?? null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setEndpoints([])
    setSelectedId(null)
    setEvents([])
    setLatestSecret(null)
    if (spaceId) void loadEndpoints()
  }, [spaceId])

  useEffect(() => {
    if (!selected) {
      setName('New webhook')
      setSampleText(EMPTY_WEBHOOK_SAMPLE)
      setMappings([])
      return
    }
    setName(selected.name)
    setSampleText(formatWebhookJson(selected.sample_payload) || EMPTY_WEBHOOK_SAMPLE)
    setMappings(selected.field_mappings ?? [])
  }, [selected])

  const loadEvents = async () => {
    if (!spaceId || !selectedId) return
    setEventsLoading(true)
    try {
      setEvents(await fetchFlowWebhookEvents(spaceId, selectedId, 25))
    } finally {
      setEventsLoading(false)
    }
  }

  useEffect(() => {
    setEvents([])
    if (spaceId && selectedId) void loadEvents()
  }, [spaceId, selectedId])

  const parsedSample = parseWebhookSample(sampleText)

  const handleCreate = async () => {
    if (!spaceId) return
    if (!parsedSample.ok) {
      toast.error(parsedSample.error)
      return
    }
    setBusy('create')
    try {
      const created = await createFlowWebhookEndpoint(spaceId, {
        name: name.trim() || 'New webhook',
        sample_payload: parsedSample.value,
        field_mappings: mappings,
      })
      setLatestSecret(created.signing_secret)
      await loadEndpoints()
      setSelectedId(created.id)
      toast.success('Webhook created')
    } finally {
      setBusy(null)
    }
  }

  const handleSave = async () => {
    if (!spaceId || !selected) return
    if (!parsedSample.ok) {
      toast.error(parsedSample.error)
      return
    }
    setBusy('save')
    try {
      await updateFlowWebhookEndpoint(spaceId, selected.id, {
        name: name.trim() || selected.name,
        sample_payload: parsedSample.value,
        field_mappings: mappings,
      })
      await loadEndpoints()
      toast.success('Webhook saved')
    } finally {
      setBusy(null)
    }
  }

  const handleRotate = async () => {
    if (!spaceId || !selected) return
    setBusy('rotate')
    try {
      const rotated = await rotateFlowWebhookSecret(spaceId, selected.id)
      setLatestSecret(rotated.signing_secret)
      await loadEndpoints()
      toast.success('Secret rotated')
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async () => {
    if (!spaceId || !selected) return
    setBusy('delete')
    try {
      await deleteFlowWebhookEndpoint(spaceId, selected.id)
      setLatestSecret(null)
      await loadEndpoints()
      toast.success('Webhook disabled')
    } finally {
      setBusy(null)
    }
  }

  const copyText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied`)
  }

  const addSampleMappings = () => {
    if (!parsedSample.ok) {
      toast.error(parsedSample.error)
      return
    }
    const existing = new Set(mappings.map((mapping) => mapping.key))
    const next = collectWebhookSampleMappings(parsedSample.value).filter(
      (mapping) => !existing.has(mapping.key),
    )
    setMappings([...mappings, ...next])
  }

  if (!spaceId) {
    return (
      <div className="p-spacing-6 flex h-full min-h-0 items-center justify-center">
        <div className="max-w-lg text-center">
          <Webhook className="text-muted-foreground mb-spacing-3 icon-lg mx-auto" />
          <h2 className="typo-heading-4 text-foreground">SELECT A SPACE</h2>
          <p className="body-3 text-muted-foreground mt-spacing-2">
            Webhook endpoints are scoped to one Space.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="gap-spacing-4 p-spacing-4 grid min-h-0 flex-1 grid-cols-1 overflow-auto lg:grid-cols-3">
      <aside className="space-y-spacing-3">
        <div className="flex items-center justify-between">
          <h2 className="typo-heading-5 text-foreground">WEBHOOKS</h2>
          <button
            type="button"
            onClick={() => {
              setSelectedId(null)
              setLatestSecret(null)
            }}
            className="input-glass h-spacing-9 px-spacing-3 body-3 rounded-spacing-2 gap-spacing-1 inline-flex items-center transition-colors"
          >
            <Plus className="icon-xs" />
            New
          </button>
        </div>
        <div className="space-y-spacing-2">
          {loading ? (
            <ListSkeleton rows={5} label="Loading..." />
          ) : endpoints.length === 0 ? (
            <div className="body-3 text-muted-foreground">No webhooks yet</div>
          ) : (
            endpoints.map((endpoint) => (
              <button
                key={endpoint.id}
                type="button"
                onClick={() => {
                  setSelectedId(endpoint.id)
                  setLatestSecret(null)
                }}
                className={cn(
                  'border-border rounded-spacing-2 p-spacing-3 flex w-full flex-col items-start border text-left transition-colors',
                  selectedId === endpoint.id ? 'bg-muted/20' : 'hover:bg-hover-subtle',
                )}
              >
                <span className="body-3 text-foreground font-medium">{endpoint.name}</span>
                <span className="body-4 text-muted-foreground mt-spacing-1">
                  {endpoint.status} · {formatWebhookDate(endpoint.last_received_at)}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="space-y-spacing-4 lg:col-span-2">
        <div className="border-border rounded-spacing-3 p-spacing-4 space-y-spacing-3 border">
          <div className="gap-spacing-2 flex flex-wrap items-center justify-between">
            <h2 className="typo-heading-5 text-foreground">
              {selected ? 'ENDPOINT SETTINGS' : 'NEW WEBHOOK'}
            </h2>
            <div className="gap-spacing-2 flex flex-wrap">
              <button
                type="button"
                onClick={selected ? handleSave : handleCreate}
                disabled={!!busy}
                className="badge-glass badge-glass-green h-spacing-9 px-spacing-3 body-3 rounded-spacing-2 gap-spacing-1 inline-flex items-center font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Save className="icon-xs" />
                {selected ? 'Save' : 'Create'}
              </button>
              {selected ? (
                <>
                  <button
                    type="button"
                    onClick={handleRotate}
                    disabled={!!busy}
                    className="input-glass h-spacing-9 px-spacing-3 body-3 rounded-spacing-2 gap-spacing-1 inline-flex items-center transition-colors"
                  >
                    <KeyRound className="icon-xs" />
                    Rotate
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={!!busy}
                    className="input-glass h-spacing-9 px-spacing-3 body-3 rounded-spacing-2 gap-spacing-1 inline-flex items-center transition-colors"
                  >
                    <Trash2 className="icon-xs" />
                    Disable
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground w-full border outline-none"
            placeholder="Webhook name"
          />

          {selected ? (
            <div className="gap-spacing-2 flex min-w-0 items-center">
              <code className="body-4 bg-muted/10 border-border rounded-spacing-2 px-spacing-3 py-spacing-2 text-muted-foreground min-w-0 flex-1 truncate border">
                {selected.webhook_url}
              </code>
              <button
                type="button"
                onClick={() => void copyText(selected.webhook_url, 'URL')}
                className="input-glass h-spacing-9 px-spacing-3 body-3 rounded-spacing-2 gap-spacing-1 inline-flex items-center transition-colors"
              >
                <Copy className="icon-xs" />
                Copy
              </button>
            </div>
          ) : null}

          {latestSecret ? (
            <div className="gap-spacing-2 flex min-w-0 items-center">
              <code className="body-4 bg-muted/10 border-border rounded-spacing-2 px-spacing-3 py-spacing-2 text-foreground min-w-0 flex-1 truncate border">
                {latestSecret}
              </code>
              <button
                type="button"
                onClick={() => void copyText(latestSecret, 'Secret')}
                className="input-glass h-spacing-9 px-spacing-3 body-3 rounded-spacing-2 gap-spacing-1 inline-flex items-center transition-colors"
              >
                <Copy className="icon-xs" />
                Copy
              </button>
            </div>
          ) : null}
        </div>

        <div className="gap-spacing-4 grid grid-cols-1 lg:grid-cols-2">
          <div className="border-border rounded-spacing-3 p-spacing-4 space-y-spacing-3 border">
            <div className="gap-spacing-2 flex items-center justify-between">
              <h3 className="typo-heading-6 text-foreground">SAMPLE PAYLOAD</h3>
              <button
                type="button"
                onClick={addSampleMappings}
                className="input-glass h-spacing-9 px-spacing-3 body-3 rounded-spacing-2 transition-colors"
              >
                Map fields
              </button>
            </div>
            <textarea
              value={sampleText}
              onChange={(event) => setSampleText(event.target.value)}
              className="body-4 border-border bg-background rounded-spacing-2 p-spacing-3 text-foreground w-full border font-mono outline-none"
              spellCheck={false}
              rows={12}
            />
            {!parsedSample.ok ? (
              <p className="body-4 text-destructive">{parsedSample.error}</p>
            ) : null}
          </div>

          <FlowsWebhookMappingsEditor mappings={mappings} setMappings={setMappings} />
        </div>

        <FlowsWebhookEventsPanel
          selected={selected}
          events={events}
          eventsLoading={eventsLoading}
          onRefresh={() => void loadEvents()}
        />
      </section>
    </div>
  )
}
