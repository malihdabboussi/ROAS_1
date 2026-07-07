import * as fs from 'fs'
import * as path from 'path'
import { Injectable, type Logger } from '@nestjs/common'
import type { TokenUsage } from './credits.types'

@Injectable()
export class CreditsTranscriptService {
  resolveSessionsDir(): string {
    return (
      process.env.OPENCLAW_SESSIONS_DIR ||
      path.join(process.env.HOME || '/root', '.openclaw/agents/vibey/sessions')
    )
  }

  async getUsageFromTranscript(
    sessionKey: string,
    openclawSessionsDir: string,
    logger: Logger,
  ): Promise<TokenUsage | null> {
    try {
      const sessionsPath = path.join(openclawSessionsDir, 'sessions.json')
      if (!fs.existsSync(sessionsPath)) {
        logger.warn(`sessions.json not found at ${sessionsPath}`)
        return null
      }

      const sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'))
      const sessionEntry = sessions[sessionKey]
      if (!sessionEntry?.sessionId) {
        logger.warn(`Session ${sessionKey} not found in sessions.json`)
        return null
      }

      const transcriptPath = path.join(openclawSessionsDir, `${sessionEntry.sessionId}.jsonl`)
      if (!fs.existsSync(transcriptPath)) {
        logger.warn(`Transcript not found: ${transcriptPath}`)
        return null
      }

      const content = fs.readFileSync(transcriptPath, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)
      const usage: TokenUsage = {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
      }
      let foundAssistant = false

      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i])
          const role = entry?.message?.role
          const entryUsage = entry?.message?.usage

          if (role === 'user' && foundAssistant) {
            break
          }

          if (role === 'assistant' && entryUsage) {
            if (
              entryUsage.input > 0 ||
              entryUsage.output > 0 ||
              entryUsage.cacheRead > 0 ||
              entryUsage.cacheWrite > 0
            ) {
              usage.input += entryUsage.input || 0
              usage.output += entryUsage.output || 0
              usage.cacheRead += entryUsage.cacheRead || 0
              usage.cacheWrite += entryUsage.cacheWrite || 0
              usage.totalTokens += entryUsage.totalTokens || 0
              foundAssistant = true
            }
          }
        } catch {
          // Skip unparseable transcript lines.
        }
      }

      if (!foundAssistant) {
        logger.debug(`No assistant usage found in transcript for ${sessionKey}`)
        return null
      }

      logger.debug(
        `Transcript usage for ${sessionKey}: in=${usage.input} out=${usage.output} cacheR=${usage.cacheRead} cacheW=${usage.cacheWrite}`,
      )

      return usage
    } catch (err) {
      logger.error(`Failed to read transcript: ${err}`)
      return null
    }
  }
}
