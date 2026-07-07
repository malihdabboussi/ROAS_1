import { BadRequestException, Injectable } from '@nestjs/common'
import { OpenRouterBillingClientService } from '../../provider-billing/services/openrouter-billing-client.service'
import type { GenerateAdConceptsInput } from '../dto/ad-concept.dto'
import { buildAdConceptGeneratorUserMessage } from '../prompts/ad-concept-generator.template'

const CONCEPT_MODEL = 'anthropic/claude-opus-4.6'

@Injectable()
export class AdConceptGenerationService {
  constructor(private readonly openRouterBilling: OpenRouterBillingClientService) {}

  async generateConceptsText(
    input: GenerateAdConceptsInput,
    owner: { userId: string; orgId?: string | null },
  ): Promise<{ text: string }> {
    const userContent = buildAdConceptGeneratorUserMessage({
      audience: input.audience ?? '',
      offer_cta: input.offer_cta ?? '',
      brand_guidelines: input.brand_guidelines ?? '',
      attached_asset_instructions: input.attached_asset_instructions ?? '',
      reference_description: input.reference_description ?? '',
    })

    const completion = await this.openRouterBilling.createChatCompletion({
      owner,
      feature: 'media',
      action: 'generate_ad_concepts',
      sourcePath: 'media/ad-concept-generation',
      model: CONCEPT_MODEL,
      body: {
        max_tokens: 8192,
        messages: [{ role: 'user', content: userContent }],
      },
    })
    const text = completion.data.choices?.[0]?.message?.content?.toString().trim()
    if (!text) {
      throw new BadRequestException('No concepts in model response')
    }
    return { text }
  }
}
