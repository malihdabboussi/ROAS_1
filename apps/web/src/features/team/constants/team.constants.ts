import { formatSkillName as formatSharedSkillName } from '@/lib/agents/agent-display'
export {
  MODEL_STRATEGIES,
  agentModelId,
  isModelStrategyId,
  resolveAgentModelDisplay,
  type ModelStrategyId,
} from '@/lib/agents/model-strategies'

export function formatSkillName(name: string): string {
  return formatSharedSkillName(name)
}

export {
  CAMPAIGN_CORE_AGENT_KEYS,
  STATUS_BADGES,
  STATUS_LABELS,
  SYSTEM_LIKE_AGENT_KEYS,
  USER_BRAIN_SHARE_EXTENDED_AGENT_KEYS,
  agentModelSettings,
  agentPresenceStatusDotClass,
} from '@/lib/agents/agent-team-display'

export interface VoiceProfile {
  name: string
  gender: 'male' | 'female'
  tone: string
  pitch: string
}

export const FEMALE_VOICES: VoiceProfile[] = [
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

export const MALE_VOICES: VoiceProfile[] = [
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

export const ALL_VOICES: VoiceProfile[] = [...FEMALE_VOICES, ...MALE_VOICES]

export type StylePresetKey = 'bold' | 'balanced' | 'calm'

export const STYLE_PRESETS: Record<StylePresetKey, { label: string; description: string }> = {
  bold: { label: 'Bold & Direct', description: 'No-nonsense, metric-driven, action-oriented' },
  balanced: {
    label: 'Balanced',
    description: 'Professional but approachable, clear communication',
  },
  calm: { label: 'Calm & Steady', description: 'Thoughtful, measured, focused on process' },
}
