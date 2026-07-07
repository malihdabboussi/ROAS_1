export class ArtifactMissionsMediaUsageService {
  async chargeDeepgramUsage(
    target: Record<string, any>,
    params: {
      userId: string
      campaignId?: string | null
      sessionKey?: string
      action: 'analyze_video' | 'transcribe_audio' | 'extract_url_transcript'
      transcript: string
      metadata?: Record<string, unknown>
    },
  ): Promise<void> {
    const transcript = params.transcript.trim()
    const credits = target.credits
    if (!transcript) return
    if (!credits || typeof credits.processDirectTextUsage !== 'function') {
      if (process.env.NODE_ENV === 'test') return
      throw new Error('artifact_media_billing_service_not_configured')
    }

    const estimatedTokens = Math.max(1, Math.round(transcript.length / 4))
    const conversationId =
      params.sessionKey && typeof target.parseConversationId === 'function'
        ? target.parseConversationId(params.sessionKey)
        : null

    const transcribeOrgId =
      params.sessionKey && typeof target.resolveOrgId === 'function'
        ? (target.resolveOrgId(params.sessionKey) as string | null)
        : null
    await credits.processDirectTextUsage({
      userId: params.userId,
      campaignId: params.campaignId ?? undefined,
      conversationId: conversationId ?? undefined,
      orgId: transcribeOrgId ?? undefined,
      feature: 'transcribe',
      action: params.action,
      modelName: 'deepgram/nova-3',
      usage: {
        input: estimatedTokens,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: estimatedTokens,
      },
      costSource: 'char_estimate',
      metadata: params.metadata ?? undefined,
    })
  }

  async chargeScrapeCreatorsUsage(
    target: Record<string, any>,
    params: {
      userId: string
      sessionKey?: string
      actionSlug: string
      metadata?: Record<string, unknown>
    },
  ): Promise<void> {
    const credits = target.credits
    if (!credits || typeof credits.processDirectTextUsage !== 'function') {
      if (process.env.NODE_ENV === 'test') return
      throw new Error('artifact_media_billing_service_not_configured')
    }
    const creditUnits =
      (
        {
          instagram_media_transcript: 80,
          tiktok_video_transcript: 80,
          twitter_tweet_transcript: 80,
          facebook_post_transcript: 80,
          youtube_video_transcript: 80,
        } as Record<string, number>
      )[params.actionSlug] ?? 60
    const orgId =
      params.sessionKey && typeof target.resolveOrgId === 'function'
        ? (target.resolveOrgId(params.sessionKey) as string | null)
        : null
    const conversationId =
      params.sessionKey && typeof target.parseConversationId === 'function'
        ? target.parseConversationId(params.sessionKey)
        : null
    await credits.processDirectTextUsage({
      userId: params.userId,
      conversationId: conversationId ?? undefined,
      orgId: orgId ?? undefined,
      feature: 'scrapecreators',
      action: params.actionSlug,
      modelName: `scrapecreators/${params.actionSlug}`,
      usage: {
        input: creditUnits,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: creditUnits,
      },
      costSource: 'scrapecreators_flat',
      metadata: params.metadata ?? undefined,
    })
  }
}
