'use client'

import { useEffect, useMemo, useState } from 'react'
import { Webhook } from 'lucide-react'
import {
  AutomationSolidSelect,
  type AutomationSolidOption,
} from '@/components/ui/forms/AutomationSolidSelect'
import {
  fetchFlowWebhookEndpoints,
  type FlowWebhookEndpoint,
} from '@/lib/flows/webhook-endpoints-api'

interface WebhookTriggerEditorProps {
  spaceId: string
  webhookEndpointId?: string
  onChange: (webhookEndpointId: string) => void
}

export function WebhookTriggerEditor({
  spaceId,
  webhookEndpointId,
  onChange,
}: WebhookTriggerEditorProps) {
  const [endpoints, setEndpoints] = useState<FlowWebhookEndpoint[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchFlowWebhookEndpoints(spaceId)
      .then((rows) => {
        if (!cancelled) setEndpoints(rows)
      })
      .catch(() => {
        if (!cancelled) setEndpoints([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [spaceId])

  const options = useMemo<AutomationSolidOption[]>(() => {
    const mapped = endpoints.map((endpoint) => ({
      value: endpoint.id,
      label: endpoint.name,
      description: endpoint.status === 'active' ? endpoint.webhook_url : 'Disabled',
    }))
    if (!webhookEndpointId || mapped.some((option) => option.value === webhookEndpointId)) {
      return mapped
    }
    return [
      { value: webhookEndpointId, label: webhookEndpointId, description: 'Saved endpoint' },
      ...mapped,
    ]
  }, [endpoints, webhookEndpointId])

  const selectedEndpoint = endpoints.find((endpoint) => endpoint.id === webhookEndpointId)

  return (
    <div className="space-y-spacing-2">
      <AutomationSolidSelect
        options={options}
        value={webhookEndpointId ?? ''}
        onChange={onChange}
        placeholder={loading ? 'Loading webhooks...' : 'Webhook endpoint'}
        disabled={loading || endpoints.length === 0}
      />
      {selectedEndpoint ? (
        <div className="border-border bg-muted/10 rounded-spacing-2 px-spacing-3 py-spacing-2 gap-spacing-2 flex min-w-0 items-center border">
          <Webhook className="icon-sm text-muted-foreground shrink-0" />
          <span className="body-4 text-muted-foreground min-w-0 truncate">
            {selectedEndpoint.webhook_url}
          </span>
        </div>
      ) : null}
    </div>
  )
}
