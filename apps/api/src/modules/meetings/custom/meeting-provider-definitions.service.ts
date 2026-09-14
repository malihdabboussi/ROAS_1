import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { normalizeMappedMeetingSource, summarizeMappedSource } from './mapped-meeting-source'
import { MeetingProviderDefinitionsRepository } from './meeting-provider-definitions.repository'
import {
  NoteTakerDefinitionInputSchema,
  NoteTakerDefinitionUpdateSchema,
  NoteTakerPreviewSchema,
  NoteTakerSuggestSchema,
  slugFromDisplayName,
  type NoteTakerDefinition,
  type NoteTakerDefinitionInput,
} from './note-taker-definition.schema'
import { NOTE_TAKER_TEMPLATES } from './note-taker-templates'
import { suggestFieldMap } from './suggest-field-map'

/** What the Library needs for a defined note taker; never the field map or signature rule. */
export type NoteTakerListing = {
  id: string
  slug: string
  displayName: string
  description: string | null
  logoUrl: string | null
  requiresSecret: boolean
  signatureHeader: string | null
  isActive: boolean
}

/**
 * Admin-defined note takers: validate, store, and keep the integration catalog
 * row that `user_integrations` references in step. Preview runs the field map
 * over a sample payload so the admin sees the mapping before saving.
 */
@Injectable()
export class MeetingProviderDefinitionsService {
  constructor(private readonly repository: MeetingProviderDefinitionsRepository) {}

  async list(): Promise<NoteTakerListing[]> {
    const definitions = await this.repository.listActive()
    return definitions.map(toListing)
  }

  async getForAdmin(slug: string): Promise<NoteTakerDefinition> {
    const definition = await this.repository.findBySlug(slug)
    if (!definition) throw new NotFoundException('Note taker not found')
    return definition
  }

  async create(body: unknown, createdBy: string): Promise<NoteTakerDefinition> {
    const input = parse(NoteTakerDefinitionInputSchema, body)
    const slug = safeSlug(input.displayName)
    const existing = await this.repository.findBySlug(slug)
    if (existing) {
      throw new ConflictException(`A note taker named "${existing.displayName}" already exists`)
    }
    const definition = await this.repository.insert(slug, input, createdBy)
    await this.repository.upsertCatalogRow(definition)
    return definition
  }

  async update(slug: string, body: unknown): Promise<NoteTakerDefinition> {
    await this.getForAdmin(slug)
    const input = parse(NoteTakerDefinitionUpdateSchema, body)
    const definition = await this.repository.update(slug, input)
    await this.repository.upsertCatalogRow(definition)
    return definition
  }

  async deactivate(slug: string): Promise<void> {
    await this.getForAdmin(slug)
    await this.repository.setActive(slug, false)
  }

  templates() {
    return NOTE_TAKER_TEMPLATES
  }

  /** Guess the field map from one sample delivery; the admin confirms with the preview. */
  suggest(body: unknown) {
    const { samplePayload } = parse(NoteTakerSuggestSchema, body)
    return suggestFieldMap(samplePayload)
  }

  /** Runs the mapping over a sample so the admin can check paths before saving. */
  preview(body: unknown) {
    const { definition, samplePayload } = parse(NoteTakerPreviewSchema, body)
    const slug = safeSlug(definition.displayName)
    try {
      const source = normalizeMappedMeetingSource(samplePayload, { ...definition, slug })
      return { ok: true as const, slug, result: summarizeMappedSource(source) }
    } catch (err) {
      return { ok: false as const, slug, error: err instanceof Error ? err.message : String(err) }
    }
  }
}

function parse<T>(
  schema: {
    safeParse(
      value: unknown,
    ): { success: true; data: T } | { success: false; error: { flatten(): unknown } }
  },
  body: unknown,
): T {
  const result = schema.safeParse(body)
  if (!result.success) {
    throw new BadRequestException({
      success: false,
      error: 'Invalid note taker definition',
      details: result.error.flatten(),
    })
  }
  return result.data
}

function safeSlug(displayName: string) {
  try {
    return slugFromDisplayName(displayName)
  } catch (err) {
    throw new BadRequestException(err instanceof Error ? err.message : String(err))
  }
}

export function toListing(definition: NoteTakerDefinition): NoteTakerListing {
  return {
    id: definition.id,
    slug: definition.slug,
    displayName: definition.displayName,
    description: definition.description ?? null,
    logoUrl: definition.logoUrl ?? null,
    requiresSecret: definition.signature.scheme !== 'none',
    signatureHeader: definition.signature.scheme === 'none' ? null : definition.signature.header,
    isActive: definition.isActive,
  }
}

export type { NoteTakerDefinitionInput }
