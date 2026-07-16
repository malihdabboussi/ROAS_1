#!/usr/bin/env python3
"""
ROAS funnel WIREFRAME renderer.

Turns a funnel spec (the section guide + page copy from roas-funnel-build) into a
set of clean, structural, ANNOTATED wireframes - one self-contained .html file per
page, CTAs wired to the next page, plus index.html to click through the funnel.

This is a wireframe, fully committed: monochrome/structural, NOT a finished funnel.
- Real copy in place (rendered verbatim).
- Section ANNOTATION TAGS on every block (HERO / SOCIAL PROOF / OFFER / ...).
- Classic crossed-box placeholders for every image / mockup / video / photo, each
  carrying a concrete SUGGESTION of what asset goes there.
- The brand is DOCUMENTED on the index (color swatches + fonts), not painted onto
  the pages - the page structure stays neutral so it reads unmistakably as a wireframe.
  The brand color appears only as a small restrained accent (tags, step numbers,
  check marks, the primary CTA edge).

Self-contained: stdlib only. No network at render time (brand fonts load at view time).

Usage:
    python render_funnel.py spec.json --outdir out/
    python render_funnel.py --demo

Spec schema:
{
  "funnel_name": "Client - VSL Funnel",
  "outdir": "out",
  "brand": {
    "accent": "#3DBDB0",        # restrained accent (tags, numbers, checks, CTA edge)
    "primary": "#111315",       # documented on index; not painted on pages
    "secondary": "#6E7681",
    "heading_font": "Poppins",  # shown in greyscale so type personality is visible
    "body_font": "Inter",
    "logo_text": "CLIENT",
    "frame": true               # slim "WIREFRAME" rail at top of each page
  },
  "pages": [
    { "name": "Pre-Call", "slug": "precall", "next": "precall",
      "sections": [ {...}, ... ] }
  ]
}

Each section can take "tag" (override the annotation label) or "tag": false (hide it),
"cta" (button text) and "href" (link override).

Section types:
  logo_bar {logo?, callout?}                 -- logo centers when there's no callout
  hero     {eyebrow?, headline, subhead?, dark?, media?:"video"|"image"|"mockup",
            media_label?, suggestion?, ratio?, countdown?, cta?, cta_sub?}
  video    {heading?, label?, suggestion?, ratio?:"16x9"|"9x16", cta?}
  image    {heading?, label?, suggestion?, ratio?:"16x9"|"4x3"|"1x1"|"9x16"}
  mockup   {heading?, label?, suggestion?, ratio?}          -- product/screen mockup box
  bullets  {heading?, items:[{bold?, text}], cta?}
  steps    {heading?, items:[{title, text}], cta?}
  text     {heading?, paras:[str], align?, dark?, cta?}
  offer_stack {heading?, mockup?, items:[{label,value?}], total?, anchor?, price?, savings?, badges?, cta?}
  offer_form_split {heading?, mockup?, offer:{items,total?,anchor?,price?,savings?}, fields:[str], cta?}
  order_form {heading?, fields:[str], cta?, note?}
  testimonials {heading?, items:[{quote, name, role?, photo?}]}   -- photo = suggestion caption
  comparison {heading?, them_label?, us_label?, rows:[{them, us}]}
  faq      {heading?, items:[{q, a}]}
  guarantee {heading?, badge?, body}
  cta      {heading?, sub?, cta, cta_sub?}
  countdown {label?}
  band     {text}
  footer   {logo?, links?:[str], disclaimer?}
"""
import sys, json, os, html, re

DEFAULT_BRAND = {
    "accent": "#3DBDB0", "primary": "#111315", "secondary": "#6E7681",
    "heading_font": "Poppins", "body_font": "Inter", "logo_text": "BRAND",
    "frame": True,
}

DEFAULT_TAGS = {
    "logo_bar": "HEADER / NAV", "hero": "HERO", "video": "VIDEO / VSL",
    "image": "IMAGE", "mockup": "MOCKUP", "bullets": "BENEFITS", "steps": "STEPS",
    "text": "COPY BLOCK", "offer_stack": "OFFER", "offer_form_split": "OFFER + ORDER FORM",
    "order_form": "FORM", "testimonials": "SOCIAL PROOF", "comparison": "COMPARISON",
    "faq": "FAQ", "guarantee": "GUARANTEE", "cta": "CALL TO ACTION",
    "countdown": "URGENCY / TIMER", "band": "URGENCY BAR", "footer": "FOOTER",
}


def esc(s):
    return html.escape(str(s)) if s is not None else ""


def font_url(name):
    return f"https://fonts.googleapis.com/css2?family={name.strip().replace(' ', '+')}:wght@400;500;600;700;800&display=swap"


