#!/usr/bin/env node
/**
 * Generates per-component reference MDs for carousel-designer Type 6
 * (Product UI Showcase) from the web-library snapshot of apps/website/src.
 *
 * Output: product-video/scripts/.out/type6-resources.json
 *   Shape: [{ file_path, content, content_type }]
 *
 * Not executed at build time. Consumed by the Supabase upsert that adds
 * these rows to skill_library_resources.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'src/web-library');

const DIRS = [
  { rel: 'components/feature-pages', category: 'feature-pages' },
  { rel: 'components/marketing', category: 'marketing' },
  { rel: 'components/marketing/brain-app', category: 'marketing-brain-app' },
  {
    rel: 'components/marketing/capabilities-carousel-previews',
    category: 'marketing-capability-preview',
  },
];

/** Extract the first export (function or const) to identify the “main” component. */
function firstExport(source) {
  const fnMatch = source.match(/export\s+(?:default\s+)?function\s+([A-Z]\w+)/);
  if (fnMatch) return fnMatch[1];
  const constMatch = source.match(/export\s+(?:const|let|var)\s+([A-Z]\w+)/);
  if (constMatch) return constMatch[1];
  return null;
}

/** Grab a Props type / interface definition if present. */
function propsBlock(source) {
  const iface = source.match(/(?:type|interface)\s+(\w+Props)[^{]*\{[\s\S]*?\n\}/);
  if (iface) return iface[0];
  return null;
}

/** Pull all lines that reference project classes (rough signal for required CSS). */
function projectClasses(source) {
  const names = new Set();
  const classes = source.match(/className="[^"]+"/g) ?? [];
  for (const raw of classes) {
    const tokens = raw.slice('className="'.length, -1).split(/\s+/);
    for (const t of tokens) {
      if (!t) continue;
      if (/^(h|w|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|flex|grid|items|justify|text|font|bg|border|rounded|shadow|opacity|relative|absolute|fixed|inset|overflow|z|min|max|top|left|right|bottom|translate|rotate|scale|space|col|row|hidden|block|inline|size|leading|tracking|uppercase|lowercase|order|whitespace|break|backdrop|ring|outline|cursor|select|pointer|aspect|col-span|row-span)-?.*/.test(t)) {
        continue; // tailwind-ish
      }
      names.add(t);
    }
  }
  return Array.from(names).sort();
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function componentSummary(name) {
  const lower = name.toLowerCase();
  if (lower.includes('hero')) return 'Hero / above-the-fold block; use as a cover slide or section opener.';
  if (lower.includes('carousel')) return 'Horizontal scroller of product imagery or cards; use for a capability sweep.';
  if (lower.includes('mockup')) return 'Product UI mockup block; use when a slide needs to look like the real app.';
  if (lower.includes('showcase')) return 'Multi-block layout alternating copy + visual; map to a full carousel.';
  if (lower.includes('orb')) return '3D Vibey brain orb; use as a brand/mood visual.';
  if (lower.includes('graph')) return 'Force graph / relationship viz; good for brain/memory slides.';
  if (lower.includes('grid')) return 'Multi-cell grid (capabilities / value props); use for list slides.';
  if (lower.includes('table')) return 'Comparison/pricing table; use for “vs” slides.';
  if (lower.includes('accordion')) return 'FAQ-style expandable list; use for “what it answers” slides.';
  if (lower.includes('strip')) return 'Horizontal integration logo strip; use as a social-proof sliver.';
  if (lower.includes('card')) return 'Single card module; use inline within a larger slide.';
  if (lower.includes('form')) return 'Form layout; only if the slide is an in-product screenshot.';
  if (lower.includes('preview')) return 'Artifact preview (ad / funnel / email); use as slide body.';
  if (lower.includes('emblem')) return 'Role/brand emblem; use as a slide decoration.';
  return 'Product component; reuse verbatim in the slide TSX for 1:1 website fidelity.';
}

function importPath(rel, name) {
  return `@/${rel.replace(/^components\//, 'components/')}/${name}`;
}

function render(rel, filename, source) {
  const name = firstExport(source) ?? path.basename(filename, '.tsx');
  const props = propsBlock(source);
  const summary = componentSummary(name);
  const classes = projectClasses(source);
  const relPath = `${rel}/${filename}`;
  const imp = importPath(rel, path.basename(filename, '.tsx'));

  const propsSection = props
    ? `## Props\n\n\`\`\`ts\n${props}\n\`\`\`\n`
    : '## Props\n\n_No explicit Props interface — see the source signature below._\n';

  const classesSection = classes.length
    ? `## Non-Tailwind classes referenced\n\nThese must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:\n\n${classes.map((c) => `- \`${c}\``).join('\n')}\n`
    : '';

  return `# ${name}

> ${summary}

## Location

- Web-library path: \`product-video/src/web-library/${relPath}\`
- Website source: \`apps/website/src/${relPath}\`
- Import alias: \`${imp}\`

${propsSection}
## Usage (slide body)

\`\`\`tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
\`\`\`

${classesSection}
## Source

\`\`\`tsx
${source}
\`\`\`
`;
}

function walk(dirAbs, dirRel, out) {
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.tsx')) continue;
    const abs = path.join(dirAbs, entry.name);
    const source = fs.readFileSync(abs, 'utf8');
    const content = render(dirRel, entry.name, source);
    const name = path.basename(entry.name, '.tsx');
    out.push({
      file_path: `references/type6-components/${name}.md`,
      content_type: 'text/markdown',
      content,
    });
  }
}

function listComponents() {
  const out = [];
  for (const { rel } of DIRS) {
    const abs = path.join(WEB, rel);
    if (!fs.existsSync(abs)) continue;
    walk(abs, rel, out);
  }
  out.sort((a, b) => a.file_path.localeCompare(b.file_path));
  return out;
}

function buildIndex(rows) {
  const lines = [];
  lines.push('# Type 6: Product UI Showcase — Component Index');
  lines.push('');
  lines.push(
    '> The real Vibey website components, one reference file per component. Use these verbatim inside a carousel slide when a visual needs to be **1:1 with the live product surface** (feature pages, hero mockups, showcase blocks).',
  );
  lines.push('');
  lines.push('## Rules');
  lines.push('');
  lines.push('1. Read the component reference before using it. Do not guess markup.');
  lines.push(
    '2. Paste JSX verbatim (minus Next.js-specific bits like `"use client"`) and keep class names as-is.',
  );
  lines.push(
    '3. Strip runtime-only behavior (`useState`/`useEffect` animations) if the target carousel is static.',
  );
  lines.push(
    '4. If a class listed in "Non-Tailwind classes referenced" is not defined in the slide\'s own CSS, replace it with an inline style before rendering.',
  );
  lines.push(
    '5. Assets (portraits, `/Logos/...`) must be replaced with an explicit URL or data-URI; the marketing site ships these from `public/`.',
  );
  lines.push('');
  lines.push('## Components');
  lines.push('');
  lines.push('| Component | Reference file |');
  lines.push('|---|---|');
  for (const r of rows) {
    const name = path.basename(r.file_path, '.md');
    lines.push(`| ${name} | \`${r.file_path}\` |`);
  }
  lines.push('');
  return {
    file_path: 'references/type6-product-ui.md',
    content_type: 'text/markdown',
    content: lines.join('\n'),
  };
}

function main() {
  const rows = listComponents();
  const overview = buildIndex(rows);
  const payload = [overview, ...rows];

  const outDir = path.join(__dirname, '.out');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'type6-resources.json');
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
  console.log(`${payload.length} reference files written to ${outFile}`);
}

main();
