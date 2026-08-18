const FUZZY_MIN_SCORE = 0.72
const AMBIGUOUS_GAP = 0.08

export type CampaignNameRow = { id: string; name: string }

export function campaignNameLookupQueries(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  const parts = trimmed
    .split(/[/|,]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3)
  return [...new Set([trimmed, ...parts])]
}

export function normalizeCampaignNameForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function canFuzzyMatchCampaignName(query: string): boolean {
  const tokens = normalizeCampaignNameForMatch(query).split(' ').filter(Boolean)
  return tokens.length >= 2 || normalizeCampaignNameForMatch(query).length >= 10
}

export function isGeneralCampaignName(name: string): boolean {
  return normalizeCampaignNameForMatch(name) === 'general'
}

export function campaignNameSimilarity(query: string, candidate: string): number {
  const left = normalizeCampaignNameForMatch(query)
  const right = normalizeCampaignNameForMatch(candidate)
  if (!left || !right) return 0
  if (left === right) return 1
  if (left.includes(right) || right.includes(left)) return 0.92

  const leftTokens = left.split(' ').filter(Boolean)
  const rightTokens = right.split(' ').filter(Boolean)
  const stringScore =
    1 - levenshtein(left, right) / Math.max(left.length, right.length, 1)

  if (leftTokens.length >= 2 && leftTokens.length === rightTokens.length) {
    const tokenAvg =
      leftTokens.reduce(
        (sum, token, index) => sum + tokenSimilarity(token, rightTokens[index] ?? ''),
        0,
      ) / leftTokens.length
    return Math.max(stringScore, tokenAvg)
  }

  return stringScore
}

export function pickUniqueFuzzyCampaign(
  queries: string[],
  rows: CampaignNameRow[],
): CampaignNameRow | 'ambiguous' | null {
  const scored: Array<{ row: CampaignNameRow; score: number }> = []
  for (const query of queries) {
    if (!canFuzzyMatchCampaignName(query)) continue
    for (const row of rows) {
      if (!row.id || !row.name || isGeneralCampaignName(row.name)) continue
      scored.push({ row, score: campaignNameSimilarity(query, row.name) })
    }
  }
  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]
  if (!best || best.score < FUZZY_MIN_SCORE) return null
  const rival = scored.find(
    (entry) => entry.row.id !== best.row.id && entry.score >= best.score - AMBIGUOUS_GAP,
  )
  if (rival && rival.score >= FUZZY_MIN_SCORE) return 'ambiguous'
  return best.row
}

function tokenSimilarity(left: string, right: string): number {
  if (left === right) return 1
  const levScore = 1 - levenshtein(left, right) / Math.max(left.length, right.length, 1)
  const sameLetters =
    left.length === right.length && [...left].sort().join('') === [...right].sort().join('')
  return Math.max(levScore, sameLetters ? 0.9 : 0)
}

function levenshtein(left: string, right: string): number {
  if (left === right) return 0
  if (!left.length) return right.length
  if (!right.length) return left.length
  const rows = left.length + 1
  const cols = right.length + 1
  const matrix = Array.from({ length: rows }, () => Array<number>(cols).fill(0))
  for (let i = 0; i < rows; i += 1) matrix[i][0] = i
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }
  return matrix[left.length][right.length]
}
