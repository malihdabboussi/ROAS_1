import { readFileSync } from 'fs'
import { join } from 'path'
import { Injectable, Logger } from '@nestjs/common'

type Channel = 'studio' | 'slack' | 'telegram' | 'voice'

const CHANNEL_FILES: Record<Channel, string> = {
  studio: 'STUDIO.md',
  slack: 'SLACK.md',
  telegram: 'TELEGRAM.md',
  voice: 'VOICE.md',
}

@Injectable()
export class ChannelInstructionsService {
  private readonly logger = new Logger(ChannelInstructionsService.name)
  private readonly cache = new Map<Channel, string>()

  getForChannel(channel: Channel): string {
    const cached = this.cache.get(channel)
    if (cached !== undefined) return cached

    const filename = CHANNEL_FILES[channel] ?? CHANNEL_FILES.studio
    const agentsBaseDir = process.env.AGENTS_BASE_DIR?.trim()
    const candidates = [
      ...(agentsBaseDir ? [join(agentsBaseDir, 'vibey', 'channels', filename)] : []),
      join(process.cwd(), 'docker', 'agents', 'vibey', 'channels', filename),
    ]

    let content = ''
    for (const filepath of candidates) {
      try {
        content = readFileSync(filepath, 'utf-8').trim()
        this.logger.log(`Loaded channel instructions: ${filepath}`)
        break
      } catch {
        continue
      }
    }

    if (!content) {
      this.logger.warn(
        `Channel instructions not found for "${channel}" (tried: ${candidates.join(', ')}). Using inline fallback.`,
      )
      content = `CHANNEL=${channel}`
    }

    this.cache.set(channel, content)
    return content
  }
}
