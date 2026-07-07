import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'

export type FlowWebhookValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null'
  | 'unknown'

export interface FlowWebhookFieldMapping {
  key: string
  label: string
  source_path: string
  value_type?: FlowWebhookValueType
}

export interface FlowWebhookEndpoint {
  id: string
  org_id: string | null
  space_id: string
  created_by: string
  name: string
  public_token: string
  webhook_url: string
  status: 'active' | 'disabled'
  field_mappings: FlowWebhookFieldMapping[]
  sample_payload: unknown
  last_received_at: string | null
  created_at: string
  updated_at: string
}

export interface FlowWebhookEvent {
  id: string
  endpoint_id: string
  org_id: string | null
  space_id: string
  idempotency_key: string | null
  fields: Record<string, unknown>
  status: string
  matched_automation_ids: string[]
  error_message: string | null
  created_at: string
  processed_at: string | null
}

export interface CreateFlowWebhookEndpointInput {
  name: string
  field_mappings?: FlowWebhookFieldMapping[]
  sample_payload?: unknown
}

export interface UpdateFlowWebhookEndpointInput {
  name?: string
  status?: 'active' | 'disabled'
  field_mappings?: FlowWebhookFieldMapping[]
  sample_payload?: unknown | null
}

export type FlowWebhookSecretResponse = FlowWebhookEndpoint & {
  signing_secret: string
}

export function fetchFlowWebhookEndpoints(spaceId: string): Promise<FlowWebhookEndpoint[]> {
  return backendGet<FlowWebhookEndpoint[]>(`/api/spaces/${spaceId}/automations/webhooks`)
}

export function createFlowWebhookEndpoint(
  spaceId: string,
  input: CreateFlowWebhookEndpointInput,
): Promise<FlowWebhookSecretResponse> {
  return backendPost<FlowWebhookSecretResponse>(
    `/api/spaces/${spaceId}/automations/webhooks`,
    input,
  )
}

export function updateFlowWebhookEndpoint(
  spaceId: string,
  endpointId: string,
  input: UpdateFlowWebhookEndpointInput,
): Promise<FlowWebhookEndpoint> {
  return backendPatch<FlowWebhookEndpoint>(
    `/api/spaces/${spaceId}/automations/webhooks/${endpointId}`,
    input,
  )
}

export function deleteFlowWebhookEndpoint(
  spaceId: string,
  endpointId: string,
): Promise<FlowWebhookEndpoint> {
  return backendDelete<FlowWebhookEndpoint>(
    `/api/spaces/${spaceId}/automations/webhooks/${endpointId}`,
  )
}

export function rotateFlowWebhookSecret(
  spaceId: string,
  endpointId: string,
): Promise<FlowWebhookSecretResponse> {
  return backendPost<FlowWebhookSecretResponse>(
    `/api/spaces/${spaceId}/automations/webhooks/${endpointId}/rotate-secret`,
    {},
  )
}

export function fetchFlowWebhookEvents(
  spaceId: string,
  endpointId: string,
  limit = 25,
): Promise<FlowWebhookEvent[]> {
  return backendGet<FlowWebhookEvent[]>(
    `/api/spaces/${spaceId}/automations/webhooks/${endpointId}/events?limit=${limit}`,
  )
}
