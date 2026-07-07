import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import {
  TranscribeFileSchema,
  type StreamConfigResponse,
  type StreamUsageInput,
  type StreamUsageResponse,
} from '../dto'
import { DeepgramIntegration } from '../integrations/deepgram.integration'

export interface TranscribeFileResult {
  success: boolean
  text?: string
  error?: string
}

export interface ApiKeyTestResult {
  success: boolean
  hasApiKey: boolean
  keyLength: number
  keyPreview: string
  environment: string
}

@Injectable()
export class TranscribeService {
  private readonly logger = new Logger(TranscribeService.name)

  constructor(private readonly deepgram: DeepgramIntegration) {}

  async transcribeFile(
    file: { buffer: Buffer; mimetype: string; size: number; originalname?: string },
    user: { id: string; email: string },
  ): Promise<TranscribeFileResult> {
    const validation = TranscribeFileSchema.safeParse({
      size: file.size,
      type: file.mimetype,
    })

    if (!validation.success) {
      const errorMessage = validation.error.issues[0]?.message || 'Invalid file'
      this.logger.warn(
        `File validation failed for user ${user.id}: ${errorMessage} (size: ${file.size}, type: ${file.mimetype})`,
      )
      throw new BadRequestException(errorMessage)
    }

    if (!this.deepgram.isConfigured()) {
      this.logger.error(`Deepgram API key not configured - user ${user.id}`)
      throw new InternalServerErrorException('Transcription service not configured')
    }

    try {
      this.logger.log(`Transcribing file for user ${user.id}: ${file.mimetype}, ${file.size} bytes`)

      const result = await this.deepgram.transcribeFile(file.buffer, file.mimetype)

      if (!result.success) {
        throw new InternalServerErrorException(result.error || 'Transcription failed')
      }

      return {
        success: true,
        text: result.text,
      }
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error
      }

      this.logger.error(
        `Transcription failed for user ${user.id}: ${error instanceof Error ? error.message : 'Unknown'}`,
      )
      throw new InternalServerErrorException('Transcription failed')
    }
  }

  getStreamConfig(user: { id: string; email: string }): StreamConfigResponse {
    const apiKey = this.deepgram.getApiKey()

    if (!apiKey) {
      this.logger.error(`Deepgram API key not configured - user ${user.id}`)
      throw new InternalServerErrorException('Deepgram API key not configured')
    }

    return {
      success: true,
      apiKey,
      config: this.deepgram.getStreamingConfig(),
    }
  }

  async trackStreamUsage(
    dto: StreamUsageInput,
    user: { id: string; email: string },
  ): Promise<StreamUsageResponse> {
    const { durationSeconds, model } = dto

    try {
      this.logger.log(
        `Stream usage tracked - user: ${user.id}, duration: ${durationSeconds}s, model: ${model}`,
      )

      return {
        success: true,
        message: 'Usage tracked successfully',
      }
    } catch (error) {
      this.logger.error(
        `Failed to track stream usage: ${error instanceof Error ? error.message : 'Unknown'}`,
      )

      return {
        success: true,
        message: 'Usage tracking failed but operation completed',
      }
    }
  }

  testApiKey(): ApiKeyTestResult {
    return {
      success: true,
      hasApiKey: this.deepgram.isConfigured(),
      keyLength: this.deepgram.getApiKey()?.length || 0,
      keyPreview: this.deepgram.getApiKeyPreview(),
      environment: process.env.NODE_ENV || 'development',
    }
  }
}
