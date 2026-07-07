import { BadRequestException } from '@nestjs/common'
import type { AdSearchKind, AdsResearchPlatform } from '../types/ads-research.types'

export function parseAdsResearchPlatform(value: string): AdsResearchPlatform {
  if (value === 'meta' || value === 'tiktok' || value === 'google') return value
  throw new BadRequestException('Invalid ads research platform')
}

export function parseAdsResearchKind(value: string): AdSearchKind {
  if (value === 'topic' || value === 'brand') return value
  throw new BadRequestException('Invalid ad search kind')
}
