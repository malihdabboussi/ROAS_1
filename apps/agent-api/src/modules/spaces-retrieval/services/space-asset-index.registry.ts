import { Injectable } from '@nestjs/common'
import type {
  SpaceRetrieveVia,
  SpaceSemanticAsset,
  SpaceSemanticSourceType,
} from '../types/space-retrieval.types'

@Injectable()
export class SpaceAssetIndexRegistry {
  toAsset(
    sourceType: SpaceSemanticSourceType,
    row: Record<string, unknown>,
    input: { userId: string; orgId?: string | null; spaceId?: string | null },
  ): SpaceSemanticAsset | null {
    if (sourceType === 'space') return this.spaceAsset(row, input)
    if (sourceType === 'space_view') return this.spaceViewAsset(row, input)
    if (sourceType === 'space_doc' || sourceType === 'space_task') {
      return this.spaceItemAsset(sourceType, row, input)
    }
    if (this.isSocialResearchSourceType(sourceType)) {
      return this.socialResearchAsset(sourceType, row, input)
    }
    if (sourceType === 'space_activity') return this.spaceActivityAsset(row, input)
    if (sourceType === 'space_deliverable') return this.spaceDeliverableAsset(row, input)
    if (sourceType === 'mission') return this.missionAsset(row, input)
    if (sourceType === 'mission_subtask') return this.missionSubtaskAsset(row, input)
    if (sourceType === 'mission_deliverable') return this.missionDeliverableAsset(row, input)
    if (sourceType === 'conversation_document') return this.conversationDocumentAsset(row, input)
    if (this.isReportingSnapshotSourceType(sourceType)) {
      return this.reportingSnapshotAsset(sourceType, row, input)
    }
    return this.richRowAsset(sourceType, row, input)
  }

  socialResearchSourceTypeForViewType(viewType: unknown): SpaceSemanticSourceType | null {
    if (viewType === 'instagram_research') return 'instagram_research_item'
    if (viewType === 'tiktok_research') return 'tiktok_research_item'
    if (viewType === 'youtube_research') return 'youtube_research_item'
    if (viewType === 'twitter_research') return 'twitter_research_item'
    return null
  }

  private spaceAsset(
    row: Record<string, unknown>,
    input: { userId: string; orgId?: string | null; spaceId?: string | null },
  ): SpaceSemanticAsset {
    const title = this.text(row.title) || 'Untitled Space'
    const schema = this.record(row.schema)
    const views = Array.isArray(schema?.views)
      ? schema.views
          .map((view) => this.text((view as Record<string, unknown>).name))
          .filter(Boolean)
          .join(', ')
      : ''
    const content = [title, this.text(row.description), views ? `Views: ${views}` : '']
      .filter(Boolean)
      .join('\n')
    return this.base('space', String(row.id), title, content, row, input, {
      action: 'get_space',
      data: { space_id: row.id },
    })
  }

  private spaceViewAsset(
    row: Record<string, unknown>,
    input: { userId: string; orgId?: string | null; spaceId?: string | null },
  ): SpaceSemanticAsset {
    const view = this.record(row.view) ?? row
    const title = this.text(view.name) || this.text(view.type) || 'Space view'
    const content = [
      `View: ${title}`,
      this.text(view.type) ? `Type: ${this.text(view.type)}` : '',
      this.text(view.id) ? `View ID: ${this.text(view.id)}` : '',
      this.stringifyUsefulJson(view),
    ]
      .filter(Boolean)
      .join('\n')
    return this.base('space_view', String(row.id ?? view.id), title, content, row, input, {
      action: 'get_space',
      data: { space_id: row.space_id ?? input.spaceId, view_id: view.id },
    })
  }

  private spaceItemAsset(
    sourceType: 'space_doc' | 'space_task',
    row: Record<string, unknown>,
    input: { userId: string; orgId?: string | null; spaceId?: string | null },
  ): SpaceSemanticAsset {
    const title =
      this.text(row.title) || (sourceType === 'space_doc' ? 'Untitled Doc' : 'Untitled Task')
    const customData = this.record(row.custom_data) ?? {}
    const customText = this.stringifyUsefulJson(customData)
    const content = [
      title,
      this.text(row.description),
      this.text(row.notes),
      this.htmlToPlainText(this.text(row.doc_body)),
      this.text(row.status) ? `Status: ${this.text(row.status)}` : '',
      this.text(row.priority) ? `Priority: ${this.text(row.priority)}` : '',
      customText,
    ]
      .filter(Boolean)
      .join('\n')
    return this.base(sourceType, String(row.id), title, content, row, input, {
      action: sourceType === 'space_doc' ? 'read_space_document' : 'get_task',
      data:
        sourceType === 'space_doc'
          ? { space_id: row.space_id, document_id: row.id }
          : { space_id: row.space_id, task_id: row.id },
    })
  }

