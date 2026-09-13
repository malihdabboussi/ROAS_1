// ROAS Wiki shared script.
// 1. "Show technical details" switch, remembered per browser.
// 2. Page outline fixed on the left, built from the page's H2 headings.
// 3. Tabs: an H2 with data-tab="Name" and everything under it lives in that tab.
//    Untagged sections belong to the first tab ("Overview"). Deep links open the right tab.
(function () {
  var cb = document.getElementById('tech');
  if (cb) {
    try { var saved = localStorage.getItem('roas-wiki-tech'); if (saved !== null) cb.checked = saved === '1'; } catch (e) {}
    var applyTech = function () {
      document.body.classList.toggle('show-tech', cb.checked);
      try { localStorage.setItem('roas-wiki-tech', cb.checked ? '1' : '0'); } catch (e) {}
    };
    cb.addEventListener('change', applyTech); applyTech();
  }

  var wrap = document.querySelector('.wrap');
  if (!wrap) return;
  var kids = Array.prototype.slice.call(wrap.children);
  var sections = [], cur = null, n = 0;
  kids.forEach(function (el) {
    if (el.tagName === 'H2') {
      n += 1;
      if (!el.id) el.id = 'section-' + n;
      cur = { h2: el, els: [el], tab: el.getAttribute('data-tab') || 'Overview', id: el.id };
      sections.push(cur);
    } else if (cur) {
      cur.els.push(el);
    }
  });
  if (sections.length < 2) return;

  var tabs = [];
  sections.forEach(function (s) { if (tabs.indexOf(s.tab) < 0) tabs.push(s.tab); });
  var multi = tabs.length > 1;

  var bar = null;
  if (multi) {
    bar = document.createElement('div'); bar.className = 'tabs';
    tabs.forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.dataset.tab = t;
      var count = sections.filter(function (s) { return s.tab === t; }).length;
      b.innerHTML = t + '<span class="count">' + count + '</span>';
      b.addEventListener('click', function () { activate(t, null, true); });
      bar.appendChild(b);
    });
    wrap.insertBefore(bar, sections[0].h2);
  }

  var aside = document.createElement('aside'); aside.className = 'outline';
  document.body.appendChild(aside); document.body.classList.add('has-outline');
  var nav = document.querySelector('.nav');
  var placeAside = function () { var h = nav ? nav.offsetHeight : 58; aside.style.top = h + 'px'; if (bar) bar.style.top = h + 'px'; document.documentElement.style.setProperty('--sticky', (h + (bar ? bar.offsetHeight : 0) + 16) + 'px'); };
  placeAside(); window.addEventListener('resize', placeAside);

  function headingText(h2) {
    var c = h2.cloneNode(true); var badge = c.querySelector('.n'); if (badge) badge.remove();
    return (c.textContent || '').trim();
  }
  function renderOutline(active) {
    aside.innerHTML = '';
    var t = document.createElement('div'); t.className = 'outline-title'; t.textContent = 'On this page'; aside.appendChild(t);
    tabs.forEach(function (tab) {
      if (multi) { var lab = document.createElement('div'); lab.className = 'outline-tab'; lab.textContent = tab; aside.appendChild(lab); }
      sections.forEach(function (s) {
        if (s.tab !== tab) return;
        var a = document.createElement('a'); a.href = '#' + s.id; a.textContent = headingText(s.h2); a.dataset.id = s.id;
        a.addEventListener('click', function (e) { e.preventDefault(); activate(s.tab, s.id, true); });
        aside.appendChild(a);
      });
    });
  }
  function findSectionFor(id) {
    var target = document.getElementById(id); if (!target) return null;
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      for (var j = 0; j < s.els.length; j++) { if (s.els[j] === target || s.els[j].contains(target)) return s; }
    }
    return null;
  }
  var activeTab = tabs[0];
  function activate(tab, id, scroll) {
    activeTab = tab;
    sections.forEach(function (s) { var show = !multi || s.tab === tab; s.els.forEach(function (el) { el.hidden = !show; }); });
    if (bar) Array.prototype.forEach.call(bar.children, function (b) { b.classList.toggle('active', b.dataset.tab === tab); });
    renderOutline(tab);
    if (id) {
      var el = document.getElementById(id);
      if (el) {
        try { history.replaceState(null, '', '#' + id); } catch (e) {}
        if (scroll) { el.scrollIntoView({ block: 'start', behavior: scroll === 'instant' ? 'auto' : 'smooth' }); }
      }
    } else if (scroll) { window.scrollTo({ top: 0, behavior: 'smooth' }); }
    markActive();
  }
  function markActive() {
    var links = aside.querySelectorAll('a'); var best = null; var offset = (nav ? nav.offsetHeight : 58) + 80;
    sections.forEach(function (s) { if (multi && s.tab !== activeTab) return; if (s.h2.getBoundingClientRect().top - offset <= 0) best = s.id; });
    if (!best) { var first = sections.filter(function (s) { return !multi || s.tab === activeTab; })[0]; best = first ? first.id : null; }
    Array.prototype.forEach.call(links, function (a) { a.classList.toggle('active', a.dataset.id === best); });
  }
  window.addEventListener('scroll', markActive, { passive: true });

  var hash = location.hash.replace('#', '');
  var startSec = hash ? findSectionFor(hash) : null;
  activate(startSec ? startSec.tab : tabs[0], startSec ? hash : null, startSec ? 'instant' : false);
  window.addEventListener('hashchange', function () {
    var h = location.hash.replace('#', ''); var s = findSectionFor(h); if (s) activate(s.tab, h, true);
  });
})();

