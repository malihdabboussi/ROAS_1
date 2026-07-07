import { BadRequestException } from '@nestjs/common'
import type { SocialResearchPlatform } from '../types/social-research.types'

export function parseSocialResearchPlatform(value: string): SocialResearchPlatform {
  if (value === 'instagram' || value === 'tiktok' || value === 'youtube' || value === 'twitter') {
    return value
  }
  throw new BadRequestException('Invalid social research platform')
}
