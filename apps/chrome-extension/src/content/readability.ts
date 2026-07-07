import { Readability } from '@mozilla/readability'

export function extractArticle(): { textContent: string; title: string } | null {
  const clone = document.cloneNode(true) as Document
  const reader = new Readability(clone)
  const article = reader.parse()
  if (!article?.textContent?.trim()) return null
  return { textContent: article.textContent.trim(), title: article.title || document.title }
}