// 4. Search box in the top bar. The index (assets/search-index.js) is loaded on first use.
//    Results jump to the matching section; deep links open the right tab (see above).
(function () {
  var nav = document.querySelector('.nav .in'); if (!nav) return;
  var me = document.querySelector('script[src$="assets/wiki.js"]');
  var base = me ? me.getAttribute('src').replace(/assets\/wiki\.js$/, '') : '';
  var box = document.createElement('div'); box.className = 'search';
  box.innerHTML = '<form role="search"><input type="search" placeholder="Search the wiki  ( / )" aria-label="Search the wiki" autocomplete="off"></form><div class="search-results" hidden></div>';
  var spacer = nav.querySelector('.spacer');
  nav.insertBefore(box, spacer ? spacer.nextSibling : null);
  var input = box.querySelector('input'), panel = box.querySelector('.search-results');
  var idx = null, loading = false, waiting = [];
  function load(cb) {
    if (idx) { cb(); return; }
    waiting.push(cb);
    if (loading) return; loading = true;
    var s = document.createElement('script'); s.src = base + 'assets/search-index.js';
    s.onload = function () { idx = window.ROAS_WIKI_INDEX || []; waiting.splice(0).forEach(function (f) { f(); }); };
    s.onerror = function () { idx = []; waiting.splice(0).forEach(function (f) { f(); }); };
    document.head.appendChild(s);
  }
  var CAT = { 'start-here': 'Start here', 'system-map': 'System map', 'features': 'Features', 'integrations': 'Integrations', 'issues': 'Issues and risks', 'tests': 'Tests and checks', 'decisions': 'Decisions and plans' };
  function crumb(r) {
    var slash = r.p.indexOf('/'), cat = slash > 0 ? CAT[r.p.slice(0, slash)] : null;
    if (!cat || cat.toLowerCase() === r.pt.toLowerCase()) return r.pt;
    return cat + ' \u203a ' + r.pt;
  }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rx(term) { return new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'); }
  function run(q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) { panel.hidden = true; return; }
    var hits = [];
    idx.forEach(function (r) {
      var h = r.h.toLowerCase(), t = r.t.toLowerCase(), pt = r.pt.toLowerCase(), score = 0;
      for (var i = 0; i < terms.length; i++) {
        var term = terms[i], inH = h.indexOf(term) >= 0, inP = pt.indexOf(term) >= 0, n = 0, pos = t.indexOf(term);
        while (pos >= 0 && n < 50) { n++; pos = t.indexOf(term, pos + term.length); }
        if (!inH && !inP && n === 0) return;
        score += (inH ? 20 : 0) + (inP ? 8 : 0) + Math.min(n, 10);
      }
      hits.push({ r: r, s: score });
    });
    hits.sort(function (a, b) { return b.s - a.s; });
    hits = hits.slice(0, 12);
    if (!hits.length) { panel.innerHTML = '<div class="search-empty">No matches</div>'; panel.hidden = false; return; }
    panel.innerHTML = hits.map(function (x) {
      var r = x.r, t = r.t, p = -1;
      for (var i = 0; i < terms.length && p < 0; i++) p = t.toLowerCase().indexOf(terms[i]);
      var start = Math.max(0, p - 70), snip = t.slice(start, start + 180), e = esc(snip);
      terms.forEach(function (term) { e = e.replace(rx(term), '<mark>$1</mark>'); });
      var href = base + r.p + (r.id ? '#' + r.id : '');
      return '<a href="' + href + '"><span class="sr-page">' + esc(crumb(r)) + (r.tab !== 'Overview' ? ' · ' + esc(r.tab) + ' tab' : '') + '</span><span class="sr-head">' + esc(r.h) + '</span><span class="sr-snip">' + (start > 0 ? '… ' : '') + e + ' …</span></a>';
    }).join('');
    panel.hidden = false;
  }
  var timer;
  input.addEventListener('input', function () {
    clearTimeout(timer); var q = input.value.trim();
    if (!q) { panel.hidden = true; return; }
    timer = setTimeout(function () { load(function () { run(q); }); }, 120);
  });
  input.addEventListener('focus', function () { load(function () { if (input.value.trim()) run(input.value.trim()); }); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { panel.hidden = true; input.blur(); }
    if (e.key === 'ArrowDown') { var a2 = panel.querySelector('a'); if (a2) { a2.focus(); e.preventDefault(); } }
  });
  function go(a) {
    var href = a.getAttribute('href'), u = new URL(href, location.href);
    panel.hidden = true;
    if (u.pathname === location.pathname && u.hash) {
      if (location.hash === u.hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
      else location.hash = u.hash;
      return;
    }
    location.href = href;
  }
  box.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim(); if (!q) return;
    load(function () { run(q); var a = panel.querySelector('a'); if (a) go(a); });
  });
  panel.addEventListener('keydown', function (e) {
    var links = [].slice.call(panel.querySelectorAll('a')), i = links.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' && i < links.length - 1) { links[i + 1].focus(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { if (i > 0) links[i - 1].focus(); else input.focus(); e.preventDefault(); }
    if (e.key === 'Escape') { panel.hidden = true; input.focus(); }
  });
  panel.addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a) return;
    e.preventDefault(); go(a);
  });
  document.addEventListener('click', function (e) { if (!box.contains(e.target)) panel.hidden = true; });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); input.select(); }
  });
})();
