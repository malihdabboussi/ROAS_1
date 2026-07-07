import { Injectable } from '@nestjs/common'
import type { ModalFileIoService } from '../../project-runtime/services/modal-file-io.service'

export type ProjectValidationResult = {
  passed: boolean
  errors: string[]
  missing_packages?: string[]
  missing_modules?: string[]
  action_required?: string
}

type PendingValidation = {
  timer: ReturnType<typeof setTimeout>
  promise: Promise<ProjectValidationResult>
  resolve: (v: ProjectValidationResult) => void
}

const VALIDATION_DEBOUNCE_MS = 800

function extractMissingDeps(errors: string[]): {
  missingPackages: string[]
  missingModules: string[]
} {
  const pkgSet = new Set<string>()
  const modSet = new Set<string>()
  const re = /Cannot find module '([^']+)'/g
  for (const err of errors) {
    let m: RegExpExecArray | null
    while ((m = re.exec(err)) !== null) {
      const mod = m[1]!
      if (mod.startsWith('@/') || mod.startsWith('.') || mod.startsWith('/')) {
        modSet.add(mod)
      } else {
        const pkgName = mod.startsWith('@')
          ? mod.split('/').slice(0, 2).join('/')
          : mod.split('/')[0]!
        pkgSet.add(pkgName)
      }
    }
  }
  return { missingPackages: [...pkgSet], missingModules: [...modSet] }
}

@Injectable()
export class ArtifactProjectValidationService {
  private pendingValidations = new Map<string, PendingValidation>()

  debouncedValidation(
    projectId: string,
    modalFileIo: ModalFileIoService | null,
  ): Promise<ProjectValidationResult> {
    const existing = this.pendingValidations.get(projectId)
    if (existing) {
      clearTimeout(existing.timer)
      const timer = setTimeout(
        () => this.runDebouncedTsc(projectId, modalFileIo),
        VALIDATION_DEBOUNCE_MS,
      )
      existing.timer = timer
      return existing.promise
    }

    let resolve!: (v: ProjectValidationResult) => void
    const promise = new Promise<ProjectValidationResult>((r) => {
      resolve = r
    })
    const timer = setTimeout(
      () => this.runDebouncedTsc(projectId, modalFileIo),
      VALIDATION_DEBOUNCE_MS,
    )
    this.pendingValidations.set(projectId, { timer, promise, resolve })
    return promise
  }

  private async runDebouncedTsc(
    projectId: string,
    modalFileIo: ModalFileIoService | null,
  ): Promise<void> {
    const entry = this.pendingValidations.get(projectId)
    if (!entry) return
    this.pendingValidations.delete(projectId)

    if (!modalFileIo) {
      entry.resolve({ passed: true, errors: [] })
      return
    }

    try {
      const results = await modalFileIo.runProjectValidation(projectId, ['typescript'])
      const tsc = results[0]
      if (!tsc || tsc.pass) {
        entry.resolve({ passed: true, errors: [] })
      } else {
        const errors = tsc.output
          .split('\n')
          .filter((l) => /error TS\d+/.test(l))
          .slice(0, 15)
        const finalErrors = errors.length > 0 ? errors : [tsc.output.slice(0, 2000)]
        const { missingPackages, missingModules } = extractMissingDeps(finalErrors)

        const actions: string[] = []
        if (missingPackages.length > 0) {
          actions.push(
            `Install missing packages via \`update_project_deps\`: ${missingPackages.map((p) => `"${p}"`).join(', ')}`,
          )
        }
        if (missingModules.length > 0) {
          actions.push(
            `Create missing local files: ${missingModules
              .map((m) => (m.startsWith('@/') ? m.replace(/^@\//, '') + '.tsx' : m))
              .map((f) => `"${f}"`)
              .join(', ')}`,
          )
        }
        if (actions.length === 0) {
          actions.push(
            'Resolve the TypeScript errors above before the next turn — they reflect what the user will see in the preview.',
          )
        }

        entry.resolve({
          passed: false,
          errors: finalErrors,
          missing_packages: missingPackages.length > 0 ? missingPackages : undefined,
          missing_modules: missingModules.length > 0 ? missingModules : undefined,
          action_required: `Build failed — the preview is broken until this is fixed. ${actions.join(' ')} Then the next write will re-validate automatically.`,
        })
      }
    } catch {
      entry.resolve({ passed: true, errors: [] })
    }
  }
}
