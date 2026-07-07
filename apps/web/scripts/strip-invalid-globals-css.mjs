/**
 * Removes accidental JS template literals pasted into globals.css
 * (e.g. var(--icon-color-${iconColorId})), which break the CSS parser.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const target = path.join(__dirname, '..', 'src', 'app', 'globals.css')

let text = fs.readFileSync(target, 'utf8')
const original = text

const lines = text.split(/\n/)
const out = []
let i = 0
while (i < lines.length) {
  const line = lines[i]
  if (line.includes('${iconColorId}')) {
    while (i < lines.length && lines[i].trim() !== '}') i += 1
    i += 1
    continue
  }
  out.push(line)
  i += 1
}
text = out.join('\n')

if (text !== original) {
  fs.writeFileSync(target, text, 'utf8')
  process.stdout.write(`strip-invalid-globals-css: removed invalid rule(s) from ${target}\n`)
} else {
  process.stdout.write(`strip-invalid-globals-css: nothing to remove in ${target}\n`)
}
