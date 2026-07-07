'use client'

import { useSyncExternalStore } from 'react'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns/campaign-api'

const cache = new Map<string, Campaign[]>()
const inflight = new Map<string, Promise<Campaign[]>>()
const listeners = new Set<() => void>()
let version = 0

function notify() {
  version += 1
  listeners.forEach((listener) => listener())
}

export function getCachedCampaigns(orgId: string): Campaign[] | undefined {
  return cache.get(orgId)
}

export function isCampaignFetchInFlight(orgId: string): boolean {
  return inflight.has(orgId)
}

export function prefetchOrgCampaigns(orgId: string): Promise<Campaign[]> {
  const existing = inflight.get(orgId)
  if (existing) return existing
  if (cache.has(orgId)) return Promise.resolve(cache.get(orgId)!)
  const request = fetchCampaigns({ orgId })
    .then((list) => {
      cache.set(orgId, list)
      inflight.delete(orgId)
      notify()
      return list
    })
    .catch((err) => {
      inflight.delete(orgId)
      throw err
    })
  inflight.set(orgId, request)
  return request
}

export function invalidateOrgCampaigns(orgId: string) {
  cache.delete(orgId)
  inflight.delete(orgId)
  notify()
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

function getSnapshot(): number {
  return version
}

function getServerSnapshot(): number {
  return 0
}

export function useCampaignCacheVersion(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
