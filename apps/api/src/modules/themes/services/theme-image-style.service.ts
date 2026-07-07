import { BadRequestException, Injectable } from '@nestjs/common'
import { OpenRouterBillingClientService } from '../../provider-billing/services/openrouter-billing-client.service'
import type { GenerateImageStyleInput } from '../dto/theme.dto'

const PROMPT_TEMPLATE = `You are a visual brand strategist specializing in AI image generation. Your task is to create concise, powerful style keywords that will guide AI image generation to match a brand's identity.

Given the brand identity below, generate a set of style keywords (max 500 characters) that describe:
- Visual mood and atmosphere
- Color palette tendencies
- Photography/illustration style
- Lighting preferences
- Composition elements
- Texture and material qualities

**Brand Voice:**
- Tone: {{tone}}
- Style: {{style}}
- Personality: {{personality}}

**Brand Values:**
- Primary Value: {{primaryValue}}
- Secondary Values: {{secondaryValues}}
- Tagline: {{tagline}}

**Requirements:**
- Output ONLY the style keywords, no explanations
- Use comma-separated descriptive phrases
- Focus on visual elements that AI image generators understand
- Make it specific enough to create consistent imagery
- Keep under 500 characters

**Example Output:**
"minimalist professional photography, soft natural lighting, clean white backgrounds, subtle warm tones, modern tech aesthetic, shallow depth of field, high contrast, sophisticated color grading"

Generate the image style keywords:`

@Injectable()
export class ThemeImageStyleService {
  constructor(private readonly openRouterBilling: OpenRouterBillingClientService) {}

  async generate(
    dto: GenerateImageStyleInput,
    owner: { userId: string; orgId?: string | null },
  ): Promise<{ imageStylePrompt: string }> {
    const hasBrandIdentity = Boolean(
      dto.brandVoice?.tone ||
      dto.brandVoice?.style ||
      dto.brandVoice?.personality ||
      dto.brandValues?.primary ||
      (dto.brandValues?.secondary && dto.brandValues.secondary.length > 0) ||
      dto.brandValues?.tagline,
    )

    if (!hasBrandIdentity) {
      throw new BadRequestException('Brand identity is required to generate image style')
    }

    const prompt = PROMPT_TEMPLATE.replace('{{tone}}', dto.brandVoice?.tone || 'Not specified')
      .replace('{{style}}', dto.brandVoice?.style || 'Not specified')
      .replace('{{personality}}', dto.brandVoice?.personality || 'Not specified')
      .replace('{{primaryValue}}', dto.brandValues?.primary || 'Not specified')
      .replace('{{secondaryValues}}', dto.brandValues?.secondary?.join(', ') || 'Not specified')
      .replace('{{tagline}}', dto.brandValues?.tagline || 'Not specified')

    const completion = await this.openRouterBilling.createChatCompletion({
      owner,
      feature: 'themes',
      action: 'generate_image_style',
      sourcePath: 'themes/theme-image-style',
      model: 'anthropic/claude-3-5-haiku-20241022',
      body: {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      },
      signal: AbortSignal.timeout(30_000),
    })

    const imageStylePrompt = completion.data.choices?.[0]?.message?.content?.toString().trim()

    if (!imageStylePrompt) {
      throw new BadRequestException('No response from AI')
    }

    return { imageStylePrompt }
  }
}