  private socialResearchAsset(
    sourceType: SpaceSemanticSourceType,
    row: Record<string, unknown>,
    input: { userId: string; orgId?: string | null; spaceId?: string | null },
  ): SpaceSemanticAsset {
    const customData = this.record(row.custom_data) ?? {}
    const platform = this.socialPlatformForSourceType(sourceType) ?? this.text(customData._platform)
    const handle = this.text(customData._handle)
    const mediaId =
      this.text(customData.media_id) ||
      this.text(customData.ig_media_id) ||
      this.text(customData.aweme_id) ||
      this.text(customData.video_id) ||
      this.text(customData.tweet_id)
    const title = [
      platform ? platform.toUpperCase() : 'Social research',
      handle ? `@${handle}` : '',
      this.text(row.title) || mediaId,
    ]
      .filter(Boolean)
      .join(' ')
    const metrics = [
      this.numberLine('Views', customData.play_count),
      this.numberLine('Likes', customData.like_count),
      this.numberLine('Comments', customData.comment_count),
      this.numberLine('Outlier score', customData.outlier_score),
      this.text(customData.taken_at) ? `Posted: ${this.text(customData.taken_at)}` : '',
    ]
      .filter(Boolean)
      .join('\n')
    const content = [
      title,
      platform ? `Platform: ${platform}` : '',
      handle ? `Handle: @${handle}` : '',
      mediaId ? `Media ID: ${mediaId}` : '',
      this.text(customData.media_type) ? `Format: ${this.text(customData.media_type)}` : '',
      this.text(customData.post_url) ? `URL: ${this.text(customData.post_url)}` : '',
      this.text(customData.caption) ? `Caption: ${this.text(customData.caption)}` : '',
      this.text(customData.hook) ? `Hook: ${this.text(customData.hook)}` : '',
      this.text(customData.transcript) ? `Transcript: ${this.text(customData.transcript)}` : '',
      metrics,
      this.stringifyUsefulJson(this.pickUsefulSocialMetadata(customData)),
    ]
      .filter(Boolean)
      .join('\n')
    return this.base(
      sourceType,
      String(row.id),
      title || 'Social research item',
      content,
      row,
      input,
      {
        action: 'get_task',
        data: { space_id: row.space_id ?? input.spaceId, task_id: row.id },
      },
    )
  }

  private spaceActivityAsset(
    row: Record<string, unknown>,
    input: { userId: string; orgId?: string | null; spaceId?: string | null },
  ): SpaceSemanticAsset {
    const payload = this.record(row.payload) ?? {}
    const title = `${this.text(row.event_type) || 'Activity'} on Space item`
    const content = [title, this.text(payload.message), this.stringifyUsefulJson(payload)]
      .filter(Boolean)
      .join('\n')
    return this.base('space_activity', String(row.id), title, content, row, input, {
      action: 'get_task',
      data: { space_id: row.space_id, task_id: row.item_id },
    })
  }

  private spaceDeliverableAsset(
    row: Record<string, unknown>,
    input: { userId: string; orgId?: string | null; spaceId?: string | null },
  ): SpaceSemanticAsset {
    const title = this.text(row.title) || 'Space deliverable'
    const content = [
      title,
      this.text(row.content),
      this.text(row.file_name),
      this.stringifyUsefulJson(this.record(row.metadata)),
    ]
      .filter(Boolean)
      .join('\n')
    return this.base('space_deliverable', String(row.id), title, content, row, input, {
      action: 'get_task',
      data: { space_id: row.space_id, task_id: row.item_id },
    })
  }

  private missionAsset(
    row: Record<string, unknown>,
    input: { userId: string; orgId?: string | null; spaceId?: string | null },
  ): SpaceSemanticAsset {
    const title = this.text(row.title) || 'Mission'
    const content = [
      title,
      this.text(row.brief),
      this.text(row.description),
      this.text(row.progress_notes),
      this.stringifyUsefulJson(row.input),
      this.stringifyUsefulJson(row.output),
    ]
      .filter(Boolean)
      .join('\n')
    return this.base('mission', String(row.id), title, content, row, input, {
      action: 'get_mission',
      data: { mission_id: row.id },
    })
  }

