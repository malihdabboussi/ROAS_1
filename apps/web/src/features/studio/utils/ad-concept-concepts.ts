/** Split Opus output on **Concept N**, ## Concept N, or Concept N: at line start */
export function extractConceptBodies(fullText: string): { n: number; body: string }[] {
  const text = fullText.trim()
  const matches: { n: number; index: number; len: number }[] = []
  const reBold = /\*\*\s*Concept\s*([1-4])[^*\n]*\*\*/gi
  let m: RegExpExecArray | null
  while ((m = reBold.exec(text)) !== null) {
    const num = m[1]
    if (num) matches.push({ n: parseInt(num, 10), index: m.index, len: m[0].length })
  }
  if (matches.length === 0) {
    const reHash = /#{1,3}\s*Concept\s*([1-4])\b/gi
    while ((m = reHash.exec(text)) !== null) {
      const num = m[1]
      if (num) matches.push({ n: parseInt(num, 10), index: m.index, len: m[0].length })
    }
  }
  if (matches.length === 0) {
    const rePlain = /^Concept\s*([1-4])\s*[:\.\-]/gim
    while ((m = rePlain.exec(text)) !== null) {
      const num = m[1]
      if (num) matches.push({ n: parseInt(num, 10), index: m.index, len: m[0].length })
    }
  }
  if (matches.length === 0) return []
  matches.sort((a, b) => a.index - b.index)
  const out: { n: number; body: string }[] = []
  for (let i = 0; i < matches.length; i++) {
    const curr = matches[i]
    const next = matches[i + 1]
    if (!curr) continue
    const start = curr.index + curr.len
    const end = next ? next.index : text.length
    const body = text.slice(start, end).trim()
    if (body.length > 20) out.push({ n: curr.n, body })
  }
  return out
}
