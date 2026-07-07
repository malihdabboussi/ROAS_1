#!/usr/bin/env node
/**
 * Static validator: mirrors the admin runner pipeline.
 *  1) read design-library-blocks.json
 *  2) for each block: transform TSX with esbuild (jsxFactory: React.createElement)
 *  3) try to evaluate the transformed code in a function with the same scope
 *     keys the admin runner exposes (React, motion, hooks, lucide stubs, THREE,
 *     PaperShaders stubs, theme, cn, etc.)
 *  4) report Reference/Syntax errors per block
 *
 * Catches:
 *  - ReferenceError: motion is not defined
 *  - ReferenceError: useState is not defined
 *  - SyntaxError from bad TSX
 *  - Top-level throws (not full render — JSX children are not evaluated)
 *
 * Usage:
 *   node product-video/scripts/validate-funnel-blocks.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const JSON_PATH = path.join(__dirname, '.out', 'design-library-blocks.json');

async function loadEsbuild() {
  // Use admin app's esbuild-wasm directly (it's a dep there).
  const adminNm = path.join(ROOT, 'apps/admin/node_modules/esbuild-wasm/lib/main.js');
  if (fs.existsSync(adminNm)) {
    return await import(adminNm);
  }
  // Fallback: any esbuild in node_modules.
  try {
    return await import('esbuild');
  } catch {}
  throw new Error('esbuild not available');
}

// Resolve every dep from the admin app's node_modules so we use the same
// versions that the runner uses at runtime.
const ADMIN_NM = path.join(ROOT, 'apps/admin/node_modules');

async function loadAdminPkg(name, subpath) {
  // Try the package's `main` from its own package.json so we honour exports.
  const pkgRoot = path.join(ADMIN_NM, name);
  const pkgJson = path.join(pkgRoot, 'package.json');
  if (!fs.existsSync(pkgJson)) return null;
  const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
  const candidates = [
    subpath ? path.join(pkgRoot, subpath) : null,
    pkg.module ? path.join(pkgRoot, pkg.module) : null,
    pkg.main ? path.join(pkgRoot, pkg.main) : null,
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        return await import(c);
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

async function loadReactScope() {
  const React = (await loadAdminPkg('react')) ?? (await import('react'));
  const FramerMotion = (await loadAdminPkg('framer-motion')) ?? {};
  return { React, FramerMotion };
}

async function loadLucideStubScope() {
  const Lucide = (await loadAdminPkg('lucide-react')) ?? {};
  return Lucide;
}

async function loadShadersScope() {
  const Shaders = (await loadAdminPkg('@paper-design/shaders-react')) ?? {};
  return Shaders;
}

async function loadThreeScope() {
  const THREE = (await loadAdminPkg('three')) ?? null;
  return THREE;
}

const DEFAULT_THEME = {
  bg: '#0a0a0f',
  surface: '#13131a',
  text: '#f5f5f7',
  textMuted: 'rgba(245,245,247,0.65)',
  primary: '#7c5cff',
  secondary: '#22d3ee',
  accent: '#facc15',
  border: 'rgba(255,255,255,0.10)',
};

function cn(...args) {
  const out = [];
  for (const a of args) {
    if (!a) continue;
    if (typeof a === 'string') out.push(a);
    else if (Array.isArray(a)) out.push(cn(...a));
    else if (typeof a === 'object') for (const [k, v] of Object.entries(a)) if (v) out.push(k);
  }
  return out.join(' ');
}

function buildScope({ React, FramerMotion, Lucide, Shaders, THREE }) {
  const scope = {
    React,
    THREE,
    cn,
    theme: DEFAULT_THEME,
    logo: null,
    brand: null,
    site: null,
    copyright: '© 2026',
    socials: [],
    footerColumns: [],
    navItems: [],
    navColumns: [],
    cta: null,
    legal: [],
    render: (el) => el,
    import: new Proxy(
      {
        react: React,
        React,
        'framer-motion': FramerMotion,
        'lucide-react': Lucide,
        '@paper-design/shaders-react': Shaders,
        three: THREE,
      },
      {
        get(t, p) {
          if (typeof p === 'symbol') return undefined;
          const k = String(p);
          if (k in t) return t[k];
          // Unknown module proxy:
          return new Proxy({ __esModule: true, default: () => null }, {
            get(_t, prop) {
              if (prop === '__esModule') return true;
              if (prop === 'default') return () => null;
              const name = String(prop);
              if (/^use[A-Z]/.test(name)) return () => undefined;
              return () => null;
            },
          });
        },
        has() {
          return true;
        },
      },
    ),
  };
  // Spread library namespaces (matches admin runner)
  for (const ns of [React, FramerMotion, Lucide, Shaders]) {
    if (!ns) continue;
    for (const k of Object.keys(ns)) if (!(k in scope)) scope[k] = ns[k];
  }
  return scope;
}

function transformedToCallable(transformedCode) {
  // Strip ALL ESM `import ...` (single or multi-line) — vm.Script can't parse them.
  let code = transformedCode.replace(
    /^[ \t]*import\b[\s\S]*?["'][^"']+["'][ \t]*;?[ \t]*$/gm,
    '',
  );

  let defaultIdent = null;

  // Case 1: `export default function NAME(...) { ... }` → keep as `function NAME(...)`,
  // capture NAME for return at end.
  code = code.replace(
    /^[ \t]*export\s+default\s+function\s+([A-Za-z_$][\w$]*)/m,
    (_m, name) => {
      defaultIdent = name;
      return `function ${name}`;
    },
  );

  // Case 2: `export default function (...) { ... }` (anonymous) → wrap to capture.
  code = code.replace(
    /^[ \t]*export\s+default\s+function\s*\(/m,
    () => {
      defaultIdent = '__fb_default_anon__';
      return `const __fb_default_anon__ = function (`;
    },
  );

  // Case 3: `export default <ident-or-expr>;` on one line.
  code = code.replace(/^[ \t]*export\s+default\s+([^;\n]+);?\s*$/gm, (_m, expr) => {
    if (defaultIdent == null) defaultIdent = expr.trim();
    return '';
  });

  // Strip remaining `export ` keywords (named exports stay as declarations).
  code = code.replace(/^[ \t]*export\s+/gm, '');

  if (defaultIdent) {
    code = `${code}\nreturn ${defaultIdent};\n`;
  }
  return code;
}

async function main() {
  const esbuild = await loadEsbuild();
  const { React, FramerMotion } = await loadReactScope();
  const Lucide = await loadLucideStubScope();
  const Shaders = await loadShadersScope();
  const THREE = await loadThreeScope();

  const rows = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const scope = buildScope({ React, FramerMotion, Lucide, Shaders, THREE });
  const RESERVED = new Set([
    'import', 'export', 'default', 'await', 'yield', 'this', 'arguments',
    'super', 'new', 'delete', 'void', 'typeof', 'instanceof', 'in', 'of',
    'class', 'function', 'return', 'if', 'else', 'switch', 'case', 'break',
    'continue', 'throw', 'try', 'catch', 'finally', 'do', 'while', 'for',
    'with', 'debugger', 'true', 'false', 'null', 'undefined', 'var', 'let',
    'const', 'enum', 'extends', 'implements', 'interface', 'package',
    'private', 'protected', 'public', 'static', 'eval',
  ]);
  const ident = /^[A-Za-z_$][\w$]*$/;
  const scopeKeys = Object.keys(scope).filter((k) => ident.test(k) && !RESERVED.has(k));
  const scopeValues = scopeKeys.map((k) => scope[k]);

  let ok = 0;
  const failures = [];
  for (const row of rows) {
    let transformed;
    try {
      const t = await esbuild.transform(row.tsx_template, {
        loader: 'tsx',
        jsx: 'transform',
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment',
        target: 'es2020',
      });
      transformed = t.code;
    } catch (err) {
      failures.push({ slug: row.slug, stage: 'transform', message: err.message });
      continue;
    }

    const body = transformedToCallable(transformed);
    try {
      const fn = new vm.Script(`(function(${scopeKeys.join(',')}){\n${body}\n})`);
      const wrapper = fn.runInThisContext();
      const Component = wrapper(...scopeValues);
      // Optionally try to call the component to find runtime ReferenceErrors
      // inside it — but skip JSX render since no DOM.
      if (typeof Component === 'function') {
        try {
          Component({ theme: DEFAULT_THEME });
        } catch (err) {
          const msg = err.message || String(err);
          // Filter validator artifacts: React hooks need a renderer; calling
          // component functions outside a React tree always fails on hook calls.
          // Those are not real bugs in the block.
          const isHookArtifact =
            /Cannot read properties of null \(reading 'use[A-Z]/i.test(msg) ||
            /Invalid hook call/i.test(msg) ||
            /Cannot read properties of undefined \(reading '0'\)/i.test(msg);
          if (!isHookArtifact) {
            failures.push({ slug: row.slug, stage: 'render', message: msg });
            continue;
          }
        }
      }
      ok++;
    } catch (err) {
      failures.push({ slug: row.slug, stage: 'eval', message: err.message });
    }
  }

  console.log(`\n=== validation ===`);
  console.log(`ok:       ${ok} / ${rows.length}`);
  console.log(`failed:   ${failures.length}`);
  for (const f of failures) {
    console.log(`  - [${f.stage}] ${f.slug}: ${f.message}`);
  }
  if (failures.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
