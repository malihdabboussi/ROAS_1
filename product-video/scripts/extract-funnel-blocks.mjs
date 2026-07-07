#!/usr/bin/env node
/**
 * Bootstraps draft funnel_blocks rows from the existing funnel-builder
 * reference examples. The output is intentionally draft-quality: designers
 * review each block in the admin UI before publishing it to agents.
 *
 * Outputs:
 *   product-video/scripts/.out/funnel-blocks.json
 *   product-video/scripts/.out/funnel-blocks-sql-XX.sql
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const EXAMPLES_ROOT = path.join(
  ROOT,
  'docker/agents/vibey/skills/funnel-builder/references/examples',
);
const OUT_DIR = path.join(__dirname, '.out');
const BATCH_BYTES = 80 * 1024;

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readMarkdownFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) readMarkdownFiles(abs, out);
    if (entry.isFile() && entry.name.endsWith('.md')) out.push(abs);
  }
  return out.sort();
}

function parseFrontmatter(md) {
  if (!md.trimStart().startsWith('---')) return {};
  const end = md.indexOf('\n---', 3);
  if (end === -1) return {};
  const block = md.slice(3, end).trim();
  const meta = {};
  for (const line of block.split('\n')) {
    const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    value = value.replace(/^["']|["']$/g, '');
    meta[key] = value;
  }
  return meta;
}

function extractCodeBlocks(md) {
  const lines = md.split('\n');
  const blocks = [];
  let heading = '';
  let inFence = false;
  let fenceLang = '';
  let buf = [];

  const openFence = /^\s*```([a-zA-Z0-9_+-]+)\s*$/;
  const closeFence = /^\s*```\s*$/;

  for (const line of lines) {
    const headingMatch = line.match(/^##+\s+(.+)$/);
    if (!inFence && headingMatch) heading = headingMatch[1].trim();

    if (!inFence) {
      const m = line.match(openFence);
      if (m) {
        inFence = true;
        fenceLang = m[1].toLowerCase();
        buf = [];
        continue;
      }
    } else {
      if (closeFence.test(line)) {
        if (fenceLang === 'tsx' || fenceLang === 'jsx') {
          blocks.push({ heading, code: buf.join('\n').trim() });
        }
        inFence = false;
        fenceLang = '';
        buf = [];
        continue;
      }
      buf.push(line);
    }
  }

  return blocks;
}

function componentName(heading, code, fileBasename) {
  const fromHeadingRaw = heading
    .replace(/^[#\s]+/, '')
    .replace(/\.(tsx|jsx)$/i, '')
    .trim();
  const fromHeading = fromHeadingRaw
    .replace(/^Entry\s+File\s*[—\-:]\s*/i, '')
    .replace(/^Entry\s+File$/i, '')
    .trim();

  const defaultExport = code.match(/export\s+default\s+(?:function\s+)?([A-Z]\w+)/);
  if (defaultExport && defaultExport[1].toLowerCase() !== 'index') return defaultExport[1];

  if (fromHeading && !/^index$/i.test(fromHeading)) return fromHeading;

  const fn = code.match(/function\s+([A-Z]\w+)\s*\(/);
  if (fn && fn[1].toLowerCase() !== 'index') return fn[1];

  const c = code.match(/(?:const|let|var)\s+([A-Z]\w+)\s*=/);
  if (c && c[1].toLowerCase() !== 'index') return c[1];

  if (defaultExport) return defaultExport[1];
  if (fromHeading) return fromHeading;
  if (fileBasename) {
    return fileBasename
      .split(/[-_]/)
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join('');
  }
  return 'Block';
}

