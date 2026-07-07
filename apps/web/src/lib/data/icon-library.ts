/**
 * Icon Library
 *
 * Full Lucide icon library (~1500+ icons) organized by category for use in
 * IconPicker component across presentation editor.
 *
 * Icons are stored by their Lucide name (e.g., 'rocket', 'check')
 * which maps directly to the Lucide React component names.
 */

import * as LucideIcons from 'lucide-react'

export interface IconDefinition {
  /** Lucide icon name (matches component name) */
  name: string
  /** Search keywords for filtering */
  keywords: string[]
}

export interface IconCategory {
  /** Category display name */
  label: string
  /** Icons in this category */
  icons: IconDefinition[]
}

// ============================================================================
// CURATED CATEGORIES (Common icons with keywords for better search)
// ============================================================================

/**
 * Curated icon library organized by category
 * These have keyword mappings for better searchability
 */
export const CURATED_ICON_LIBRARY: IconCategory[] = [
  {
    label: 'Common',
    icons: [
      { name: 'check', keywords: ['checkmark', 'done', 'complete', 'yes', 'tick'] },
      { name: 'x', keywords: ['close', 'remove', 'cancel', 'no', 'cross'] },
      { name: 'plus', keywords: ['add', 'new', 'create'] },
      { name: 'minus', keywords: ['remove', 'subtract', 'less'] },
      { name: 'star', keywords: ['favorite', 'rate', 'rating', 'featured'] },
      { name: 'heart', keywords: ['love', 'like', 'favorite'] },
      { name: 'circle', keywords: ['dot', 'bullet', 'point'] },
      { name: 'square', keywords: ['box', 'shape'] },
      { name: 'triangle', keywords: ['shape', 'warning'] },
    ],
  },
  {
    label: 'Arrows',
    icons: [
      { name: 'arrow-right', keywords: ['next', 'forward', 'go'] },
      { name: 'arrow-left', keywords: ['back', 'previous', 'return'] },
      { name: 'arrow-up', keywords: ['increase', 'growth', 'rise'] },
      { name: 'arrow-down', keywords: ['decrease', 'drop', 'fall'] },
      { name: 'arrow-up-right', keywords: ['growth', 'increase', 'trending'] },
      { name: 'arrow-down-right', keywords: ['decrease', 'decline'] },
      { name: 'chevron-right', keywords: ['next', 'expand'] },
      { name: 'chevron-left', keywords: ['back', 'collapse'] },
      { name: 'chevron-up', keywords: ['expand', 'up'] },
      { name: 'chevron-down', keywords: ['collapse', 'down'] },
      { name: 'move-right', keywords: ['transfer', 'send'] },
      { name: 'trending-up', keywords: ['growth', 'increase', 'chart'] },
      { name: 'trending-down', keywords: ['decrease', 'decline', 'chart'] },
    ],
  },
  {
    label: 'Actions',
    icons: [
      { name: 'rocket', keywords: ['launch', 'start', 'fast', 'speed', 'startup'] },
      { name: 'target', keywords: ['goal', 'aim', 'focus', 'objective'] },
      { name: 'trophy', keywords: ['win', 'award', 'achievement', 'success'] },
      { name: 'flame', keywords: ['fire', 'hot', 'trending', 'popular'] },
      { name: 'zap', keywords: ['bolt', 'lightning', 'fast', 'power', 'energy'] },
      { name: 'lightbulb', keywords: ['idea', 'tip', 'insight', 'innovation'] },
      { name: 'sparkles', keywords: ['magic', 'ai', 'new', 'special', 'stars'] },
      { name: 'wand-2', keywords: ['magic', 'transform', 'edit'] },
      { name: 'play', keywords: ['start', 'video', 'begin'] },
      { name: 'pause', keywords: ['stop', 'wait', 'hold'] },
      { name: 'refresh-cw', keywords: ['reload', 'refresh', 'sync'] },
      { name: 'download', keywords: ['save', 'get', 'export'] },
      { name: 'upload', keywords: ['send', 'share', 'import'] },
      { name: 'share-2', keywords: ['share', 'social', 'send'] },
      { name: 'link', keywords: ['url', 'chain', 'connect'] },
      { name: 'copy', keywords: ['duplicate', 'clone'] },
      { name: 'scissors', keywords: ['cut', 'trim'] },
      { name: 'search', keywords: ['find', 'look', 'magnify'] },
      { name: 'filter', keywords: ['sort', 'narrow', 'refine'] },
      { name: 'settings', keywords: ['gear', 'config', 'options', 'preferences'] },
    ],
  },
  {
    label: 'Status',
    icons: [
      { name: 'check-circle', keywords: ['success', 'done', 'complete', 'approved'] },
      { name: 'x-circle', keywords: ['error', 'failed', 'cancel', 'wrong'] },
      { name: 'alert-circle', keywords: ['warning', 'attention', 'caution'] },
      { name: 'alert-triangle', keywords: ['warning', 'danger', 'caution'] },
      { name: 'info', keywords: ['information', 'help', 'about'] },
      { name: 'help-circle', keywords: ['question', 'help', 'support', 'faq'] },
      { name: 'badge-check', keywords: ['verified', 'certified', 'approved'] },
      { name: 'shield-check', keywords: ['secure', 'protected', 'safe', 'verified'] },
      { name: 'clock', keywords: ['time', 'schedule', 'deadline', 'wait'] },
      { name: 'timer', keywords: ['countdown', 'stopwatch', 'duration'] },
      { name: 'hourglass', keywords: ['time', 'wait', 'processing'] },
      { name: 'loader-2', keywords: ['loading', 'spinner', 'progress'] },
      { name: 'ban', keywords: ['block', 'forbidden', 'not allowed'] },
      { name: 'eye', keywords: ['view', 'visible', 'show', 'watch'] },
      { name: 'eye-off', keywords: ['hide', 'invisible', 'private'] },
      { name: 'lock', keywords: ['secure', 'private', 'protected'] },
      { name: 'unlock', keywords: ['open', 'access', 'public'] },
    ],
  },
  {
    label: 'Objects',
    icons: [
      { name: 'file', keywords: ['document', 'page', 'paper'] },
      { name: 'file-text', keywords: ['document', 'text', 'page'] },
      { name: 'folder', keywords: ['directory', 'container', 'organize'] },
      { name: 'image', keywords: ['photo', 'picture', 'media'] },
      { name: 'video', keywords: ['movie', 'film', 'media'] },
      { name: 'music', keywords: ['audio', 'sound', 'song'] },
      { name: 'mic', keywords: ['microphone', 'record', 'audio', 'podcast'] },
      { name: 'headphones', keywords: ['audio', 'listen', 'music'] },
      { name: 'camera', keywords: ['photo', 'picture', 'capture'] },
      { name: 'book', keywords: ['read', 'learn', 'education', 'manual'] },
      { name: 'book-open', keywords: ['read', 'learn', 'guide', 'documentation'] },
      { name: 'bookmark', keywords: ['save', 'favorite', 'mark'] },
      { name: 'tag', keywords: ['label', 'category', 'price'] },
      { name: 'gift', keywords: ['present', 'bonus', 'free', 'reward'] },
      { name: 'package', keywords: ['box', 'delivery', 'product'] },
      { name: 'shopping-cart', keywords: ['buy', 'purchase', 'cart', 'ecommerce'] },
      { name: 'shopping-bag', keywords: ['buy', 'purchase', 'store'] },
      { name: 'credit-card', keywords: ['payment', 'buy', 'card', 'money'] },
      { name: 'wallet', keywords: ['money', 'payment', 'finance'] },
      { name: 'receipt', keywords: ['invoice', 'bill', 'payment'] },
      { name: 'key', keywords: ['access', 'unlock', 'secure', 'password'] },
      { name: 'crown', keywords: ['premium', 'vip', 'king', 'best', 'top'] },
      { name: 'gem', keywords: ['diamond', 'premium', 'valuable', 'jewel'] },
      { name: 'award', keywords: ['medal', 'prize', 'achievement'] },
      { name: 'medal', keywords: ['award', 'achievement', 'winner'] },
    ],
  },
  {
    label: 'People',
    icons: [
      { name: 'user', keywords: ['person', 'profile', 'account'] },
      { name: 'users', keywords: ['team', 'group', 'people', 'community'] },
      { name: 'user-plus', keywords: ['add user', 'invite', 'signup'] },
      { name: 'user-check', keywords: ['verified', 'approved', 'member'] },
      { name: 'user-x', keywords: ['remove', 'blocked', 'banned'] },
      { name: 'smile', keywords: ['happy', 'emoji', 'satisfied'] },
      { name: 'frown', keywords: ['sad', 'unhappy', 'dissatisfied'] },
      { name: 'meh', keywords: ['neutral', 'okay', 'indifferent'] },
      { name: 'thumbs-up', keywords: ['like', 'approve', 'good', 'yes'] },
      { name: 'thumbs-down', keywords: ['dislike', 'reject', 'bad', 'no'] },
      { name: 'hand', keywords: ['stop', 'wave', 'greeting'] },
      { name: 'handshake', keywords: ['deal', 'agreement', 'partnership'] },
      { name: 'brain', keywords: ['think', 'idea', 'mind', 'smart', 'ai'] },
      { name: 'heart-handshake', keywords: ['care', 'support', 'partnership'] },
    ],
  },
  {
    label: 'Communication',
    icons: [
      { name: 'mail', keywords: ['email', 'message', 'letter', 'inbox'] },
      { name: 'mail-open', keywords: ['read', 'opened', 'email'] },
      { name: 'send', keywords: ['send', 'message', 'submit'] },
      { name: 'inbox', keywords: ['messages', 'mail', 'receive'] },
      { name: 'message-circle', keywords: ['chat', 'comment', 'talk'] },
      { name: 'message-square', keywords: ['chat', 'comment', 'message'] },
      { name: 'messages-square', keywords: ['conversation', 'chat', 'discuss'] },
      { name: 'phone', keywords: ['call', 'contact', 'telephone'] },
      { name: 'phone-call', keywords: ['calling', 'ring', 'contact'] },
      { name: 'video', keywords: ['call', 'meeting', 'conference'] },
      { name: 'at-sign', keywords: ['email', 'mention', 'contact'] },
      { name: 'bell', keywords: ['notification', 'alert', 'reminder'] },
      { name: 'bell-ring', keywords: ['notification', 'alert', 'active'] },
      { name: 'megaphone', keywords: ['announce', 'marketing', 'broadcast'] },
      { name: 'radio', keywords: ['broadcast', 'podcast', 'audio'] },
    ],
  },
  {
    label: 'Business',
    icons: [
      { name: 'briefcase', keywords: ['work', 'job', 'business', 'career'] },
      { name: 'building', keywords: ['company', 'office', 'organization'] },
      { name: 'building-2', keywords: ['company', 'office', 'corporate'] },
      { name: 'landmark', keywords: ['bank', 'institution', 'government'] },
      { name: 'chart-bar', keywords: ['analytics', 'graph', 'statistics', 'data'] },
      { name: 'chart-line', keywords: ['graph', 'trend', 'analytics', 'growth'] },
      { name: 'chart-pie', keywords: ['graph', 'statistics', 'data', 'distribution'] },
      { name: 'presentation', keywords: ['slides', 'meeting', 'pitch'] },
      { name: 'kanban', keywords: ['board', 'tasks', 'project', 'agile'] },
      { name: 'clipboard', keywords: ['tasks', 'checklist', 'notes'] },
      { name: 'clipboard-check', keywords: ['done', 'complete', 'verified'] },
      { name: 'clipboard-list', keywords: ['tasks', 'todo', 'checklist'] },
      { name: 'calendar', keywords: ['date', 'schedule', 'event', 'appointment'] },
      { name: 'calendar-check', keywords: ['scheduled', 'confirmed', 'event'] },
      { name: 'calculator', keywords: ['math', 'calculate', 'numbers', 'finance'] },
      { name: 'percent', keywords: ['discount', 'sale', 'percentage'] },
      { name: 'dollar-sign', keywords: ['money', 'price', 'cost', 'currency'] },
      { name: 'coins', keywords: ['money', 'payment', 'finance'] },
      { name: 'piggy-bank', keywords: ['save', 'savings', 'money', 'finance'] },
      { name: 'banknote', keywords: ['money', 'cash', 'payment'] },
      { name: 'scale', keywords: ['balance', 'compare', 'weigh', 'justice'] },
    ],
  },
  {
    label: 'Technology',
    icons: [
      { name: 'laptop', keywords: ['computer', 'device', 'work'] },
      { name: 'monitor', keywords: ['screen', 'display', 'desktop'] },
      { name: 'smartphone', keywords: ['phone', 'mobile', 'device'] },
      { name: 'tablet', keywords: ['device', 'ipad', 'mobile'] },
      { name: 'server', keywords: ['hosting', 'database', 'backend'] },
      { name: 'database', keywords: ['data', 'storage', 'server'] },
      { name: 'cloud', keywords: ['storage', 'online', 'sync', 'backup'] },
      { name: 'cloud-upload', keywords: ['upload', 'sync', 'backup'] },
      { name: 'cloud-download', keywords: ['download', 'sync', 'get'] },
      { name: 'wifi', keywords: ['internet', 'connection', 'network'] },
      { name: 'bluetooth', keywords: ['wireless', 'connect', 'device'] },
      { name: 'cpu', keywords: ['processor', 'chip', 'hardware'] },
      { name: 'hard-drive', keywords: ['storage', 'disk', 'memory'] },
      { name: 'usb', keywords: ['drive', 'port', 'connect'] },
      { name: 'plug', keywords: ['power', 'connect', 'plugin'] },
      { name: 'code', keywords: ['programming', 'developer', 'software'] },
      { name: 'terminal', keywords: ['command', 'console', 'cli'] },
      { name: 'globe', keywords: ['world', 'internet', 'web', 'worldwide'] },
      { name: 'app-window', keywords: ['application', 'software', 'program'] },
      { name: 'bot', keywords: ['ai', 'robot', 'automation', 'chatbot'] },
    ],
  },
  {
    label: 'Nature',
    icons: [
      { name: 'sun', keywords: ['day', 'light', 'bright', 'weather'] },
      { name: 'moon', keywords: ['night', 'dark', 'sleep'] },
      { name: 'cloud-sun', keywords: ['weather', 'partly cloudy'] },
      { name: 'cloud-rain', keywords: ['weather', 'rain', 'storm'] },
      { name: 'snowflake', keywords: ['cold', 'winter', 'freeze'] },
      { name: 'wind', keywords: ['weather', 'air', 'breeze'] },
      { name: 'leaf', keywords: ['nature', 'plant', 'eco', 'green'] },
      { name: 'tree-deciduous', keywords: ['nature', 'forest', 'plant'] },
      { name: 'flower', keywords: ['plant', 'bloom', 'garden'] },
      { name: 'mountain', keywords: ['nature', 'outdoor', 'peak', 'climb'] },
      { name: 'waves', keywords: ['water', 'ocean', 'sea'] },
      { name: 'droplet', keywords: ['water', 'liquid', 'rain'] },
      { name: 'earth', keywords: ['globe', 'planet', 'world'] },
      { name: 'recycle', keywords: ['eco', 'environment', 'green', 'reuse'] },
    ],
  },
  {
    label: 'Navigation',
    icons: [
      { name: 'home', keywords: ['house', 'main', 'start', 'dashboard'] },
      { name: 'compass', keywords: ['direction', 'navigate', 'explore'] },
      { name: 'map', keywords: ['location', 'direction', 'navigate'] },
      { name: 'map-pin', keywords: ['location', 'place', 'marker'] },
      { name: 'navigation', keywords: ['direction', 'gps', 'location'] },
      { name: 'route', keywords: ['path', 'journey', 'direction'] },
      { name: 'signpost', keywords: ['direction', 'guide', 'way'] },
      { name: 'milestone', keywords: ['checkpoint', 'progress', 'goal'] },
      { name: 'flag', keywords: ['marker', 'milestone', 'goal'] },
      { name: 'external-link', keywords: ['open', 'new tab', 'link'] },
      { name: 'log-in', keywords: ['signin', 'enter', 'access'] },
      { name: 'log-out', keywords: ['signout', 'exit', 'leave'] },
      { name: 'door-open', keywords: ['enter', 'access', 'opportunity'] },
      { name: 'door-closed', keywords: ['closed', 'locked', 'private'] },
    ],
  },
  {
    label: 'Education',
    icons: [
      { name: 'graduation-cap', keywords: ['education', 'graduate', 'school', 'learn'] },
      { name: 'school', keywords: ['education', 'building', 'institution'] },
      { name: 'pencil', keywords: ['write', 'edit', 'draw'] },
      { name: 'pen', keywords: ['write', 'sign', 'edit'] },
      { name: 'highlighter', keywords: ['mark', 'important', 'highlight'] },
      { name: 'eraser', keywords: ['delete', 'remove', 'clear'] },
      { name: 'ruler', keywords: ['measure', 'design', 'size'] },
      { name: 'notebook', keywords: ['notes', 'journal', 'write'] },
      { name: 'scroll', keywords: ['document', 'certificate', 'ancient'] },
      { name: 'library', keywords: ['books', 'knowledge', 'learning'] },
      { name: 'atom', keywords: ['science', 'physics', 'chemistry'] },
      { name: 'flask-conical', keywords: ['science', 'experiment', 'lab'] },
      { name: 'microscope', keywords: ['science', 'research', 'study'] },
      { name: 'telescope', keywords: ['explore', 'discover', 'space'] },
    ],
  },
  {
    label: 'Layout',
    icons: [
      { name: 'layout-grid', keywords: ['grid', 'tiles', 'view'] },
      { name: 'layout-list', keywords: ['list', 'rows', 'view'] },
      { name: 'columns', keywords: ['layout', 'split', 'two'] },
      { name: 'rows', keywords: ['layout', 'horizontal', 'lines'] },
      { name: 'panels-top-left', keywords: ['layout', 'sidebar', 'dashboard'] },
      { name: 'panel-left', keywords: ['sidebar', 'layout', 'menu'] },
      { name: 'panel-right', keywords: ['sidebar', 'layout', 'panel'] },
      { name: 'maximize', keywords: ['fullscreen', 'expand', 'large'] },
      { name: 'minimize', keywords: ['shrink', 'small', 'collapse'] },
      { name: 'move', keywords: ['drag', 'reorder', 'arrange'] },
      { name: 'grip-vertical', keywords: ['drag', 'handle', 'reorder'] },
      { name: 'grip-horizontal', keywords: ['drag', 'handle', 'reorder'] },
      { name: 'align-left', keywords: ['text', 'align', 'format'] },
      { name: 'align-center', keywords: ['text', 'align', 'format'] },
      { name: 'align-right', keywords: ['text', 'align', 'format'] },
      { name: 'align-justify', keywords: ['text', 'align', 'format'] },
    ],
  },
]