# ---------------------------------------------------------------- CSS
def build_css(b):
    root = (
        ":root{"
        f"--accent:{b['accent']};--brand-primary:{b['primary']};--brand-secondary:{b['secondary']};"
        f"--head:'{b['heading_font']}',system-ui,sans-serif;--body:'{b['body_font']}',system-ui,sans-serif;"
        "--mono:ui-monospace,'SF Mono','Cascadia Code',Menlo,Consolas,monospace;"
        "--bg:#F3F4F6;--surface:#FFFFFF;--ink:#1F2328;--muted:#6E7681;--faint:#9AA1AB;"
        "--line:#CBD1D9;--ph:#E7EAEE;--maxw:1080px;}"
    )
    static = """
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:var(--body);color:var(--ink);background:var(--bg);line-height:1.6;-webkit-font-smoothing:antialiased;padding:0 0 40px}
h1,h2,h3{font-family:var(--head);line-height:1.16;font-weight:800;letter-spacing:-0.02em;color:var(--ink)}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 26px}
/* ONE continuous page on a grey canvas, with labels in the left margin (off the page) */
.doc{display:grid;grid-template-columns:120px minmax(0,940px);justify-content:center;align-items:start;
 max-width:1090px;margin:0 auto;padding:0 18px 30px}
.anno{font-family:var(--mono);font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--faint);
 text-align:right;padding:62px 18px 0 0;line-height:1.4;white-space:nowrap;position:relative}
.anno:after{content:"";position:absolute;right:7px;top:67px;width:5px;height:5px;border-radius:50%;background:var(--accent);opacity:.7}
.content{background:var(--surface);border-left:1.5px solid var(--line);border-right:1.5px solid var(--line)}
.content.first{border-top:1.5px solid var(--line);border-radius:16px 16px 0 0}
.content.last{border-bottom:1.5px solid var(--line);border-radius:0 0 16px 16px}
.content.dark{background:#16191D;color:#fff}
.content.dark h1,.content.dark h2,.content.dark h3{color:#fff}
.content.dark .sub{color:rgba(255,255,255,.72)}
.content.bare{background:transparent;border:none}
.sec{padding:58px 56px}
.sec.tight{padding:30px 56px}
.center{text-align:center}
/* two-column balanced layout for copy blocks (copy one side, asset the other) */
.split{display:grid;grid-template-columns:1fr 1fr;gap:44px;align-items:center}
.split.media-left{direction:rtl}.split.media-left>*{direction:ltr}
.split .col-copy{text-align:left}
.split .ph{margin:0;max-width:none;width:100%}
/* type scale */
.eyebrow{font-family:var(--mono);text-transform:uppercase;letter-spacing:.18em;font-size:12px;font-weight:600;color:var(--accent);margin-bottom:16px}
h1{font-size:clamp(30px,5vw,50px)}
h2{font-size:clamp(23px,3.3vw,36px)}
h3{font-size:clamp(17px,2.1vw,21px)}
.sub{font-size:clamp(16px,1.9vw,20px);color:var(--muted);margin-top:16px;max-width:720px}
.center .sub{margin-left:auto;margin-right:auto}
p{font-size:16.5px}
/* wireframe button: flat, structural, accent edge */
.btn{display:inline-block;background:var(--ink);color:#fff;font-family:var(--head);font-weight:700;font-size:16px;
 text-transform:uppercase;letter-spacing:.04em;text-decoration:none;padding:16px 34px;border:none;border-radius:6px;
 border-left:4px solid var(--accent);cursor:pointer}
.btn:hover{background:#000}
.btn-sub{display:block;font-family:var(--mono);font-size:12px;color:var(--faint);margin-top:10px}
.cta-block{margin-top:28px}
/* header */
.logobar{background:var(--ink);color:#fff;padding:16px 0}
.logobar .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px}
.logobar.solo .wrap{justify-content:center}
.logo{font-family:var(--head);font-weight:800;letter-spacing:.03em;font-size:19px;color:#fff}
.callout{font-family:var(--mono);font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.7)}
/* hero */
.hero{padding:64px 0 56px}
/* crossed-box placeholder = "asset goes here" */
.ph{position:relative;border:1.5px solid var(--line);border-radius:10px;background-color:var(--ph);
 background-image:linear-gradient(to top right,transparent calc(50% - 1px),var(--line) 50%,transparent calc(50% + 1px)),
 linear-gradient(to bottom right,transparent calc(50% - 1px),var(--line) 50%,transparent calc(50% + 1px));
 display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:22px;margin:28px auto 0;max-width:720px}
.ph.r16x9{aspect-ratio:16/9}.ph.r4x3{aspect-ratio:4/3}.ph.r1x1{aspect-ratio:1/1;max-width:420px}.ph.r9x16{aspect-ratio:9/16;max-width:320px}
.ph .chip{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);
 background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:6px 14px}
.ph .play{width:54px;height:54px;border-radius:50%;background:var(--surface);border:1.5px solid var(--accent);
 display:flex;align-items:center;justify-content:center;margin-bottom:12px}
.ph .play:after{content:"";border-style:solid;border-width:10px 0 10px 17px;border-color:transparent transparent transparent var(--accent);margin-left:4px}
.ph .sugg{margin-top:12px;font-family:var(--body);font-size:13px;color:var(--ink);background:var(--surface);
 border:1px dashed var(--line);border-radius:6px;padding:6px 12px;max-width:90%}
.ph .sugg b{font-family:var(--mono);font-weight:600;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);display:block;margin-bottom:2px}
.ph.sm{max-width:120px;aspect-ratio:1/1;margin:0;padding:8px;border-radius:8px}
.ph.sm .chip{font-size:9px;padding:3px 7px;letter-spacing:.08em}
/* bullets */
.bul{list-style:none;max-width:760px;margin:24px auto 0;text-align:left}
.bul li{display:flex;gap:13px;padding:13px 0;border-bottom:1px solid var(--line);font-size:16.5px;align-items:flex-start}
.bul li:before{content:"";flex:0 0 22px;height:22px;border-radius:50%;border:1.5px solid var(--accent);margin-top:2px;
 -webkit-mask:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'/></svg>") center/13px no-repeat;
 mask:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'/></svg>") center/13px no-repeat;background:var(--accent)}
.bul b{font-weight:700}
/* steps */
.steps{display:grid;gap:20px;max-width:780px;margin:28px auto 0;text-align:left}
.step{display:flex;gap:16px;align-items:flex-start}
.step .n{flex:0 0 40px;height:40px;border-radius:50%;background:var(--surface);border:1.5px solid var(--accent);
 color:var(--ink);font-family:var(--head);font-weight:800;display:flex;align-items:center;justify-content:center;font-size:16px}
.secwrap.dark .step .n{background:transparent;color:#fff}
.step h3{margin-bottom:3px}
/* cards */
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:30px;text-align:left}
.card{background:var(--surface);border:1.5px solid var(--line);border-radius:10px;padding:22px}
.secwrap.dark .card{background:#23272c;border-color:#3a3f45}
.quote{font-size:15.5px}
.who{display:flex;align-items:center;gap:12px;margin-top:16px}
.who .nm{font-family:var(--head);font-weight:700;font-size:14px}
.who .rl{font-family:var(--mono);font-size:11px;color:var(--muted);letter-spacing:.04em}
/* offer + form */
.offer{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:900px;margin:28px auto 0;align-items:start;text-align:left}
.panel{border:1.5px solid var(--line);border-radius:10px;padding:26px;background:var(--surface)}
.stack{list-style:none}
.stack li{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px dashed var(--line);font-size:14.5px}
.stack .val{color:var(--muted);white-space:nowrap;font-family:var(--mono);font-size:13px}
.pricing{margin-top:16px;text-align:center}
.anchor{color:var(--muted);text-decoration:line-through;font-size:17px;font-family:var(--mono)}
.price{font-family:var(--head);font-weight:800;font-size:40px;color:var(--ink);line-height:1.1}
.savings{display:inline-block;border:1.5px solid var(--accent);color:var(--ink);font-family:var(--mono);font-weight:600;
 font-size:12px;padding:5px 12px;border-radius:999px;margin-top:10px;text-transform:uppercase;letter-spacing:.06em}
.field{margin-bottom:13px}
.field label{display:block;font-family:var(--mono);font-size:11px;letter-spacing:.04em;font-weight:600;margin-bottom:6px;color:var(--muted);text-transform:uppercase}
.field .inp{height:44px;border:1.5px solid var(--line);border-radius:7px;background:var(--bg)}
.badges{margin-top:14px;text-align:center;font-family:var(--mono);font-size:11px;color:var(--faint)}
/* comparison */
.cmp{width:100%;border-collapse:collapse;max-width:760px;margin:28px auto 0;font-size:15.5px}
.cmp th,.cmp td{padding:13px 15px;border:1.5px solid var(--line);text-align:left}
.cmp th{background:var(--ink);color:#fff;font-family:var(--head)}
.cmp td.them{color:var(--muted)}
/* faq */
.faq{max-width:760px;margin:22px auto 0;text-align:left}
.qa{border-bottom:1px solid var(--line);padding:18px 0}
.qa .q{font-family:var(--head);font-weight:700;font-size:17px}
.qa .a{color:var(--muted);margin-top:7px}
/* guarantee */
.guar{max-width:720px;margin:0 auto;text-align:center;border:1.5px dashed var(--accent);border-radius:12px;padding:38px 32px;background:var(--surface)}
.guar .seal{display:inline-block;font-family:var(--mono);font-weight:600;text-transform:uppercase;letter-spacing:.1em;
 color:var(--ink);border:1.5px solid var(--accent);border-radius:999px;padding:7px 16px;font-size:11px;margin-bottom:16px}
/* timer / band */
.timer{display:inline-flex;gap:10px;margin-top:8px}
.timer .u{border:1.5px solid var(--line);border-radius:8px;padding:9px 13px;min-width:58px;text-align:center;font-family:var(--head);background:var(--surface)}
.timer .u b{font-size:24px;display:block;line-height:1;color:var(--ink)}
.timer .u span{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.band-inner{text-align:center;padding:13px 0;font-family:var(--mono);font-weight:600;text-transform:uppercase;letter-spacing:.08em;font-size:13px;color:var(--ink);border-bottom:1.5px solid var(--accent)}
/* footer */
.foot{padding:38px 0;font-size:13px;text-align:center;color:var(--muted)}
.foot .logo{color:var(--ink);margin-bottom:12px}
.foot a{color:var(--muted);text-decoration:none;margin:0 9px;font-family:var(--mono);font-size:12px}
.foot .disc{margin-top:14px;max-width:760px;margin-left:auto;margin-right:auto;font-family:var(--mono);font-size:11px;color:var(--faint);line-height:1.5}
/* per-page frame rail */
.frame{max-width:1090px;margin:0 auto;padding:18px 18px 12px;box-sizing:border-box;display:grid;
 grid-template-columns:120px minmax(0,940px);justify-content:center}
.frame .bar{grid-column:2;display:flex;justify-content:space-between;align-items:center;
 font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.frame .wf{color:var(--accent);border:1px solid var(--accent);border-radius:5px;padding:3px 9px}
@media(max-width:900px){.doc{grid-template-columns:1fr;max-width:560px}.anno{text-align:left;padding:26px 0 0 4px}.anno:after{display:none}.content,.content.first,.content.last{border-radius:0}.split{grid-template-columns:1fr;gap:26px}.split.media-left{direction:ltr}.cards{grid-template-columns:1fr}.offer{grid-template-columns:1fr}.sec{padding:42px 28px}.btn{display:block;text-align:center}}
"""
    return root + static