function inferCategory(name, code) {
  const hay = `${name}\n${code}`.toLowerCase();
  if (hay.includes('hero')) return 'hero';
  if (hay.includes('nav') || hay.includes('header')) return 'navigation';
  if (hay.includes('footer')) return 'footer';
  if (hay.includes('faq')) return 'faq';
  if (/\b(price|pricing|ticket|tickets|checkout|cart)\b/.test(hay)) return 'pricing';
  if (hay.includes('testimonial') || hay.includes('proof') || hay.includes('review')) return 'social-proof';
  if (hay.includes('countdown') || hay.includes('urgency') || hay.includes('scarcity')) return 'urgency';
  if (/\b(form|registration|application|input)\b/.test(hay)) return 'form';
  if (/\b(cta|callbooking|booking|book-call|book)\b/.test(hay)) return 'cta';
  if (hay.includes('benefit')) return 'benefits';
  if (hay.includes('feature') || hay.includes('learn') || hay.includes('inside')) return 'features';
  if (hay.includes('stat') || hay.includes('metric')) return 'stats';
  if (hay.includes('team') || hay.includes('host') || hay.includes('speaker')) return 'team';
  if (hay.includes('gallery') || hay.includes('image') || hay.includes('photo')) return 'gallery';
  if (hay.includes('video') || hay.includes('vsl') || hay.includes('replay')) return 'video';
  return 'unique';
}

function inferLayoutSignature(code) {
  const hay = code.toLowerCase();
  if (hay.includes('grid-cols-3') || hay.includes('md:grid-cols-3')) return 'grid-3';
  if (hay.includes('grid-cols-2') || hay.includes('md:grid-cols-2') || hay.includes('lg:grid-cols-2')) return 'split-2';
  if (hay.includes('grid-cols-4') || hay.includes('md:grid-cols-4')) return 'grid-4';
  if (hay.includes('text-center')) return 'centered-stack';
  if (hay.includes('fixed') && hay.includes('bottom')) return 'sticky-bar';
  if (hay.includes('modal') || hay.includes('popup') || hay.includes('dialog')) return 'modal';
  if (hay.includes('<form') || hay.includes('input')) return 'form-panel';
  return 'section';
}

function normalizePageTypes(meta, relPath) {
  const values = new Set();
  const raw = [meta.page_type, meta.category, relPath.split(path.sep)[0]].filter(Boolean);
  for (const v of raw) {
    const normalized = v.toLowerCase().replace(/_/g, '-');
    values.add(normalized);
    if (normalized.includes('optin') || normalized.includes('opt-in')) values.add('opt-in');
    if (normalized.includes('confirmation') || normalized.includes('thank')) values.add('thank-you');
    if (normalized.includes('replay')) values.add('replay');
    if (normalized.includes('cart') || normalized.includes('checkout')) values.add('checkout');
    if (normalized.includes('application')) values.add('application');
    if (normalized.includes('booking')) values.add('call-booking');
    if (normalized.includes('home')) values.add('home');
    if (normalized.includes('event')) values.add('landing');
  }
  return Array.from(values).filter(Boolean);
}

