#!/usr/bin/env node
/**
 * Extract curated funnel/website blocks from
 * docker/agents/vibey/skills/funnel-builder/references/design-library/*.md
 *
 * Each markdown file follows the pattern:
 *   # <Category> — Design Library
 *   <intro>
 *   ## Table of Contents
 *   ...
 *   ## N. <Block Name>
 *     **When to use:** ...
 *     **Do not:** ...
 *     **Description:** ...
 *     ```tsx
 *     <component code>
 *     ```
 *
 * Output:
 *   product-video/scripts/.out/design-library-blocks.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const LIB_ROOT = path.join(
  ROOT,
  'docker/agents/vibey/skills/funnel-builder/references/design-library',
);
const OUT_DIR = path.join(__dirname, '.out');

const CATEGORY_BY_FILE = {
  heroes: 'hero',
  'cta-sections': 'cta',
  faq: 'faq',
  features: 'features',
  footer: 'footer',
  navigation: 'navigation',
  pricing: 'pricing',
  stats: 'stats',
  team: 'team',
  testimonials: 'social-proof',
  utility: 'unique',
};

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readMd(file) {
  return fs.readFileSync(file, 'utf8');
}

function parseSections(md) {
  // Section starts at "## N. <Name>" — matches ##, then optional digits/period, then text
  const lines = md.split('\n');
  const sections = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^##\s+(?:(\d+)\.\s+)?(.+?)\s*$/);
    if (m) {
      const number = m[1] ? parseInt(m[1], 10) : null;
      const title = m[2].trim();
      // Skip Table of Contents
      if (/^table of contents$/i.test(title)) {
        current = null;
        continue;
      }
      // Only number-prefixed sections are blocks
      if (number == null) {
        current = null;
        continue;
      }
      current = { number, title, body: [] };
      sections.push(current);
      continue;
    }
    if (current) current.body.push(line);
  }
  return sections;
}

function extractTsxFromBody(bodyLines) {
  let inFence = false;
  let lang = '';
  const buf = [];
  for (const line of bodyLines) {
    const open = line.match(/^\s*```([a-zA-Z0-9_+-]+)\s*$/);
    const close = /^\s*```\s*$/;
    if (!inFence && open) {
      inFence = true;
      lang = open[1].toLowerCase();
      continue;
    }
    if (inFence && close.test(line)) {
      if (lang === 'tsx' || lang === 'jsx') return buf.join('\n').trim();
      return null;
    }
    if (inFence) buf.push(line);
  }
  return null;
}

function extractAnnotation(bodyLines, label) {
  // Match "**Label:** value" possibly across following indented lines until blank.
  const labelRe = new RegExp(`^\\s*\\*\\*${label}:\\*\\*\\s*(.*)$`, 'i');
  let inMatch = false;
  let parts = [];
  for (const line of bodyLines) {
    if (!inMatch) {
      const m = line.match(labelRe);
      if (m) {
        inMatch = true;
        if (m[1].trim()) parts.push(m[1].trim());
        continue;
      }
    } else {
      if (/^\s*$/.test(line)) break;
      if (/^\s*```/.test(line)) break;
      if (/^\s*\*\*[A-Z][^:]*:\*\*/.test(line)) break;
      parts.push(line.trim());
    }
  }
  return parts.length ? parts.join(' ') : null;
}

