import { randomUUID } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import type { SocialResearchPlatform } from '../types/social-research.types'

@Injectable()
export class SocialResearchTranscriptFallbackService {
  private readonly logger = new Logger(SocialResearchTranscriptFallbackService.name)

  constructor(private readonly userAgentApi: UserAgentApiService) {}

  async fetchTranscriptViaAgent(opts: {
    userId: string
    orgId: string | null
    platform: SocialResearchPlatform
    url: string
  }): Promise<string | null> {
    if (opts.platform !== 'instagram') return null

    const conversationId = randomUUID()
    const orgSuffix = opts.orgId ? `::org:${opts.orgId}` : ''
    const sessionKey = `agent:gateway:mission:atlas:${opts.userId}:${conversationId}${orgSuffix}`

    try {
      const response = await this.userAgentApi.invoke(
        opts.userId,
        '/api/artifacts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-openclaw-internal': 'true',
            'x-session-key': sessionKey,
          },
          body: JSON.stringify({
            action: 'extract_url_transcript',
            data: { url: opts.url, include_metadata: false },
          }),
        },
        {
          timeoutMs: 180_000,
          logTag: `social_research_transcript_fallback user=${opts.userId}`,
        },
      )

      if (!response.ok) {
        this.logger.warn(
          `Transcript fallback returned ${response.status} platform=${opts.platform} url=${opts.url}`,
        )
        return null
      }

      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null
      if (body?.success !== true) return null

      const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : ''
      return transcript || null
    } catch (err) {
      this.logger.warn(
        `Transcript fallback failed platform=${opts.platform} url=${opts.url} err=${err instanceof Error ? err.message : String(err)}`,
      )
      return null
    }
  }
}
