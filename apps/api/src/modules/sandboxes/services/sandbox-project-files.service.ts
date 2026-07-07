import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Sandbox } from 'modal'
import { ErrorReporter, getModalSandboxClient } from '@vibey/api-shared'
import { SandboxesRepository } from '../repositories/sandboxes.repository'

const SNAPSHOT_MAX_AGE_DAYS = 30
const HYDRATE_DEPS_PATH = /(^|\/)(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/i

@Injectable()
export class SandboxProjectFilesService {
  private readonly logger = new Logger(SandboxProjectFilesService.name)

  constructor(
    private readonly repository: SandboxesRepository,
    private readonly errorReporter: ErrorReporter,
  ) {}

  async restoreProjectFiles(
    sb: Sandbox,
    supabase: SupabaseClient,
    projectId: string,
    project: {
      modal_snapshot_id?: string | null
      modal_snapshot_created_at?: string | null
    } | null,
  ): Promise<{ touchedDeps: boolean }> {
    const modal = getModalSandboxClient()
    const templateImageId = process.env.MODAL_SPACES_PROJECT_TEMPLATE_IMAGE_ID?.trim()

    const snapshotId = project?.modal_snapshot_id
    const snapshotAt = project?.modal_snapshot_created_at
    let mountedFromSnapshot = false

    if (snapshotId && snapshotAt) {
      const age = Date.now() - new Date(snapshotAt).getTime()
      if (age < SNAPSHOT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000) {
        try {
          const snapshotImage = await modal.images.fromId(snapshotId)
          await sb.mountImage('/project', snapshotImage)
          mountedFromSnapshot = true
          this.logger.log(
            `Restored snapshot for project ${projectId} (age: ${Math.round(age / 86400000)}d)`,
          )
        } catch (err) {
          if (err instanceof Error && err.name === 'NotFoundError') {
            this.logger.warn(
              `Snapshot ${snapshotId} missing for project ${projectId}, falling back to template/Storage`,
            )
          } else {
            throw err
          }
        }
      } else {
        this.logger.log(
          `Snapshot too old (${Math.round(age / 86400000)}d) for project ${projectId}, using template/Storage`,
        )
      }
    }

    if (!mountedFromSnapshot && templateImageId) {
      try {
        const templateImage = await modal.images.fromId(templateImageId)
        await sb.mountImage('/project', templateImage)
        this.logger.log(`Mounted global Spaces template image for project ${projectId}`)
      } catch (err) {
        this.logger.warn(
          `MODAL_SPACES_PROJECT_TEMPLATE_IMAGE_ID mount failed for project ${projectId}: ${err}`,
        )
      }
    }

    const hydrateResult = await this.hydrateFromStorage(sb, supabase, projectId)

    await this.injectThemeCSS(sb, supabase, projectId)

    await this.injectComponentKit(sb, projectId)

    return hydrateResult
  }

  private async fetchComponentKitWithRetry(
    projectId: string,
    attempts = 3,
  ): Promise<Array<{ file_path: string; content: string }>> {
    let lastError: unknown
    for (let i = 0; i < attempts; i++) {
      try {
        return await this.repository.findComponentKitFiles()
      } catch (err) {
        lastError = err
        this.logger.warn(
          `Component kit DB fetch attempt ${i + 1}/${attempts} failed for project ${projectId}: ${err}`,
        )
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, 300 * (i + 1)))
      }
    }
    throw lastError ?? new Error('component kit fetch failed after retries')
  }

  private async writeKitFileWithRetry(
    sb: Sandbox,
    filePath: string,
    content: string,
    attempts = 3,
  ): Promise<void> {
    let lastError: unknown
    for (let i = 0; i < attempts; i++) {
      try {
        const handle = await sb.open(`/project/.vibey-kit/${filePath}`, 'w')
        await handle.write(new TextEncoder().encode(content))
        await handle.close()
        return
      } catch (err) {
        lastError = err
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, 200 * (i + 1)))
      }
    }
    throw lastError ?? new Error(`kit file write failed: ${filePath}`)
  }

  private async injectComponentKit(sb: Sandbox, projectId: string): Promise<void> {
    let files: Array<{ file_path: string; content: string }>
    try {
      files = await this.fetchComponentKitWithRetry(projectId)
    } catch (err) {
      this.logger.error(
        `Component kit DB fetch permanently failed for project ${projectId}: ${err}. Sandbox will have stale or missing kit files.`,
      )
      return
    }

    const dirs = new Set<string>()
    for (const f of files) {
      const slash = f.file_path.lastIndexOf('/')
      if (slash > 0) dirs.add(f.file_path.slice(0, slash))
    }
    const mkdirParts = ['/project/.vibey-kit', ...[...dirs].map((d) => `/project/.vibey-kit/${d}`)]
    await sb.exec(['mkdir', '-p', ...mkdirParts])

    const results = await Promise.allSettled(
      files.map((f) => this.writeKitFileWithRetry(sb, f.file_path, f.content)),
    )
    const failed = results
      .map((r, i) =>
        r.status === 'rejected'
          ? { path: files[i]!.file_path, reason: String(r.reason).slice(0, 120) }
          : null,
      )
      .filter((x): x is { path: string; reason: string } => x !== null)

    if (failed.length === 0) {
      this.logger.log(`Injected ${files.length} component kit files for project ${projectId}`)
      return
    }

    this.logger.warn(
      `Component kit: ${failed.length}/${files.length} files failed on first pass for project ${projectId}`,
    )
    const retryResults = await Promise.allSettled(
      failed.map((f) => {
        const src = files.find((x) => x.file_path === f.path)!
        return this.writeKitFileWithRetry(sb, src.file_path, src.content, 2)
      }),
    )
    const stillFailed = retryResults
      .map((r, i) => (r.status === 'rejected' ? failed[i]!.path : null))
      .filter((x): x is string => x !== null)

    if (stillFailed.length === 0) {
      this.logger.log(
        `Component kit recovered: all ${files.length} files written for project ${projectId}`,
      )
    } else {
      this.logger.error(
        `Component kit: ${stillFailed.length} files permanently failed for project ${projectId}: ${stillFailed.join(', ')}`,
      )
      this.errorReporter.report({
        app: 'api',
        severity: 'error',
        feature: 'sandbox',
        error_code: 'component_kit_partial_write',
        message: `Component kit partial write failure: ${stillFailed.length}/${files.length} files for project ${projectId}`,
        context: { projectId, failedPaths: stillFailed },
      })
    }
  }

  private async injectThemeCSS(
    sb: Sandbox,
    supabase: SupabaseClient,
    projectId: string,
  ): Promise<void> {
    try {
      const themeId = await this.repository.findProjectThemeId(supabase, projectId)
      if (!themeId) return

      const theme = await this.repository.findBrandingTheme(themeId)

      if (!theme?.colors) return

      const colors = theme.colors as Record<string, string>
      const lines = [':root {']

      const colorMap: Record<string, string> = {
        primary: '--color-primary',
        primaryForeground: '--color-primary-foreground',
        primaryLight: '--color-primary-light',
        primaryDark: '--color-primary-dark',
        heading: '--color-foreground',
        body: '--color-muted-foreground',
        pageBackground: '--color-background',
        cardBackground: '--color-card-background',
        border: '--color-border',
        input: '--color-input',
        success: '--color-success',
        warning: '--color-warning',
        danger: '--color-danger',
        secondaryAccent1: '--color-secondary-accent-1',
        secondaryAccent2: '--color-secondary-accent-2',
      }

      for (const [dbKey, cssVar] of Object.entries(colorMap)) {
        if (colors[dbKey]) lines.push(`  ${cssVar}: ${colors[dbKey]};`)
      }

      if (theme.font_heading) {
        lines.push(`  --font-heading: "${theme.font_heading}", sans-serif;`)
      }
      if (theme.font_body) {
        lines.push(`  --font-body: "${theme.font_body}", ui-sans-serif, system-ui, sans-serif;`)
      }

      lines.push('}')

      const googleFonts: string[] = []
      if (theme.font_heading)
        googleFonts.push(
          `family=${encodeURIComponent(theme.font_heading)}:wght@400;500;600;700;800`,
        )
      if (theme.font_body && theme.font_body !== theme.font_heading)
        googleFonts.push(`family=${encodeURIComponent(theme.font_body)}:wght@400;500;600;700`)

      let css = ''
      if (googleFonts.length) {
        css += `@import url('https://fonts.googleapis.com/css2?${googleFonts.join('&')}&display=swap');\n\n`
      }
      css += lines.join('\n')

      const f = await sb.open('/project/app/theme.css', 'w')
      await f.write(new TextEncoder().encode(css))
      await f.close()
      this.logger.log(`Injected theme CSS for project ${projectId}`)
    } catch (err) {
      this.logger.warn(`Theme CSS injection failed for project ${projectId}: ${err}`)
    }
  }

  private async hydrateFromStorage(
    sb: Sandbox,
    supabase: SupabaseClient,
    projectId: string,
  ): Promise<{ touchedDeps: boolean }> {
    const project = await this.repository.findHydrationProject(supabase, projectId)

    if (!project?.storage_path) return { touchedDeps: false }

    const manifest = project.manifest as { files?: string[] } | null
    const files = manifest?.files ?? []
    if (files.length === 0) return { touchedDeps: false }

    this.logger.log(`Hydrating ${files.length} files from Storage for project ${projectId}`)

    await sb.exec(['mkdir', '-p', '/project'])

    let touchedDeps = false
    const skipSamples: { path: string; reason: string }[] = []

    type Downloaded = { filePath: string; content: string }
    const downloads = await Promise.all(
      files.map(async (filePath): Promise<Downloaded | null> => {
        try {
          const objectPath = `${project.storage_path}/${filePath}`
          const { data, error } = await this.repository.downloadProjectFile(objectPath)
          if (error || !data) {
            const reason = formatStorageDownloadFailure(error, !!data)
            this.logger.warn(`Hydrate skipped ${filePath} for project ${projectId}: ${reason}`)
            if (skipSamples.length < 8) skipSamples.push({ path: filePath, reason })
            return null
          }
          return { filePath, content: await data.text() }
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err)
          this.logger.warn(`Failed to download ${filePath}: ${err}`)
          if (skipSamples.length < 8) skipSamples.push({ path: filePath, reason: `exc:${reason}` })
          return null
        }
      }),
    )

    const dirs = new Set<string>()
    for (const d of downloads) {
      if (!d) continue
      const dir = d.filePath.includes('/')
        ? d.filePath.substring(0, d.filePath.lastIndexOf('/'))
        : null
      if (dir) dirs.add(dir)
    }
    if (dirs.size > 0) {
      await sb.exec(['bash', '-c', [...dirs].map((d) => `mkdir -p /project/${d}`).join(' && ')])
    }

    for (const d of downloads) {
      if (!d) continue
      try {
        const isDep = HYDRATE_DEPS_PATH.test(d.filePath)
        if (isDep) {
          try {
            const existing = await sb.open(`/project/${d.filePath}`, 'r')
            const oldBytes = await existing.read()
            await existing.close()
            if (new TextDecoder().decode(oldBytes) === d.content) {
              continue
            }
          } catch {
            // File does not exist yet.
          }
        }

        const f = await sb.open(`/project/${d.filePath}`, 'w')
        await f.write(new TextEncoder().encode(d.content))
        await f.close()
        if (isDep) touchedDeps = true
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        this.logger.warn(`Failed to hydrate file ${d.filePath}: ${err}`)
        if (skipSamples.length < 8) skipSamples.push({ path: d.filePath, reason: `exc:${reason}` })
      }
    }

    return { touchedDeps }
  }
}

function formatStorageDownloadFailure(error: unknown, hasData: boolean): string {
  if (!error && !hasData) return 'no blob'
  if (!error) return 'download returned no error object'
  if (typeof error === 'string') return error.slice(0, 400)
  if (error instanceof Error && error.message) return error.message.slice(0, 400)
  const o = error as Record<string, unknown>
  const msg = o.message ?? o.error ?? o.error_description
  if (typeof msg === 'string' && msg.length) return msg.slice(0, 400)
  try {
    return JSON.stringify(error).slice(0, 400)
  } catch {
    return String(error).slice(0, 400)
  }
}