  private missionSubtaskAsset(
    row: Record<string, unknown>,
    input: { userId: string; orgId?: string | null; spaceId?: string | null },
  ): SpaceSemanticAsset {
    const title = this.text(row.title) || 'Mission subtask'
    const content = [title, this.text(row.feedback), this.stringifyUsefulJson(row.output)]
      .filter(Boolean)
      .join('\n')
    return this.base('mission_subtask', String(row.id), title, content, row, input, {
      action: 'list_mission_subtasks',
      data: { mission_id: row.mission_id },
    })
  }

  private missionDeliverableAsset(
    row: Record<string, unknown>,
    input: { userId: string; orgId?: string | null; spaceId?: string | null },
  ): SpaceSemanticAsset {
    const title = this.text(row.title) || 'Mission deliverable'
    const content = [
      title,
      this.text(row.content),
      this.stringifyUsefulJson(row.content_json),
      this.text(row.file_name),
      this.stringifyUsefulJson(row.metadata),
    ]
      .filter(Boolean)
      .join('\n')
    return this.base('mission_deliverable', String(row.id), title, content, row, input, {
      action: 'get_mission_deliverables',
      data: { mission_id: row.mission_id },
    })
  }

  private conversationDocumentAsset(
    row: Record<string, unknown>,
    input: { userId: string; orgId?: string | null; spaceId?: string | null },
  ): SpaceSemanticAsset {
    const title = this.text(row.title) || 'Conversation document'
    const content = [title, this.stringifyUsefulJson(row.content), this.text(row.document_type)]
      .filter(Boolean)
      .join('\n')
    return this.base('conversation_document', String(row.id), title, content, row, input, {
      action: 'get_document',
      data: { document_id: row.id },
    })
  }

  private reportingSnapshotAsset(
    sourceType: SpaceSemanticSourceType,
    row: Record<string, unknown>,
    input: { userId: string; orgId?: string | null; spaceId?: string | null },
  ): SpaceSemanticAsset {
    const title = this.text(row.title) || this.humanSourceType(sourceType)
    const content = [
      title,
      this.text(row.summary),
      this.text(row.range_label) ? `Range: ${this.text(row.range_label)}` : '',
      this.stringifyUsefulJson(row.metrics),
      this.stringifyUsefulJson(row.rows),
      this.stringifyUsefulJson(row.metadata),
    ]
      .filter(Boolean)
      .join('\n')
    return this.base(sourceType, String(row.id), title, content, row, input, {
      action: 'search_space_context',
      data: { space_id: row.space_id ?? input.spaceId, source_types: [sourceType] },
    })
  }

  private richRowAsset(
    sourceType: SpaceSemanticSourceType,
    row: Record<string, unknown>,
    input: { userId: string; orgId?: string | null; spaceId?: string | null },
  ): SpaceSemanticAsset | null {
    const title = this.titleForRichRow(sourceType, row)
    const content = [
      title,
      this.text(row.description),
      this.text(row.summary),
      this.text(row.content),
      this.text(row.body),
      this.text(row.subject),
      this.text(row.caption),
      this.text(row.headline),
      this.text(row.primary_text),
      this.text(row.generated_html),
      this.text(row.generated_css),
      this.stringifyUsefulJson(row.schema),
      this.stringifyUsefulJson(row.settings),
      this.stringifyUsefulJson(row.metadata),
      this.stringifyUsefulJson(row.persona_data),
      this.stringifyUsefulJson(row.generated_tsx),
      this.stringifyUsefulJson(row.carousel_slides),
      this.stringifyUsefulJson(row.targeting),
      this.stringifyUsefulJson(row.seo),
    ]
      .filter(Boolean)
      .join('\n')
    if (!content.trim()) return null
    return this.base(
      sourceType,
      String(row.id),
      title,
      content,
      row,
      input,
      this.retrieveVia(sourceType, row),
    )
  }

