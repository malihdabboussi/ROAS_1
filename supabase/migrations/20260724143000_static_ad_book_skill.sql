BEGIN;

INSERT INTO public.skill_library (skill_key, name, description, markdown_content, category, updated_at)
VALUES (
  'static-ad-book',
  'Static Ad Book',
  'Produces client-ready static ads in ten proven person-led, receipt, authority, and graphic formats. Use for static ad production, multiple ad variants, uploaded person or product references, exact-copy rendering, or turning Ads Research recommendations into final images.',
  $static_ad_book_skill$# Static Ad Book

Renders finished static ad creatives in 10 proven formats. The copy is composited by a deterministic HTML→PNG engine (never by an image model), so every word renders verbatim. Imagery, when a format needs it, comes from the Higgsfield MCP with the prompt rules below.

## Workflow

When `playbook_kickoff` exists, it is authoritative. Read `selected_format_ids`, `quantity`,
`aspect_ratio`, `copy_mode`, `exact_copy`, `offer_context`, `person_strategy`,
`reference_assets`, `source_mission_id`, and `source_deliverable_ids`. Produce exactly `quantity`
finished ads, from 1 through 10. If more than one format is selected, distribute variants as evenly
as possible in the selected order. Do not silently force a fixed number of concepts.

Copy modes:
- `write_for_me`: read linked Ads Research deliverables and campaign context, then load
  `dylans-super-voice` and write format-appropriate copy before rendering.
- `use_my_copy`: preserve `exact_copy` verbatim. Do not paraphrase, shorten, or silently correct it.

1. **Intake**: client/offer, ICP, the copy (or get it from roas-ad-copy / roas-ad-kit), and which format(s). If the user doesn't name a format, pick 2-3 using the picker below and say why.
2. **Person source** (ask ONLY when a chosen format puts a person in the creative — Family A, press/authority photo, etc.): the user picks per campaign, **real photo** (they attach/point to the client's photo) or **generative person** (Higgsfield, cast to match the ICP and offer). Never decide silently and never keep a pre-made stock-people library — a generated person is created fresh for the campaign so they plausibly look like the ICP. The user's pick always wins, even on case-study/receipt formats; if they pick generative on an ad that names a real person, flag the substantiation risk once (see Legal/brand cautions) and then build what they chose.
3. **Read the family reference** for the chosen format(s): `references/family-a-person.md`, `references/family-b-receipts.md`, or `references/family-c-graphics.md`. Each contains the full anatomy, spec keys, and copy rules per format.
4. **Imagery** (only if the format needs it): generate via Higgsfield `generate_image` using the prompt template below, then download it where the engine runs.
5. **Render**: build a spec JSON and run the engine (below). Default size 1080x1350 (4:5 feed); also make 1080x1920 for stories when asked.
6. **Verify visually** before delivering — open the PNG and check: copy verbatim, nothing clipped, nothing overlapping, imagery clean. Never ship unviewed.
7. Register every final PNG in campaign Space Media immediately and attach it as an image
   Deliverable to the current mission or conversation. Deliver the PNGs + pair with primary text
   from roas-ad-copy if the user wants the full ad.

## Format picker

| Format | Template | Family | Reach for it when... |
|---|---|---|---|
| Hero Framing | `hero_framing` | A | Founder/personal brand, direct "I'm looking for N [ICP]" offer |
| Identity Callout | `identity_callout` | A | Calling out one ICP hard ("If you're a MECHANIC...") |
| Case-Study Callout | `case_study` | A | A named client result is the hook ("[Name] collected $100K...") |
| Workshop / Event | `workshop_event` | A | Live training/webinar with a date to push |
| Tweet Receipt | `tweet_receipt` | B | A post + dashboard screenshot IS the proof |
| Chat Receipt | `chat_receipt` | B | A Slack/DM win message + profile is the proof |
| Press / Authority | `press_authority` | B | Borrowed authority ("AS SEEN ON X") + a result number |
| Fake News | `fake_news` | C | Pattern-interrupt news framing ("LEAKED...", "BREAKING...") |
| Myth vs System | `myth_vs_system` | C | Kill a guru belief, then old-way/new-way comparison |
| Offer Stack | `offer_stack` | C | Low-ticket direct offer: price, deliverable, guarantee |

Rules of thumb: cold traffic pattern-interrupts = Fake News / Myth vs System / Identity Callout. Warm or retargeting proof = the receipt family + Case-Study. Low-ticket ($27-$97) = Offer Stack / Myth vs System. Founder-led high-ticket = Hero Framing / Workshop.

## Render engine

Lives in `assets/engine/`. Run wherever Python + Playwright + Chromium exist (the Cowork container has all three preinstalled; do NOT run `playwright install`).

```
python3 assets/engine/render_ad.py <template> <spec.json> <out.png> --size 1080x1350
```

- Spec is a flat JSON object; keys are the {{TOKENS}} in the template (each family reference lists them).
- Keys ending `_HTML` are inserted raw — build lists/accent spans there. Everything else is escaped.
- Image keys (BG_IMAGE, PHOTO, MOCKUP, AVATAR, PROOF, PROP1/2) take a local path (inlined as data URL) or https URL. Missing images degrade gracefully.
- Fonts (Anton for tabloid caps, Inter 400/700/900) auto-download from raw.githubusercontent.com on first run — jsDelivr/gstatic may be blocked; do not change the sources.
- **Auto-fit**: if the copy runs long the engine zooms the layout to fit rather than clipping. If a render looks noticeably shrunken, the copy is too long — cut it instead.
- Two worked example specs ship in `assets/engine/examples/`.

## Imagery via Higgsfield (only when the format needs a photo)

Prompt template (same battle-tested recipe as ig-organic-ad — full rationale there):

> Candid handheld photo, vertical composition, upright, level horizon: [subject], natural light, true-to-life colors, realistic. The frame contains only the scene itself, edge to edge photograph, no text anywhere, no readable signs, no logos, no flags, no banners, no license plate characters.

- NEVER write "smartphone", "phone", "Instagram", "story", "selfie", "screenshot", or "camera roll" in an image prompt — those spawn fake UI chrome.
- People: only per the intake choice in step 2 (real vs generative) — no silent defaults, no stock-people library. When generative: `soul_2`, cast the person to the ICP (a mechanic ad gets someone who reads as a mechanic, not a generic model). Full AI faces are allowed for these formats (the references use them) but inspect closely at full res for artifacts — hands, teeth, text on clothing. Regenerate rather than ship a weird face.
- Product mockups (laptop screens, documents): prompt screens DARK/OFF, never with content — AI screen content is always gibberish. If a screen needs real content, render that content as its own HTML (a mini spec) and composite it.
- The Cowork container cannot download from Higgsfield CDNs directly; pull generated images via the Higgsfield sandbox (`sandbox_exec` + curl), then `media_upload` them, or composite inside the sandbox. See ig-organic-ad for the full transfer pattern.

## Legal/brand cautions (tell the client, don't silently ship)

- Fake News and the receipt formats imitate news/UI framing. Meta rejects some of these under misleading-content policies depending on the page's standing — normal in this niche, but flag it.
- Only use REAL client names, results, and screenshots in Case-Study / receipt formats when the client can substantiate them. Never invent a testimonial for a real business.
- Platform logos (Meta cube, etc.) as floating props: client's risk call — default to leaving them out unless asked.

## Delivery checklist

- [ ] Formats chosen deliberately (say why)
- [ ] Every render visually verified — verbatim copy, no clipping, no AI artifacts
- [ ] 4:5 delivered; story size if asked
- [ ] Paired with primary text (roas-ad-copy) when the user wants the complete ad
$static_ad_book_skill$,
  'paid_media',
  now()
)
ON CONFLICT (skill_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  category = EXCLUDED.category,
  updated_at = now();

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('static-ad-book', 'assets/engine/examples/chat_receipt_example.json', $static_ad_resource_0${
 "HEADLINE_HTML": "ONLINE FITNESS COACH <span class=\"red\">HITS $100,000 IN 7 DAYS</span> JUST FROM UPSELLS",
 "NAME": "Rachel Scheer",
 "TIME": "2:21 AM",
 "MSG_HTML": "My win for the week is 100k in upsells for my new business coaching program for functional medicine practitioners. I am grateful that so many people in my community see the value of what I have created and want to continue with me in the institute.",
 "REACTIONS_HTML": "<span>&#128588; 7</span><span>&#128564; 2</span><span>&#128293; 3</span>",
 "PHANDLE": "rachelscheer",
 "PBIO": "Rachel Scheer, BS Dietetics, Certified Functional Medicine",
 "PSTATS_HTML": "<span><b>2,555</b> posts</span><span><b>284K</b> followers</span><span><b>535</b> following</span>"
}
$static_ad_resource_0$, 'application/json')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('static-ad-book', 'assets/engine/examples/myth_example.json', $static_ad_resource_1${
 "EYEBROW": "What the gurus told you...",
 "HEADLINE_HTML": "“Just launch <span class=\"strike\">MORE CREATIVES</span>”",
 "LIE_PILL": "THAT IS A LIE.",
 "SUBHEAD_HTML": "Meta’s Andromeda update changed everything. And, you have to update the way you run ads.",
 "OLD_TITLE": "OLD WAY",
 "NEW_TITLE": "ANDROMEDA WAY",
 "OLD_ROWS_HTML": "<li>Launch 40 new creatives per week</li><li>Spend more to get more leads</li><li>Hope the algorithm figures it out</li>",
 "NEW_ROWS_HTML": "<li>Install buyer-only hook frameworks</li><li>Put guardrails on the algorithm to attract high-intent buyers</li><li>Implement the Scaling Signal that scales without breaking ROAS</li>",
 "OLD_RESULT": "$0.50 leads who never buy",
 "NEW_RESULT": "$2–$5 leads at 5–15X ROAS",
 "PUNCH": "You don’t need more. You need algorithm guardrails.",
 "CTA": "GET THE ANDROMEDA ADS SEQUENCE — $27",
 "GUARANTEE": "No Questions Asked - 90 Day Money Back Guarantee"
}
$static_ad_resource_1$, 'application/json')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('static-ad-book', 'assets/engine/render_ad.py', $static_ad_resource_2$#!/usr/bin/env python3
"""Static Ad Book render engine.
Usage: python3 render_ad.py <template_name> <spec.json> <out.png> [--size 1080x1350]

- Templates live in ./templates/<template_name>.html and use {{TOKEN}} placeholders.
- Spec is a flat JSON object. Keys ending in _HTML are inserted raw (build lists/spans
  in the spec); all other values are HTML-escaped. Missing tokens become "".
- Image slots: pass a local file path or URL in keys like BG_IMAGE / PHOTO / MOCKUP;
  local paths are inlined as data: URLs so the render never depends on the network.
- Fonts (Anton + Inter) auto-download from jsDelivr fontsource on first run into ./fonts.
- Screenshot via Playwright chromium at exactly the requested pixel size.
"""
import sys, json, html, base64, mimetypes, pathlib, urllib.request, os, shutil

HERE = pathlib.Path(__file__).parent
# raw.githubusercontent.com is reachable from both the Cowork container and the
# Higgsfield sandbox; jsDelivr/gstatic may not be. Keep these URLs as-is.
FONTS = {
    ("Anton", "400", "truetype"): "https://raw.githubusercontent.com/google/fonts/main/ofl/anton/Anton-Regular.ttf",
    ("Inter", "400", "woff2"): "https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-Regular.woff2",
    ("Inter", "700", "woff2"): "https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-Bold.woff2",
    ("Inter", "900", "woff2"): "https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-Black.woff2",
}

def ensure_fonts():
    fdir = HERE / "fonts"
    fdir.mkdir(exist_ok=True)
    css = ""
    for (fam, weight, fmt), url in FONTS.items():
        ext = "ttf" if fmt == "truetype" else "woff2"
        p = fdir / f"{fam}-{weight}.{ext}"
        if not p.exists() or p.stat().st_size < 1000:
            urllib.request.urlretrieve(url, p)
        mime = "font/ttf" if fmt == "truetype" else "font/woff2"
        b64 = base64.b64encode(p.read_bytes()).decode()
        css += (f"@font-face{{font-family:'{fam}';font-weight:{weight};"
                f"src:url(data:{mime};base64,{b64}) format('{fmt}');}}\n")
    return css

def data_url(path_or_url):
    s = str(path_or_url)
    if s.startswith(("http://", "https://", "data:")) or not s:
        return s
    p = pathlib.Path(s)
    if not p.exists():
        return ""
    mime = mimetypes.guess_type(s)[0] or "image/png"
    return f"data:{mime};base64," + base64.b64encode(p.read_bytes()).decode()

def browser_launch_options():
    override = os.environ.get("STATIC_AD_CHROMIUM_PATH", "").strip()
    candidates = [
        override,
        shutil.which("chromium"),
        shutil.which("chromium-browser"),
        shutil.which("google-chrome"),
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ]
    for candidate in candidates:
        if candidate and pathlib.Path(candidate).exists():
            return {"executable_path": candidate}
    return {}

def main():
    tpl_name, spec_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    size = "1080x1350"
    if "--size" in sys.argv:
        size = sys.argv[sys.argv.index("--size") + 1]
    w, h = (int(x) for x in size.split("x"))

    tpl = (HERE / "templates" / f"{tpl_name}.html").read_text()
    spec = json.loads(pathlib.Path(spec_path).read_text())

    tpl = tpl.replace("{{FONT_CSS}}", ensure_fonts())
    tpl = tpl.replace("{{W}}", str(w)).replace("{{H}}", str(h))
    import re
    tokens = set(re.findall(r"\{\{([A-Z0-9_]+)\}\}", tpl))
    for t in tokens:
        v = spec.get(t, "")
        if t.endswith("_HTML"):
            pass                       # raw
        elif t.endswith(("_IMAGE", "IMAGE", "PHOTO", "MOCKUP", "AVATAR", "PROOF", "PROP1", "PROP2")):
            v = data_url(v)
        else:
            v = html.escape(str(v))
        tpl = tpl.replace("{{" + t + "}}", str(v))

    tmp = HERE / "_render.html"
    tmp.write_text(tpl)

    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch(**browser_launch_options())
        page = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
        page.goto(tmp.as_uri())
        page.wait_for_timeout(300)
        # Auto-fit: if content overflows the canvas, zoom the body down so nothing clips.
        page.evaluate("""() => {
            const b = document.body;
            const H = window.innerHeight;
            const sh = b.scrollHeight;
            if (sh > H) {
                b.style.height = sh + 'px';   // let it be its natural height...
                b.style.zoom = (H / sh) * 0.998;  // ...then scale the whole thing to fit
            }
        }""")
        page.wait_for_timeout(150)
        page.screenshot(path=out_path, clip={"x": 0, "y": 0, "width": w, "height": h})
        b.close()
    print("saved", out_path, f"{w}x{h}")

if __name__ == "__main__":
    main()
$static_ad_resource_2$, 'text/x-python')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('static-ad-book', 'assets/engine/templates/case_study.html', $static_ad_resource_3$<!doctype html><html><head><meta charset="utf-8"><style>
{{FONT_CSS}}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:{{W}}px;height:{{H}}px;overflow:hidden;background:#05070c}
.bg{position:absolute;inset:0;background:url('{{PHOTO}}') center/cover no-repeat}
.tint{position:absolute;inset:0;background:radial-gradient(90% 70% at 50% 32%,rgba(20,80,200,.18) 0%,rgba(2,6,14,.72) 75%,rgba(2,6,14,.92) 100%)}
.prop{position:absolute;width:300px;filter:drop-shadow(0 18px 30px rgba(0,0,0,.5))}
.p1{left:-40px;top:20%;transform:rotate(-14deg)}
.p2{right:-50px;top:34%;transform:rotate(10deg)}
.tl{position:absolute;left:44px;top:44px;font-family:Inter;font-size:30px;color:#cfd6e4;max-width:360px;line-height:1.3}
.tl b{color:#fff}
.tr{position:absolute;right:44px;top:44px;font-family:Inter;font-weight:800;font-size:28px;color:#fff;background:rgba(0,0,0,.55);border:2px solid rgba(255,255,255,.25);padding:12px 26px;border-radius:40px}
.tr b{color:{{ACCENT}}}
.stack{position:absolute;left:0;right:0;bottom:170px;display:flex;flex-direction:column;align-items:center;gap:26px;padding:0 54px;text-align:center}
h1{font-family:Anton;font-weight:400;font-size:96px;line-height:1.02;color:{{ACCENT}};text-transform:uppercase;letter-spacing:1px;text-shadow:0 6px 24px rgba(0,0,0,.6)}
.sub{font-family:Anton;font-size:52px;color:#fff;text-transform:uppercase;letter-spacing:1px}
.contrast{font-family:Inter;font-weight:500;font-size:40px;color:#e8ecf4}
.guar{font-family:Inter;font-weight:800;font-size:40px;line-height:1.3;color:#fff}
.guar .dim{color:#9aa3b5;font-weight:700}
.proofrow{font-family:Inter;font-size:32px;color:#cfd6e4}
.proofrow b{color:#fff}
.ctabar{position:absolute;left:0;right:0;bottom:0;height:110px;background:{{ACCENT}};display:flex;align-items:center;justify-content:space-between;padding:0 50px;font-family:Inter;font-weight:800;font-size:40px;color:#fff}
</style></head><body>
<div class="bg"></div><div class="tint"></div>
<img class="prop p1" src="{{PROP1}}" onerror="this.remove()">
<img class="prop p2" src="{{PROP2}}" onerror="this.remove()">
<div class="tl">{{PROOF_TL_HTML}}</div>
<div class="tr">{{PILL_TR_HTML}}</div>
<div class="stack">
  <h1>{{HEADLINE_HTML}}</h1>
  <div class="sub">{{SUBHEAD}}</div>
  <div class="contrast">{{CONTRAST}}</div>
  <div class="guar">{{GUARANTEE_HTML}}</div>
  <div class="proofrow">{{PROOF_ROW_HTML}}</div>
</div>
<div class="ctabar"><span>{{CTA}}</span><span>&#8250;</span></div>
</body></html>
$static_ad_resource_3$, 'text/html')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('static-ad-book', 'assets/engine/templates/chat_receipt.html', $static_ad_resource_4$<!doctype html><html><head><meta charset="utf-8"><style>
{{FONT_CSS}}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:{{W}}px;height:{{H}}px;overflow:hidden}
body{background:#fff;border:14px solid #f2f2f2;padding:70px 60px;display:flex;flex-direction:column;gap:60px;font-family:Inter}
h1{font-family:Anton;font-weight:400;font-size:82px;line-height:1.08;text-transform:uppercase;color:#111;text-align:center;letter-spacing:1px}
h1 .red{color:#e8151b}
.slack{display:flex;gap:24px;padding:0 20px}
.slack .av{width:88px;height:88px;border-radius:12px;object-fit:cover;background:#e8e8e8;flex:none}
.slack .meta{font-weight:800;font-size:32px;color:#111}
.slack .meta small{font-weight:500;color:#8a8a8a;font-size:26px;margin-left:14px}
.slack .msg{font-size:33px;line-height:1.45;color:#1b1b1b;margin-top:10px}
.reactions{display:flex;gap:14px;margin-top:22px}
.reactions span{background:#eef3f8;border:1.5px solid #d7e0ea;border-radius:30px;font-size:27px;padding:8px 20px;color:#333}
.profile{display:flex;align-items:center;gap:34px;padding:0 30px}
.profile .pav{width:190px;height:190px;border-radius:50%;object-fit:cover;background:#eee;border:6px solid transparent;
  background-clip:padding-box;box-shadow:0 0 0 6px #fff,0 0 0 12px #d62976}
.profile .ph{font-weight:800;font-size:40px;color:#111;display:flex;align-items:center;gap:12px}
.profile .ph .chk{color:#1d9bf0;font-size:34px}
.profile .pb{font-size:29px;color:#555;margin-top:8px}
.profile .ps{font-size:30px;color:#111;margin-top:16px;display:flex;gap:34px}
.profile .ps b{font-weight:800}
</style></head><body>
<h1>{{HEADLINE_HTML}}</h1>
<div class="slack">
  <img class="av" src="{{AVATAR}}" onerror="this.style.visibility='hidden'">
  <div>
    <div class="meta">{{NAME}}<small>{{TIME}}</small></div>
    <div class="msg">{{MSG_HTML}}</div>
    <div class="reactions">{{REACTIONS_HTML}}</div>
  </div>
</div>
<div class="profile">
  <img class="pav" src="{{PAVATAR}}" onerror="this.style.visibility='hidden'">
  <div>
    <div class="ph">{{PHANDLE}} <span class="chk">&#10004;&#65039;</span></div>
    <div class="pb">{{PBIO}}</div>
    <div class="ps">{{PSTATS_HTML}}</div>
  </div>
</div>
</body></html>
$static_ad_resource_4$, 'text/html')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('static-ad-book', 'assets/engine/templates/fake_news.html', $static_ad_resource_5$<!doctype html><html><head><meta charset="utf-8"><style>
{{FONT_CSS}}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:{{W}}px;height:{{H}}px;overflow:hidden;background:#111}
.bg{position:absolute;inset:0;background:url('{{BG_IMAGE}}') center/cover no-repeat}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.72) 82%)}
.stack{position:absolute;left:0;right:0;bottom:7%;display:flex;flex-direction:column;align-items:center;gap:26px;padding:0 46px}
.tag{font-family:Anton;font-size:64px;letter-spacing:2px;color:#fff;background:#e8151b;padding:6px 42px 10px}
h1{font-family:Anton;font-weight:400;color:#fff;text-transform:uppercase;text-align:center;font-size:88px;line-height:1.04;letter-spacing:1px;
   text-shadow:0 4px 0 #000,0 -4px 0 #000,4px 0 0 #000,-4px 0 0 #000,3px 3px 0 #000,-3px 3px 0 #000,3px -3px 0 #000,-3px -3px 0 #000,0 10px 26px rgba(0,0,0,.55)}
.cta{margin-top:10px;background:#fff;color:#111;font-family:Inter;font-weight:700;font-size:44px;border-radius:60px;padding:20px 54px;display:{{CTA_DISPLAY}}}
</style></head><body>
<div class="bg"></div><div class="shade"></div>
<div class="stack">
  <div class="tag">{{TAG}}</div>
  <h1>{{HEADLINE_HTML}}</h1>
  <div class="cta">&#128279;&nbsp; {{CTA}}</div>
</div>
</body></html>
$static_ad_resource_5$, 'text/html')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('static-ad-book', 'assets/engine/templates/hero_framing.html', $static_ad_resource_6$<!doctype html><html><head><meta charset="utf-8"><style>
{{FONT_CSS}}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:{{W}}px;height:{{H}}px;overflow:hidden;background:#0c0c0c}
.bg{position:absolute;inset:0;background:url('{{PHOTO}}') center/cover no-repeat}
.shade{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 30%,rgba(0,0,0,.08) 0%,rgba(0,0,0,.55) 70%,rgba(0,0,0,.8) 100%)}
.stack{position:absolute;left:0;right:0;top:44%;display:flex;flex-direction:column;align-items:center;gap:56px;padding:0 60px;text-align:center}
h1{font-family:Inter;font-weight:700;font-size:58px;line-height:1.28;color:#fff;text-shadow:0 3px 18px rgba(0,0,0,.6)}
h1 .acc{color:{{ACCENT}};font-weight:800}
.sub{font-family:Inter;font-weight:700;font-size:44px;line-height:1.3;color:#fff;text-shadow:0 3px 16px rgba(0,0,0,.6)}
.cta{font-family:Inter;font-weight:800;font-size:38px;color:{{ACCENT}};text-shadow:0 3px 14px rgba(0,0,0,.6)}
</style></head><body>
<div class="bg"></div><div class="shade"></div>
<div class="stack">
  <h1>{{HEADLINE_HTML}}</h1>
  <div class="sub">{{SUB_HTML}}</div>
  <div class="cta">{{CTA}}</div>
</div>
</body></html>
$static_ad_resource_6$, 'text/html')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('static-ad-book', 'assets/engine/templates/identity_callout.html', $static_ad_resource_7$<!doctype html><html><head><meta charset="utf-8"><style>
{{FONT_CSS}}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:{{W}}px;height:{{H}}px;overflow:hidden;background:#0a0a0a}
.bg{position:absolute;inset:0;background:url('{{PHOTO}}') center/cover no-repeat;filter:brightness(.85)}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.45) 0%,rgba(0,0,0,.15) 35%,rgba(0,0,0,.55) 75%,rgba(0,0,0,.85) 100%)}
.chev{position:absolute;left:-10%;right:-10%;height:230px;background:{{ACCENT}};opacity:.28}
.chev.a{bottom:2%;transform:rotate(-6deg)}.chev.b{bottom:-6%;transform:rotate(-6deg);opacity:.5}
.stack{position:absolute;left:0;right:0;top:41%;display:flex;flex-direction:column;align-items:center;gap:22px;padding:0 50px;text-align:center}
.top{font-family:Inter;font-weight:700;font-size:56px;color:#fff;text-shadow:0 3px 16px rgba(0,0,0,.7)}
.top b{font-weight:900}
.mid{font-family:Inter;font-weight:600;font-size:42px;color:#ddd}
.big{font-family:Inter;font-weight:900;font-size:96px;line-height:1.04;color:#fff;text-transform:uppercase;text-shadow:0 5px 22px rgba(0,0,0,.7)}
.big .red{color:{{ACCENT}}}
.sub{font-family:Inter;font-weight:600;font-size:40px;line-height:1.3;color:#eee;margin-top:14px}
</style></head><body>
<div class="bg"></div><div class="shade"></div>
<div class="chev a"></div><div class="chev b"></div>
<div class="stack">
  <div class="top">{{TOP_HTML}}</div>
  <div class="mid">{{MID}}</div>
  <div class="big">{{BIG_HTML}}</div>
  <div class="sub">{{SUB_HTML}}</div>
</div>
</body></html>
$static_ad_resource_7$, 'text/html')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('static-ad-book', 'assets/engine/templates/myth_vs_system.html', $static_ad_resource_8$<!doctype html><html><head><meta charset="utf-8"><style>
{{FONT_CSS}}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:{{W}}px;height:{{H}}px;overflow:hidden}
body{font-family:Inter;background:linear-gradient(160deg,#fbfbf9 0%,#f2f1ee 100%);display:flex;flex-direction:column;align-items:center;padding:64px 56px;gap:34px;text-align:center}
body>*{flex:none}
.eyebrow{color:#d92b2b;font-size:36px;font-style:italic;font-weight:600}
h1{font-weight:900;font-size:74px;color:#111;line-height:1.05}
h1 .strike{position:relative;white-space:nowrap}
h1 .strike:after{content:"";position:absolute;left:-2%;right:-2%;top:48%;height:10px;background:#e8151b;transform:rotate(-3deg);border-radius:5px}
.lie{background:#e8151b;color:#fff;font-weight:900;font-size:52px;padding:14px 56px;border-radius:60px}
.sub{font-weight:800;font-size:42px;color:#111;line-height:1.25;max-width:900px}
.cols{display:flex;width:100%;background:#fff;border-radius:22px;box-shadow:0 18px 50px rgba(0,0,0,.10);overflow:hidden;text-align:left}
.col{flex:1;padding:34px 36px;display:flex;flex-direction:column;gap:18px}
.col+.col{border-left:2px solid #eee}
.colhead{font-size:34px;font-weight:900}
.old .colhead{color:#c92a2a}.new .colhead{color:#1d9d51}
.colhead small{font-weight:700;color:#888;font-size:28px}
.col ul{list-style:none;display:flex;flex-direction:column;gap:14px;font-size:29px;color:#222;line-height:1.3}
.col li:before{content:"- "}
.result{margin-top:auto;font-weight:800;font-size:28px;padding:12px 20px;border-radius:40px;align-self:flex-start}
.old .result{background:#fde3e3;color:#c92a2a}.new .result{background:#dff5e7;color:#1d9d51}
.punch{font-weight:900;font-size:46px;color:#111}
.ctabtn{background:#e8151b;color:#fff;font-weight:900;font-size:42px;padding:26px 60px;border-radius:70px;box-shadow:0 14px 34px rgba(232,21,27,.35)}
.fine{color:#555;font-size:27px;font-weight:600}
</style></head><body>
<div class="eyebrow">{{EYEBROW}}</div>
<h1>{{HEADLINE_HTML}}</h1>
<div class="lie">{{LIE_PILL}}</div>
<div class="sub">{{SUBHEAD_HTML}}</div>
<div class="cols">
  <div class="col old"><div class="colhead">&#10060; {{OLD_TITLE}} <small>(Broken)</small></div><ul>{{OLD_ROWS_HTML}}</ul><div class="result">{{OLD_RESULT}}</div></div>
  <div class="col new"><div class="colhead">&#9989; {{NEW_TITLE}} <small>(Working)</small></div><ul>{{NEW_ROWS_HTML}}</ul><div class="result">{{NEW_RESULT}}</div></div>
</div>
<div class="punch">{{PUNCH}}</div>
<div class="ctabtn">{{CTA}}</div>
<div class="fine">{{GUARANTEE}}</div>
</body></html>
$static_ad_resource_8$, 'text/html')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('static-ad-book', 'assets/engine/templates/offer_stack.html', $static_ad_resource_9$<!doctype html><html><head><meta charset="utf-8"><style>
{{FONT_CSS}}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:{{W}}px;height:{{H}}px;overflow:hidden;background:#0d0f13}
.bg{position:absolute;inset:0;background:url('{{BG_IMAGE}}') center/cover no-repeat;opacity:.22;filter:blur(1px)}
.wrap{position:absolute;inset:0;display:flex;flex-direction:column;padding:64px 56px 0;gap:36px}
.toprow{display:flex;align-items:flex-start;gap:40px}
.price{font-family:Inter;font-weight:900;font-size:190px;line-height:.95;color:#fff}
.title{font-family:Inter;font-weight:800;font-size:64px;line-height:1.1;color:#fff;text-transform:uppercase;padding-top:16px}
.trust{display:flex;align-items:center;gap:60px;font-family:Inter;font-size:30px;color:#dfe3ea;font-weight:700}
.trust .stars{color:#22c55e;letter-spacing:4px}
.trust .badge{display:flex;align-items:center;gap:16px}
.trust .circle{width:74px;height:74px;border-radius:50%;border:4px solid #1fb6b0;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;text-align:center;line-height:1.1}
.mock{flex:1;display:flex;align-items:center;justify-content:center;min-height:0}
.mock img{max-width:88%;max-height:100%;object-fit:contain;filter:drop-shadow(0 30px 60px rgba(0,0,0,.6))}
.cols{display:flex;gap:34px;padding-bottom:120px}
.c{flex:1;border-left:6px solid #e8151b;padding-left:22px}
.c .t{font-family:Inter;font-weight:900;font-size:38px;color:#fff;text-transform:uppercase}
.c .d{font-family:Inter;font-size:27px;color:#c9cfd9;margin-top:8px;line-height:1.3}
.ctabar{position:absolute;left:0;right:0;bottom:0;height:104px;background:{{BAR_COLOR}};display:flex;align-items:center;justify-content:space-between;padding:0 46px;font-family:Inter;font-weight:800;font-size:38px;color:#fff}
</style></head><body>
<div class="bg"></div>
<div class="wrap">
  <div class="toprow"><div class="price">{{PRICE}}</div><div class="title">{{TITLE_HTML}}</div></div>
  <div class="trust">
    <div class="badge"><span class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span><span>{{TRUST_LINE_HTML}}</span></div>
    <div class="badge"><span class="circle">{{BADGE_DAYS}}</span><span>{{BADGE_LINE_HTML}}</span></div>
  </div>
  <div class="mock"><img src="{{MOCKUP}}" onerror="this.remove()"></div>
  <div class="cols">{{COLS_HTML}}</div>
</div>
<div class="ctabar"><span>{{CTA}}</span><span>&#8250;</span></div>
</body></html>
$static_ad_resource_9$, 'text/html')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('static-ad-book', 'assets/engine/templates/press_authority.html', $static_ad_resource_10$<!doctype html><html><head><meta charset="utf-8"><style>
{{FONT_CSS}}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:{{W}}px;height:{{H}}px;overflow:hidden;background:#0b0d14}
.topbar{position:absolute;top:0;left:0;right:0;height:96px;background:#000;display:flex;align-items:center;justify-content:center;font-family:Inter;font-weight:900;font-size:44px;letter-spacing:2px;color:#fff;text-transform:uppercase}
.topbar span{border-bottom:6px solid {{GOLD}};padding-bottom:6px}
.photo{position:absolute;top:96px;left:0;right:0;bottom:110px;background:url('{{PHOTO}}') center/cover no-repeat}
.shade{position:absolute;top:96px;left:0;right:0;bottom:110px;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.78) 85%)}
.stack{position:absolute;left:0;right:0;bottom:150px;display:flex;flex-direction:column;align-items:center;gap:20px;padding:0 60px;text-align:center}
h1{font-family:Inter;font-weight:800;font-size:66px;line-height:1.15;color:#fff;text-shadow:0 4px 20px rgba(0,0,0,.6)}
h1 .gold{color:{{GOLD}};font-weight:900}
.sub{font-family:Inter;font-weight:700;font-size:44px;color:#fff}
.price{font-family:Inter;font-weight:500;font-size:38px;color:#e8e8e8}
.cta{margin-top:16px;background:#ff5c1f;color:#fff;font-family:Inter;font-weight:800;font-size:40px;padding:22px 64px;border-radius:60px;box-shadow:0 14px 34px rgba(255,92,31,.4)}
.bottom{position:absolute;left:0;right:0;bottom:0;height:110px;background:{{BAR_COLOR}};display:flex;align-items:center;justify-content:space-between;padding:0 46px;font-family:Inter;font-weight:800;font-size:38px;color:#111}
</style></head><body>
<div class="topbar"><span>{{TOPBAR}}</span></div>
<div class="photo"></div><div class="shade"></div>
<div class="stack">
  <h1>{{HEADLINE_HTML}}</h1>
  <div class="sub">{{SUB}}</div>
  <div class="price">{{PRICE_LINE}}</div>
  <div class="cta">{{CTA}}</div>
</div>
<div class="bottom"><span>{{BOTTOM_BAR}}</span><span>&#8250;</span></div>
</body></html>
$static_ad_resource_10$, 'text/html')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('static-ad-book', 'assets/engine/templates/tweet_receipt.html', $static_ad_resource_11$<!doctype html><html><head><meta charset="utf-8"><style>
{{FONT_CSS}}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:{{W}}px;height:{{H}}px;overflow:hidden;background:#3a4a5a}
.bg{position:absolute;inset:0;background:url('{{BG_IMAGE}}') center/cover no-repeat;filter:blur(2px) brightness(.85);transform:scale(1.05)}
.toppill{position:absolute;top:64px;left:50%;transform:translateX(-50%);background:#fff;border:3px solid #111;border-radius:60px;padding:18px 46px;font-family:Inter;font-weight:900;font-size:36px;letter-spacing:1px;color:#111;display:flex;align-items:center;gap:18px;white-space:nowrap}
.toppill .dot{width:22px;height:22px;border-radius:50%;background:#e8151b}
.card{position:absolute;left:70px;right:70px;top:200px;background:#fff;border-radius:28px;padding:48px 52px;box-shadow:0 30px 70px rgba(0,0,0,.35)}
.who{display:flex;align-items:center;gap:22px;margin-bottom:36px}
.who img{width:96px;height:96px;border-radius:50%;object-fit:cover;background:#dde3ea}
.who .n{font-family:Inter;font-weight:800;font-size:34px;color:#111;display:flex;align-items:center;gap:10px}
.who .n .chk{color:#1d9bf0;font-size:32px}
.who .h{font-family:Inter;font-size:28px;color:#7a8699}
.body{font-family:Inter;font-size:35px;line-height:1.45;color:#111;display:flex;flex-direction:column;gap:30px}
.body b{font-weight:800}
.proof{margin-top:36px;border:2px solid #e3e8ef;border-radius:16px;width:100%;display:block}
</style></head><body>
<div class="bg"></div>
<div class="toppill"><span class="dot"></span>{{TOP_PILL}}</div>
<div class="card">
  <div class="who">
    <img src="{{AVATAR}}" onerror="this.style.visibility='hidden'">
    <div><div class="n">{{NAME}} <span class="chk">&#10004;&#65039;</span></div><div class="h">{{HANDLE}}</div></div>
  </div>
  <div class="body">{{BODY_HTML}}</div>
  <img class="proof" src="{{PROOF}}" onerror="this.remove()">
</div>
</body></html>
$static_ad_resource_11$, 'text/html')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('static-ad-book', 'assets/engine/templates/workshop_event.html', $static_ad_resource_12$<!doctype html><html><head><meta charset="utf-8"><style>
{{FONT_CSS}}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:{{W}}px;height:{{H}}px;overflow:hidden}
body{background:linear-gradient(180deg,{{BG_TOP}} 0%,{{BG_BOTTOM}} 100%)}
.photo{position:absolute;inset:0;background:url('{{PHOTO}}') center top/cover no-repeat}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.12) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,.25) 100%)}
.live{position:absolute;top:56px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:18px;background:#15151c;color:#fff;font-family:Inter;font-size:34px;font-weight:600;padding:16px 34px;border-radius:60px;white-space:nowrap}
.live .pill{background:#e8151b;color:#fff;font-weight:900;font-size:28px;padding:6px 20px;border-radius:30px;display:flex;align-items:center;gap:10px}
.live .dot{width:16px;height:16px;border-radius:50%;background:#fff}
.live b{font-weight:800}
.stack{position:absolute;left:0;right:0;bottom:80px;display:flex;flex-direction:column;align-items:center;gap:44px;padding:0 50px;text-align:center}
h1{font-family:Inter;font-weight:800;font-size:84px;line-height:1.12;color:#fff;text-shadow:0 4px 20px rgba(0,0,0,.35)}
h1 .hl{background:{{ACCENT}};padding:0 18px}
h1 .it{font-style:italic;font-weight:600}
.cta{background:#fff;color:#111;font-family:Inter;font-weight:800;font-size:40px;letter-spacing:1px;padding:24px 60px;border-radius:16px;text-transform:uppercase}
</style></head><body>
<div class="photo"></div><div class="shade"></div>
<div class="live"><span class="pill"><span class="dot"></span>LIVE</span><span>{{EVENT_LINE_HTML}}</span></div>
<div class="stack">
  <h1>{{HEADLINE_HTML}}</h1>
  <div class="cta">{{CTA}}</div>
</div>
</body></html>
$static_ad_resource_12$, 'text/html')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('static-ad-book', 'references/family-a-person.md', $static_ad_resource_13$# Family A — Person-anchored formats

A face carries the ad. Imagery: per the intake choice in SKILL.md step 2 — real photo (user-provided) or generative person (Higgsfield `soul_2` per SKILL.md prompt rules, cast to the ICP). The user selects either way, including on named-result formats (flag the risk once, then build their pick). Photo goes in `PHOTO`.

## 1. Hero Framing (`hero_framing`)

The "I'm looking for 5 online coaches" style: founder photo full-bleed, dark radial shade, 3 stacked copy blocks in the lower half, 2-3 phrases in one accent color.

Anatomy: photo (subject upper third, eyes visible, slight smile, office/neutral bg) → HEADLINE (the offer callout, ~15-20 words, accent-colored spans on the numbers and the promise) → SUB (the mechanism + timeframe, one sentence) → CTA line in accent.

Spec keys: `PHOTO`, `ACCENT` (hex, e.g. #b8f34c lime), `HEADLINE_HTML` (use `<span class="acc">` for accents), `SUB_HTML`, `CTA`.

Copy rules: first person ("I'm looking for..."), a specific count of spots, a specific revenue target with a year, mechanism sentence starts "We'll". CTA is soft: "Click the link to learn more."

## 2. Identity Callout (`identity_callout`)

"If You're a MECHANIC and want to START MAKING MONEY ONLINE" — the Validate Messaging identity filter as a full static. Person mid-shot, arms-open gesture reads well.

Anatomy: TOP line ("If You're a **[ICP]**") → MID connector ("and want to") → BIG payoff in huge caps with the last phrase in accent red → SUB with the friction-remover + soft CTA.

Spec keys: `PHOTO`, `ACCENT` (default #e8151b), `TOP_HTML` (bold the ICP with `<b>`), `MID`, `BIG_HTML` (use `<span class="red">` on the payoff phrase), `SUB_HTML`.

Copy rules: ONE ICP per creative (make a set for the Validate Messaging batch — this format is the static twin of roas-ad-copy's identity callouts). Payoff ≤ 6 words. Sub names the objection killed ("without showing your face").

## 3. Case-Study Callout (`case_study`)

"[NAME] COLLECTED $100K IN CASH IN A SINGLE WEEK." — named result in giant colored Anton caps over a person shot with a dark blue tint, proof line top-left, ICP pill top-right, guarantee line, CTA bar.

Anatomy: top-left social proof ("**105+ coaches** scaled to $100K/month+") → top-right pill ("FOR **FITNESS COACHES** ONLY") → name + result headline (Anton, accent blue #2e7bff) → sub-result line (white caps) → contrast line ("Not from posting more. From the right ad system.") → guarantee ("We install the ad system that gets you **qualified clients** — or you don't pay.") → proof row → full-width CTA bar.

Spec keys: `PHOTO`, `ACCENT` (default #2e7bff), `PROOF_TL_HTML`, `PILL_TR_HTML`, `HEADLINE_HTML`, `SUBHEAD`, `CONTRAST`, `GUARANTEE_HTML` (`<span class="dim">` for the de-emphasized half), `PROOF_ROW_HTML`, `CTA`, optional `PROP1`/`PROP2` (transparent PNG props, floating; leave empty by default — see SKILL.md caution on platform logos).

Copy rules: real name + real number only. The contrast line is always "Not from [common belief]. From [mechanism]." Guarantee has teeth or is omitted.

## 4. Workshop / Event (`workshop_event`)

"LIVE — Free AI Workshop This Tuesday" pill up top, presenter photo, big 3-beat headline with the last beat highlighted, white CTA button.

Anatomy: LIVE pill (red LIVE chip + event line with the day bolded) → presenter photo center (waist-up, plain gradient bg works: `BG_TOP`/`BG_BOTTOM`) → headline, 3 short beats, beat 3 wrapped in `<span class="hl">` highlight (use `<span class="it">` for an italic beat) → CTA button ("SECURE MY FREE SPOT").

Spec keys: `PHOTO` (can be empty for pure gradient), `BG_TOP`/`BG_BOTTOM` (hex gradient, e.g. #b18cf5 → #7d4fe0), `ACCENT` (highlight bg), `EVENT_LINE_HTML`, `HEADLINE_HTML`, `CTA`.

Copy rules: the 3 beats are two dismissals + one command ("Forget X. Forget Y. Launch a Z.") or problem/problem/solution. Day-specific urgency always ("This Tuesday", never "soon").
$static_ad_resource_13$, 'text/markdown')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('static-ad-book', 'references/family-b-receipts.md', $static_ad_resource_14$# Family B — Proof / receipt formats

Screenshots ARE the creative. Warm-traffic and retargeting killers. Only use real, substantiable receipts for real clients (SKILL.md cautions apply).

## 5. Tweet Receipt (`tweet_receipt`)

A post-style card (avatar, name, check, result claim) with an embedded revenue-dashboard screenshot, floating over a blurred lifestyle background, ICP pill on top.

Anatomy: top pill ("● COACHES & COURSE CREATORS") → white card: avatar + "Name | Positioning ✔" + handle → 3 short paragraphs (result line with the number bolded / the offer line "Give us 7-days and we'll install..." / "Click Below & Apply Now.") → dashboard image inside the card.

Spec keys: `BG_IMAGE` (lifestyle scene — generate via Higgsfield, pool/skyline works), `TOP_PILL`, `AVATAR`, `NAME`, `HANDLE`, `BODY_HTML` (wrap paragraphs in `<div>`s, bold numbers with `<b>`), `PROOF` (dashboard screenshot image).

Proof rule: use the client's REAL Stripe/Ads dashboard screenshot. If none exists, render a plausible-styled overview panel as its own HTML and screenshot it — but only with the client's real numbers.

## 6. Chat Receipt (`chat_receipt`)

Tabloid headline + a Slack/community win message + the person's IG profile row as identity proof. White, screenshot-collage energy.

Anatomy: Anton caps headline, middle phrase red (`<span class="red">`) → Slack message block (square avatar, name, timestamp, the win message verbatim, emoji reaction pills) → IG profile row (round avatar with story ring, handle + check, bio line, posts/followers/following stats).

Spec keys: `HEADLINE_HTML`, `AVATAR`, `NAME`, `TIME`, `MSG_HTML`, `REACTIONS_HTML` (`<span>🙌 7</span>...`), `PAVATAR`, `PHANDLE`, `PBIO`, `PSTATS_HTML` (`<span><b>2,555</b> posts</span>...`).

Copy rules: the message stays in the client's own words — typos and all, that's the authenticity. Headline extracts the most concrete number from the message. Follower count in the stats row is the credibility anchor; if it's small, use a different format.

## 7. Press / Authority (`press_authority`)

"AS SEEN ON CLICKFUNNELS" black bar, stage/podcast photo, white headline with the money number in gold, price line, orange CTA.

Anatomy: top bar (AS SEEN ON [PLATFORM], gold underline) → photo (real event/podcast photo strongly preferred; AI stage shots read fake fast) → headline ("My client generated `<span class="gold">`$243,000 IN 60 DAYS`</span>`") → sub (the mechanism: "using this 3-phase Meta Ads system.") → price line ("The [Name] — $27") → CTA button → bottom bar ("Learn more").

Spec keys: `TOPBAR`, `PHOTO`, `GOLD` (default #e5b94e), `HEADLINE_HTML`, `SUB`, `PRICE_LINE`, `CTA`, `BAR_COLOR` (bottom bar, default #7f7fe8), `BOTTOM_BAR`.

Rule: only claim platforms the client actually appeared on. "As seen on" with no receipts is a refund machine.
$static_ad_resource_14$, 'text/markdown')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('static-ad-book', 'references/family-c-graphics.md', $static_ad_resource_15$# Family C — Direct-response graphic formats

No person needed. Pure pattern-interrupt or offer mechanics. These three carry cold traffic for low-ticket funnels.

## 8. Fake News (`fake_news`)

King Kong style: macro object photo, red NEWS tag, huge white Anton caps with heavy black outline. The object is a curiosity hook, not the product.

Anatomy: full-bleed macro photo (a chip held in fingers, a vault door, a document — something that makes the "leak" tangible; generate via Higgsfield: "macro photo, fingers holding a [object], shallow depth of field" + the no-text rules) → bottom gradient → red tag ("NEWS", "LEAKED", "UPDATE") → 3-line headline → optional white CTA pill.

Spec keys: `BG_IMAGE`, `TAG`, `HEADLINE_HTML` (use `<br>` for line breaks — aim for 3 lines ≤ 26 chars each), `CTA`, `CTA_DISPLAY` ("flex" to show the pill, "none" to hide).

Copy formula: LEAKED/EXPOSED + a big specific number + the platform + the outcome metric ("LEAKED $300M A.I. META ADS 'CHEAT CODES' FOR GETTING 3,466+ LEADS P/M"). Numbers are never round.

## 9. Myth vs System (`myth_vs_system`)

"Just launch ~~MORE CREATIVES~~ — THAT IS A LIE." then an old-way vs new-way comparison card. The strongest belief-breaking format in the book.

Anatomy: red italic eyebrow ("What the gurus told you...") → headline quoting the myth with the myth phrase struck through (`<span class="strike">`) → red pill ("THAT IS A LIE.") → subhead naming what changed → two-column card: ✗ OLD WAY (Broken) 3 bullets + red result pill vs ✓ NEW WAY (Working) 3 bullets + green result pill → punch line ("You don't need more. You need X.") → red CTA button with price → guarantee fine print.

Spec keys: `EYEBROW`, `HEADLINE_HTML`, `LIE_PILL`, `SUBHEAD_HTML`, `OLD_TITLE`, `NEW_TITLE`, `OLD_ROWS_HTML`/`NEW_ROWS_HTML` (`<li>` items, exactly 3 each), `OLD_RESULT`, `NEW_RESULT`, `PUNCH`, `CTA`, `GUARANTEE`.

Copy rules: the myth is something the ICP has literally been told. Old-way bullets are things they're currently DOING (recognition), new-way bullets are named mechanisms (curiosity). Result pills are $ or ROAS numbers, not adjectives. See `assets/engine/examples/myth_example.json`.

## 10. Offer Stack (`offer_stack`)

"$97 DFY VSL, 24 HOUR DELIVERY" — dark bg, giant price, deliverable title, trust row (stars + guarantee badge), product mockup, 3-column what-you-get strip, CTA bar.

Anatomy: huge price left + stacked title right → trust row ("★★★★★ TRUSTED BY 300+ FOUNDERS LIKE YOU" + circular N-day money-back badge) → center mockup (laptop/product image — screens rendered as HTML or dark, never AI screen content) → 3 columns with red left-bars (BLUEPRINT / VSL / FUNNEL pattern: name + one-line what-it-is) → CTA bar.

Spec keys: `PRICE`, `TITLE_HTML`, `TRUST_LINE_HTML`, `BADGE_DAYS` ("7 DAYS"), `BADGE_LINE_HTML` ("7 DAY MONEY BACK GUARANTEE"), `MOCKUP`, `COLS_HTML` (`<div class="c"><div class="t">NAME</div><div class="d">one-liner</div></div>` ×3), `CTA`, `BAR_COLOR`, optional `BG_IMAGE` (dimmed collage behind everything).

Copy rules: price is the hook — put it first and huge. Delivery speed in the title ("24 HOUR DELIVERY"). Exactly 3 stack items; more reads like a menu, not an offer.
$static_ad_resource_15$, 'text/markdown')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.template_skill_assignments (template_key, skill_key, is_enabled)
VALUES ('designer', 'static-ad-book', true)
ON CONFLICT (template_key, skill_key) DO UPDATE SET is_enabled = true;

INSERT INTO public.agent_skills (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT NULL, NULL, target.agent_key, library.skill_key, library.name, library.description,
  library.markdown_content, true, 'system'
FROM (VALUES ('designer'), ('vibey')) AS target(agent_key)
CROSS JOIN public.skill_library library
WHERE library.skill_key = 'static-ad-book'
ON CONFLICT (agent_key, skill_key) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  is_enabled = true,
  source = 'system',
  updated_at = now();

INSERT INTO public.agent_skill_resources (
  user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url
)
SELECT NULL, NULL, target.agent_key, resource.skill_key, resource.file_path, resource.content,
  resource.content_type, NULL
FROM (VALUES ('designer'), ('vibey')) AS target(agent_key)
CROSS JOIN public.skill_library_resources resource
WHERE resource.skill_key = 'static-ad-book'
ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type,
  updated_at = now();

-- Backfill already-hired designers without overwriting user-authored skill copies.
INSERT INTO public.agent_skills (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT DISTINCT marker.user_id, marker.org_id, marker.agent_key, library.skill_key, library.name,
  library.description, library.markdown_content, true, 'template'
FROM public.agent_skills marker
CROSS JOIN public.skill_library library
WHERE marker.skill_key IN ('roas-ad-design', 'instagram-carousel-design', 'ig-organic-video-ad')
  AND library.skill_key = 'static-ad-book'
  AND (marker.user_id IS NOT NULL OR marker.org_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1
    FROM public.agent_skills existing
    WHERE existing.agent_key = marker.agent_key
      AND existing.skill_key = library.skill_key
      AND existing.user_id IS NOT DISTINCT FROM marker.user_id
      AND existing.org_id IS NOT DISTINCT FROM marker.org_id
  );

INSERT INTO public.agent_skill_resources (
  user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url
)
SELECT skill.user_id, skill.org_id, skill.agent_key, resource.skill_key, resource.file_path,
  resource.content, resource.content_type, NULL
FROM public.agent_skills skill
JOIN public.skill_library_resources resource ON resource.skill_key = skill.skill_key
WHERE skill.skill_key = 'static-ad-book'
  AND NOT EXISTS (
    SELECT 1
    FROM public.agent_skill_resources existing
    WHERE existing.agent_key = skill.agent_key
      AND existing.skill_key = skill.skill_key
      AND existing.file_path = resource.file_path
      AND existing.user_id IS NOT DISTINCT FROM skill.user_id
      AND existing.org_id IS NOT DISTINCT FROM skill.org_id
  );

COMMIT;