# ---------------------------------------------------------------- helpers
def btn(text, href):
    return f'<a class="btn" href="{esc(href)}">{esc(text)}</a>'


def maybe_cta(s, nxt):
    if not s.get("cta"):
        return ""
    sub = f'<span class="btn-sub">{esc(s["cta_sub"])}</span>' if s.get("cta_sub") else ""
    return f'<div class="cta-block">{btn(s["cta"], s.get("href", nxt))}{sub}</div>'


def placeholder(kind, label, suggestion, ratio):
    rcls = {"16x9": "r16x9", "9x16": "r9x16", "4x3": "r4x3", "1x1": "r1x1"}.get(ratio, "r16x9")
    deflabel = {"video": "VSL THUMBNAIL", "image": "IMAGE", "mockup": "PRODUCT MOCKUP",
                "photo": "PHOTO"}.get(kind, "ASSET")
    play = '<div class="play"></div>' if kind == "video" else ""
    chip = f'<div class="chip">{esc(label or deflabel)}</div>'
    sugg = ""
    if suggestion:
        sugg = f'<div class="sugg"><b>suggestion</b>{esc(suggestion)}</div>'
    return f'<div class="ph {rcls}">{play}{chip}{sugg}</div>'


# ---------------------------------------------------------------- section renderers
def r_logo_bar(s, b, nxt):
    logo = esc(s.get("logo", b.get("logo_text", "BRAND")))
    solo = "" if s.get("callout") else "solo"
    callout = f'<span class="callout">{esc(s["callout"])}</span>' if s.get("callout") else ""
    return f'<header class="logobar {solo}"><div class="wrap"><span class="logo">{logo}</span>{callout}</div></header>'