// ============================================================================
// FULL LUCIDE ICON LIBRARY
// ============================================================================

/**
 * Get all Lucide icon names (dynamically from lucide-react)
 * Converts PascalCase component names to kebab-case icon names
 */
function getAllLucideIconNames(): string[] {
  const iconNames: string[] = []

  for (const key of Object.keys(LucideIcons)) {
    // Skip non-icon exports (like createLucideIcon, etc.)
    const firstChar = key[0]
    if (
      typeof (LucideIcons as Record<string, unknown>)[key] === 'function' &&
      firstChar !== undefined &&
      firstChar === firstChar.toUpperCase() &&
      !key.startsWith('create') &&
      !key.startsWith('default') &&
      key !== 'Icon' &&
      key !== 'IconNode' &&
      key !== 'LucideIcon'
    ) {
      // Convert PascalCase to kebab-case
      const kebabName = key
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .toLowerCase()
      iconNames.push(kebabName)
    }
  }

  return iconNames.sort()
}

/**
 * All Lucide icon names (sorted alphabetically)
 * ~1500+ icons
 */
export const ALL_LUCIDE_ICONS: string[] = getAllLucideIconNames()

/**
 * Flat list of curated icon names for quick lookup
 */
export const CURATED_ICON_NAMES: string[] = CURATED_ICON_LIBRARY.flatMap((category) =>
  category.icons.map((icon) => icon.name),
)

