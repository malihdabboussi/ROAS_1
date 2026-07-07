export const TAG_COLORS = [
  { name: 'Green', value: 'green', hex: '#10B981' },
  { name: 'Blue', value: 'blue', hex: '#3B82F6' },
  { name: 'Sky', value: 'sky', hex: '#0EA5E9' },
  { name: 'Emerald', value: 'emerald', hex: '#10B981' },
  { name: 'Amber', value: 'amber', hex: '#F59E0B' },
  { name: 'Orange', value: 'orange', hex: '#F97316' },
  { name: 'Red', value: 'red', hex: '#EF4444' },
  { name: 'Pink', value: 'pink', hex: '#EC4899' },
  { name: 'Violet', value: 'violet', hex: '#A855F7' },
  { name: 'Brown', value: 'brown', hex: '#8B5A2B' },
  { name: 'Gray', value: 'gray', hex: '#374151' },
] as const

export type TagColorValue = (typeof TAG_COLORS)[number]['value']

export function getTagColorHex(colorValue: string): string {
  const color = TAG_COLORS.find((c) => c.value === colorValue)
  return color?.hex || '#374151'
}

/** Stable tint key derived from tag string (contacts store tags as plain names only). */
export function tagNameToColorKey(tagName: string): TagColorValue {
  let h = 0
  for (let i = 0; i < tagName.length; i++) h = (h * 31 + tagName.charCodeAt(i)) | 0
  const idx = Math.abs(h) % TAG_COLORS.length
  return TAG_COLORS[idx]!.value
}

export function tagNameToTintClass(tagName: string): string {
  return `tintbg-${tagNameToColorKey(tagName)}`
}