function extractDefaultProps(code) {
  const heading =
    code.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ??
    code.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ??
    '';
  const paragraphs = Array.from(code.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((m) => cleanText(m[1]));
  const buttons = Array.from(code.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi)).map((m) =>
    cleanText(m[1]),
  );
  const images = Array.from(code.matchAll(/src=["']([^"']+)["']/g)).map((m) => m[1]);
  const bullets = Array.from(code.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map((m) => cleanText(m[1]))
    .filter(Boolean)
    .slice(0, 6);

  return {
    headline: cleanText(heading) || 'Replace this headline',
    subheadline: paragraphs.find(Boolean) || '',
    cta_label: buttons.find(Boolean) || '',
    bullets,
    image_url: images.find((src) => !src.includes('placeholder')) || '',
  };
}

function cleanText(input) {
  return input
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[^}]+\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferSlotSchema(defaultProps) {
  const schema = {
    headline: { type: 'string', max: 90, required: true },
    subheadline: { type: 'string', max: 220, required: false },
    cta_label: { type: 'string', max: 32, required: false },
  };
  if (defaultProps.bullets.length > 0) {
    schema.bullets = { type: 'array', of: 'string', min: 0, max: 6, item_max: 90 };
  }
  if (defaultProps.image_url) {
    schema.image_url = { type: 'asset', role: 'section', aspect: '16:9', required: false };
  }
  return schema;
}

function shouldKeepBlock(name, code) {
  const lower = name.toLowerCase();
  if (lower.includes('ui/')) return false;
  if (!/(return\s*\(|<\w)/.test(code)) return false;
  if (code.length < 200) return false;
  return true;
}

const PLACEHOLDER_IMG = 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset';
const PLACEHOLDER_SQUARE = 'https://placehold.co/600x600/0f1116/9ca3af?text=Asset';

const SHADCN_SHIM = `// __FB_SHIM_START__
const __fbButton = (p) => React.createElement('button', { ...p, className: ['fb-shadcn-btn', p?.className].filter(Boolean).join(' ') }, p?.children);
const __fbDiv = (tag) => (p) => React.createElement(tag, p, p?.children);
const Button = __fbButton;
const Card = __fbDiv('div');
const CardHeader = __fbDiv('div');
const CardTitle = __fbDiv('div');
const CardContent = __fbDiv('div');
const CardFooter = __fbDiv('div');
const CardDescription = __fbDiv('div');
const Badge = (p) => React.createElement('span', { ...p, className: ['fb-shadcn-badge', p?.className].filter(Boolean).join(' ') }, p?.children);
const Input = (p) => React.createElement('input', p);
const Label = (p) => React.createElement('label', p, p?.children);
const Textarea = (p) => React.createElement('textarea', p);
const Separator = (p) => React.createElement('hr', p);
const Progress = (p) => React.createElement('div', { ...p, className: ['fb-shadcn-progress', p?.className].filter(Boolean).join(' ') }, React.createElement('div', { style: { width: ((p?.value ?? 0) + '%'), height: '100%', background: 'currentColor' } }));
const Switch = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Checkbox = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Avatar = __fbDiv('div');
const AvatarImage = (p) => React.createElement('img', p);
const AvatarFallback = __fbDiv('span');
const Accordion = __fbDiv('div');
const AccordionItem = __fbDiv('div');
const AccordionTrigger = (p) => React.createElement('button', p, p?.children);
const AccordionContent = __fbDiv('div');
const RadioGroup = (p) => React.createElement('div', { ...p, role: 'radiogroup' }, p?.children);
const RadioGroupItem = (p) => React.createElement('input', { ...p, type: 'radio' });
const Select = __fbDiv('div');
const SelectTrigger = (p) => React.createElement('button', p, p?.children);
const SelectValue = __fbDiv('span');
const SelectContent = __fbDiv('div');
const SelectItem = __fbDiv('div');
const Tabs = __fbDiv('div');
const TabsList = __fbDiv('div');
const TabsTrigger = (p) => React.createElement('button', p, p?.children);
const TabsContent = __fbDiv('div');
const Dialog = __fbDiv('div');
const DialogTrigger = (p) => React.createElement('button', p, p?.children);
const DialogContent = __fbDiv('div');
const DialogHeader = __fbDiv('div');
const DialogTitle = __fbDiv('div');
const DialogDescription = __fbDiv('div');
const Sheet = __fbDiv('div');
const SheetTrigger = (p) => React.createElement('button', p, p?.children);
const SheetContent = __fbDiv('div');
const Popover = __fbDiv('div');
const PopoverTrigger = (p) => React.createElement('button', p, p?.children);
const PopoverContent = __fbDiv('div');
const Tooltip = __fbDiv('div');
const TooltipTrigger = (p) => React.createElement('span', p, p?.children);
const TooltipContent = __fbDiv('div');
const TooltipProvider = (p) => p?.children ?? null;
const ScrollArea = __fbDiv('div');
const useNavigate = () => () => {};
const Link = (p) => React.createElement('a', { ...p, href: p?.to ?? p?.href }, p?.children);
const NavLink = Link;
const useLocation = () => ({ pathname: '/' });
const useParams = () => ({});
const useSearchParams = () => [new URLSearchParams(), () => {}];
const useCountdown = () => ({ days: 0, hours: 0, minutes: 0, seconds: 0 });
const useToast = () => ({ toast: () => {} });
const useCart = () => ({ addItem: () => {}, removeItem: () => {}, items: [] });
const cn = (...args) => args.filter(Boolean).flat(Infinity).filter((v) => typeof v === 'string').join(' ');
const confetti = () => {};
const __FB_PLACEHOLDER_IMG = '${PLACEHOLDER_IMG}';
// __FB_SHIM_END__
`;

// Matches both single-line and multi-line imports (and bare side-effect imports):
//   import X from "spec";
//   import { A, B } from "spec";
//   import { A,\n  B,\n} from "spec";
//   import * as N from "spec";
//   import "spec";
const STRIP_IMPORT_RE = /^[ \t]*import\b[\s\S]*?["']([^"']+)["'][ \t]*;?[ \t]*$/gm;

function isStrippable(spec) {
  if (spec.startsWith('@/')) return true;
  if (spec === 'react-router-dom' || spec === 'react-router') return true;
  if (spec === 'canvas-confetti') return true;
  if (spec.startsWith('react-icons/')) return true;
  if (spec.startsWith('next/')) return true;
  if (/\.(png|jpe?g|gif|svg|webp|avif|mp4|mov|css|scss)(\?.*)?$/i.test(spec)) return true;
  return false;
}

function collectAssetIdentifiers(code) {
  // Find: import xxx from "@/assets/foo.png" or import * as foo from "..."
  const ids = new Set();
  const reDefault = /^[ \t]*import\s+([A-Za-z_$][\w$]*)\s+from\s+["'][^"']*\.(?:png|jpe?g|gif|svg|webp|avif|mp4|mov)["'][ \t]*;?[ \t]*$/gm;
  for (const m of code.matchAll(reDefault)) ids.add(m[1]);
  return ids;
}

function replaceAssetIdentifierUsage(code, ids) {
  if (ids.size === 0) return code;
  let next = code;
  for (const id of ids) {
    // Replace bare identifier usage like {productCombo}, src={productCombo}
    const re = new RegExp(`\\b${id}\\b`, 'g');
    next = next.replace(re, `'${PLACEHOLDER_IMG}'`);
  }
  return next;
}

function replaceUnknownComponentImports(code) {
  // Drop "import { Foo, Bar } from '@/components/<custom>'" — the JSX usages
  // will resolve to undefined; we can't safely stub all custom components, so
  // we make any unknown PascalCase JSX tag a no-op by injecting a Proxy default.
  return code;
}

function normalizeTsx(rawCode) {
  let code = rawCode;
  // Strip an accidentally captured trailing ``` followed by the next markdown heading
  code = code.replace(/\n?```\s*\n##[\s\S]*$/, '\n');
  code = code.replace(/\n?```\s*$/, '\n');

  // Capture asset identifiers BEFORE stripping their imports
  const assetIds = collectAssetIdentifiers(code);

  // Strip strippable imports
  code = code.replace(STRIP_IMPORT_RE, (line, spec) => (isStrippable(spec) ? '' : line));

  // Replace asset identifier usages with placeholder URL
  code = replaceAssetIdentifierUsage(code, assetIds);

  // Drop "use client" / "use server" directives
  code = code.replace(/^\s*['"]use (client|server)['"]\s*;?\s*$/gm, '');

  // Strip unknown custom component imports (handled above)
  code = replaceUnknownComponentImports(code);

  // Prepend shim so referenced names resolve
  code = `${SHADCN_SHIM}\n${code.trim()}\n`;

  return code;
}

function buildRows() {
  const rows = [];
  const files = readMarkdownFiles(EXAMPLES_ROOT);
  for (const file of files) {
    const md = fs.readFileSync(file, 'utf8');
    const meta = parseFrontmatter(md);
    const rel = path.relative(EXAMPLES_ROOT, file);
    const funnelType = rel.split(path.sep)[0];
    const pageTypes = normalizePageTypes(meta, rel);

    const fileBase = path.basename(file, '.md');
    for (const block of extractCodeBlocks(md)) {
      const name = componentName(block.heading, block.code, fileBase);
      if (!shouldKeepBlock(name, block.code)) continue;
      const category = inferCategory(name, block.code);
      const defaultProps = extractDefaultProps(block.code);
      const sourceSlug = slugify(`${funnelType}-${fileBase}-${name}`);
      const tsxTemplate = normalizeTsx(block.code);

      rows.push({
        slug: sourceSlug,
        name,
        description: `${meta.company || meta.name || funnelType} ${name} extracted from ${rel}`,
        category,
        page_types: pageTypes,
        funnel_types: [funnelType],
        slot_schema: inferSlotSchema(defaultProps),
        theme_tokens: ['colors', 'font_heading', 'font_body'],
        asset_slots: defaultProps.image_url
          ? { image_url: { role: 'section', aspect: '16:9', required: false } }
          : {},
        tsx_template: tsxTemplate,
        default_props: defaultProps,
        layout_signature: inferLayoutSignature(block.code),
        source_type: 'extracted',
        source_reference: {
          file_path: rel,
          heading: block.heading,
          page_name: meta.name || null,
          company: meta.company || null,
        },
      });
    }
  }
  return rows.sort((a, b) => a.slug.localeCompare(b.slug));
}

function dollar(value, rowIndex, key) {
  let tag = `$fb_${rowIndex}_${key}$`;
  while (String(value).includes(tag)) tag = `$fb_${rowIndex}_${key}_x$`;
  return `${tag}${value}${tag}`;
}

function sqlArray(values, rowIndex, key) {
  if (!values.length) return `ARRAY[]::text[]`;
  return `ARRAY[${values.map((value, i) => dollar(value, rowIndex, `${key}_${i}`)).join(', ')}]::text[]`;
}

function jsonb(value, rowIndex, key) {
  return `${dollar(JSON.stringify(value), rowIndex, key)}::jsonb`;
}

function rowSql(row, rowIndex) {
  const values = [
    dollar(row.slug, rowIndex, 'slug'),
    dollar(row.name, rowIndex, 'name'),
    dollar(row.description, rowIndex, 'description'),
    dollar(row.category, rowIndex, 'category'),
    sqlArray(row.page_types, rowIndex, 'page_types'),
    sqlArray(row.funnel_types, rowIndex, 'funnel_types'),
    jsonb(row.slot_schema, rowIndex, 'slot_schema'),
    sqlArray(row.theme_tokens, rowIndex, 'theme_tokens'),
    jsonb(row.asset_slots, rowIndex, 'asset_slots'),
    dollar(row.tsx_template, rowIndex, 'tsx'),
    jsonb(row.default_props, rowIndex, 'default_props'),
    dollar(row.layout_signature, rowIndex, 'layout_signature'),
    dollar(row.source_type, rowIndex, 'source_type'),
    jsonb(row.source_reference, rowIndex, 'source_reference'),
  ];

  return `INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  ${values.join(',\n  ')},\n  true, 'draft', false\n) ON CONFLICT DO NOTHING;\n`;
}

function writeSql(rows) {
  let batch = '';
  let batchIndex = 0;
  const flush = () => {
    if (!batch) return;
    const file = path.join(OUT_DIR, `funnel-blocks-sql-${String(batchIndex).padStart(2, '0')}.sql`);
    fs.writeFileSync(file, batch);
    console.log(`wrote ${file} (${batch.length} bytes)`);
    batch = '';
    batchIndex += 1;
  };

  for (let i = 0; i < rows.length; i += 1) {
    const sql = rowSql(rows[i], i);
    if (batch && batch.length + sql.length > BATCH_BYTES) flush();
    batch += sql;
  }
  flush();
  return batchIndex;
}

function main() {
  if (!fs.existsSync(EXAMPLES_ROOT)) {
    throw new Error(`Missing examples root: ${EXAMPLES_ROOT}`);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rows = buildRows();
  const jsonPath = path.join(OUT_DIR, 'funnel-blocks.json');
  fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2));
  const sqlFiles = writeSql(rows);
  console.log(`done: ${rows.length} draft blocks across ${sqlFiles} SQL batch files`);
}

main();
