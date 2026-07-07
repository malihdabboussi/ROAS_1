#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

function usage() {
  return [
    'Usage:',
    '  node scripts/arch/http-contract-harness.mjs --base-url <url> --requests <file> --out <file>',
    '',
    'Request file shape:',
    '  { "requests": [{ "name": "status", "method": "GET", "path": "/api/health" }] }',
  ].join('\n')
}

export function stableClone(value) {
  if (Array.isArray(value)) return value.map((item) => stableClone(item))
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableClone(value[key])]),
  )
}

export function stableSerialize(value) {
  return JSON.stringify(stableClone(value), null, 2)
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

function requestBody(body) {
  if (body === undefined) return undefined
  return typeof body === 'string' ? body : JSON.stringify(body)
}

function requestHeaders(headers, body) {
  const out = { ...(headers ?? {}) }
  if (body !== undefined && !Object.keys(out).some((key) => key.toLowerCase() === 'content-type')) {
    out['Content-Type'] = 'application/json'
  }
  return out
}

async function parseResponseBody(response) {
  const text = await response.text()
  if (!text) return null
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
  return text
}

function normalizedBaseUrl(baseUrl) {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

function normalizedPath(path) {
  return path.startsWith('/') ? path : `/${path}`
}

export async function captureHttpContract(baseUrl, requestSpec) {
  const body = requestBody(requestSpec.body)
  const response = await fetch(`${normalizedBaseUrl(baseUrl)}${normalizedPath(requestSpec.path)}`, {
    method: requestSpec.method ?? 'GET',
    headers: requestHeaders(requestSpec.headers, body),
    body,
  })

  return {
    name: requestSpec.name ?? `${requestSpec.method ?? 'GET'} ${requestSpec.path}`,
    request: {
      method: requestSpec.method ?? 'GET',
      path: normalizedPath(requestSpec.path),
    },
    response: {
      status: response.status,
      body: await parseResponseBody(response),
    },
  }
}

function pathSegments(path) {
  return path
    .replace(/^\$\.?/, '')
    .split('.')
    .filter(Boolean)
}

function deleteJsonPath(target, path) {
  const segments = pathSegments(path)
  if (segments.length === 0) return

  let cursor = target
  for (const segment of segments.slice(0, -1)) {
    if (cursor === null || typeof cursor !== 'object') return
    cursor = cursor[segment]
  }

  if (cursor && typeof cursor === 'object') {
    delete cursor[segments[segments.length - 1]]
  }
}

export function normalizeContractRecord(record, normalizers = {}) {
  const clone = stableClone(record)
  for (const path of normalizers.ignoreJsonPaths ?? []) {
    deleteJsonPath(clone, path)
  }
  return clone
}

export async function captureHttpContracts(baseUrl, contractSpec) {
  const requests = Array.isArray(contractSpec) ? contractSpec : contractSpec.requests
  const records = []
  for (const requestSpec of requests ?? []) {
    records.push(captureHttpContract(baseUrl, requestSpec))
  }
  return Promise.all(records)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args['base-url'] || !args.requests || !args.out) {
    console.error(usage())
    process.exit(2)
  }

  const contractSpec = readJson(args.requests)
  const records = await captureHttpContracts(args['base-url'], contractSpec)
  writeFileSync(args.out, `${stableSerialize(records)}\n`)
  console.log(
    `Wrote ${args.out} (${records.length} contract record${records.length === 1 ? '' : 's'})`,
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error?.stack ?? error)
    process.exit(1)
  })
}