function inferComponentName(code, fallback) {
  const candidates = [
    /export\s+default\s+(?:function\s+)?([A-Z]\w+)/,
    /^\s*function\s+([A-Z]\w+)\s*\(/m,
    /^\s*const\s+([A-Z]\w+)\s*=/m,
  ];
  for (const re of candidates) {
    const m = code.match(re);
    if (m && m[1].toLowerCase() !== 'index') return m[1];
  }
  return fallback;
}

function ensureDefaultExport(code, name) {
  // Strip any existing `export default X;` so we always wrap the component.
  let body = code.replace(/^[ \t]*export\s+default\s+([A-Z]\w+)\s*;?\s*$/gm, '');
  // Find the inner component name (the one being exported / declared).
  const innerName = (() => {
    const m =
      code.match(/export\s+default\s+(?:function\s+)?([A-Z]\w+)/) ||
      code.match(/^\s*function\s+([A-Z]\w+)\s*\(/m) ||
      code.match(/^\s*const\s+([A-Z]\w+)\s*=/m);
    return m ? m[1] : name;
  })();

  // Wrap so the runner-injected layout-data globals (`theme`, `members`,
  // `logo`, `socials`, `footerColumns`, `navItems`, `cta`, etc.) are passed
  // as props automatically. Components that destructure these from props
  // therefore Just Work, while components that only read them as globals
  // still see them via the runner scope.
  const wrapper = `

export default function FunnelBlockEntry(__fbProps) {
  return React.createElement(${innerName}, {
    theme: typeof theme !== 'undefined' ? theme : undefined,
    logo: typeof logo !== 'undefined' ? logo : null,
    brand: typeof brand !== 'undefined' ? brand : null,
    site: typeof site !== 'undefined' ? site : null,
    copyright: typeof copyright !== 'undefined' ? copyright : '',
    socials: typeof socials !== 'undefined' ? socials : [],
    footerColumns: typeof footerColumns !== 'undefined' ? footerColumns : [],
    navItems: typeof navItems !== 'undefined' ? navItems : [],
    navColumns: typeof navColumns !== 'undefined' ? navColumns : [],
    cta: typeof cta !== 'undefined' ? cta : null,
    legal: typeof legal !== 'undefined' ? legal : [],
    members: typeof members !== 'undefined' ? members : [],
    stats: typeof stats !== 'undefined' ? stats : [],
    features: typeof features !== 'undefined' ? features : [],
    testimonials: typeof testimonials !== 'undefined' ? testimonials : [],
    faqs: typeof faqs !== 'undefined' ? faqs : [],
    plans: typeof plans !== 'undefined' ? plans : [],
    ...(__fbProps || {}),
  });
}
`;
  return `${body.trim()}\n${wrapper}`;
}

function buildRows() {
  const files = fs
    .readdirSync(LIB_ROOT)
    .filter((f) => f.endsWith('.md'))
    .sort();
  const rows = [];
  for (const file of files) {
    const base = path.basename(file, '.md');
    const category = CATEGORY_BY_FILE[base] ?? 'unique';
    const md = readMd(path.join(LIB_ROOT, file));
    const sections = parseSections(md);
    for (const section of sections) {
      const tsx = extractTsxFromBody(section.body);
      if (!tsx) continue;
      const fallback = section.title.replace(/[^A-Za-z0-9]/g, '');
      const name = inferComponentName(tsx, fallback);
      const description = extractAnnotation(section.body, 'Description');
      const whenToUse = extractAnnotation(section.body, 'When to use');
      const doNot = extractAnnotation(section.body, 'Do not');
      const tsxWithDefault = ensureDefaultExport(tsx, name);
      const slug = slugify(`design-${base}-${section.number}-${section.title}`);

      rows.push({
        slug,
        name: section.title,
        description: description || whenToUse || `Curated ${base} block ${section.number}`,
        category,
        page_types: [],
        funnel_types: [],
        slot_schema: {},
        theme_tokens: ['colors', 'font_heading', 'font_body'],
        asset_slots: {},
        tsx_template: tsxWithDefault,
        default_props: {},
        layout_signature: 'designer',
        source_type: 'imported',
        source_reference: {
          file_path: `design-library/${file}`,
          section_number: section.number,
          section_title: section.title,
          when_to_use: whenToUse,
          do_not: doNot,
          description,
        },
      });
    }
  }
  return rows;
}

function main() {
  if (!fs.existsSync(LIB_ROOT)) throw new Error(`Missing design-library: ${LIB_ROOT}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rows = buildRows();
  const out = path.join(OUT_DIR, 'design-library-blocks.json');
  fs.writeFileSync(out, JSON.stringify(rows, null, 2));
  console.log(`extracted ${rows.length} blocks → ${out}`);
}

main();
