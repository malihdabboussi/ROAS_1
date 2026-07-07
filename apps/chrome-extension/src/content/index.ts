import { extractArticle } from './readability'

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'CAPTURE_PAGE') return
  const selectionText = window.getSelection()?.toString() ?? ''
  const metaDesc =
    document.querySelector('meta[name="description"]')?.getAttribute('content') ?? ''
  const article = extractArticle()
  sendResponse({
    url: location.href,
    title: document.title,
    description: metaDesc,
    selectionText,
    articleText: article?.textContent ?? null,
    articleTitle: article?.title ?? null,
  })
})
