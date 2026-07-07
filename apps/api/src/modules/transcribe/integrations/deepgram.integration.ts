import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface DeepgramTranscriptionResult {
  success: boolean
  text: string
  metadata?: {
    duration: number
    model: string
    channels: number
  }
  error?: string
}

interface DeepgramApiResponse {
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string
        confidence?: number
      }>
    }>
  }
  metadata?: {
    duration?: number
    model_info?: {
      name?: string
    }
    channels?: number
  }
}

@Injectable()
export class DeepgramIntegration {
  private readonly logger = new Logger(DeepgramIntegration.name)
  private readonly apiKey: string
  private readonly apiUrl = 'https://api.deepgram.com/v1/listen'
  private readonly defaultModel = 'nova-3'

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DEEPGRAM_API_KEY') || ''

    if (!this.apiKey) {
      this.logger.warn('DEEPGRAM_API_KEY not configured - transcription will fail')
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }

  getApiKey(): string | null {
    return this.apiKey || null
  }

  getApiKeyPreview(): string {
    if (!this.apiKey) return 'Not set'
    return `${this.apiKey.substring(0, 8)}...`
  }

  async transcribeFile(
    audioBuffer: Buffer,
    contentType: string,
  ): Promise<DeepgramTranscriptionResult> {
    if (!this.apiKey) {
      this.logger.error('Deepgram API key not configured')
      throw new InternalServerErrorException('Transcription service not configured')
    }

    try {
      this.logger.debug(`Transcribing audio: ${contentType}, size: ${audioBuffer.length} bytes`)

      const audioData = new Uint8Array(audioBuffer)

      const response = await fetch(`${this.apiUrl}?model=${this.defaultModel}`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${this.apiKey}`,
          'Content-Type': contentType,
        },
        body: audioData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        this.logger.error(`Deepgram API error: ${response.status} - ${errorText}`)
        throw new InternalServerErrorException(`Transcription failed: ${response.status}`)
      }

      const result: DeepgramApiResponse = await response.json()

      const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''

      if (!transcript) {
        this.logger.warn('Empty transcript returned from Deepgram')
        return {
          success: true,
          text: '',
          metadata: {
            duration: result.metadata?.duration || 0,
            model: this.defaultModel,
            channels: result.metadata?.channels || 1,
          },
        }
      }

      this.logger.debug(`Transcription successful: ${transcript.length} characters`)

      return {
        success: true,
        text: transcript,
        metadata: {
          duration: result.metadata?.duration || 0,
          model: this.defaultModel,
          channels: result.metadata?.channels || 1,
        },
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error
      }

      this.logger.error(
        `Deepgram transcription error: ${error instanceof Error ? error.message : 'Unknown'}`,
      )
      throw new InternalServerErrorException('Transcription failed')
    }
  }

  getStreamingConfig(): {
    model: string
    interim_results: boolean
    smart_format: boolean
    language: string
  } {
    return {
      model: 'nova-2',
      interim_results: true,
      smart_format: true,
      language: 'en-US',
    }
  }
}
