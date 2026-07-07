export const ACTION_CONTRACT_PROTOCOL_HEADING = '## Backend Action Contract Protocol'

export const ACTION_CONTRACT_PROTOCOL_BLOCK = `${ACTION_CONTRACT_PROTOCOL_HEADING}

Backend actions accept exact payload fields, not free-form keys derived from the action name or the user's wording. Guessing fields wastes a retry cycle and shows the user a hiccup.

Before calling a \`vibey_backend\` action, first use the exact contract already in your current context, the visible tool schema, or \`skills/vibey-api/SKILL.md\` references. Do not call \`describe_action\` when the required fields, optional fields, aliases, and action fit are already available.

Use \`describe_action\` only as a fallback for unknown, rare, or dynamic backend actions whose contract is not available in current context or reference files.

Example:

\`\`\`json
{
  "action": "describe_action",
  "label": "Checking action contract",
  "data": { "action_name": "update_presentation" }
}
\`\`\`

The result tells you:
- \`required\` — fields that must be present
- \`optional\` — fields you may send
- \`aliases\` — accepted alternate wording (e.g. \`title\` → \`name\`)
- \`types\` — expected primitive types
- \`use_when\` / \`do_not_use_when\` — when this action is the right call
- \`examples\` — valid payloads

Rules:
1. Send only fields in \`required\`, \`optional\`, or \`aliases\`.
2. If a user word maps to an alias, send the canonical field name.
3. For \`use_integration\`, put provider-specific inputs inside \`data.params\` using the exact parameter names returned by the integration docs. Do not send provider inputs flat on \`data\`.
4. If the contract says a different action fits the intent better, switch to that action before calling.
5. Do not surface \`describe_action\`, schemas, or internal contracts to the user.
`

export function hasActionContractProtocol(content: string): boolean {
  return content.includes(ACTION_CONTRACT_PROTOCOL_HEADING)
}

function findFirstH1(content: string): RegExpMatchArray | null {
  return content.match(/^# .+$/m)
}

function removeActionContractProtocol(content: string): string {
  let output = content

  while (hasActionContractProtocol(output)) {
    const start = output.indexOf(ACTION_CONTRACT_PROTOCOL_HEADING)
    const lineStart = Math.max(0, output.lastIndexOf('\n', start - 1) + 1)
    const afterHeading = start + ACTION_CONTRACT_PROTOCOL_HEADING.length
    const nextHeading = output.slice(afterHeading).match(/\n#{1,6}\s/m)
    const end = nextHeading ? afterHeading + nextHeading.index! + 1 : output.length
    output = `${output.slice(0, lineStart).trimEnd()}\n\n${output.slice(end).trimStart()}`
  }

  return output.trim()
}

function findRuntimeLayersInsertionIndex(content: string): number | null {
  const runtimeHeading = '## Runtime Operating Layers'
  const start = content.indexOf(runtimeHeading)
  if (start === -1) return null

  const afterHeading = start + runtimeHeading.length
  const nextH2 = content.slice(afterHeading).match(/\n##\s/m)
  if (!nextH2) return content.length
  return afterHeading + nextH2.index! + 1
}

function insertBlockAt(content: string, index: number, block: string): string {
  const before = content.slice(0, index).trimEnd()
  const after = content.slice(index).trimStart()
  if (!before) return after ? `${block}\n\n${after}` : block
  return after ? `${before}\n\n${block}\n\n${after}` : `${before}\n\n${block}`
}

function insertActionContractProtocol(content: string): string {
  const runtimeInsertion = findRuntimeLayersInsertionIndex(content)
  if (runtimeInsertion !== null) {
    return insertBlockAt(content, runtimeInsertion, ACTION_CONTRACT_PROTOCOL_BLOCK)
  }

  const h1Match = findFirstH1(content)
  if (!h1Match) return insertBlockAt(content.trimStart(), 0, ACTION_CONTRACT_PROTOCOL_BLOCK)

  const insertAt = (h1Match.index ?? 0) + h1Match[0].length
  return insertBlockAt(content, insertAt, ACTION_CONTRACT_PROTOCOL_BLOCK)
}

export function prependActionContractProtocol(content: string): string {
  if (hasActionContractProtocol(content)) {
    const start = content.indexOf(ACTION_CONTRACT_PROTOCOL_HEADING)
    const h1Match = findFirstH1(content)
    const runtimeIndex = content.indexOf('## Runtime Operating Layers')
    const h1BeforeProtocol = h1Match ? (h1Match.index ?? 0) < start : false
    const runtimeBeforeProtocol = runtimeIndex === -1 || runtimeIndex < start

    if (h1BeforeProtocol && runtimeBeforeProtocol) return content

    return insertActionContractProtocol(removeActionContractProtocol(content))
  }

  return insertActionContractProtocol(content)
}
