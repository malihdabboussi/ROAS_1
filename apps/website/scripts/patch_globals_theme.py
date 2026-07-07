#!/usr/bin/env python3
"""One-off splice: extract :root, split themes into html.dark/.site-mock-dark vs html:not(.dark)."""

from pathlib import Path

LIGHT_INNER = r"""
  /* apps/web @layer base `:root` light parity (marketing shell) */
  --bg-deep: #faf9f6;
  --bg-surface: #ffffff;
  --bg-card: #ffffff;
  --border-glass: rgba(0, 0, 0, 0.08);
  --text-primary: #1a1a1a;
  --text-muted: #6b7280;
  --glow-emerald: rgb(var(--accent-emerald-rgb) / 0.12);
  --glow-secondary: rgb(var(--accent-secondary-rgb) / 0.1);

  --bg-deep-dark: #f2efe8;
  --bg-deep-darker: #ebe6dc;
  --bg-deep-blue: #f7f8fa;
  --text-secondary: #374151;
  --text-dim: #9ca3af;
  --text-dimmer: #78716f;
  --border-glass-bright: rgba(0, 0, 0, 0.12);
  --border-glass-dim: rgba(0, 0, 0, 0.06);
  --bg-subtle: rgba(0, 0, 0, 0.035);
  --bg-subtle-hover: rgba(0, 0, 0, 0.055);
  --bg-subtle-bright: rgba(0, 0, 0, 0.08);

  --color-background: var(--bg-deep);
  --color-foreground: var(--text-primary);
  --color-card: var(--bg-card);
  --color-muted: #f3f4f6;
  --color-muted-foreground: var(--text-muted);
  --color-secondary: #f3f4f6;
  --color-border: var(--border-glass);
  --spacing-0: 0px;
  --spacing-0-5: 2px;

  --border-section: rgba(0, 0, 0, 0.08);
  --border-hairline: rgba(0, 0, 0, 0.06);
  --border-slot: rgba(0, 0, 0, 0.05);
  --border-strong: rgba(0, 0, 0, 0.1);
  --border-hover-strong: rgba(0, 0, 0, 0.14);
  --border-focus-ring: rgb(16 185 129 / 0.35);
  --divider-line: rgba(0, 0, 0, 0.09);
  --bg-pixel: rgba(0, 0, 0, 0.03);
  --bg-pixel-mid: rgba(0, 0, 0, 0.045);
  --bg-address-well: rgba(0, 0, 0, 0.05);
  --bg-traffic-dot: rgba(0, 0, 0, 0.2);
  --bg-overlay-panel: rgba(254, 254, 252, 0.96);
  --text-subtle: #78716f;
  --text-faint: #a8a29e;
  --bg-panel: #fafafa;
  --bg-panel-mid: #f4f4f5;
  --overlay-scrim: rgba(45, 40, 35, 0.35);
  --shadow-footer-drop: 0 20px 60px rgba(15, 23, 42, 0.1);
  --bg-footer-slab: rgba(255, 255, 255, 0.9);
  --fill-diamond-inner: rgba(28, 25, 23, 0.08);
  --shadow-elevate: rgba(15, 23, 42, 0.08);
  --shadow-modal: rgba(15, 23, 42, 0.12);
  --glass-stop-02: rgba(0, 0, 0, 0.02);
  --glass-stop-04: rgba(0, 0, 0, 0.04);
  --glass-stop-05: rgba(0, 0, 0, 0.05);
  --glass-stop-06: rgba(0, 0, 0, 0.06);
  --glass-stop-08: rgba(0, 0, 0, 0.08);
  --glass-stop-10: rgba(0, 0, 0, 0.1);
  --glass-stop-12: rgba(0, 0, 0, 0.12);
  --glass-stop-15: rgba(0, 0, 0, 0.14);
  --glass-stop-30: rgba(0, 0, 0, 0.2);
  --inset-shadow-dark: rgba(0, 0, 0, 0.06);
  --inset-bottom-15: inset 0 -1px 0 rgba(0, 0, 0, 0.1);
  --inset-white-90: inset 0 1px 0 rgb(255 255 255 / 0.9);
  --inset-white-25: inset 0 1px 0 rgb(255 255 255 / 0.45);
  --shadow-black-15: rgba(15, 23, 42, 0.1);
  --shadow-black-20: rgba(15, 23, 42, 0.14);
  --shadow-black-25: rgba(15, 23, 42, 0.17);
  --shadow-black-30: rgba(15, 23, 42, 0.2);
  --shadow-black-40: rgba(15, 23, 42, 0.24);
  --shadow-black-50: rgba(15, 23, 42, 0.28);

  --text-on-dark-pure: #ffffff;
  --text-warm-highlight: #064e3b;
  --neutral-250: #fafafa;
  --hero-dot-fill: rgba(28, 25, 23, 0.88);
  --selection-bg: rgb(var(--accent-emerald-rgb) / 0.25);
  --scrollbar-thumb: rgba(120, 113, 108, 0.35);
  --scrollbar-thumb-hover: rgba(120, 113, 108, 0.5);
  --mock-white-60: rgb(28 25 23 / 0.55);
  --mock-white-20: rgb(28 25 23 / 0.12);
  --mock-white-70: rgb(28 25 23 / 0.65);

  --gradient-chip-neutral: linear-gradient(135deg, var(--glass-stop-04) 0%, var(--glass-stop-08) 50%, var(--glass-stop-04) 100%);
  --gradient-chip-neutral-hover: linear-gradient(
    135deg,
    var(--glass-stop-08) 0%,
    var(--glass-stop-12) 50%,
    var(--glass-stop-08) 100%
  );
  --gradient-switch-off: linear-gradient(135deg, var(--glass-stop-05) 0%, var(--glass-stop-08) 50%, var(--glass-stop-04) 100%);
  --gradient-switch-thumb: linear-gradient(135deg, rgb(248 248 246) 0%, rgb(239 239 239) 100%);
  --gradient-hero-screenshot: linear-gradient(135deg, var(--glass-stop-06) 0%, var(--glass-stop-02) 100%);
  --gradient-input-glass: linear-gradient(135deg, var(--glass-stop-06) 0%, var(--glass-stop-02) 100%);
  --gradient-button-glass-neutral: linear-gradient(
    135deg,
    var(--glass-stop-06) 0%,
    var(--glass-stop-10) 50%,
    var(--glass-stop-05) 100%
  );
  --gradient-voice-orb: linear-gradient(135deg, var(--glass-stop-06) 0%, var(--glass-stop-02) 100%);
  --gradient-indicator-muted: linear-gradient(
    135deg,
    rgba(148, 163, 184, 0.12) 0%,
    rgba(148, 163, 184, 0.18) 50%,
    rgba(148, 163, 184, 0.1) 100%
  );
  --border-indicator-muted: rgba(148, 163, 184, 0.28);
  --gradient-badge-muted: linear-gradient(
    135deg,
    rgba(156, 163, 175, 0.12) 0%,
    rgba(209, 213, 219, 0.16) 50%,
    rgba(156, 163, 175, 0.1) 100%
  );
  --border-badge-muted: rgba(209, 213, 219, 0.28);

  --shadow-glass-card-hover:
    0 8px 28px rgba(15, 23, 42, 0.1), 0 0 0 1px rgb(var(--accent-secondary-rgb) / 0.12);
  --shadow-chip-neutral:
    0 2px 10px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgb(255 255 255 / 0.9),
    inset 0 -1px 0 var(--inset-shadow-dark);
  --shadow-chip-neutral-hover:
    0 4px 16px rgba(15, 23, 42, 0.12),
    inset 0 1px 0 rgb(255 255 255 / 1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.12);
  --shadow-emerald-chip:
    0 2px 10px rgb(var(--accent-emerald-rgb) / 0.12),
    inset 0 1px 0 rgb(255 255 255 / 0.85),
    inset 0 -1px 0 rgb(var(--accent-emerald-mid-rgb) / 0.08);
  --shadow-emerald-chip-hover:
    0 4px 16px rgb(var(--accent-emerald-rgb) / 0.22),
    inset 0 1px 0 rgb(255 255 255 / 0.92),
    inset 0 -1px 0 rgb(var(--accent-emerald-mid-rgb) / 0.14);
  --shadow-secondary-button:
    0 2px 16px rgb(var(--accent-secondary-rgb) / 0.08),
    inset 0 1px 0 rgb(255 255 255 / 0.75),
    inset 0 -1px 0 rgb(var(--accent-secondary-rgb) / 0.06);
  --shadow-secondary-button-hover:
    0 4px 20px rgb(var(--accent-secondary-rgb) / 0.12),
    inset 0 1px 0 rgb(255 255 255 / 0.85),
    inset 0 -1px 0 rgb(var(--accent-secondary-rgb) / 0.08);
  --shadow-switch-on:
    0 2px 8px rgb(var(--accent-emerald-mid-rgb) / 0.28),
    var(--inset-white-25),
    inset 0 -1px 0 rgb(var(--accent-emerald-mid-rgb) / 0.12);
  --shadow-switch-off: inset 0 1px 0 var(--glass-stop-06), inset 0 -1px 0 rgba(15, 23, 42, 0.12);
  --shadow-switch-thumb:
    0 2px 4px rgba(15, 23, 42, 0.12),
    0 1px 2px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgb(255 255 255 / 0.95);
  --shadow-hero-screenshot-frame:
    0 4px 48px rgba(15, 23, 42, 0.16),
    0 0 0 1px var(--border-hairline),
    inset 0 1px 0 rgba(255 255 255 / 0.92);
  --shadow-voice-orb:
    0 0 40px rgb(var(--accent-emerald-rgb) / 0.1),
    inset 0 1px 0 rgba(255 255 255 / 0.92),
    inset 0 -1px 0 var(--inset-shadow-dark);
  --shadow-badge-secondary:
    0 2px 10px rgb(var(--accent-secondary-rgb) / 0.06),
    inset 0 1px 0 rgb(255 255 255 / 0.8),
    inset 0 -1px 0 rgb(var(--accent-secondary-rgb) / 0.08);
  --shadow-input-glass:
    0 4px 16px rgba(15, 23, 42, 0.09),
    inset 0 1px 0 rgb(255 255 255 / 0.9);
  --shadow-button-neutral:
    0 2px 14px rgba(15, 23, 42, 0.1),
    inset 0 1px 0 rgb(255 255 255 / 0.9),
    inset 0 -1px 0 var(--inset-shadow-dark);
  --shadow-chip-glass-secondary:
    0 2px 10px rgb(var(--accent-secondary-rgb) / 0.1),
    inset 0 1px 0 rgb(255 255 255 / 0.7),
    inset 0 -1px 0 rgb(var(--accent-secondary-rgb) / 0.05);
  --shadow-mockup-frame: 0 25px 50px -12px rgba(15, 23, 42, 0.28);
  --shadow-studio-dropdown:
    0 4px 18px rgba(15, 23, 42, 0.12),
    0 2px 8px rgba(15, 23, 42, 0.1);
"""


