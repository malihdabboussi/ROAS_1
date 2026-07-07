import { z } from 'zod'
import {
  ANTHROPIC_CLAUDE_TOKEN_MIN_LENGTH,
  ANTHROPIC_CLAUDE_TOKEN_PREFIX,
} from '../types/anthropic-claude.types'

export const AnthropicClaudeConnectSchema = z.object({
  setupToken: z
    .string()
    .trim()
    .min(ANTHROPIC_CLAUDE_TOKEN_MIN_LENGTH)
    .startsWith(ANTHROPIC_CLAUDE_TOKEN_PREFIX),
})
