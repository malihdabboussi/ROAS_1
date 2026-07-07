import { createHash } from 'crypto'
import { Injectable } from '@nestjs/common'
import type { SpaceSemanticAsset, SpaceSemanticSourceType } from '../types/space-retrieval.types'

type KeywordContext = {
  contextualPrefix: string
  searchTerms: string[]
  entities: string[]
  aliases: string[]
  contentHash: string
  metadata: Record<string, unknown>
}

const STOPWORDS = new Set([
  'about',
  'after',
  'before',
  'from',
  'into',
  'that',
  'this',
  'with',
  'your',
  'their',
  'there',
  'where',
  'when',
  'what',
  'which',
  'would',
  'could',
  'should',
  'space',
  'task',
  'mission',
  'document',
])

@Injectable()
export class SpaceKeywordContextService {
  build(asset: SpaceSemanticAsset, chunk: string, chunkIndex: number): KeywordContext {
    const aliases = this.compactStrings([
      asset.title,
      String(asset.metadata?.slug ?? ''),
      String(asset.metadata?.file_name ?? ''),
      String(asset.metadata?.label ?? ''),
      String(asset.metadata?.source_title ?? ''),
    ])
    const entities = this.extractEntities(
      [
        asset.title,
        chunk,
        String(asset.metadata?.space_title ?? ''),
        String(asset.metadata?.campaign_title ?? ''),
        String(asset.metadata?.mission_title ?? ''),
      ].join(' '),
    )
    const searchTerms = this.extractSearchTerms(
      [
        asset.title,
        asset.summary ?? '',
        chunk,
        aliases.join(' '),
        entities.join(' '),
        JSON.stringify(asset.metadata ?? {}),
      ].join(' '),
    )
    const contextualPrefix = this.contextualPrefix(asset, searchTerms.slice(0, 8))
    const contentHash = this.hash(`${contextualPrefix}\n${chunk}`)
    const metadata = {
      ...(asset.metadata ?? {}),
      asset_type: asset.sourceType,
      source_type: asset.sourceType,
      source_id: asset.sourceId,
      search_terms: searchTerms,
      entities,
      aliases,
      scope: {
        user_id: asset.userId,
        org_id: asset.orgId ?? null,
        space_id: asset.spaceId ?? null,
        campaign_id: asset.campaignId ?? null,
        parent_type: asset.parentType ?? null,
        parent_id: asset.parentId ?? null,
      },
      retrieve_via: asset.retrieveVia ?? null,
      source_updated_at: asset.sourceUpdatedAt ?? null,
      content_hash: contentHash,
      chunk_index: chunkIndex,
    }
    return { contextualPrefix, searchTerms, entities, aliases, contentHash, metadata }
  }

  private contextualPrefix(asset: SpaceSemanticAsset, keywords: string[]): string {
    const parts = [
      `Source: ${asset.title || asset.sourceType}.`,
      `Type: ${this.humanSourceType(asset.sourceType)}.`,
      asset.spaceId ? `Space ID: ${asset.spaceId}.` : '',
      asset.campaignId ? `Campaign ID: ${asset.campaignId}.` : '',
      asset.parentType && asset.parentId ? `Parent: ${asset.parentType} ${asset.parentId}.` : '',
      asset.summary ? `Summary: ${asset.summary}.` : '',
      keywords.length > 0 ? `Important terms: ${keywords.join(', ')}.` : '',
    ]
    return parts.filter(Boolean).join(' ')
  }

  private humanSourceType(sourceType: SpaceSemanticSourceType): string {
    return sourceType.replace(/_/g, ' ')
  }

  private extractSearchTerms(text: string): string[] {
    const terms = text
      .toLowerCase()
      .split(/[^a-z0-9_-]+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 3 && !STOPWORDS.has(term))
    return [...new Set(terms)].slice(0, 48)
  }

  private extractEntities(text: string): string[] {
    const matches =
      text.match(/\b[A-Z][A-Za-z0-9_-]{2,}(?:\s+[A-Z][A-Za-z0-9_-]{2,}){0,4}\b/g) ?? []
    return this.compactStrings(matches).slice(0, 24)
  }

  private compactStrings(values: string[]): string[] {
    return [
      ...new Set(
        values
          .map((value) => value.trim().replace(/\s+/g, ' '))
          .filter((value) => value.length > 0),
      ),
    ]
  }

  private hash(value: string): string {
    return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
  }
}
