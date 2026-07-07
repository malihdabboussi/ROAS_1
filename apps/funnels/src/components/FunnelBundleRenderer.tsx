import type { AssembledFunnelHtml } from '@/lib/assemble-funnel-html'
import { FunnelBehaviorBridge, type FunnelPageMapEntry } from './FunnelBehaviorBridge'

interface WebsiteNavItem {
  label: string
  path: string
  style?: 'link' | 'button'
}

interface WebsiteLayout {
  navigation?: {
    logo?: { url: string; alt: string }
    items?: WebsiteNavItem[]
    position?: 'sticky' | 'fixed' | 'static'
    style?: 'transparent' | 'solid' | 'blur'
  }
  footer?: {
    columns?: Array<{ title: string; links: Array<{ label: string; path: string }> }>
    copyright?: string
    socials?: Array<{ platform: string; url: string }>
  }
}

interface FunnelBundleRendererProps {
  assembled: AssembledFunnelHtml
  funnelId: string
  pageId: string
  funnelSlug?: string
  pageMap?: FunnelPageMapEntry[]
  funnelType?: string | null
  layout?: WebsiteLayout | null
}

function normalizePath(path: string): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (path.startsWith('/')) return path
  return `/${path}`
}

// Self-contained chrome styles: bundle pages don't load Tailwind, so the
// structured-layout fallback nav/footer ship their own CSS.
const CHROME_CSS = `
.vibey-site-nav { position: sticky; top: 0; z-index: 40; background: #fff; border-bottom: 1px solid rgba(0,0,0,0.05); }
.vibey-site-nav--fixed { position: fixed; top: 0; left: 0; right: 0; z-index: 50; }
.vibey-site-nav--static { position: relative; }
.vibey-site-nav--transparent { background: transparent; border-bottom: none; }
.vibey-site-nav__inner { margin: 0 auto; display: flex; width: 100%; max-width: 80rem; align-items: center; justify-content: space-between; gap: 1.5rem; padding: 1rem 1.5rem; }
.vibey-site-nav__logo { height: 2.5rem; width: auto; max-width: 220px; }
.vibey-site-nav__brand { font-size: 0.875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.vibey-site-nav__items { display: flex; align-items: center; gap: 0.75rem; }
.vibey-site-nav__link { border: none; background: none; cursor: pointer; border-radius: 0.375rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; font-weight: 500; color: rgba(0,0,0,0.8); }
.vibey-site-nav__link:hover { background: rgba(0,0,0,0.05); }
.vibey-site-nav__button { border: none; cursor: pointer; border-radius: 0.375rem; background: #000; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #fff; }
.vibey-site-nav__button:hover { opacity: 0.9; }
.vibey-site-footer { border-top: 1px solid rgba(0,0,0,0.1); background: #fff; }
.vibey-site-footer__columns { margin: 0 auto; display: grid; width: 100%; max-width: 80rem; gap: 2rem; padding: 2.5rem 1.5rem; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.vibey-site-footer__title { margin: 0 0 0.75rem; font-size: 0.875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(0,0,0,0.8); }
.vibey-site-footer__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; }
.vibey-site-footer__link { font-size: 0.875rem; color: rgba(0,0,0,0.7); text-decoration: none; }
.vibey-site-footer__link:hover { color: #000; }
.vibey-site-footer__meta { margin: 0 auto; display: flex; width: 100%; max-width: 80rem; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0 1.5rem 2rem; }
.vibey-site-footer__copyright { font-size: 0.75rem; color: rgba(0,0,0,0.6); margin: 0; }
.vibey-site-footer__socials { display: flex; align-items: center; gap: 0.75rem; }
.vibey-site-footer__social { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(0,0,0,0.6); text-decoration: none; }
`

