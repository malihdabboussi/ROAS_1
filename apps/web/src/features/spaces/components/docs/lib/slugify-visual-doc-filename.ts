export function slugifyVisualDocFilename(title: string): string {
  const s = title
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const base = s.slice(0, 80)
  return base || 'visual-doc'
}
