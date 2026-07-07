import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { getOrgScopedKey } from '@/lib/utils/org-storage'
import type {
  CreateCustomFieldInput,
  CustomFieldDefinition,
  UpdateCustomFieldInput,
} from './custom-fields'

interface CustomFieldsListResponse {
  fields: CustomFieldDefinition[]
}

interface CustomFieldResponse {
  field: CustomFieldDefinition
}

const CUSTOM_FIELDS_CACHE_PREFIX = 'custom-fields'
const CUSTOM_FIELDS_TTL_MS = 60_000

/** Drop every cached custom-fields entry (all org/personal variants). */
function invalidateCustomFieldsCache(): void {
  invalidateCachedFetch(CUSTOM_FIELDS_CACHE_PREFIX)
}

export const customFieldsApi = {
  async getCustomFields(): Promise<CustomFieldDefinition[]> {
    const response = await cachedFetch(
      getOrgScopedKey(CUSTOM_FIELDS_CACHE_PREFIX),
      () => backendGet<CustomFieldsListResponse>('/api/custom-fields'),
      { ttlMs: CUSTOM_FIELDS_TTL_MS },
    )
    return response.fields || []
  },

  async createCustomField(input: CreateCustomFieldInput): Promise<CustomFieldDefinition> {
    const response = await backendPost<CustomFieldResponse>('/api/custom-fields', input)
    invalidateCustomFieldsCache()
    return response.field
  },

  async updateCustomField(
    fieldId: string,
    updates: UpdateCustomFieldInput,
  ): Promise<CustomFieldDefinition> {
    const response = await backendPatch<CustomFieldResponse>(
      `/api/custom-fields/${fieldId}`,
      updates,
    )
    invalidateCustomFieldsCache()
    return response.field
  },

  async deleteCustomField(fieldId: string): Promise<void> {
    await backendDelete(`/api/custom-fields/${fieldId}`)
    invalidateCustomFieldsCache()
  },
}