function DefaultBundleNav({ layout }: { layout: WebsiteLayout }) {
  const items = layout.navigation?.items ?? []
  const position = layout.navigation?.position ?? 'sticky'
  const style = layout.navigation?.style ?? 'solid'
  const classes = [
    'vibey-site-nav',
    position === 'fixed' ? 'vibey-site-nav--fixed' : '',
    position === 'static' ? 'vibey-site-nav--static' : '',
    style === 'transparent' ? 'vibey-site-nav--transparent' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <header className={classes}>
      <div className="vibey-site-nav__inner">
        {layout.navigation?.logo?.url ? (
          <img
            src={layout.navigation.logo.url}
            alt={layout.navigation.logo.alt || 'Logo'}
            className="vibey-site-nav__logo"
            loading="eager"
          />
        ) : (
          <div className="vibey-site-nav__brand">Website</div>
        )}
        <nav className="vibey-site-nav__items">
          {items.map((item) => (
            <button
              key={`${item.label}-${item.path}`}
              type="button"
              data-vibey-link={normalizePath(item.path)}
              className={
                item.style === 'button' ? 'vibey-site-nav__button' : 'vibey-site-nav__link'
              }
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}

function DefaultBundleFooter({ layout }: { layout: WebsiteLayout }) {
  const columns = layout.footer?.columns ?? []
  const socials = layout.footer?.socials ?? []
  return (
    <footer className="vibey-site-footer">
      <div className="vibey-site-footer__columns">
        {columns.map((column) => (
          <section key={column.title}>
            <h3 className="vibey-site-footer__title">{column.title}</h3>
            <ul className="vibey-site-footer__list">
              {(column.links ?? []).map((link) => (
                <li key={`${column.title}-${link.label}-${link.path}`}>
                  <a href={normalizePath(link.path)} className="vibey-site-footer__link">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {(layout.footer?.copyright || socials.length > 0) && (
        <div className="vibey-site-footer__meta">
          <p className="vibey-site-footer__copyright">{layout.footer?.copyright ?? ''}</p>
          <div className="vibey-site-footer__socials">
            {socials.map((social) => (
              <a
                key={`${social.platform}-${social.url}`}
                href={social.url}
                target="_blank"
                rel="noreferrer"
                className="vibey-site-footer__social"
              >
                {social.platform}
              </a>
            ))}
          </div>
        </div>
      )}
    </footer>
  )
}

/**
 * Server-rendered HTML bundle funnel page. The bundle HTML lands directly in
 * the page response (SEO-visible, same-origin lead capture); the behavior
 * bridge wires lead forms and data-vibey-link navigation via event delegation.
 */
export function FunnelBundleRenderer({
  assembled,
  funnelId,
  pageId,
  funnelSlug,
  pageMap,
  funnelType,
  layout,
}: FunnelBundleRendererProps) {
  const isWebsite = funnelType === 'website'
  const hasSharedNav = Boolean(assembled.navHtml)
  const hasSharedFooter = Boolean(assembled.footerHtml)
  const useDefaultChrome =
    isWebsite &&
    Boolean(layout?.navigation || layout?.footer) &&
    (!hasSharedNav || !hasSharedFooter)

  return (
    <div className="vibey-bundle-runtime">
      {assembled.css ? <style dangerouslySetInnerHTML={{ __html: assembled.css }} /> : null}
      {useDefaultChrome ? <style dangerouslySetInnerHTML={{ __html: CHROME_CSS }} /> : null}

      {isWebsite && hasSharedNav ? (
        <div dangerouslySetInnerHTML={{ __html: assembled.navHtml! }} />
      ) : isWebsite && layout?.navigation ? (
        <DefaultBundleNav layout={layout} />
      ) : null}

      <main dangerouslySetInnerHTML={{ __html: assembled.bodyHtml }} />

      {isWebsite && hasSharedFooter ? (
        <div dangerouslySetInnerHTML={{ __html: assembled.footerHtml! }} />
      ) : isWebsite && layout?.footer ? (
        <DefaultBundleFooter layout={layout} />
      ) : null}

      <FunnelBehaviorBridge
        funnelId={funnelId}
        pageId={pageId}
        funnelSlug={funnelSlug}
        pageMap={pageMap}
      />
    </div>
  )
}
