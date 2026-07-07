#!/usr/bin/env node
/**
 * Reads the type6 payload JSON and emits SQL files in batches for
 * execute_sql calls. Uses dollar-quoted string literals with unique tags.
 *
 * Output files: scripts/.out/type6-sql-<n>.sql
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.join(__dirname, '.out');

const rows = JSON.parse(fs.readFileSync(path.join(outDir, 'type6-resources.json'), 'utf8'));

const BATCH_BYTES = 80 * 1024; // 80KB per SQL call (fits MCP input limits)

function dollarTag(i, kind) {
  return `$body_${kind}_${i}$`;
}

function literal(s, i, kind) {
  let tag = dollarTag(i, kind);
  let raw = `${tag}...${tag}`;
  // Ensure tag is not present in the string (extremely unlikely but be safe).
  while (s.includes(tag)) {
    tag = `$body_${kind}_${i}_x$`;
  }
  return `${tag}${s}${tag}`;
}

function rowSql(row, i) {
  const fp = literal(row.file_path, i, 'fp');
  const ct = literal(row.content_type, i, 'ct');
  const c = literal(row.content, i, 'c');
  return (
    `INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) ` +
    `VALUES ('carousel-designer', ${fp}, ${c}, ${ct}, now()) ` +
    `ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;\n`
  );
}

let batch = '';
let batchIdx = 0;
function flush() {
  if (!batch) return;
  const filePath = path.join(outDir, `type6-sql-${String(batchIdx).padStart(2, '0')}.sql`);
  fs.writeFileSync(filePath, batch);
  console.log(`wrote ${filePath} (${batch.length} bytes)`);
  batchIdx += 1;
  batch = '';
}

for (let i = 0; i < rows.length; i += 1) {
  const sql = rowSql(rows[i], i);
  if (batch.length + sql.length > BATCH_BYTES && batch) {
    flush();
  }
  batch += sql;
}
flush();

console.log(`done: ${rows.length} rows across ${batchIdx} files`);
