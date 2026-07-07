import { Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { CreditsService } from '../../billing/services/credits.service'
import { BrainRuntimeRepository } from '../repositories/brain-runtime.repository'

interface VoiceProfile {
  name: string
  gender: 'male' | 'female'
  tone: string
  pitch: string
}

const FEMALE_VOICES: VoiceProfile[] = [
  { name: 'Kore', gender: 'female', tone: 'firm', pitch: 'middle' },
  { name: 'Aoede', gender: 'female', tone: 'breezy', pitch: 'middle' },
  { name: 'Zephyr', gender: 'female', tone: 'bright', pitch: 'higher' },
  { name: 'Leda', gender: 'female', tone: 'youthful', pitch: 'higher' },
  { name: 'Achernar', gender: 'female', tone: 'soft', pitch: 'higher' },
  { name: 'Gacrux', gender: 'female', tone: 'mature', pitch: 'middle' },
  { name: 'Erinome', gender: 'female', tone: 'clear', pitch: 'middle' },
  { name: 'Despina', gender: 'female', tone: 'smooth', pitch: 'middle' },
  { name: 'Callirrhoe', gender: 'female', tone: 'easy-going', pitch: 'middle' },
  { name: 'Autonoe', gender: 'female', tone: 'bright', pitch: 'middle' },
  { name: 'Laomedeia', gender: 'female', tone: 'upbeat', pitch: 'higher' },
  { name: 'Vindemiatrix', gender: 'female', tone: 'gentle', pitch: 'middle' },
]

const MALE_VOICES: VoiceProfile[] = [
  { name: 'Charon', gender: 'male', tone: 'informative', pitch: 'lower' },
  { name: 'Fenrir', gender: 'male', tone: 'excitable', pitch: 'lower-middle' },
  { name: 'Orus', gender: 'male', tone: 'firm', pitch: 'lower-middle' },
  { name: 'Puck', gender: 'male', tone: 'upbeat', pitch: 'middle' },
  { name: 'Achird', gender: 'male', tone: 'friendly', pitch: 'lower-middle' },
  { name: 'Rasalgethi', gender: 'male', tone: 'informative', pitch: 'middle' },
  { name: 'Iapetus', gender: 'male', tone: 'clear', pitch: 'lower-middle' },
  { name: 'Umbriel', gender: 'male', tone: 'easy-going', pitch: 'lower-middle' },
  { name: 'Algieba', gender: 'male', tone: 'smooth', pitch: 'lower' },
  { name: 'Enceladus', gender: 'male', tone: 'breathy', pitch: 'lower' },
  { name: 'Alnilam', gender: 'male', tone: 'firm', pitch: 'lower-middle' },
  { name: 'Schedar', gender: 'male', tone: 'even', pitch: 'lower-middle' },
  { name: 'Zubenelgenubi', gender: 'male', tone: 'casual', pitch: 'lower-middle' },
  { name: 'Algenib', gender: 'male', tone: 'gravelly', pitch: 'lower' },
  { name: 'Sadachbia', gender: 'male', tone: 'lively', pitch: 'lower-middle' },
  { name: 'Sulafat', gender: 'male', tone: 'warm', pitch: 'lower-middle' },
  { name: 'Sadaltager', gender: 'male', tone: 'steady', pitch: 'lower-middle' },
  { name: 'Pulcherrima', gender: 'male', tone: 'forward', pitch: 'middle' },
]

export const ALL_VOICES = [...FEMALE_VOICES, ...MALE_VOICES]

const ROLE_VOICE_MAP_FEMALE: Record<string, string> = {
  strateg: 'Gacrux',
  lead: 'Gacrux',
  ceo: 'Aoede',
  director: 'Gacrux',
  creative: 'Aoede',
  design: 'Aoede',
  copywrite: 'Autonoe',
  write: 'Autonoe',
  content: 'Autonoe',
  market: 'Laomedeia',
  social: 'Laomedeia',
  growth: 'Zephyr',
  support: 'Vindemiatrix',
  success: 'Vindemiatrix',
  hr: 'Vindemiatrix',
  analys: 'Erinome',
  research: 'Erinome',
  data: 'Erinome',
  sales: 'Despina',
  account: 'Despina',
  project: 'Callirrhoe',
  ops: 'Callirrhoe',
  autom: 'Erinome',
  integrat: 'Erinome',
  architect: 'Gacrux',
  product: 'Gacrux',
}

const ROLE_VOICE_MAP_MALE: Record<string, string> = {
  strateg: 'Charon',
  lead: 'Alnilam',
  ceo: 'Charon',
  director: 'Alnilam',
  creative: 'Fenrir',
  design: 'Fenrir',
  copywrite: 'Puck',
  write: 'Puck',
  content: 'Puck',
  market: 'Puck',
  social: 'Zubenelgenubi',
  growth: 'Sadachbia',
  support: 'Achird',
  success: 'Achird',
  hr: 'Achird',
  analys: 'Rasalgethi',
  research: 'Rasalgethi',
  data: 'Iapetus',
  sales: 'Algieba',
  account: 'Algieba',
  project: 'Orus',
  ops: 'Schedar',
  autom: 'Orus',
  integrat: 'Iapetus',
  architect: 'Orus',
  product: 'Rasalgethi',
}

@Injectable()
export class VoiceAssignmentService {
  private readonly logger = new Logger(VoiceAssignmentService.name)
  private readonly supabase: SupabaseClient

  constructor(
    private readonly config: ConfigService,
    private readonly svc: SupabaseServiceClient,
    private readonly repository: BrainRuntimeRepository = new BrainRuntimeRepository(),
    @Optional() private readonly creditsService?: CreditsService,
  ) {
    this.supabase = svc.client
  }

  assignVoiceByGenderAndRole(gender: 'male' | 'female', role: string): string {
    const roleLower = role.toLowerCase()
    const map = gender === 'female' ? ROLE_VOICE_MAP_FEMALE : ROLE_VOICE_MAP_MALE
    for (const [keyword, voice] of Object.entries(map)) {
      if (roleLower.includes(keyword)) return voice
    }
    return gender === 'female' ? 'Callirrhoe' : 'Umbriel'
  }

  async resolveAgentVoice(
    agentKey: string,
    userId: string,
    orgId?: string | null,
  ): Promise<string> {
    const { data } = await this.repository.findAgentVoiceRow(this.supabase, {
      agentKey,
      userId,
      orgId,
    })
    if (data?.voice_name) return data.voice_name

    if (!data) return 'Kore'

    const gender = data.image_url
      ? await this.detectAvatarGender(data.image_url, { userId, orgId, agentKey })
      : 'female'
    const voice = this.assignVoiceByGenderAndRole(gender, data.role ?? '')

    await this.repository.updateAgentVoice(this.supabase, { agentKey, userId, orgId, voice })

    this.logger.log(`voice_assigned agent=${agentKey} gender=${gender} voice=${voice}`)
    return voice
  }

  async detectAvatarGender(
    imageUrl: string,
    billing?: { userId: string; orgId?: string | null; agentKey?: string },
  ): Promise<'male' | 'female'> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')
    if (!apiKey) return 'female'

    let chargingProviderUsage = false
    try {
      const prompt =
        'Look at this avatar image. Respond with ONLY the single word "male" or "female" based on the apparent gender of the person/character depicted. If unclear, respond "female".'
      const imageBase64 = await this.fetchImageAsBase64(imageUrl)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                  {
                    inlineData: {
                      mimeType: 'image/png',
                      data: imageBase64,
                    },
                  },
                ],
              },
            ],
          }),
        },
      )

      if (!response.ok) return 'female'
      const result = await response.json()
      const text = (result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim().toLowerCase()
      chargingProviderUsage = true
      await this.chargeAvatarDetectionUsage(result, prompt, text, billing)
      chargingProviderUsage = false

      return text.includes('male') && !text.includes('female') ? 'male' : 'female'
    } catch (err) {
      if (chargingProviderUsage) throw err
      this.logger.warn(
        `avatar_gender_detection_failed url=${imageUrl} err=${err instanceof Error ? err.message : String(err)}`,
      )
      return 'female'
    }
  }

  private async fetchImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url)
    const buffer = Buffer.from(await response.arrayBuffer())
    return buffer.toString('base64')
  }

  private async chargeAvatarDetectionUsage(
    result: any,
    prompt: string,
    output: string,
    billing?: { userId: string; orgId?: string | null; agentKey?: string },
  ): Promise<void> {
    if (!billing?.userId) return
    if (!this.creditsService) {
      if (process.env.NODE_ENV === 'test') return
      throw new Error('voice_assignment_billing_service_not_configured')
    }
    const usage = result?.usageMetadata ?? {}
    const inputTokens = Number(usage.promptTokenCount ?? Math.max(1, Math.ceil(prompt.length / 4)))
    const outputTokens = Number(
      usage.candidatesTokenCount ?? Math.max(1, Math.ceil(output.length / 4)),
    )
    const totalTokens = Number(usage.totalTokenCount ?? inputTokens + outputTokens)
    await this.creditsService.processDirectTextUsage({
      userId: billing.userId,
      orgId: billing.orgId ?? undefined,
      feature: 'brain',
      action: 'voice_avatar_gender_detection',
      modelName: 'gemini-3.5-flash',
      usage: {
        input: Number.isFinite(inputTokens) ? inputTokens : Math.max(1, Math.ceil(prompt.length / 4)),
        output: Number.isFinite(outputTokens) ? outputTokens : 1,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: Number.isFinite(totalTokens) ? totalTokens : inputTokens + outputTokens,
      },
      costSource: usage.totalTokenCount ? 'runtime_tokens' : 'char_estimate',
      metadata: { agent_key: billing.agentKey ?? null },
    })
  }
}
