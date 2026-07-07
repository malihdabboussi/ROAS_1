/** Mirrors `useTeamContainerDerived` metric keys / labels (apps/web team feature). */

export const LIBRARY_AGENT_PERFORMANCE_METRICS: Array<{ key: string; label: string }> = [
  { key: 'execution_speed', label: 'Speed' },
  { key: 'quality', label: 'Quality' },
  { key: 'reliability', label: 'Reliable' },
  { key: 'initiative', label: 'Initiative' },
  { key: 'communication', label: 'Comms' },
  { key: 'spec_adherence', label: 'Spec' },
  { key: 'learning_rate', label: 'Learning' },
]

export type LibraryAgentDemoPerformance = {
  overall: number
  missionsScored: number
  overallColor: string
  stats: Record<string, number>
}

function overallColorClass(overall: number): string {
  if (overall >= 8) return 'text-emerald-400'
  if (overall >= 6) return 'text-emerald-500'
  if (overall >= 4) return 'text-amber-400'
  return 'text-red-400'
}

function averageStats(stats: Record<string, number>): number {
  const vals = LIBRARY_AGENT_PERFORMANCE_METRICS.map((m) => stats[m.key] ?? 0)
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function buildDemo(
  missionsScored: number,
  stats: Record<string, number>,
): Omit<LibraryAgentDemoPerformance, 'overallColor'> {
  const overall = Math.round(averageStats(stats) * 10) / 10
  return { overall, missionsScored, stats }
}

/** Demo scores per hireable template `role_key` (marketing carousel). */
const PRESET: Record<string, { missionsScored: number; stats: Record<string, number> }> = {
  copywriter: {
    missionsScored: 14,
    stats: {
      execution_speed: 7.2,
      quality: 9.1,
      reliability: 8.0,
      initiative: 7.8,
      communication: 8.9,
      spec_adherence: 8.2,
      learning_rate: 7.5,
    },
  },
  designer: {
    missionsScored: 11,
    stats: {
      execution_speed: 6.8,
      quality: 9.4,
      reliability: 7.9,
      initiative: 8.6,
      communication: 7.6,
      spec_adherence: 8.1,
      learning_rate: 7.8,
    },
  },
  analyst: {
    missionsScored: 18,
    stats: {
      execution_speed: 7.5,
      quality: 8.3,
      reliability: 9.0,
      initiative: 7.4,
      communication: 7.9,
      spec_adherence: 9.1,
      learning_rate: 8.2,
    },
  },
  developer: {
    missionsScored: 22,
    stats: {
      execution_speed: 8.8,
      quality: 8.1,
      reliability: 8.4,
      initiative: 7.9,
      communication: 7.5,
      spec_adherence: 8.9,
      learning_rate: 8.3,
    },
  },
  pm_marketing: {
    missionsScored: 16,
    stats: {
      execution_speed: 8.0,
      quality: 8.2,
      reliability: 8.1,
      initiative: 8.5,
      communication: 9.0,
      spec_adherence: 8.0,
      learning_rate: 7.7,
    },
  },
  pm_product: {
    missionsScored: 19,
    stats: {
      execution_speed: 7.4,
      quality: 8.7,
      reliability: 8.8,
      initiative: 8.2,
      communication: 8.0,
      spec_adherence: 8.6,
      learning_rate: 8.1,
    },
  },
  pm_operations: {
    missionsScored: 17,
    stats: {
      execution_speed: 7.6,
      quality: 8.0,
      reliability: 9.1,
      initiative: 7.8,
      communication: 8.1,
      spec_adherence: 9.0,
      learning_rate: 7.6,
    },
  },
  automation_integrations_engineer: {
    missionsScored: 13,
    stats: {
      execution_speed: 8.5,
      quality: 8.3,
      reliability: 8.7,
      initiative: 8.0,
      communication: 7.4,
      spec_adherence: 8.4,
      learning_rate: 9.0,
    },
  },
}

function hashRoleKey(roleKey: string): number {
  let h = 0
  for (let i = 0; i < roleKey.length; i += 1) h = (h * 31 + roleKey.charCodeAt(i)) | 0
  return Math.abs(h)
}

function syntheticForRoleKey(roleKey: string): { missionsScored: number; stats: Record<string, number> } {
  const h = hashRoleKey(roleKey)
  const stats: Record<string, number> = {}
  LIBRARY_AGENT_PERFORMANCE_METRICS.forEach((m, i) => {
    const slice = (h >> (i * 3)) & 0x1f
    stats[m.key] = Math.round((5.2 + (slice / 31) * 4.2) * 10) / 10
  })
  const missionsScored = 4 + (h % 20)
  return { missionsScored, stats }
}

export function getLibraryAgentDemoPerformance(roleKey: string): LibraryAgentDemoPerformance {
  const base = PRESET[roleKey] ?? syntheticForRoleKey(roleKey)
  const { overall, missionsScored, stats } = buildDemo(base.missionsScored, base.stats)
  return {
    overall,
    missionsScored,
    stats,
    overallColor: overallColorClass(overall),
  }
}
