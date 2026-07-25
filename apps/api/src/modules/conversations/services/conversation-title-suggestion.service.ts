import { Injectable } from '@nestjs/common'
import { LoggerService } from '@vibey/api-shared'
import { CreditsService } from '../../billing/services/credits.service'

const ERR_SUGGEST_TITLE_UNAVAILABLE = 'SUGGEST_TITLE_UNAVAILABLE'
const ERR_SUGGEST_TITLE_FAILED = 'SUGGEST_TITLE_FAILED'

@Injectable()
export class ConversationTitleSuggestionService {
  constructor(
    private readonly logger: LoggerService,
    private readonly creditsService: CreditsService,
  ) {}

  async suggestConversationTitle(userMessage: string, userId: string): Promise<{ title: string }> {
    const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!geminiApiKey) {
      await this.logger.logError({
        severity: 'critical',
        feature: 'conversations/suggest-title',
        error_code: 'CONFIG_ERROR',
        message: 'Gemini API key not configured for title suggestion',
        context: {},
        user_id: userId,
      })
      throw new Error(ERR_SUGGEST_TITLE_UNAVAILABLE)
    }

    const maxIn = 8000
    const input = userMessage.length > maxIn ? userMessage.slice(0, maxIn) : userMessage
    const instruction = `The user started a chat with this first message (may be long; focus on the main intent):

${input}

Reply with ONLY valid JSON, no markdown, in this exact shape:
{"title":"<short chat title>"}

Rules for title:
- 3-6 words (short noun phrase, like ChatGPT/Claude sidebar titles)
- Prefer Title Case when natural (e.g. "Budget Approval Check")
- Describe the topic, not a greeting or the first sentence verbatim
- No quotes inside the string, no emojis, no trailing punctuation
- Never include Slack IDs, channel mentions, or raw markup`

    const model = 'gemini-3.5-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: instruction }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        await this.logger.logError({
          severity: 'error',
          feature: 'conversations/suggest-title',
          error_code: 'EXTERNAL_API_ERROR',
          message: 'Gemini generateContent returned non-OK status',
          context: { status: response.status, bodyPreview: errText.slice(0, 500) },
          user_id: userId,
        })
        throw new Error(ERR_SUGGEST_TITLE_FAILED)
      }

      type GeminiGenerateContentJson = {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
        usageMetadata?: {
          promptTokenCount?: number
          candidatesTokenCount?: number
          totalTokenCount?: number
        }
      }

      let json: GeminiGenerateContentJson
      try {
        json = (await response.json()) as GeminiGenerateContentJson
      } catch (parseErr) {
        await this.logger.logError({
          severity: 'error',
          feature: 'conversations/suggest-title',
          error_code: 'EXTERNAL_API_ERROR',
          message: 'Failed to parse Gemini response as JSON',
          context: {
            parseError: parseErr instanceof Error ? parseErr.message : String(parseErr),
          },
          user_id: userId,
        })
        throw new Error(ERR_SUGGEST_TITLE_FAILED)
      }

      const textPart = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
      const usage = this.resolveUsage(json, instruction, textPart)
      await this.creditsService.processDirectTextUsage({
        userId,
        feature: 'conversations',
        action: 'suggest_title',
        modelName: model,
        usage: {
          input: usage.input,
          output: usage.output,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: usage.totalTokens,
        },
        costSource: json.usageMetadata?.totalTokenCount ? 'runtime_tokens' : 'char_estimate',
      })

      let title = ''
      try {
        const parsed = JSON.parse(textPart) as { title?: unknown }
        title = typeof parsed.title === 'string' ? parsed.title.trim() : ''
      } catch {
        await this.logger.logError({
          severity: 'warn',
          feature: 'conversations/suggest-title',
          error_code: 'VALIDATION_FAILED',
          message: 'Model returned JSON body that could not be parsed for title field',
          context: { textPartPreview: textPart.slice(0, 200) },
          user_id: userId,
        })
      }

      title = title
        .replace(/\s+/g, ' ')
        .replace(/^['"]|['"]$/g, '')
        .slice(0, 80)

      return { title }
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message === ERR_SUGGEST_TITLE_UNAVAILABLE || err.message === ERR_SUGGEST_TITLE_FAILED)
      ) {
        throw err
      }
      await this.logger.logError({
        severity: 'error',
        feature: 'conversations/suggest-title',
        error_code: 'UNHANDLED_ERROR',
        message: 'Unexpected error during title suggestion',
        context: { error: err instanceof Error ? err.message : String(err) },
        stack: err instanceof Error ? err.stack : undefined,
        user_id: userId,
      })
      throw new Error(ERR_SUGGEST_TITLE_FAILED)
    }
  }

  private resolveUsage(
    json: {
      usageMetadata?: {
        promptTokenCount?: number
        candidatesTokenCount?: number
        totalTokenCount?: number
      }
    },
    input: string,
    output: string,
  ): { input: number; output: number; totalTokens: number } {
    const estimatedInput = Math.max(1, Math.ceil(input.length / 4))
    const estimatedOutput = Math.max(1, Math.ceil(output.length / 4))
    const promptTokens = Number(json.usageMetadata?.promptTokenCount ?? estimatedInput)
    const outputTokens = Number(json.usageMetadata?.candidatesTokenCount ?? estimatedOutput)
    const totalTokens = Number(json.usageMetadata?.totalTokenCount ?? promptTokens + outputTokens)
    return {
      input: Number.isFinite(promptTokens) ? promptTokens : estimatedInput,
      output: Number.isFinite(outputTokens) ? outputTokens : estimatedOutput,
      totalTokens: Number.isFinite(totalTokens) ? totalTokens : estimatedInput + estimatedOutput,
    }
  }
}