def r_hero(s, b, nxt):
    eb = f'<div class="eyebrow">{esc(s["eyebrow"])}</div>' if s.get("eyebrow") else ""
    sub = f'<p class="sub">{esc(s["subhead"])}</p>' if s.get("subhead") else ""
    media = ""
    if s.get("media") in ("video", "image", "mockup"):
        media = placeholder(s["media"], s.get("media_label"), s.get("suggestion"),
                            s.get("ratio", "16x9"))
    cd = countdown_block(s["countdown"]) if s.get("countdown") else ""
    return (f'<section class="sec hero"><div class="wrap center">{eb}'
            f'<h1>{esc(s["headline"])}</h1>{sub}{media}{cd}{maybe_cta(s, nxt)}</div></section>')


def r_video(s, b, nxt):
    head = f'<h2 class="center">{esc(s["heading"])}</h2>' if s.get("heading") else ""
    media = placeholder("video", s.get("label"), s.get("suggestion"), s.get("ratio", "16x9"))
    return f'<section class="sec"><div class="wrap center">{head}{media}{maybe_cta(s, nxt)}</div></section>'


def r_image(s, b, nxt):
    head = f'<h2 class="center">{esc(s["heading"])}</h2>' if s.get("heading") else ""
    media = placeholder("image", s.get("label"), s.get("suggestion"), s.get("ratio", "4x3"))
    return f'<section class="sec"><div class="wrap center">{head}{media}</div></section>'


