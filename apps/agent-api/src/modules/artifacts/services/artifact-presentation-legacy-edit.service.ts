import { Injectable } from '@nestjs/common'
import { normalizeFunnelPageSource, validateFunnelTsxContract } from '@vibey/api-shared'
import { ArtifactPresentationsRepository } from '../repositories/artifact-presentations.repository'
import {
  applyTsxPatch,
  parsePresentationSections,
  rebuildPresentationHtml,
  validatePatchValue,
} from '../utils/artifact-patch.util'

@Injectable()
export class ArtifactPresentationLegacyEditService {
  constructor(
    private readonly repository: ArtifactPresentationsRepository = new ArtifactPresentationsRepository(),
  ) {}

  async patchPresentation(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const presentationId = String(input.presentation_id ?? '').trim()
    if (!presentationId) return { success: false, error: 'presentation_id required' }

    const patchTypeRaw = (input.patch_type as string | undefined) ?? 'text'
    const patchType = patchTypeRaw === 'className' ? 'className' : ('text' as const)
    const value = input.value as string | undefined

    if (value) {
      const valueError = validatePatchValue(patchType, value)
      if (valueError) return { success: false, error: valueError }
    }

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const { data: presentation, error: fetchErr } = await this.repository.findPresentation(
      supabase,
      { presentationId, userId, columns: 'id, generated_html' },
    )

    if (fetchErr) throw fetchErr
    if (!presentation) return { success: false, error: 'Presentation not found' }

    const originalHtml = String((presentation as Record<string, unknown>).generated_html ?? '')
    if (!originalHtml.trim()) {
      return { success: false, error: 'Presentation has no generated_html to patch' }
    }

    const patchResult = applyTsxPatch({
      originalHtml,
      markerId: input.marker_id as string | undefined,
      patchType,
      value,
      fallbackFind: input.fallback_find as string | undefined,
      fallbackReplace: input.fallback_replace as string | undefined,
    })
    if (!patchResult.success) return { success: false, error: patchResult.error }

    const normalized = this.sanitizeAndValidatePresentationTsx(patchResult.nextHtml!)
    if (normalized.error) return { success: false, error: normalized.error }

    const { error: updateErr } = await this.repository.updatePresentationFields(supabase, {
      presentationId,
      userId,
      updates: { generated_html: normalized.value },
    })

    if (updateErr) throw updateErr
    return {
      success: true,
      presentation_id: presentationId,
      patched: patchResult.strategy ?? 'fallback',
    }
  }

  async updatePresentationSlide(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const presentationId = String(input.presentation_id ?? '').trim()
    if (!presentationId) return { success: false, error: 'presentation_id required' }

    const slideIndex = Number(input.slide_index)
    if (!Number.isInteger(slideIndex) || slideIndex < 0) {
      return { success: false, error: 'slide_index must be a non-negative integer' }
    }

    const newSectionHtml = input.generated_html as string | undefined
    if (!newSectionHtml || typeof newSectionHtml !== 'string' || !newSectionHtml.trim()) {
      return { success: false, error: 'generated_html (new slide TSX) is required' }
    }

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const { data: presentation, error: fetchErr } = await this.repository.findPresentation(
      supabase,
      { presentationId, userId, columns: 'id, generated_html' },
    )

    if (fetchErr) throw fetchErr
    if (!presentation) return { success: false, error: 'Presentation not found' }

    const originalHtml = String((presentation as Record<string, unknown>).generated_html ?? '')
    const parsed = parsePresentationSections(originalHtml)
    if (!parsed) {
      return {
        success: false,
        error:
          'Could not parse presentation sections. Ensure generated_html uses <section> elements for each slide.',
      }
    }

    if (slideIndex >= parsed.sections.length) {
      return {
        success: false,
        error: `slide_index ${slideIndex} is out of range. Presentation has ${parsed.sections.length} slides (0-${parsed.sections.length - 1}).`,
      }
    }

    parsed.sections[slideIndex] = newSectionHtml.trim()
    const rebuilt = rebuildPresentationHtml(parsed)

    const normalized = this.sanitizeAndValidatePresentationTsx(rebuilt)
    if (normalized.error) return { success: false, error: normalized.error }

    const { error: updateErr } = await this.repository.updatePresentationFields(supabase, {
      presentationId,
      userId,
      updates: { generated_html: normalized.value },
    })

    if (updateErr) throw updateErr
    return {
      success: true,
      presentation_id: presentationId,
      slide_index: slideIndex,
      total_slides: parsed.sections.length,
    }
  }

  async addPresentationSlide(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const presentationId = String(input.presentation_id ?? '').trim()
    if (!presentationId) return { success: false, error: 'presentation_id required' }

    const slideIndex = Number(input.slide_index)
    if (!Number.isInteger(slideIndex) || slideIndex < 0) {
      return { success: false, error: 'slide_index must be a non-negative integer' }
    }

    const newSectionHtml = input.generated_html as string | undefined
    if (!newSectionHtml || typeof newSectionHtml !== 'string' || !newSectionHtml.trim()) {
      return { success: false, error: 'generated_html (new slide TSX) is required' }
    }

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const { data: presentation, error: fetchErr } = await this.repository.findPresentation(
      supabase,
      { presentationId, userId, columns: 'id, generated_html' },
    )

    if (fetchErr) throw fetchErr
    if (!presentation) return { success: false, error: 'Presentation not found' }

    const originalHtml = String((presentation as Record<string, unknown>).generated_html ?? '')
    const parsed = parsePresentationSections(originalHtml)
    if (!parsed) {
      return {
        success: false,
        error:
          'Could not parse presentation sections. Ensure generated_html uses <section> elements for each slide.',
      }
    }

    if (slideIndex > parsed.sections.length) {
      return {
        success: false,
        error: `slide_index ${slideIndex} is out of range. Use 0-${parsed.sections.length} to insert (${parsed.sections.length} appends at end).`,
      }
    }

    parsed.sections.splice(slideIndex, 0, newSectionHtml.trim())
    const rebuilt = rebuildPresentationHtml(parsed)

    const normalized = this.sanitizeAndValidatePresentationTsx(rebuilt)
    if (normalized.error) return { success: false, error: normalized.error }

    const { error: updateErr } = await this.repository.updatePresentationFields(supabase, {
      presentationId,
      userId,
      updates: { generated_html: normalized.value },
    })

    if (updateErr) throw updateErr
    return {
      success: true,
      presentation_id: presentationId,
      slide_index: slideIndex,
      total_slides: parsed.sections.length,
    }
  }

  private sanitizeAndValidatePresentationTsx(raw: string): { value: string; error: string | null } {
    const normalized = normalizeFunnelPageSource({ generatedHtmlRaw: raw })
    const validation = validateFunnelTsxContract(normalized.generatedHtml)
    return {
      value: normalized.generatedHtml,
      error: validation.valid
        ? null
        : String(validation.message ?? 'generated_html is not valid TSX'),
    }
  }
}
