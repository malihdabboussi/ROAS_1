/** Inline script that mirrors bridge applyThemePaintToDocument for thumbnail iframes. */
export function buildPresentationThemePaintScript(): string {
  return `<script data-vibey-theme-paint>
(() => {
  // #region debug-log - H1/H3: paint reporter (srcDoc script: thumbnails + main initial paint)
  const __vibeyDebugReport = (message, vars) => {
    try {
      const isoStyle = document.querySelector('style[data-vibey-slide-isolation]');
      const slideIso = isoStyle ? (isoStyle.textContent.match(/data-vibey-slide-index="(\\d+)"/) || [])[1] : null;
      const visibleSection = Array.from(document.querySelectorAll('section')).find((s) => getComputedStyle(s).display !== 'none') || null;
      const h1 = (visibleSection && visibleSection.querySelector('h1,h2,h3')) || document.querySelector('h1,h2,h3');
      const rect = visibleSection ? visibleSection.getBoundingClientRect() : null;
      fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bd981c' },
        body: JSON.stringify({
          sessionId: 'bd981c',
          hypothesisId: 'H1',
          location: 'presentation-theme-paint-script (srcDoc)',
          message,
          data: {
            context: isoStyle ? 'thumbnail(slide ' + slideIso + ')' : 'main-initial',
            themeNative: Boolean(document.querySelector('[data-vibey-theme-native="true"], .vibey-theme-native')),
            viewport: { w: window.innerWidth, h: window.innerHeight },
            themeStyleEls: {
              live: Boolean(document.getElementById('vibey-tweaks-live')),
              initial: Boolean(document.getElementById('vibey-tweaks-initial')),
              bridge: Boolean(document.getElementById('vibey-tweaks-theme')),
            },
            vars,
            sampled: {
              bodyBg: getComputedStyle(document.body).backgroundColor,
              sectionBg: visibleSection ? getComputedStyle(visibleSection).backgroundColor : null,
              headingColor: h1 ? getComputedStyle(h1).color : null,
              sectionRect: rect ? { w: Math.round(rect.width), h: Math.round(rect.height) } : null,
            },
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch (_) {}
  };
  // #endregion
  const isOpaqueBg = (bg) => {
    if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') return false;
    const alphaMatch = bg.match(/,\\s*([\\d.]+)\\s*\\)\\s*$/);
    if (alphaMatch && parseFloat(alphaMatch[1]) === 0) return false;
    return true;
  };

  function applyThemePaintToDocument() {
    const root = document.documentElement;
    const read = (name) => getComputedStyle(root).getPropertyValue(name).trim();
    const pageBg = read('--color-page-background');
    const slideBg = read('--color-slide-background') || pageBg;
    const heading = read('--color-heading');
    const body = read('--color-body');
    const primary = read('--color-primary');
    const primarySolid = read('--color-primary-solid') || primary;
    const primaryFg = read('--color-primary-foreground') || '#ffffff';
    const card = read('--color-card-background');
    const border = read('--color-border');
    const fontHeading = read('--font-heading');
    const fontBody = read('--font-body');
    const themeNative = Boolean(document.querySelector('[data-vibey-theme-native="true"], .vibey-theme-native'));
    // #region debug-log - H3: theme-native early return
    if (themeNative) {
      __vibeyDebugReport('paint SKIPPED (theme-native marker found)', { pageBg, slideBg, heading, body, primary, card, border });
      return;
    }
    // #endregion
    if (themeNative) return;

    if (pageBg) {
      paintSet(document.body, 'background', pageBg);
      paintSet(document.documentElement, 'background', pageBg);
    }
    if (body) paintSet(document.body, 'color', body);
    if (fontBody) paintSet(document.body, 'font-family', fontBody);

    document.querySelectorAll('main').forEach((el) => {
      if (pageBg) paintSet(el, 'background', pageBg);
    });

    document.querySelectorAll('section').forEach((section) => {
      paintSet(section, 'background', slideBg);
      if (body) paintSet(section, 'color', body);
    });

    const headingSelector = 'h1,h2,h3,h4,h5,h6';
    document.querySelectorAll(headingSelector).forEach((el) => {
      if (heading) paintSet(el, 'color', heading);
      if (fontHeading) paintSet(el, 'font-family', fontHeading);
    });

    document.querySelectorAll('p,li,blockquote,figcaption,dd,dt,label,small,td,th').forEach((el) => {
      if (el.closest(headingSelector)) return;
      if (body) paintSet(el, 'color', body);
      if (fontBody) paintSet(el, 'font-family', fontBody);
    });

    document.querySelectorAll('span,div').forEach((el) => {
      if (el.closest(headingSelector)) return;
      const text = (el.textContent || '').replace(/\\s+/g, '');
      if (!text.length) return;
      const childText = Array.from(el.children).some((child) => ((child.textContent || '').replace(/\\s+/g, '')).length > 0);
      if (childText) return;
      if (body) paintSet(el, 'color', body);
      if (fontBody) paintSet(el, 'font-family', fontBody);
    });

    document.querySelectorAll('a').forEach((el) => {
      if (primarySolid) paintSet(el, 'color', primarySolid);
    });

    document.querySelectorAll('[style]').forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      const tag = el.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style') return;
      const styleAttr = el.getAttribute('style') || '';
      if (/background-color|background\\s*:/i.test(styleAttr)) {
        if (/url\\(|gradient/i.test(styleAttr)) {
          if (tag === 'section' && slideBg) {
            paintSet(el, 'background', slideBg);
          } else if (primary && /gradient/i.test(primary)) {
            paintSet(el, 'background', primary);
          } else if (card) {
            paintSet(el, 'background', card);
          }
        } else if (tag === 'section') {
          paintSet(el, 'background', slideBg);
        } else {
          paintSet(el, 'background-color', card);
        }
      }
      if (/\\bcolor\\s*:/i.test(styleAttr)) {
        if (/^h[1-6]$/.test(tag)) {
          if (heading) paintSet(el, 'color', heading);
        } else if (tag === 'a') {
          if (primarySolid) paintSet(el, 'color', primarySolid);
        } else if (body) {
          paintSet(el, 'color', body);
        }
      }
      if (/font-family/i.test(styleAttr)) {
        if (/^h[1-6]$/.test(tag)) {
          if (fontHeading) paintSet(el, 'font-family', fontHeading);
        } else if (fontBody) {
          paintSet(el, 'font-family', fontBody);
        }
      }
      if (/border-color/i.test(styleAttr) && border) {
        paintSet(el, 'border-color', border);
      }
    });

    document.querySelectorAll('section, section *').forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      const tag = el.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'img' || tag === 'svg' || tag === 'video') return;
      if (tag === 'button' || el.getAttribute('role') === 'button') return;
      const cs = getComputedStyle(el);
      const hasBgImage = cs.backgroundImage && cs.backgroundImage !== 'none';
      if (hasBgImage) {
        if (tag === 'section' && slideBg) {
          paintSet(el, 'background', slideBg);
        } else if (primary && /gradient/i.test(primary)) {
          paintSet(el, 'background', primary);
        } else if (card) {
          paintSet(el, 'background', card);
        }
        return;
      }
      if (!isOpaqueBg(cs.backgroundColor)) return;
      if (tag === 'section') {
        if (slideBg) paintSet(el, 'background', slideBg);
      } else if (card) {
        paintSet(el, 'background-color', card);
      }
    });

    document.querySelectorAll('button,[role="button"]').forEach((el) => {
      if (primary) paintSet(el, 'background', primary);
      paintSet(el, 'color', primaryFg);
      if (primarySolid) paintSet(el, 'border-color', primarySolid);
    });

    // #region debug-log - H1: paint applied (srcDoc script)
    __vibeyDebugReport('paint APPLIED', { pageBg, slideBg, heading, body, primary, card, border });
    // #endregion
  }

  function schedulePaint() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => applyThemePaintToDocument());
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedulePaint);
  } else {
    schedulePaint();
  }
})();
</script>`
}