def r_mockup(s, b, nxt):
    head = f'<h2 class="center">{esc(s["heading"])}</h2>' if s.get("heading") else ""
    media = placeholder("mockup", s.get("label"), s.get("suggestion"), s.get("ratio", "4x3"))
    return f'<section class="sec"><div class="wrap center">{head}{media}</div></section>'


def r_bullets(s, b, nxt):
    head = f'<h2 class="center">{esc(s["heading"])}</h2>' if s.get("heading") else ""
    items = "".join(
        f'<li><span>{(f"<b>{esc(it["bold"])}</b> " if it.get("bold") else "")}{esc(it.get("text",""))}</span></li>'
        for it in s.get("items", []))
    return f'<section class="sec"><div class="wrap center">{head}<ul class="bul">{items}</ul>{maybe_cta(s, nxt)}</div></section>'


def r_steps(s, b, nxt):
    head = f'<h2 class="center">{esc(s["heading"])}</h2>' if s.get("heading") else ""
    items = "".join(
        f'<div class="step"><div class="n">{i}</div><div><h3>{esc(it.get("title",""))}</h3>'
        f'<p>{esc(it.get("text",""))}</p></div></div>'
        for i, it in enumerate(s.get("items", []), 1))
    return f'<section class="sec"><div class="wrap center">{head}<div class="steps">{items}</div>{maybe_cta(s, nxt)}</div></section>'


def r_text(s, b, nxt):
    media = s.get("media")
    paras = "".join(f'<p style="margin-top:15px">{esc(p)}</p>' for p in s.get("paras", []))
    cta = maybe_cta(s, nxt)
    if media in ("image", "mockup", "video"):
        head = f'<h2 style="text-align:left">{esc(s["heading"])}</h2>' if s.get("heading") else ""
        ph = placeholder(media, s.get("media_label"), s.get("suggestion"), s.get("ratio", "4x3"))
        side = "media-left" if s.get("media_side") == "left" else ""
        copy = f'<div class="col-copy">{head}{paras}{cta}</div>'
        col = f'<div class="col-media">{ph}</div>'
        return f'<section class="sec"><div class="wrap"><div class="split {side}">{copy}{col}</div></div></section>'
    # no media: center by default so a copy block never orphans on the right
    align = "" if s.get("align") == "left" else "center"
    h = f'<h2 class="{align}">{esc(s["heading"])}</h2>' if s.get("heading") else ""
    body = f'<div class="{align}" style="max-width:720px;margin:0 auto">{h}{paras}{cta}</div>'
    return f'<section class="sec"><div class="wrap">{body}</div></section>'


def _stack(offer):
    items = "".join(f'<li>{esc(it.get("label",""))}<span class="val">{esc(it.get("value",""))}</span></li>'
                    for it in offer.get("items", []))
    total = f'<li style="font-weight:700">Total Value<span class="val">{esc(offer["total"])}</span></li>' if offer.get("total") else ""
    anchor = f'<div class="anchor">{esc(offer["anchor"])}</div>' if offer.get("anchor") else ""
    price = f'<div class="price">{esc(offer["price"])}</div>' if offer.get("price") else ""
    sav = f'<div class="savings">{esc(offer["savings"])}</div>' if offer.get("savings") else ""
    return f'<ul class="stack">{items}{total}</ul><div class="pricing">{anchor}{price}{sav}</div>'


def r_offer_stack(s, b, nxt):
    head = f'<h2 class="center">{esc(s["heading"])}</h2>' if s.get("heading") else ""
    mock = ""
    if s.get("mockup"):
        mock = '<div style="text-align:center;margin-bottom:18px">' + placeholder("mockup", None, s["mockup"], "1x1") + "</div>"
    cta = f'<div class="cta-block center">{btn(s["cta"], s.get("href", nxt))}</div>' if s.get("cta") else ""
    badges = f'<div class="badges">{esc(s["badges"])}</div>' if s.get("badges") else ""
    panel = f'<div class="panel">{mock}{_stack(s)}{cta}{badges}</div>'
    return f'<section class="sec"><div class="wrap center">{head}<div style="max-width:540px;margin:28px auto 0">{panel}</div></div></section>'


def r_offer_form_split(s, b, nxt):
    offer = s.get("offer", {})
    mock = placeholder("mockup", None, s["mockup"], "1x1") if s.get("mockup") else ""
    left = f'<div class="panel">{mock}{_stack(offer)}</div>'
    fields = "".join(f'<div class="field"><label>{esc(f)}</label><div class="inp"></div></div>'
                     for f in s.get("fields", ["Full Name", "Email", "Card Number", "Exp", "CVV"]))
    right = f'<div class="panel">{fields}<div class="cta-block">{btn(s.get("cta","Complete Order"), s.get("href", nxt))}</div></div>'
    head = f'<h2 class="center">{esc(s["heading"])}</h2>' if s.get("heading") else ""
    return f'<section class="sec"><div class="wrap">{head}<div class="offer">{left}{right}</div></div></section>'


