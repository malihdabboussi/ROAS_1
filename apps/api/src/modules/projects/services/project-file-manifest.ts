export function parseDependencies(packageJsonContent: string): Record<string, string> {
  if (!packageJsonContent) return {}
  try {
    const parsed = JSON.parse(packageJsonContent) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    return {
      ...(parsed.dependencies ?? {}),
      ...(parsed.devDependencies ?? {}),
    }
  } catch {
    return {}
  }
}

export function normalizeRelativePath(path: string): string {
  const normalized = path.replace(/^\/+/, '').replace(/\\/g, '/').trim()
  if (!normalized) throw new Error('invalid_file_path')
  if (normalized.includes('..')) throw new Error('invalid_file_path')
  return normalized
}

export function getManifestFiles(manifest: Record<string, unknown>): string[] {
  if (!manifest || typeof manifest !== 'object') return []
  const files = manifest.files
  if (!Array.isArray(files)) return []
  return files
    .map((entry) => String(entry ?? '').trim())
    .filter((entry) => entry.length > 0)
    .sort((a, b) => a.localeCompare(b))
}

export function withManifestFile(
  manifest: Record<string, unknown>,
  filePath: string,
  include: boolean,
): Record<string, unknown> {
  const set = new Set(getManifestFiles(manifest))
  if (include) set.add(filePath)
  else set.delete(filePath)
  return { ...(manifest ?? {}), files: Array.from(set).sort((a, b) => a.localeCompare(b)) }
}

export function detectContentType(path: string): string {
  if (path.endsWith('.json')) return 'application/json'
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return 'text/yaml'
  if (path.endsWith('.ts')) return 'text/typescript'
  if (path.endsWith('.tsx')) return 'text/tsx'
  if (path.endsWith('.mjs')) return 'text/javascript'
  if (path.endsWith('.js')) return 'text/javascript'
  if (path.endsWith('.jsx')) return 'text/jsx'
  if (path.endsWith('.css')) return 'text/css'
  if (path.endsWith('.html')) return 'text/html'
  if (path.endsWith('.md')) return 'text/markdown'
  return 'text/plain'
}