  private base(
    sourceType: SpaceSemanticSourceType,
    sourceId: string,
    title: string,
    content: string,
    row: Record<string, unknown>,
    input: { userId: string; orgId?: string | null; spaceId?: string | null },
    retrieveVia: SpaceRetrieveVia,
  ): SpaceSemanticAsset {
    const metadata = this.record(row.metadata) ?? {}
    return {
      sourceType,
      sourceId,
      title,
      summary: content.slice(0, 240),
      content,
      userId: input.userId,
      orgId: this.optionalUuid(row.org_id) ?? input.orgId ?? null,
      spaceId:
        sourceType === 'space'
          ? sourceId
          : (this.optionalUuid(row.space_id) ?? input.spaceId ?? null),
      campaignId: this.optionalUuid(row.campaign_id),
      parentType: this.text(row.parent_type) || null,
      parentId: this.optionalUuid(
        row.parent_id ?? row.parent_item_id ?? row.item_id ?? row.mission_id,
      ),
      sourceUpdatedAt: this.text(row.updated_at ?? row.created_at) || null,
      metadata: { ...metadata, raw_source_type: sourceType },
      retrieveVia,
    }
  }

  private retrieveVia(
    sourceType: SpaceSemanticSourceType,
    row: Record<string, unknown>,
  ): SpaceRetrieveVia {
    if (sourceType === 'contact')
      return { action: 'search_space_context', data: { source_id: row.id } }
    if (sourceType === 'channel' || sourceType === 'channel_message') {
      return { action: 'search_space_context', data: { source_id: row.id } }
    }
    if (sourceType === 'media_asset')
      return { action: 'search_space_context', data: { source_id: row.id } }
    if (sourceType === 'funnel' || sourceType === 'funnel_page' || sourceType === 'blog_post') {
      return { action: 'list_funnels', data: { campaign_id: row.campaign_id } }
    }
    if (sourceType === 'sequence' || sourceType === 'sequence_email' || sourceType === 'email') {
      return { action: 'list_sequences', data: { campaign_id: row.campaign_id } }
    }
    return { action: 'search_space_context', data: { source_id: row.id, source_type: sourceType } }
  }

  private titleForRichRow(
    sourceType: SpaceSemanticSourceType,
    row: Record<string, unknown>,
  ): string {
    return (
      this.text(row.title) ||
      this.text(row.name) ||
      this.text(row.subject) ||
      this.text(row.headline) ||
      this.text(row.slug) ||
      this.humanSourceType(sourceType)
    )
  }

  private numberLine(label: string, value: unknown): string {
    if (value === null || value === undefined || value === '') return ''
    const numeric = Number(value)
    return Number.isFinite(numeric) ? `${label}: ${numeric}` : ''
  }

  private pickUsefulSocialMetadata(customData: Record<string, unknown>): Record<string, unknown> {
    const keys = [
      'owner_username',
      'owner_full_name',
      'owner_follower_count',
      'audio_name',
      'audio_artist',
      'hashtag_names',
      'mention_handles',
      'link_urls',
      'post_description',
      'post_genre',
      'keyword_names',
      'transcript_language',
      'retweet_count',
      'quote_count',
      'bookmark_count',
    ]
    return Object.fromEntries(
      keys.filter((key) => customData[key] !== undefined).map((key) => [key, customData[key]]),
    )
  }

  private socialPlatformForSourceType(sourceType: SpaceSemanticSourceType): string | null {
    if (sourceType === 'instagram_research_item') return 'instagram'
    if (sourceType === 'tiktok_research_item') return 'tiktok'
    if (sourceType === 'youtube_research_item') return 'youtube'
    if (sourceType === 'twitter_research_item') return 'twitter'
    return null
  }

  private isSocialResearchSourceType(sourceType: SpaceSemanticSourceType): boolean {
    return (
      sourceType === 'instagram_research_item' ||
      sourceType === 'tiktok_research_item' ||
      sourceType === 'youtube_research_item' ||
      sourceType === 'twitter_research_item'
    )
  }

  private isReportingSnapshotSourceType(sourceType: SpaceSemanticSourceType): boolean {
    return sourceType.endsWith('_snapshot')
  }

  private humanSourceType(sourceType: SpaceSemanticSourceType): string {
    return sourceType.replace(/_/g, ' ')
  }

  private optionalUuid(value: unknown): string | null {
    return this.text(value) || null
  }

  private text(value: unknown): string {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : ''
  }

  private record(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  }

  private stringifyUsefulJson(value: unknown): string {
    if (typeof value === 'string') return value
    if (value == null) return ''
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }

  private htmlToPlainText(value: string): string {
    return value
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
}