def patch(path: Path) -> None:
    full = path.read_text()
    root_idx = full.find(":root {\n")
    if root_idx == -1:
        raise SystemExit("Missing :root")
    brace_pos = full.find("{", root_idx)
    depth = 1
    i = brace_pos + 1
    while i < len(full) and depth > 0:
        if full[i] == "{":
            depth += 1
        elif full[i] == "}":
            depth -= 1
        i += 1
    root_end_idx = i
    segment = full[root_idx:root_end_idx]

    deep = segment.find("  --bg-deep:")
    brain = segment.find("  --brain-mem-fact:")
    sem = segment.find("  /* Semantic tokens for Tailwind brain port")
    colon = segment.find("{")
    brand_block = segment[colon + 1 : deep].strip()
    if brand_block.startswith("\n"):
        brand_block = brand_block[1:]
    brain_block = segment[brain:sem].strip()
    dark_middle = segment[deep:brain].strip()
    dark_tail = segment[sem:].strip()
    if dark_tail.endswith("}"):
        dark_tail = dark_tail[:-1].strip()
    html_dark_inner = dark_middle + "\n\n" + dark_tail

    new_block = (
        ":root {\n"
        + brand_block
        + "\n\n"
        + brain_block
        + "\n}\n\nhtml.dark,\n.site-mock-dark {\n"
        + html_dark_inner
        + "\n}\n\nhtml:not(.dark) {\n"
        + LIGHT_INNER.strip()
        + "\n}\n"
    )

    out = full[:root_idx] + new_block + full[root_end_idx:]
    path.write_text(out)
    print("patched:", path, "chars", len(out))


def main() -> None:
    root = Path(__file__).resolve().parent.parent / "src" / "app" / "globals.css"
    patch(root)


if __name__ == "__main__":
    main()
