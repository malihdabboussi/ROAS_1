import { Injectable, Logger } from '@nestjs/common'
import { SessionsStorageRepository } from '../repositories/sessions-storage.repository'

@Injectable()
export class SessionsStorageService {
  private readonly logger = new Logger(SessionsStorageService.name)

  constructor(private readonly repository: SessionsStorageRepository) {}

  private resolveTranscriptPath(agentId: string, sessionId: string): string {
    const safeAgent = agentId.replace(/[^a-zA-Z0-9._-]/g, '_')
    const safeSession = sessionId.replace(/[^a-zA-Z0-9._-]/g, '_')
    return `${safeAgent}/${safeSession}.jsonl`
  }

  private resolveStorePath(agentId: string): string {
    const safeAgent = agentId.replace(/[^a-zA-Z0-9._-]/g, '_')
    return `${safeAgent}/sessions.json`
  }

  async uploadTranscript(agentId: string, sessionId: string, content: string): Promise<void> {
    const path = this.resolveTranscriptPath(agentId, sessionId)
    const errorMessage = await this.repository.upload(
      path,
      content,
      'application/octet-stream',
    )
    if (errorMessage) {
      this.logger.warn(`[SessionStorage] upload failed path=${path} err=${errorMessage}`)
      throw new Error(errorMessage)
    }
    this.logger.log(`[SessionStorage] uploaded transcript path=${path} bytes=${content.length}`)
  }

  async downloadTranscript(agentId: string, sessionId: string): Promise<string | null> {
    const path = this.resolveTranscriptPath(agentId, sessionId)
    const { text, errorMessage } = await this.repository.downloadText(path)
    if (errorMessage !== null) {
      const msg = errorMessage
      if (!msg || msg === '{}' || /not\s*found/i.test(msg)) {
        return null
      }
      this.logger.warn(`[SessionStorage] download failed path=${path} err=${msg}`)
      throw new Error(msg)
    }
    return text
  }

  async uploadStore(agentId: string, content: string): Promise<void> {
    const path = this.resolveStorePath(agentId)
    const errorMessage = await this.repository.upload(path, content, 'application/json')
    if (errorMessage) {
      this.logger.warn(`[SessionStorage] store upload failed path=${path} err=${errorMessage}`)
      throw new Error(errorMessage)
    }
    const parentPrefix = path.split('/').slice(0, -1).join('/')
    const fileName = path.split('/').at(-1) ?? 'sessions.json'
    await this.repository.listStoreFile(parentPrefix, fileName)
    this.logger.log(`[SessionStorage] uploaded store path=${path} bytes=${content.length}`)
  }

  async downloadStore(agentId: string): Promise<string | null> {
    const path = this.resolveStorePath(agentId)
    const { text, errorMessage } = await this.repository.downloadText(path)
    if (errorMessage !== null) {
      const msg = errorMessage
      if (!msg || msg === '{}' || /not\s*found/i.test(msg)) {
        return null
      }
      this.logger.warn(`[SessionStorage] store download failed path=${path} err=${msg}`)
      throw new Error(msg)
    }
    return text
  }
}
