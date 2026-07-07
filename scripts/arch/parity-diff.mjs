#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import {
  captureHttpContracts,
  normalizeContractRecord,
  stableSerialize,
} from './http-contract-harness.mjs'

function usage() {
  return [
    'Usage:',
    '  node scripts/arch/parity-diff.mjs --before-url <url> --after-url <url> --requests <file>',
    '',
    'Compares recorded HTTP contract responses from two app versions.',
    'The request file may include { "requests": [...], "normalizers": { "ignoreJsonPaths": [...] } }.',
  ].join('\n')
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function parseArgs(argv) {
  const parsed = {}
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    parsed[key.slice(2)] = argv[i + 1]
    i += 1
  }
  return parsed
}

function recordKey(record) {
  return `${record.request.method} ${record.request.path}`
}

export function compareCapturedContracts(beforeRecords, afterRecords, normalizers = {}) {
  const beforeByKey = new Map(beforeRecords.map((record) => [recordKey(record), record]))
  const afterByKey = new Map(afterRecords.map((record) => [recordKey(record), record]))
  const allKeys = Array.from(new Set([...beforeByKey.keys(), ...afterByKey.keys()])).sort()
  const diffs = []

  for (const key of allKeys) {
    const before = beforeByKey.get(key)
    const after = afterByKey.get(key)
    if (!before) {
      diffs.push({ key, reason: 'missing-before' })
      continue
    }
    if (!after) {
      diffs.push({ key, reason: 'missing-after' })
      continue
    }

    const normalizedBefore = normalizeContractRecord(before, normalizers)
    const normalizedAfter = normalizeContractRecord(after, normalizers)
    const beforeText = stableSerialize(normalizedBefore)
    const afterText = stableSerialize(normalizedAfter)
    if (beforeText !== afterText) {
      diffs.push({
        key,
        reason: 'response-delta',
        before: normalizedBefore,
        after: normalizedAfter,
      })
    }
  }

  return diffs
}

export async function runParityDiff(options) {
  const contractSpec = readJson(options.requestsPath)
  const normalizers = options.normalizers ?? contractSpec.normalizers ?? {}
  const beforeRecords = await captureHttpContracts(options.beforeUrl, contractSpec)
  const afterRecords = await captureHttpContracts(options.afterUrl, contractSpec)
  return compareCapturedContracts(beforeRecords, afterRecords, normalizers)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args['before-url'] || !args['after-url'] || !args.requests) {
    console.error(usage())
    process.exit(2)
  }

  const diffs = await runParityDiff({
    beforeUrl: args['before-url'],
    afterUrl: args['after-url'],
    requestsPath: args.requests,
  })

  if (diffs.length > 0) {
    console.error('Parity diff failed:')
    for (const diff of diffs) {
      console.error(`- ${diff.key}: ${diff.reason}`)
    }
    process.exit(1)
  }

  console.log('Parity diff passed')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error?.stack ?? error)
    process.exit(1)
  })
}
