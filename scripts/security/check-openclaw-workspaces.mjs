#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const CONFIG_PATH = path.resolve(process.cwd(), 'docker/openclaw.json')
const TOKEN_ROOT = '${AGENTS_BASE_DIR}'
const PRODUCTION_ROOT = '/app/agents'

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  } catch (error) {
    throw new Error(
      `Cannot parse ${CONFIG_PATH}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

function isAllowedWorkspace(value) {
  return (
    value === TOKEN_ROOT ||
    value.startsWith(`${TOKEN_ROOT}/`) ||
    value === PRODUCTION_ROOT ||
    value.startsWith(`${PRODUCTION_ROOT}/`)
  )
}

function isAbsoluteWorkspace(value) {
  return value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value)
}

function collectWorkspaceEntries(config) {
  const entries = []
  const defaultsWorkspace = config?.agents?.defaults?.workspace
  if (typeof defaultsWorkspace === 'string') {
    entries.push({
      label: 'agents.defaults.workspace',
      value: defaultsWorkspace,
    })
  }

  const agents = config?.agents?.list
  if (Array.isArray(agents)) {
    agents.forEach((agent, index) => {
      if (typeof agent?.workspace !== 'string') return
      entries.push({
        label: `agents.list[${index}]${agent.id ? ` (${agent.id})` : ''}.workspace`,
        value: agent.workspace,
      })
    })
  }

  return entries
}

function validateWorkspaceEntry(entry) {
  const value = entry.value.trim()
  if (!value) return `${entry.label}: workspace is empty`
  if (isAllowedWorkspace(value)) return null
  if (value === '/Users' || value.startsWith('/Users/')) {
    return `${entry.label}: macOS host path is forbidden (${value})`
  }
  if (/^[A-Za-z]:[\\/]Users[\\/]/.test(value)) {
    return `${entry.label}: Windows host path is forbidden (${value})`
  }
  if (value === '/home' || value.startsWith('/home/')) {
    return `${entry.label}: Linux host home path is forbidden (${value})`
  }
  if (isAbsoluteWorkspace(value)) {
    return `${entry.label}: absolute workspace must stay under ${PRODUCTION_ROOT} (${value})`
  }
  return `${entry.label}: workspace must use ${TOKEN_ROOT}/... or ${PRODUCTION_ROOT}/... (${value})`
}

const config = readConfig()
const failures = collectWorkspaceEntries(config).map(validateWorkspaceEntry).filter(Boolean)

if (failures.length > 0) {
  console.error('[openclaw-workspace-guard] invalid workspace paths found:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('[openclaw-workspace-guard] ok')
