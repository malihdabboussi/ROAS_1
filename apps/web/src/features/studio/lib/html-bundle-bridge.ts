/**
 * Shared HTML-bundle preview machinery for artifact editors (presentations,
 * funnels): srcDoc assembly from bundle files/assets, and the in-iframe
 * editor bridge script (hover/select traces, markup drawing, live styles,
 * theme tweaks, slide/section navigation) parameterized per artifact.
 */

export {
  applyBundleAssetUrls,
  buildHtmlBundleSrcDoc,
  escapeRegExp,
  inlineBundleLocalReferences,
} from '@/lib/html/html-bundle-srcdoc'
export type { HtmlBundleSrcDocAsset, HtmlBundleSrcDocFile } from '@/lib/html/html-bundle-srcdoc'

export type HtmlEditMode = 'preview' | 'markup' | 'edit' | 'tweaks' | 'comments'

export interface EditorBridgeOptions {
  /** postMessage type prefix, e.g. 'presentation' or 'funnel'. */
  messagePrefix: string
  /** Trace field carrying the artifact id, e.g. 'presentation_id'. */
  artifactIdField: string
  artifactId: string
  initialMode: HtmlEditMode
  /** Extra constant fields merged into every trace (e.g. funnel_id). */
  extraTraceFields?: Record<string, string>
}

