import type { FunnelPageBundle } from '../services/artifact-preview.service'
import { buildHtmlBundleSrcDoc } from './html-bundle-bridge'

const FUNNEL_HERO_THUMB_ISOLATION = `<style data-vibey-hero-thumb>
html, body {
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  height: 100% !important;
  width: 100% !important;
  background: #fff !important;
}
body {
  display: flex !important;
  justify-content: center !important;
  align-items: flex-start !important;
}
main,
section.hero,
#hero,
.hero,
body > section:first-of-type {
  width: 100% !important;
  max-width: 100% !important;
  margin-left: auto !important;
  margin-right: auto !important;
}
body > footer,
body > .vibey-site-footer,
footer {
  display: none !important;
}
</style>
<script data-vibey-hero-thumb>
(() => {
  const selectors = ['#hero', 'section.hero', '.hero', 'main > section:first-child', 'body > section:first-of-type'];
  let hero = null;
  for (const selector of selectors) {
    hero = document.querySelector(selector);
    if (hero) break;
  }
  window.scrollTo(0, 0);
  if (!hero) return;
  for (const child of Array.from(document.body.children)) {
    if (child === hero || hero.contains(child) || child.contains(hero)) continue;
    if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE' || child.tagName === 'LINK') continue;
    child.style.display = 'none';
  }
  let node = hero;
  while (node && node.parentElement && node.parentElement !== document.body) {
    node = node.parentElement;
  }
  if (node && node !== document.body) {
    for (const child of Array.from(document.body.children)) {
      if (child === node || node.contains(child) || child.contains(node)) continue;
      if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE' || child.tagName === 'LINK') continue;
      child.style.display = 'none';
    }
  }
  hero.style.display = 'block';
  hero.style.visibility = 'visible';
  hero.style.minHeight = '100vh';
  hero.style.width = '100%';
})();
</script>`

function appendSharedCss(doc: string, bundle: FunnelPageBundle): string {
  const unreferencedSharedCss = bundle.shared_files
    .filter(
      (file) =>
        (file.mime_type === 'text/css' || file.path.endsWith('.css')) &&
        !doc.includes(`data-vibey-source="${file.path}"`),
    )
    .map((file) => `<style data-vibey-source="${file.path}">\n${file.content}\n</style>`)
    .join('\n')

  if (!unreferencedSharedCss) return doc

  return doc.includes('</head>')
    ? doc.replace('</head>', `${unreferencedSharedCss}</head>`)
    : `${unreferencedSharedCss}${doc}`
}

function injectHeroThumbnailRuntime(doc: string): string {
  if (doc.includes('</body>')) {
    return doc.replace('</body>', `${FUNNEL_HERO_THUMB_ISOLATION}</body>`)
  }
  return `${doc}${FUNNEL_HERO_THUMB_ISOLATION}`
}

export function buildFunnelPageThumbnailSrcDoc(bundle: FunnelPageBundle): string | null {
  if (!bundle.has_entry) return null

  const allFiles = [...bundle.shared_files, ...bundle.files]
  let doc = buildHtmlBundleSrcDoc(
    allFiles,
    bundle.assets,
    bundle.entry_file,
    'No funnel entry file',
  )
  doc = appendSharedCss(doc, bundle)
  doc = injectHeroThumbnailRuntime(doc)
  return doc
}
