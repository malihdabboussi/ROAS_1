import {
  MISSION_ERROR_DEFAULT,
  MISSION_ERROR_FINAL,
  MISSION_ERROR_MESSAGES,
} from '../config/mission-error-messages'
import type { AgentKey } from '../types'

export function humanizeMissionError(raw: string, agentKey: AgentKey, isFinal: boolean): string {
  const searchableText = `${raw} ${agentKey}`
  for (const rule of MISSION_ERROR_MESSAGES) {
    if (rule.pattern.test(searchableText)) {
      return rule.message
    }
  }
  return isFinal ? MISSION_ERROR_FINAL : MISSION_ERROR_DEFAULT
}