export function buildEditorBridgeScript(options: EditorBridgeOptions): string {
  const { messagePrefix: p, artifactIdField, artifactId, initialMode } = options
  const extraTrace = JSON.stringify(options.extraTraceFields ?? {})
  return `<script>
(() => {
  const artifactId = ${JSON.stringify(artifactId)};
  const extraTrace = ${extraTrace};
  let mode = ${JSON.stringify(initialMode)};
  const hoverBox = document.createElement('div');
  hoverBox.style.cssText = 'position:fixed;display:none;pointer-events:none;border:2px solid Highlight;z-index:2147483647;box-sizing:border-box;';
  document.documentElement.appendChild(hoverBox);

  const getPath = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      const tag = node.tagName.toLowerCase();
      const siblings = Array.from(node.parentElement ? node.parentElement.children : []).filter((child) => child.tagName === node.tagName);
      const index = siblings.indexOf(node) + 1;
      parts.unshift(siblings.length > 1 ? tag + ':nth-of-type(' + index + ')' : tag);
      node = node.parentElement;
    }
    return parts.join(' > ');
  };

  const tagChain = (el) => {
    const tags = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      tags.unshift(node.tagName.toLowerCase());
      node = node.parentElement;
    }
    return tags;
  };

  const toHexColor = (colorStr) => {
    if (!colorStr || colorStr === 'transparent') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    try {
      ctx.fillStyle = '#000000';
      ctx.fillStyle = colorStr;
      const normalized = ctx.fillStyle;
      if (typeof normalized === 'string' && normalized.charAt(0) === '#') {
        if (normalized.length === 7) return normalized;
        if (normalized.length === 4) {
          return '#' + normalized[1] + normalized[1] + normalized[2] + normalized[2] + normalized[3] + normalized[3];
        }
      }
      const rgb = String(normalized).match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/i);
      if (rgb) {
        const hex = (n) => Number(n).toString(16).padStart(2, '0');
        return '#' + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
      }
    } catch (_) {}
    return null;
  };

  const isTransparentBg = (colorStr) => {
    if (!colorStr || colorStr === 'transparent') return true;
    const match = String(colorStr).match(/rgba?\\(\\s*[\\d.]+\\s*,\\s*[\\d.]+\\s*,\\s*[\\d.]+\\s*,\\s*([\\d.]+)\\s*\\)/);
    if (match) return parseFloat(match[1]) === 0;
    const slash = String(colorStr).match(/\\/\\s*([\\d.]+)\\s*\\)/);
    return slash ? parseFloat(slash[1]) === 0 : false;
  };

  const collectUniqueTextColors = (root) => {
    const colors = new Set();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const text = (node.textContent || '').replace(/\\s+/g, '');
      if (text.length > 0) {
        const parent = node.parentElement;
        if (parent) {
          const hex = toHexColor(window.getComputedStyle(parent).color);
          if (hex) colors.add(hex);
        }
      }
      node = walker.nextNode();
    }
    return Array.from(colors);
  };

  const collectUniqueBackgroundColors = (root) => {
    const colors = new Set();
    const visit = (node) => {
      if (!(node instanceof Element)) return;
      const bg = window.getComputedStyle(node).backgroundColor;
      if (!isTransparentBg(bg)) {
        const hex = toHexColor(bg);
        if (hex) colors.add(hex);
      }
      for (const child of node.children) visit(child);
    };
    visit(root);
    return Array.from(colors);
  };

  // The live DOM carries theme-paint inline styles that don't exist in the
  // source files; stripping them from the hint keeps source matching working.
  const cleanSourceHint = (el) => {
    if (!el.outerHTML) return null;
    const clone = el.cloneNode(true);
    const nodes = [clone].concat(Array.from(clone.querySelectorAll('[data-vibey-paint]')));
    nodes.forEach((node) => {
      if (!node.getAttribute) return;
      const painted = node.getAttribute('data-vibey-paint') || '';
      if (!painted) return;
      painted.split(' ').filter(Boolean).forEach((prop) => node.style.removeProperty(prop));
      node.removeAttribute('data-vibey-paint');
      if (!node.getAttribute('style')) node.removeAttribute('style');
    });
    return clone.outerHTML.slice(0, 500);
  };

  const buildTrace = (el) => {
    const rect = el.getBoundingClientRect();
    const computed = window.getComputedStyle(el);
    const section = el.closest('section');
    const sections = Array.from(document.querySelectorAll('section'));
    const sourceEl = el.closest('[data-vibey-source]');
    const textColors = collectUniqueTextColors(el);
    const bgColors = collectUniqueBackgroundColors(el);
    const textMixed = textColors.length > 1;
    const bgMixed = bgColors.length > 1;
    const ownTextHex = toHexColor(computed.color);
    const ownBgHex = isTransparentBg(computed.backgroundColor)
      ? null
      : toHexColor(computed.backgroundColor);
    return Object.assign({
      ${artifactIdField}: artifactId,
      anchor_id: el.getAttribute('data-comment-anchor') || el.getAttribute('data-edit-id') || el.id || null,
      dom_path: getPath(el),
      tag_chain: tagChain(el),
      text_snapshot: ((el.innerText || el.textContent || '') + '').replace(/\\s+/g, ' ').trim().slice(0, 280) || null,
      bounds: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      slide_index: section ? sections.indexOf(section) : null,
      source_file: sourceEl ? sourceEl.getAttribute('data-vibey-source') : null,
      source_hint: cleanSourceHint(el),
      computed_style: {
        font_family: computed.fontFamily || null,
        font_size: computed.fontSize || null,
        font_weight: computed.fontWeight || null,
        line_height: computed.lineHeight || null,
        letter_spacing: computed.letterSpacing || null,
        color: textMixed ? null : (textColors[0] || ownTextHex),
        color_mixed: textMixed,
        background_color: bgMixed ? null : (bgColors[0] || ownBgHex),
        background_color_mixed: bgMixed,
        padding: computed.padding || null,
        margin: computed.margin || null,
        border_radius: computed.borderRadius || null,
        width: computed.width || null,
        height: computed.height || null,
      },
    }, extraTrace);
  };

  const toPoint = (event) => ({ x: event.clientX, y: event.clientY });
  let pointerStart = null;
  let drawingPointerId = null;
  let dragged = false;
  let selectedElement = null;

  const ensureFontLoaded = (fontFamily) => {
    const fontName = String(fontFamily || '').replace(/"/g, '').split(',')[0].trim();
    if (!fontName || fontName === 'inherit') return;
    const id = 'vibey-font-' + fontName.replace(/\\s+/g, '-');
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(fontName).replace(/%20/g, '+') + ':wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  };

  const updateHover = (el) => {
    if ((mode !== 'markup' && mode !== 'edit') || !el || el === hoverBox || el.closest('script, style')) {
      hoverBox.style.display = 'none';
      return;
    }
    const rect = el.getBoundingClientRect();
    hoverBox.style.display = 'block';
    hoverBox.style.left = rect.left + 'px';
    hoverBox.style.top = rect.top + 'px';
    hoverBox.style.width = rect.width + 'px';
    hoverBox.style.height = rect.height + 'px';
  };

  document.addEventListener('mousemove', (event) => updateHover(event.target), true);
  document.addEventListener('pointerdown', (event) => {
    if (mode !== 'markup' || event.button !== 0) return;
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('script, style')) return;
    pointerStart = { point: toPoint(event), target: event.target, pointerId: event.pointerId };
    drawingPointerId = null;
    dragged = false;
  }, true);
  document.addEventListener('pointermove', (event) => {
    if (mode !== 'markup' || !pointerStart) return;
    const point = toPoint(event);
    const distance = Math.hypot(point.x - pointerStart.point.x, point.y - pointerStart.point.y);
    if (drawingPointerId === null && distance < 5) return;
    if (drawingPointerId === null) {
      dragged = true;
      drawingPointerId = pointerStart.pointerId;
      hoverBox.style.display = 'none';
      if (typeof pointerStart.target.setPointerCapture === 'function') {
        pointerStart.target.setPointerCapture(pointerStart.pointerId);
      }
      parent.postMessage({ type: '${p}:drawing', phase: 'start', point: pointerStart.point }, '*');
    }
    event.preventDefault();
    event.stopPropagation();
    parent.postMessage({ type: '${p}:drawing', phase: 'move', point }, '*');
  }, true);
  const finishDrawing = (event) => {
    if (mode !== 'markup' || !pointerStart) return;
    if (drawingPointerId !== null) {
      event.preventDefault();
      event.stopPropagation();
      parent.postMessage({ type: '${p}:drawing', phase: 'end', point: toPoint(event) }, '*');
    }
    pointerStart = null;
    drawingPointerId = null;
  };
  document.addEventListener('pointerup', finishDrawing, true);
  document.addEventListener('pointercancel', finishDrawing, true);
  document.addEventListener('keydown', (event) => {
    if (!(event.metaKey || event.ctrlKey) || String(event.key).toLowerCase() !== 'z') return;
    const t = event.target;
    if (t instanceof Element && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    event.preventDefault();
    event.stopPropagation();
    parent.postMessage({ type: '${p}:history', direction: event.shiftKey ? 'redo' : 'undo' }, '*');
  }, true);
  document.addEventListener('click', (event) => {
    if (mode !== 'markup' && mode !== 'edit') return;
    if (dragged) {
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) return;
    selectedElement = target;
    event.preventDefault();
    event.stopPropagation();
    parent.postMessage({ type: '${p}:element-clicked', trace: buildTrace(target) }, '*');
  }, true);

  const isOpaqueBg = (bg) => {
    if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') return false;
    const alphaMatch = bg.match(/,\\s*([\\d.]+)\\s*\\)\\s*$/);
    if (alphaMatch && parseFloat(alphaMatch[1]) === 0) return false;
    return true;
  };

  // Theme paint writes go through paintSet so user-edited properties (inline
  // !important set via apply-style or persisted as "prop: value !important")
  // are never stomped. data-vibey-paint records which properties the theme
  // paint owns on each element; everything else inline-!important is the user's.
  const paintSet = (el, prop, value) => {
    const attr = (el.getAttribute && el.getAttribute('data-vibey-paint')) || '';
    const list = attr ? attr.split(' ').filter(Boolean) : [];
    const userOwned = el.style && el.style.getPropertyPriority(prop) === 'important' && list.indexOf(prop) === -1;
    if (userOwned) return;
    el.style.setProperty(prop, value, 'important');
    if (list.indexOf(prop) === -1) {
      list.push(prop);
      el.setAttribute('data-vibey-paint', list.join(' '));
    }
  };

  // #region debug-log - H2: bridge paint reporter (main iframe)
  const __vibeyBridgeDebugReport = (message, vars) => {
    try {
      const activeSlideStyle = document.getElementById('vibey-active-slide-view');
      const visibleSection = Array.from(document.querySelectorAll('section')).find((s) => getComputedStyle(s).display !== 'none') || null;
      const h1 = (visibleSection && visibleSection.querySelector('h1,h2,h3')) || document.querySelector('h1,h2,h3');
      const rect = visibleSection ? visibleSection.getBoundingClientRect() : null;
      fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bd981c' },
        body: JSON.stringify({
          sessionId: 'bd981c',
          hypothesisId: 'H2',
          location: 'html-bundle-bridge (main iframe)',
          message,
          data: {
            artifactId,
            themeNative: Boolean(document.querySelector('[data-vibey-theme-native="true"], .vibey-theme-native')),
            viewport: { w: window.innerWidth, h: window.innerHeight },
            activeSlideViewApplied: Boolean(activeSlideStyle),
            bodyScrollHeight: document.body ? document.body.scrollHeight : null,
            themeStyleEls: {
              live: Boolean(document.getElementById('vibey-tweaks-live')),
              initial: Boolean(document.getElementById('vibey-tweaks-initial')),
              bridge: Boolean(document.getElementById('vibey-tweaks-theme')),
            },
            vars,
            sampled: {
              bodyBg: document.body ? getComputedStyle(document.body).backgroundColor : null,
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

    // #region debug-log - H2: bridge theme-native early return
    if (themeNative) {
      __vibeyBridgeDebugReport('bridge paint SKIPPED (theme-native)', { pageBg, slideBg, heading, body, primary, card, border });
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
        } else {
          if (tag === 'section') {
            paintSet(el, 'background', slideBg);
          } else {
            paintSet(el, 'background-color', card);
          }
        }
      }
      if (/\\bcolor\\s*:/i.test(styleAttr)) {
        if (/^h[1-6]$/.test(tag)) {
          if (heading) paintSet(el, 'color', heading);
        } else if (tag === 'a') {
          if (primarySolid) paintSet(el, 'color', primarySolid);
        } else {
          if (body) paintSet(el, 'color', body);
        }
      }
      if (/font-family/i.test(styleAttr)) {
        if (/^h[1-6]$/.test(tag)) {
          if (fontHeading) paintSet(el, 'font-family', fontHeading);
        } else {
          if (fontBody) paintSet(el, 'font-family', fontBody);
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

    // #region debug-log - H2: bridge paint applied (main iframe)
    __vibeyBridgeDebugReport('bridge paint APPLIED', { pageBg, slideBg, heading, body, primary, card, border });
    // #endregion
  }

  const getSlideSections = () =>
    Array.from(document.querySelectorAll('section')).filter(
      (section) => !section.parentElement || !section.parentElement.closest('section'),
    );

  let activeSlideIndex = 0;

  // Letterbox-fit the active slide. Slides are authored responsive (content
  // height), but the stage is a fixed 16:9 box with overflow:hidden. Without
  // this, a slide whose content is taller than the box — more likely when the
  // stage is narrow, e.g. when the chat panel is open — gets its bottom clipped.
  // Scale the whole slide down so it always fits; never clip.
  const fitActiveSlide = (target) => {
    if (!target) return;
    target.style.removeProperty('transform');
    target.style.removeProperty('transform-origin');
    const vh = document.documentElement.clientHeight || window.innerHeight || 0;
    const contentH = target.scrollHeight;
    if (vh > 0 && contentH > vh + 1) {
      target.style.setProperty('transform-origin', 'top center', 'important');
      target.style.setProperty('transform', 'scale(' + vh / contentH + ')', 'important');
    }
  };

  let fitRaf = 0;
  const refitActiveSlide = () => {
    if (fitRaf) cancelAnimationFrame(fitRaf);
    fitRaf = requestAnimationFrame(() => {
      fitRaf = 0;
      fitActiveSlide(getSlideSections()[activeSlideIndex]);
    });
  };
  // Re-fit when the iframe itself resizes (chat panel open/close, window resize).
  window.addEventListener('resize', refitActiveSlide);

  const applyActiveSlide = (index) => {
    const sections = getSlideSections();
    if (!sections.length) return;
    const safeIndex = Math.max(0, Math.min(Number(index) || 0, sections.length - 1));
    sections.forEach((section, i) => {
      section.setAttribute('data-vibey-slide-index', String(i));
      section.hidden = false;
    });
    let styleEl = document.getElementById('vibey-active-slide-view');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'vibey-active-slide-view';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = [
      'html, body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; height: 100% !important; width: 100% !important; }',
      'section[data-vibey-slide-index] { display: none !important; visibility: hidden !important; }',
      'section[data-vibey-slide-index="' + safeIndex + '"] { display: flex !important; visibility: visible !important; min-height: 100% !important; width: 100% !important; box-sizing: border-box !important; margin: 0 !important; }',
    ].join('\\n');
    activeSlideIndex = safeIndex;
    const target = sections[safeIndex];
    if (target) {
      target.scrollIntoView({ block: 'start', inline: 'nearest' });
      fitActiveSlide(target);
      // Re-fit after layout settles (late fonts/images can change content height).
      requestAnimationFrame(() => fitActiveSlide(getSlideSections()[safeIndex]));
      setTimeout(() => fitActiveSlide(getSlideSections()[safeIndex]), 200);
    }
  };

  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type === '${p}:set-mode') {
      mode = data.mode || 'preview';
      hoverBox.style.display = 'none';
      if (mode !== 'edit' && mode !== 'markup') selectedElement = null;
    }
    if (data.type === '${p}:apply-style' && data.styles) {
      const target = data.domPath ? document.body.querySelector(data.domPath) : selectedElement;
      if (!target) return;
      selectedElement = target;
      // Inline !important so user edits beat the theme mapping CSS (!important).
      // Removing the property from data-vibey-paint hands ownership to the user:
      // subsequent theme paint passes skip user-owned properties.
      const painted = ((target.getAttribute('data-vibey-paint') || '').split(' ')).filter(Boolean);
      Object.keys(data.styles).forEach((prop) => {
        const kebab = prop.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
        target.style.setProperty(kebab, String(data.styles[prop]), 'important');
        const idx = painted.indexOf(kebab);
        if (idx !== -1) painted.splice(idx, 1);
      });
      target.setAttribute('data-vibey-paint', painted.join(' '));
      if (data.styles.fontFamily) ensureFontLoaded(data.styles.fontFamily);
    }
    if (data.type === '${p}:apply-theme-css') {
      const styleId = 'vibey-tweaks-theme';
      let styleEl = document.getElementById(styleId);
      if (!data.css) {
        if (styleEl) styleEl.remove();
      } else {
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = styleId;
          document.head.appendChild(styleEl);
        }
        styleEl.textContent = data.css;
      }
      if (data.fontsUrl) {
        const fontId = 'vibey-tweaks-fonts';
        let fontEl = document.getElementById(fontId);
        if (!fontEl) {
          fontEl = document.createElement('link');
          fontEl.id = fontId;
          fontEl.rel = 'stylesheet';
          document.head.appendChild(fontEl);
        }
        if (fontEl.getAttribute('href') !== data.fontsUrl) {
          fontEl.setAttribute('href', data.fontsUrl);
        }
      }
      if (data.css) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => applyThemePaintToDocument());
        });
      }
      // #region debug-log - H2: apply-theme-css received in main iframe
      __vibeyBridgeDebugReport('apply-theme-css RECEIVED (cssLen=' + String(data.css ? data.css.length : 0) + ', fontsUrl=' + String(Boolean(data.fontsUrl)) + ')', {});
      // #endregion
    }
    if (data.type === '${p}:jump-slide') {
      applyActiveSlide(data.index);
      // #region debug-log - H2: jump-slide applied in main iframe
      __vibeyBridgeDebugReport('jump-slide APPLIED (index=' + String(data.index) + ')', {});
      // #endregion
    }
  });

  parent.postMessage({ type: '${p}:viewport-ready' }, '*');
})();
</script>`
}

export function injectEditorBridge(srcDoc: string, bridge: string): string {
  if (srcDoc.includes('</body>')) return srcDoc.replace('</body>', `${bridge}</body>`)
  return `${srcDoc}${bridge}`
}

/**
 * Preview-safe funnel runtime for the studio iframe: lead-capture forms are
 * intercepted (never create real leads) and data-vibey-link navigation is
 * forwarded to the parent so it can switch the previewed page.
 */
export function buildFunnelPreviewRuntimeScript(): string {
  return `<script>
(() => {
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!form || !(form instanceof Element) || !form.hasAttribute('data-vibey-capture')) return;
    event.preventDefault();
    event.stopPropagation();
    parent.postMessage({ type: 'funnel:capture-blocked' }, '*');
  }, true);
  document.addEventListener('click', (event) => {
    let el = event.target;
    while (el && el !== document.body && el instanceof Element) {
      const target = el.getAttribute('data-vibey-link');
      if (target !== null) {
        event.preventDefault();
        event.stopPropagation();
        parent.postMessage({ type: 'funnel:navigate', target }, '*');
        return;
      }
      el = el.parentElement;
    }
  }, true);
})();
</script>`
}