def r_order_form(s, b, nxt):
    head = f'<h2 class="center">{esc(s["heading"])}</h2>' if s.get("heading") else ""
    fields = "".join(f'<div class="field"><label>{esc(f)}</label><div class="inp"></div></div>'
                     for f in s.get("fields", ["Full Name", "Email", "Phone"]))
    note = f'<div class="badges">{esc(s["note"])}</div>' if s.get("note") else ""
    panel = f'<div class="panel">{fields}<div class="cta-block">{btn(s.get("cta","Submit"), s.get("href", nxt))}</div>{note}</div>'
    return f'<section class="sec"><div class="wrap center">{head}<div style="max-width:460px;margin:24px auto 0">{panel}</div></div></section>'


def r_testimonials(s, b, nxt):
    head = f'<h2 class="center">{esc(s["heading"])}</h2>' if s.get("heading") else ""
    cards = ""
    for it in s.get("items", []):
        role = f'<div class="rl">{esc(it["role"])}</div>' if it.get("role") else ""
        photo = it.get("photo", "Client headshot")
        ph = f'<div class="ph sm"><div class="chip">PHOTO</div></div>'
        sug = f'<div style="font-family:var(--mono);font-size:10px;color:var(--faint);margin-top:6px">{esc(photo)}</div>' if photo else ""
        cards += (f'<div class="card"><p class="quote">&ldquo;{esc(it.get("quote",""))}&rdquo;</p>'
                  f'<div class="who"><div>{ph}{sug}</div><div>'
                  f'<div class="nm">{esc(it.get("name",""))}</div>{role}</div></div></div>')
    return f'<section class="sec"><div class="wrap center">{head}<div class="cards">{cards}</div></div></section>'


def r_comparison(s, b, nxt):
    head = f'<h2 class="center">{esc(s["heading"])}</h2>' if s.get("heading") else ""
    them = esc(s.get("them_label", "The Old Way"))
    us = esc(s.get("us_label", "With Us"))
    rows = "".join(f'<tr><td class="them">{esc(r.get("them",""))}</td><td>{esc(r.get("us",""))}</td></tr>'
                   for r in s.get("rows", []))
    return f'<section class="sec"><div class="wrap center">{head}<table class="cmp"><tr><th>{them}</th><th>{us}</th></tr>{rows}</table></div></section>'


def r_faq(s, b, nxt):
    head = f'<h2 class="center">{esc(s["heading"])}</h2>' if s.get("heading") else ""
    qas = "".join(f'<div class="qa"><div class="q">{esc(it.get("q",""))}</div><div class="a">{esc(it.get("a",""))}</div></div>'
                  for it in s.get("items", []))
    return f'<section class="sec"><div class="wrap">{head}<div class="faq">{qas}</div></div></section>'


def r_guarantee(s, b, nxt):
    seal = f'<div class="seal">{esc(s.get("badge","Guarantee"))}</div>'
    head = f'<h2>{esc(s["heading"])}</h2>' if s.get("heading") else ""
    body = f'<p style="margin-top:13px">{esc(s.get("body",""))}</p>'
    return f'<section class="sec"><div class="wrap"><div class="guar">{seal}{head}{body}</div></div></section>'


def r_cta(s, b, nxt):
    head = f'<h2>{esc(s["heading"])}</h2>' if s.get("heading") else ""
    sub = f'<p class="sub">{esc(s["sub"])}</p>' if s.get("sub") else ""
    sub2 = f'<span class="btn-sub">{esc(s["cta_sub"])}</span>' if s.get("cta_sub") else ""
    return f'<section class="sec"><div class="wrap center">{head}{sub}<div class="cta-block">{btn(s.get("cta","Get Started"), s.get("href", nxt))}{sub2}</div></div></section>'


def countdown_block(s):
    label = esc(s.get("label", "Offer ends soon")) if isinstance(s, dict) else "Offer ends soon"
    return ('<div style="margin-top:18px"><div class="eyebrow">' + label + '</div>'
            '<div class="timer"><div class="u"><b>00</b><span>Hrs</span></div>'
            '<div class="u"><b>14</b><span>Min</span></div>'
            '<div class="u"><b>59</b><span>Sec</span></div></div></div>')


def r_countdown(s, b, nxt):
    return f'<section class="sec tight"><div class="wrap center">{countdown_block(s)}</div></section>'


def r_band(s, b, nxt):
    return f'<div class="band-inner">{esc(s.get("text",""))}</div>'


