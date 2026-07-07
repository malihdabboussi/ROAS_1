'use client'

import { backendFetch } from '../api/backend-client'

interface StreamConfigResponse {
  success: boolean
  apiKey: string
  config: {
    model: string
    interim_results: boolean
    smart_format: boolean
    language: string
  }
}

interface StreamUsageResponse {
  success: boolean
  message?: string
  error?: string
}

interface ApiKeyTestResponse {
  success: boolean
  hasApiKey: boolean
  keyLength: number
  keyPreview: string
  environment: string
}

export const transcribeBackendApi = {
  getStreamConfig: async (): Promise<StreamConfigResponse> => {
    const res = await backendFetch('/api/transcribe/stream-config', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    if (!res.ok) throw new Error(`Backend error ${res.status}`)
    return res.json() as Promise<StreamConfigResponse>
  },

  trackStreamUsage: async (data: {
    durationSeconds: number
    model?: string
    metadata?: Record<string, unknown>
  }): Promise<StreamUsageResponse> => {
    const res = await backendFetch('/api/transcribe/stream-usage', {
      method: 'POST',
      body: JSON.stringify({
        durationSeconds: data.durationSeconds,
        model: data.model || 'nova-2-multilingual',
        metadata: data.metadata,
      }),
    })
    if (!res.ok) throw new Error(`Backend error ${res.status}`)
    return res.json() as Promise<StreamUsageResponse>
  },

  testApiKey: async (): Promise<ApiKeyTestResponse> => {
    const res = await backendFetch('/api/transcribe/test')
    if (!res.ok) throw new Error(`Backend error ${res.status}`)
    return res.json() as Promise<ApiKeyTestResponse>
  },
}

export type TranscribeBackendApi = typeof transcribeBackendApi
