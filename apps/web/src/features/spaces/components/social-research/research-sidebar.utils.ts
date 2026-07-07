import type { SocialPlatform } from '../../types/space-schema'

export function accountNavKey(platform: SocialPlatform, handle: string): string {
  return `${platform}:${handle.toLowerCase()}`
}

export function parseAccountNavKey(key: string): { platform: SocialPlatform; handle: string } {
  const colon = key.indexOf(':')
  if (colon < 0) {
    return { platform: 'instagram', handle: key }
  }
  return {
    platform: key.slice(0, colon) as SocialPlatform,
    handle: key.slice(colon + 1),
  }
}

export const RESEARCH_SIDEBAR_WIDTH_PX = 232