def r_footer(s, b, nxt):
    logo = esc(s.get("logo", b.get("logo_text", "BRAND")))
    links = "".join(f'<a href="#">{esc(l)}</a>' for l in s.get("links", ["Privacy", "Terms"]))
    disc = f'<div class="disc">{esc(s["disclaimer"])}</div>' if s.get("disclaimer") else ""
    return f'<footer class="foot"><div class="wrap"><div class="logo">{logo}</div><div>{links}</div>{disc}</div></footer>'


RENDERERS = {
    "logo_bar": r_logo_bar, "hero": r_hero, "video": r_video, "image": r_image, "mockup": r_mockup,
    "bullets": r_bullets, "steps": r_steps, "text": r_text, "offer_stack": r_offer_stack,
    "offer_form_split": r_offer_form_split, "order_form": r_order_form, "testimonials": r_testimonials,
    "comparison": r_comparison, "faq": r_faq, "guarantee": r_guarantee, "cta": r_cta,
    "countdown": r_countdown, "band": r_band, "footer": r_footer,
}


# ---------------------------------------------------------------- page assembly
def render_page(page, brand, nxt_href, funnel_name):
    sects = [s for s in page.get("sections", []) if RENDERERS.get(s.get("type"))]
    blocks = []
    for i, s in enumerate(sects):
        t = s.get("type")
        inner = RENDERERS[t](s, brand, s.get("href", nxt_href))
        tag = s.get("tag", DEFAULT_TAGS.get(t, t.upper() if t else ""))
        anno = "" if tag is False else esc(tag)
        cls = "content"
        if s.get("dark"):
            cls += " dark"
        if i == 0:
            cls += " first"
        if i == len(sects) - 1:
            cls += " last"
        blocks.append(f'<div class="anno">{anno}</div><div class="{cls}">{inner}</div>')
    body = '<div class="doc">' + "\n".join(blocks) + '</div>'
    frame = ""
    if brand.get("frame", True):
        frame = (f'<div class="frame"><div class="bar"><span>{esc(funnel_name)} &nbsp;/&nbsp; {esc(page.get("name",""))}</span>'
                 f'<span class="wf">Wireframe</span></div></div>')
    css = build_css(brand)
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(page.get('name','Page'))} — Wireframe</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{font_url(brand['heading_font'])}" rel="stylesheet"><link href="{font_url(brand['body_font'])}" rel="stylesheet">
<style>{css}</style></head>
<body>{frame}
{body}
</body></html>"""


def build_index(spec, brand, pages):
    name = esc(spec.get("funnel_name", "Funnel"))
    links = "".join(
        f'<a class="row" href="{esc(p["slug"])}.html"><span class="num">{i+1:02d}</span>'
        f'<span class="nm">{esc(p["name"])}</span><span class="meta">{len(p.get("sections",[]))} blocks &nbsp;&rarr;</span></a>'
        for i, p in enumerate(pages))
    swatches = "".join(
        f'<div class="sw"><span style="background:{esc(brand.get(k))}"></span>{esc(k)}<code>{esc(brand.get(k))}</code></div>'
        for k in ("accent", "primary", "secondary") if brand.get(k))
    css = build_css(brand)
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{name} — Wireframes</title>
<link href="{font_url(brand['heading_font'])}" rel="stylesheet"><link href="{font_url(brand['body_font'])}" rel="stylesheet">
<style>{css}
.idx{{max-width:720px;margin:46px auto;padding:0 26px}}
.kick{{font-family:var(--mono);text-transform:uppercase;letter-spacing:.18em;font-size:12px;color:var(--accent)}}
.row{{display:flex;align-items:center;gap:16px;border:1.5px solid var(--line);background:var(--surface);border-radius:10px;
padding:18px 22px;margin-bottom:12px;text-decoration:none;color:var(--ink)}}
.row:hover{{border-color:var(--accent)}}
.row .num{{font-family:var(--mono);color:var(--faint);font-size:13px}}
.row .nm{{font-family:var(--head);font-weight:700;font-size:18px;flex:1}}
.row .meta{{font-family:var(--mono);font-size:12px;color:var(--muted)}}
.brandbox{{border:1.5px dashed var(--line);border-radius:10px;padding:18px 22px;margin:26px 0;background:var(--surface)}}
.brandbox h3{{font-size:13px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:600;margin-bottom:14px}}
.sws{{display:flex;gap:22px;flex-wrap:wrap}}
.sw{{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:12px;text-transform:capitalize;color:var(--muted)}}
.sw span{{width:22px;height:22px;border-radius:5px;border:1px solid var(--line);display:inline-block}}
.sw code{{color:var(--ink)}}
.fonts{{margin-top:12px;font-family:var(--mono);font-size:12px;color:var(--muted)}}
</style></head>
<body><div class="idx"><div class="kick">ROAS Funnel Wireframes</div>
<h1 style="margin:8px 0 6px">{name}</h1>
<p class="sub" style="margin-bottom:8px">Click any page to open its wireframe. CTAs link to the next page.</p>
<div class="brandbox"><h3>Brand reference (documented, not painted on — applied in hi-fi design)</h3>
<div class="sws">{swatches}</div>
<div class="fonts">Headings: {esc(brand['heading_font'])} &nbsp;·&nbsp; Body: {esc(brand['body_font'])}</div></div>
{links}</div></body></html>"""


