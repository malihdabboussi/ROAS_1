type ChatChannel = 'telegram' | 'slack' | 'studio'

const STATIC_AD_FORMAT_TERMS = [
  'hero framing',
  'identity callout',
  'case study',
  'workshop',
  'event ad',
  'tweet receipt',
  'chat receipt',
  'press authority',
  'news-style hook',
  'news style hook',
  'myth vs system',
  'myth versus system',
  'offer stack',
] as const

const STATIC_AD_MODE_TERMS = {
  validate_messaging: [
    'validate messaging',
    'validate message',
    'messaging angles',
    'message angles',
  ],
  image_brief: ['image brief'],
  static_ad_book: ['static ad book'],
} as const

const CREATE_VERBS = new Set([
  'make',
  'create',
  'generate',
  'design',
  'produce',
  'build',
  'want',
  'need',
])
const AD_ACCOUNTISH = new Set([
  'account',
  'set',
  'sets',
  'spend',
  'manager',
  'library',
  'group',
  'groups',
])
const MAX_WORDS_BETWEEN = 5
const PASTE_SCAN_CHARS = 240
const PASTE_LENGTH_THRESHOLD = 480

export function buildStaticAdChatRoutingInstruction(content: string, channel: ChatChannel): string {
  const normalized = normalize(content)
  const explicitMode = findExplicitMode(normalized)
  const isModeSelectionReply = explicitMode !== null && normalized.length <= 240
  if (!isStaticAdCreationRequest(normalized) && !isModeSelectionReply) return ''

  const explicitFormat = STATIC_AD_FORMAT_TERMS.some((term) => normalized.includes(term))

  if (explicitMode === 'validate_messaging') {
    return [
      'CURRENT TURN STATIC AD ROUTE: validate_messaging.',
      'The user explicitly chose Validate Messaging Angles. Follow roas-ad-design and render that lane.',
      'Do not substitute Static Ad Book, Myth vs. System, or old-way/new-way layouts.',
    ].join('\n')
  }
  if (explicitMode === 'image_brief') {
    return [
      'CURRENT TURN STATIC AD ROUTE: image_brief.',
      'The user explicitly chose Image Brief. Follow roas-image-brief through finished image generation.',
      'Do not substitute Static Ad Book, Myth vs. System, or copy-only specs.',
    ].join('\n')
  }
  if (explicitMode === 'static_ad_book' || explicitFormat) {
    return [
      'CURRENT TURN STATIC AD ROUTE: static_ad_book.',
      explicitFormat
        ? 'The user explicitly named a Static Ad Book format. Preserve that format and continue.'
        : 'The user chose Static Ad Book but not a format. Ask the skill-defined family and format clarification cards before rendering.',
      'Do not silently default to Myth vs. System.',
    ].join('\n')
  }

  if (channel !== 'studio') {
    return [
      'CURRENT TURN STATIC AD ROUTE: selection_required.',
      'Before writing copy or rendering, ask which production type they want: Validate Messaging Angles, Image Brief, or Static Ad Book.',
      'This channel does not support the Studio card, so ask the three numbered choices in plain text.',
      'Do not silently default to Myth vs. System.',
    ].join('\n')
  }

  return [
    'CURRENT TURN STATIC AD ROUTE: selection_required.',
    'This is a hard routing gate. Your ONE next action must be ask_clarification with the exact payload below.',
    'Do not write ad copy, choose formats, call image/media tools, or claim generation is unavailable before the user answers.',
    '{"action":"ask_clarification","label":"Choose static ad production type","data":{"title":"Choose a static ad direction","intro_message":"Pick a production type before I create the visuals. You can click one or reply 1, 2, or 3.","questions":[{"id":"static_ad_production_mode","text":"Which kind of static ad should I create?","type":"single_choice","required":true,"options":[{"id":"validate_messaging","label":"Validate messaging angles","description":"Text-led ads that turn approved message angles into clear visual hooks."},{"id":"image_brief","label":"Image brief","description":"Build a qualified image brief, then generate the finished visual ads."},{"id":"static_ad_book","label":"Static ad book","description":"Use proven layouts such as chat receipt, myth vs. system, and offer stack."}]}]}}',
    'Do not silently default to Myth vs. System.',
  ].join('\n')
}

function normalize(content: string): string {
  return content
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\bsttic\b/g, 'static')
    .replace(/\s+/g, ' ')
    .trim()
}

function isStaticAdCreationRequest(content: string): boolean {
  if (content.includes('video ad') || content.includes('video creative')) return false
  if (/\b(audit|analy[sz]e|performance|publish|launch)\b/.test(content)) return false

  const namesStaticWorkflow =
    content.includes('/static-ad-book') ||
    content.includes('/static-ad-production') ||
    content.includes('static ad production')
  if (namesStaticWorkflow) return true

  return asksForAdCreation(content)
}

function asksForAdCreation(content: string): boolean {
  if (content.length <= PASTE_LENGTH_THRESHOLD) {
    return hasCreateVerbNearAdNoun(tokenize(content))
  }
  return (
    hasCreateVerbNearAdNoun(tokenize(content.slice(0, PASTE_SCAN_CHARS))) ||
    hasCreateVerbNearAdNoun(tokenize(content.slice(-PASTE_SCAN_CHARS)))
  )
}

function tokenize(content: string): string[] {
  return content
    .split(' ')
    .map((word) => word.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''))
    .filter(Boolean)
}

function hasCreateVerbNearAdNoun(words: string[]): boolean {
  for (let index = 0; index < words.length; index += 1) {
    const nounLength = adNounLengthAt(words, index)
    if (nounLength > 0) {
      const afterNoun = index + nounLength
      const verbLimit = Math.min(words.length, afterNoun + MAX_WORDS_BETWEEN + 1)
      for (let cursor = afterNoun; cursor < verbLimit; cursor += 1) {
        if (CREATE_VERBS.has(words[cursor] ?? '')) return true
      }
    }
    if (!CREATE_VERBS.has(words[index] ?? '')) continue
    const nounLimit = Math.min(words.length, index + 2 + MAX_WORDS_BETWEEN)
    for (let cursor = index + 1; cursor < nounLimit; cursor += 1) {
      if (adNounLengthAt(words, cursor) > 0) return true
    }
  }
  return false
}

function adNounLengthAt(words: string[], index: number): number {
  const current = words[index] ?? ''
  const next = words[index + 1] ?? ''
  const afterNext = words[index + 2] ?? ''

  if (current === 'static' && (next === 'ad' || next === 'ads')) {
    return next === 'ad' && AD_ACCOUNTISH.has(afterNext) ? 0 : 2
  }
  if (current === 'image' && (next === 'ad' || next === 'ads')) {
    return next === 'ad' && AD_ACCOUNTISH.has(afterNext) ? 0 : 2
  }
  if (
    current === 'ad' &&
    (next === 'image' || next === 'images' || next === 'creative' || next === 'creatives')
  ) {
    return 2
  }
  if (current === 'an' && next === 'ad') {
    return AD_ACCOUNTISH.has(afterNext) ? 0 : 2
  }
  if (current === 'ads') {
    return AD_ACCOUNTISH.has(next) ? 0 : 1
  }
  return 0
}

function findExplicitMode(
  content: string,
): 'validate_messaging' | 'image_brief' | 'static_ad_book' | null {
  for (const [mode, terms] of Object.entries(STATIC_AD_MODE_TERMS)) {
    if (terms.some((term) => content.includes(term))) {
      return mode as 'validate_messaging' | 'image_brief' | 'static_ad_book'
    }
  }
  return null
}
