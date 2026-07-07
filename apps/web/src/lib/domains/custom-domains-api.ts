import { backendFetch, backendGet, backendPost } from '@/lib/api/backend-client'
import type {
  AddDomainResponse,
  DomainConfigResponse,
  ListDomainsResponse,
  RemoveDomainResponse,
  VerifyDomainResponse,
} from './domains.types'

export const customDomainsApi = {
  list: () => backendGet<ListDomainsResponse>('/api/domains'),

  add: (domainName: string) =>
    backendPost<AddDomainResponse>('/api/domains', {
      domain_name: domainName,
    }),

  verify: (domainId: string) =>
    backendPost<VerifyDomainResponse>('/api/domains/verify', {
      domain_id: domainId,
    }),

  config: (domainName: string) =>
    backendGet<DomainConfigResponse>(
      `/api/domains/config?domain_name=${encodeURIComponent(domainName)}`,
    ),

  remove: async (domainId: string) => {
    const res = await backendFetch('/api/domains', {
      method: 'DELETE',
      body: JSON.stringify({ domain_id: domainId }),
    })
    const json = (await res.json()) as RemoveDomainResponse
    if (!res.ok) throw new Error(json?.error ?? `Backend error ${res.status}`)
    return json
  },
}