def render_funnel(spec):
    brand = dict(DEFAULT_BRAND)
    brand.update(spec.get("brand", {}))
    outdir = spec.get("outdir", "out")
    os.makedirs(outdir, exist_ok=True)
    pages = spec.get("pages", [])
    for i, page in enumerate(pages):
        if "slug" not in page:
            page["slug"] = re.sub(r"[^a-z0-9]+", "-", page.get("name", f"page-{i+1}").lower()).strip("-")
    funnel_name = spec.get("funnel_name", "Funnel")
    written = []
    for i, page in enumerate(pages):
        nxt = page.get("next") or (pages[i + 1]["slug"] if i + 1 < len(pages) else None)
        nxt_href = f"{nxt}.html" if nxt else "#"
        path = os.path.join(outdir, f'{page["slug"]}.html')
        with open(path, "w") as f:
            f.write(render_page(page, brand, nxt_href, funnel_name))
        written.append(path)
        print(f"  \u2713 {path}")
    idx = os.path.join(outdir, "index.html")
    with open(idx, "w") as f:
        f.write(build_index(spec, brand, pages))
    print(f"  \u2713 {idx}  (funnel index)")
    return [idx] + written


def demo_spec():
    return {
        "funnel_name": "Origin Podcast Studios — VSL Call Booking Funnel",
        "outdir": "out",
        "brand": {"accent": "#3DBDB0", "primary": "#111315", "secondary": "#6E7681",
                  "heading_font": "Poppins", "body_font": "Inter", "logo_text": "Origin Podcast Studios"},
        "pages": [
            {"name": "Opt-In / VSL Landing", "slug": "optin", "next": "optin", "sections": [
                {"type": "logo_bar", "callout": "Attention Las Vegas business owners, founders, and operators"},
                {"type": "hero",
                 "headline": "How busy business owners turn one hour a week into their best sales and networking channel, recorded in probably the best podcast studio in Vegas",
                 "subhead": "Watch the short video below. You'll see how owners use a single recording session to get the right clients and partners in the room, on their turf, and walk out with content that keeps working for them for months.",
                 "media": "video",
                 "suggestion": "The VSL. Founder/host on camera in the Origin studio talking to a business owner. Warm, premium, real room visible. Compelling thumbnail, no autoplay.",
                 "cta": "Apply To Work With Origin",
                 "cta_sub": "A quick application so we can see if it's a fit before we ever get on a call."},
                {"type": "text", "tag": "Differentiator", "heading": "The room is the difference",
                 "media": "image", "media_side": "left", "ratio": "4x3",
                 "suggestion": "Wide photo of an Origin studio: acoustic panels, broadcast mics, 4K cameras, lit set. Premium and real.",
                 "paras": ["Most \"podcast studios\" in town are a closet with a mic. Origin is three acoustically treated studios, broadcast microphones, 4K cameras, and engineers who run the session so you don't have to think about any of it. You sit down, you talk, you leave. We do the rest."],
                 "cta": "See If Origin Is A Fit"},
                {"type": "image", "heading": "See the room", "ratio": "16x9",
                 "suggestion": "Hero shot of the main studio set, two chairs, mics on the table, lit and styled. The space that sells the room."},
                {"type": "bullets", "heading": "Who this is for", "items": [
                    {"text": "Owners and founders in Las Vegas who want more of the right clients and partners in the room."},
                    {"text": "Coaches, consultants, and service providers who want to be the known name in their space."},
                    {"text": "Operators who'd rather their content build the company's value than chase likes."},
                    {"text": "People in Vegas for a conference who want a full run of episodes recorded before the flight home."}]},
                {"type": "text", "tag": "Who it's not for", "heading": "Who it's not for",
                 "paras": ["This isn't for someone chasing a viral clip or a quick hit of attention. If you don't have a business you're trying to grow, we're probably not your room."]},
                {"type": "cta", "heading": "Ready to see if it's a fit?",
                 "cta": "Apply To Work With Origin", "cta_sub": "Takes about two minutes. No pressure, no obligation."},
                {"type": "footer", "logo": "Origin Podcast Studios",
                 "disclaimer": "Origin Podcast Studios · 6565 Spencer Street Unit 101, Las Vegas, NV 89119 · (702) 200-4763"}]},
        ],
    }


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "--demo":
        render_funnel(demo_spec()); return
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    spec = json.load(open(sys.argv[1]))
    if "--outdir" in sys.argv:
        spec["outdir"] = sys.argv[sys.argv.index("--outdir") + 1]
    render_funnel(spec)


if __name__ == "__main__":
    main()