// Backwards compatibility - alias to curated library
export const ICON_LIBRARY = CURATED_ICON_LIBRARY
export const ALL_ICON_NAMES = CURATED_ICON_NAMES

/**
 * Search icons by name or keywords
 * Searches both curated icons (with keywords) and full Lucide library
 * @param query - Search string
 * @param includeAllLucide - Whether to include all Lucide icons (not just curated)
 * @returns Filtered icons with their categories
 */
export function searchIcons(
  query: string,
  includeAllLucide: boolean = true,
): { category: string; icon: IconDefinition }[] {
  const normalizedQuery = query.toLowerCase().trim()
  const results: { category: string; icon: IconDefinition }[] = []
  const addedIconNames = new Set<string>()

  // First, search curated icons (better keyword matching)
  for (const category of CURATED_ICON_LIBRARY) {
    for (const icon of category.icons) {
      const matchesName = !normalizedQuery || icon.name.toLowerCase().includes(normalizedQuery)
      const matchesKeyword =
        !normalizedQuery || icon.keywords.some((kw) => kw.toLowerCase().includes(normalizedQuery))

      if (matchesName || matchesKeyword) {
        results.push({ category: category.label, icon })
        addedIconNames.add(icon.name)
      }
    }
  }

  // Then, search all Lucide icons (if enabled and query provided)
  if (includeAllLucide) {
    const matchingLucideIcons = ALL_LUCIDE_ICONS.filter(
      (name) =>
        !addedIconNames.has(name) &&
        (!normalizedQuery || name.toLowerCase().includes(normalizedQuery)),
    )

    // Add matching icons under "All Icons" category
    for (const name of matchingLucideIcons) {
      results.push({
        category: 'All Icons',
        icon: { name, keywords: [] },
      })
    }
  }

  return results
}

/**
 * Get icons by category
 * @param categoryLabel - Category name
 * @returns Icons in that category
 */
export function getIconsByCategory(categoryLabel: string): IconDefinition[] {
  const category = CURATED_ICON_LIBRARY.find((c) => c.label === categoryLabel)
  return category ? category.icons : []
}

/**
 * Check if an icon name is valid Lucide icon
 * @param name - Icon name to check
 * @returns True if icon exists in Lucide library
 */
export function isValidIcon(name: string): boolean {
  return ALL_LUCIDE_ICONS.includes(name)
}
