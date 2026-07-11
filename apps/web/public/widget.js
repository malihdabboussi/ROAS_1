;(function () {
  'use strict'

  var STYLE_ID = '__vibey_widget_styles__'
  var ROOT_ID = '__vibey_widget_root__'
  var SCRIPT_TAG = document.currentScript
  if (!SCRIPT_TAG) return

  var slug = SCRIPT_TAG.getAttribute('data-slug')
  var agentKey = SCRIPT_TAG.getAttribute('data-agent')
  if (!slug || !agentKey) {
    console.error('[Vibey Widget] data-slug and data-agent are required')
    return
  }

  var apiBase = SCRIPT_TAG.getAttribute('data-api-base')
  var devToken = SCRIPT_TAG.getAttribute('data-token')
  var baseHost = SCRIPT_TAG.getAttribute('data-host') || slug + '.agents.roas.io'
  var baseUrl = apiBase ? apiBase.replace(/\/$/, '') : 'https://' + baseHost

  function apiUrl(path) {
    if (apiBase) return baseUrl + '/api/public-' + path
    return baseUrl + '/a/' + encodeURIComponent(agentKey) + '/api/' + path
  }

  function qs(obj) {
    return Object.keys(obj)
      .filter(function (k) {
        return obj[k] !== undefined && obj[k] !== null && obj[k] !== ''
      })
      .map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(String(obj[k]))
      })
      .join('&')
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return
    var style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent =
      '#' +
      ROOT_ID +
      '{position:fixed;z-index:2147483646;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
      '#' +
      ROOT_ID +
      '.vw-br{bottom:20px;right:20px}' +
      '#' +
      ROOT_ID +
      '.vw-bl{bottom:20px;left:20px}' +
      '#' +
      ROOT_ID +
      ' .vw-launcher{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.24),0 2px 6px rgba(0,0,0,.12);display:flex;align-items:center;justify-content:center;color:#fff;transition:transform .18s ease,box-shadow .18s ease;padding:0}' +
      '#' +
      ROOT_ID +
      ' .vw-launcher:hover{transform:scale(1.05);box-shadow:0 12px 28px rgba(0,0,0,.28),0 2px 8px rgba(0,0,0,.14)}' +
      '#' +
      ROOT_ID +
      ' .vw-launcher:active{transform:scale(0.97)}' +
      '#' +
      ROOT_ID +
      ' .vw-launcher img{width:28px;height:28px;border-radius:50%;object-fit:cover}' +
      '#' +
      ROOT_ID +
      ' .vw-frame-wrap{position:absolute;bottom:72px;width:380px;height:600px;max-height:calc(100vh - 120px);max-width:calc(100vw - 40px);border-radius:16px;overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,.28),0 4px 12px rgba(0,0,0,.14);background:#0a0a0a;opacity:0;transform:translateY(8px) scale(.98);pointer-events:none;transition:opacity .18s ease,transform .18s ease}' +
      '#' +
      ROOT_ID +
      '.vw-br .vw-frame-wrap{right:0}' +
      '#' +
      ROOT_ID +
      '.vw-bl .vw-frame-wrap{left:0}' +
      '#' +
      ROOT_ID +
      '.vw-open .vw-frame-wrap{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}' +
      '#' +
      ROOT_ID +
      ' iframe{width:100%;height:100%;border:0;display:block;background:transparent}' +
      '@media (max-width:480px){#' +
      ROOT_ID +
      ' .vw-frame-wrap{width:calc(100vw - 24px);height:calc(100vh - 100px);bottom:72px}}'
    document.head.appendChild(style)
  }

  function svgBubble() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
  }

  function build(config) {
    injectStyles()
    var root = document.createElement('div')
    root.id = ROOT_ID
    root.className = config.position === 'bottom-left' ? 'vw-bl' : 'vw-br'

    var btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'vw-launcher'
    btn.setAttribute('aria-label', 'Open chat with ' + (config.title || 'agent'))
    btn.style.background = config.accentColor || '#7C3AED'
    if (config.launcherIconUrl) {
      var img = document.createElement('img')
      img.src = config.launcherIconUrl
      img.alt = ''
      btn.appendChild(img)
    } else {
      btn.innerHTML = svgBubble()
    }

    var wrap = document.createElement('div')
    wrap.className = 'vw-frame-wrap'
    var iframe = document.createElement('iframe')
    iframe.setAttribute('title', 'Chat with ' + (config.title || 'agent'))
    iframe.setAttribute('allow', 'clipboard-write; microphone')

    var paramObj = {
      embed: '1',
      accent: config.accentColor,
      title: config.title,
      subtitle: config.subtitle,
      greeting: config.greeting,
      avatar: config.imageUrl,
      tagline: SCRIPT_TAG.getAttribute('data-tagline') || '',
    }
    if (apiBase) {
      paramObj._uid = SCRIPT_TAG.getAttribute('data-uid') || config.userId || ''
      paramObj._name = config.name || config.title || ''
      paramObj._role = config.role || config.subtitle || ''
      paramObj._slug = config.userSlug || slug
      paramObj._image = config.imageUrl || ''
      paramObj._apiBase = apiBase
      paramObj._token = devToken || ''
    }
    var params = qs(paramObj)
    var pageBase = apiBase
      ? SCRIPT_TAG.getAttribute('data-page-base') || 'https://' + baseHost
      : baseUrl
    iframe.src = pageBase + '/a/' + encodeURIComponent(agentKey) + (params ? '?' + params : '')
    wrap.appendChild(iframe)

    root.appendChild(wrap)
    root.appendChild(btn)
    document.body.appendChild(root)

    var opened = false
    function setOpen(next) {
      opened = next
      if (opened) {
        if (!iframe.src || iframe.getAttribute('data-loaded') !== '1') {
          iframe.setAttribute('data-loaded', '1')
        }
        root.classList.add('vw-open')
        btn.setAttribute('aria-expanded', 'true')
      } else {
        root.classList.remove('vw-open')
        btn.setAttribute('aria-expanded', 'false')
      }
    }

    btn.addEventListener('click', function () {
      setOpen(!opened)
    })
    window.addEventListener('message', function (e) {
      if (!e.data || e.data.source !== 'vibey-widget') return
      if (iframe.contentWindow && e.source !== iframe.contentWindow) return
      if (e.data.type === 'close') setOpen(false)
      if (e.data.type === 'open') setOpen(true)
      if (e.data.type === 'tab-changed' && typeof e.data.tab === 'string') {
        var evt = new CustomEvent('vibey-tab-changed', { detail: { tab: e.data.tab } })
        window.dispatchEvent(evt)
      }
    })

    function navigateTab(tab) {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          { source: 'vibey-widget-parent', type: 'navigate', tab: tab },
          '*',
        )
      }
    }

    window.VibeyWidget = {
      open: function (tab) {
        setOpen(true)
        if (tab) navigateTab(tab)
      },
      close: function () {
        setOpen(false)
      },
      toggle: function () {
        setOpen(!opened)
      },
      navigate: function (tab) {
        navigateTab(tab)
      },
    }
  }

  var configUrl = apiUrl('widget/config')
  var fetchOpts = { credentials: 'omit' }
  if (devToken) fetchOpts.headers = { 'x-public-agent-token': devToken }
  fetch(configUrl, fetchOpts)
    .then(function (r) {
      return r.ok ? r.json() : null
    })
    .then(function (j) {
      if (!j || !j.ok || !j.config) {
        console.warn('[Vibey Widget] widget is disabled for this agent')
        return
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          build(j.config)
        })
      } else {
        build(j.config)
      }
    })
    .catch(function (err) {
      console.error('[Vibey Widget] failed to load config', err)
    })
})()
