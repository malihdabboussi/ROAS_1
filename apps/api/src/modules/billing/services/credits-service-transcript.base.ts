import * as fs from 'fs'
import * as path from 'path'
import { CreditsServiceBase } from './credits-service.base'
import type { TokenUsage } from './credits.types'

export abstract class CreditsTranscriptBase extends CreditsServiceBase {
  // ============================================================
  // TRANSCRIPT READING
  // ============================================================

  /**
   * Read token usage from OpenClaw session transcript.
   * Finds the latest assistant entries (since last user message)
   * and sums their usage — one user turn can trigger multiple
   * assistant responses due to tool calls.
   */
  async getUsageFromTranscript(sessionKey: string): Promise<TokenUsage | null> {
    try {
      // Read sessions.json to find the transcript session ID
      const sessionsPath = path.join(this.openclawSessionsDir, 'sessions.json')
      if (!fs.existsSync(sessionsPath)) {
        this.logger.warn(`sessions.json not found at ${sessionsPath}`)
        return null
      }

      const sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'))
      const sessionEntry = sessions[sessionKey]
      if (!sessionEntry?.sessionId) {
        this.logger.warn(`Session ${sessionKey} not found in sessions.json`)
        return null
      }

      // Read the transcript JSONL file
      const transcriptPath = path.join(this.openclawSessionsDir, `${sessionEntry.sessionId}.jsonl`)
      if (!fs.existsSync(transcriptPath)) {
        this.logger.warn(`Transcript not found: ${transcriptPath}`)
        return null
      }

      const content = fs.readFileSync(transcriptPath, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)

      // Walk backwards from the end, collecting assistant entries until we hit a user message
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
            // Hit the previous user message — stop collecting
            break
          }

          if (role === 'assistant' && entryUsage) {
            // Only count entries with actual token usage (not zero entries)
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
          // Skip unparseable lines
        }
      }

      if (!foundAssistant) {
        this.logger.debug(`No assistant usage found in transcript for ${sessionKey}`)
        return null
      }

      this.logger.debug(
        `Transcript usage for ${sessionKey}: in=${usage.input} out=${usage.output} cacheR=${usage.cacheRead} cacheW=${usage.cacheWrite}`,
      )

      return usage
    } catch (err) {
      this.logger.error(`Failed to read transcript: ${err}`)
      return null
    }
  }
}
