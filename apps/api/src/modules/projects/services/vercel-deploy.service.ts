import * as crypto from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface VercelDeployResult {
  success: boolean
  deploymentId?: string
  deploymentUrl?: string
  projectId?: string
  error?: string
}

interface VercelFileRef {
  file: string
  sha: string
  size: number
}

/** Vercel runs install + build on uploaded source (POST /v13/deployments projectSettings). */
const VERCEL_NEXT_PROJECT_SETTINGS = {
  framework: 'nextjs' as const,
  installCommand: 'pnpm install',
  buildCommand: 'next build',
  nodeVersion: '22.x',
}

export const VERCEL_PUBLISH_DEPLOY_WAIT_MS = 900_000

@Injectable()
export class VercelDeployService {
  private readonly logger = new Logger(VercelDeployService.name)
  private readonly API_BASE = 'https://api.vercel.com'
  private readonly VERCEL_TOKEN: string
  private readonly VERCEL_TEAM_ID: string | undefined
  private readonly APPS_PROJECT_PREFIX: string

  constructor(private readonly configService: ConfigService) {
    this.VERCEL_TOKEN =
      this.configService.get<string>('VERCEL_APPS_TOKEN') ||
      this.configService.get<string>('VERCEL_TOKEN') ||
      ''
    this.VERCEL_TEAM_ID =
      this.configService.get<string>('VERCEL_APPS_TEAM_ID') ||
      this.configService.get<string>('VERCEL_TEAM_ID')
    this.APPS_PROJECT_PREFIX =
      this.configService.get<string>('VERCEL_APPS_PROJECT_PREFIX') || 'vibey-app-'
  }

  private buildUrl(urlPath: string): string {
    return this.VERCEL_TEAM_ID
      ? `${this.API_BASE}${urlPath}${urlPath.includes('?') ? '&' : '?'}teamId=${this.VERCEL_TEAM_ID}`
      : `${this.API_BASE}${urlPath}`
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    }
  }

  get isConfigured(): boolean {
    return !!this.VERCEL_TOKEN
  }

  async ensureVercelProject(
    slug: string,
    existingVercelProjectId?: string | null,
  ): Promise<{ projectId: string; error?: string }> {
    if (existingVercelProjectId) {
      const exists = await this.checkProjectExists(existingVercelProjectId)
      if (exists) return { projectId: existingVercelProjectId }
    }

    const name = `${this.APPS_PROJECT_PREFIX}${slug}`
    const url = this.buildUrl('/v10/projects')

    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ name, framework: 'nextjs' }),
    })

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
      const err = body.error as Record<string, string> | undefined
      if (err?.code === 'project_already_exists' || err?.code === 'CONFLICT') {
        const found = await this.findProjectByName(name)
        if (found) return { projectId: found }
      }
      return {
        projectId: '',
        error: `Failed to create Vercel project: ${err?.message ?? res.status}`,
      }
    }

    const data = (await res.json()) as { id: string }
    this.logger.log(`Created Vercel project ${name} → ${data.id}`)
    return { projectId: data.id }
  }

  async uploadFile(content: Buffer): Promise<string> {
    const sha = crypto.createHash('sha1').update(content).digest('hex')
    const url = this.buildUrl('/v2/files')

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.VERCEL_TOKEN}`,
        'Content-Type': 'application/octet-stream',
        'x-vercel-digest': sha,
        'Content-Length': String(content.length),
      },
      body: content as unknown as BodyInit,
    })

    if (!res.ok && res.status !== 200) {
      const text = await res.text().catch(() => '')
      throw new Error(`File upload failed (${res.status}): ${text.slice(0, 200)}`)
    }

    return sha
  }

  async uploadFiles(files: Map<string, Buffer>): Promise<VercelFileRef[]> {
    const refs: VercelFileRef[] = []

    for (const [filePath, content] of files) {
      const sha = await this.uploadFile(content)
      refs.push({ file: filePath, sha, size: content.length })
    }

    this.logger.log(`Uploaded ${refs.length} files to Vercel`)
    return refs
  }

  async createDeployment(
    vercelProjectId: string,
    files: VercelFileRef[],
    opts: { slug: string; envVars?: Record<string, string> },
  ): Promise<VercelDeployResult> {
    const url = this.buildUrl('/v13/deployments')

    const body: Record<string, unknown> = {
      name: opts.slug,
      project: vercelProjectId,
      files: files.map((f) => ({ file: f.file, sha: f.sha, size: f.size })),
      projectSettings: { ...VERCEL_NEXT_PROJECT_SETTINGS },
      target: 'production',
    }

    if (opts.envVars && Object.keys(opts.envVars).length > 0) {
      body.env = opts.envVars
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      return {
        success: false,
        error: `Deployment creation failed (${res.status}): ${errBody.slice(0, 500)}`,
      }
    }

    const data = (await res.json()) as { id: string; url: string; readyState: string }
    return {
      success: true,
      deploymentId: data.id,
      deploymentUrl: `https://${data.url}`,
      projectId: vercelProjectId,
    }
  }

  async waitForDeployment(
    deploymentId: string,
    timeoutMs = 120_000,
  ): Promise<{ ready: boolean; url?: string; error?: string }> {
    const start = Date.now()
    const pollInterval = 3_000

    while (Date.now() - start < timeoutMs) {
      const url = this.buildUrl(`/v13/deployments/${deploymentId}`)
      const res = await fetch(url, { headers: this.headers })

      if (!res.ok) {
        return { ready: false, error: `Failed to check deployment status: ${res.status}` }
      }

      const data = (await res.json()) as {
        readyState: string
        url: string
        error?: { message?: string }
      }

      if (data.readyState === 'READY') {
        return { ready: true, url: `https://${data.url}` }
      }

      if (data.readyState === 'ERROR' || data.readyState === 'CANCELED') {
        return { ready: false, error: data.error?.message ?? `Deployment ${data.readyState}` }
      }

      await new Promise((r) => setTimeout(r, pollInterval))
    }

    return { ready: false, error: 'Deployment timed out' }
  }

  async addDomainToProject(
    vercelProjectId: string,
    domain: string,
  ): Promise<{ success: boolean; error?: string }> {
    const url = this.buildUrl(`/v10/projects/${vercelProjectId}/domains`)

    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ name: domain }),
    })

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
      const err = body.error as Record<string, string> | undefined
      if (err?.code === 'domain_already_in_use' || err?.code === 'CONFLICT') {
        return { success: true }
      }
      return { success: false, error: `Failed to add domain: ${err?.message ?? res.status}` }
    }

    this.logger.log(`Added domain ${domain} to Vercel project ${vercelProjectId}`)
    return { success: true }
  }

  async removeDomainFromProject(
    vercelProjectId: string,
    domain: string,
  ): Promise<{ success: boolean; error?: string }> {
    const url = this.buildUrl(`/v9/projects/${vercelProjectId}/domains/${domain}`)

    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.headers,
    })

    if (!res.ok && res.status !== 404) {
      const body = await res.text().catch(() => '')
      return { success: false, error: `Failed to remove domain: ${body.slice(0, 200)}` }
    }

    this.logger.log(`Removed domain ${domain} from Vercel project ${vercelProjectId}`)
    return { success: true }
  }

  async deleteDeployment(deploymentId: string): Promise<void> {
    const url = this.buildUrl(`/v13/deployments/${deploymentId}`)
    await fetch(url, { method: 'DELETE', headers: this.headers }).catch(() => {})
    this.logger.log(`Deleted Vercel deployment ${deploymentId}`)
  }

  async deleteProject(vercelProjectId: string): Promise<void> {
    const url = this.buildUrl(`/v10/projects/${vercelProjectId}`)
    await fetch(url, { method: 'DELETE', headers: this.headers }).catch(() => {})
    this.logger.log(`Deleted Vercel project ${vercelProjectId}`)
  }

  async setProjectEnvVars(vercelProjectId: string, envVars: Record<string, string>): Promise<void> {
    const listUrl = this.buildUrl(`/v10/projects/${vercelProjectId}/env`)

    const existingByKey = new Map<string, string>()
    try {
      const listRes = await fetch(listUrl, { headers: this.headers })
      if (listRes.ok) {
        const data = (await listRes.json()) as { envs?: Array<{ id: string; key: string }> }
        for (const env of data.envs ?? []) {
          existingByKey.set(env.key, env.id)
        }
      }
    } catch {}

    for (const [key, value] of Object.entries(envVars)) {
      const existingId = existingByKey.get(key)
      try {
        if (existingId) {
          await fetch(this.buildUrl(`/v10/projects/${vercelProjectId}/env/${existingId}`), {
            method: 'PATCH',
            headers: this.headers,
            body: JSON.stringify({ value, type: 'encrypted', target: ['production', 'preview'] }),
          })
        } else {
          await fetch(listUrl, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
              key,
              value,
              type: 'encrypted',
              target: ['production', 'preview'],
            }),
          })
        }
      } catch (err) {
        this.logger.warn(`Failed to set env var ${key} on Vercel project: ${err}`)
      }
    }
  }

  private async checkProjectExists(vercelProjectId: string): Promise<boolean> {
    const url = this.buildUrl(`/v10/projects/${vercelProjectId}`)
    const res = await fetch(url, { headers: this.headers }).catch(() => null)
    return res?.ok === true
  }

  async healthCheck(deploymentUrl: string): Promise<{
    healthy: boolean
    issues: Array<{ type: string; message: string; autoFixable: boolean }>
  }> {
    const issues: Array<{ type: string; message: string; autoFixable: boolean }> = []

    try {
      const res = await fetch(deploymentUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(15_000),
        redirect: 'follow',
      })

      if (res.status >= 500) {
        const body = await res.text().catch(() => '')
        if (body.includes('MODULE_NOT_FOUND')) {
          issues.push({
            type: 'missing_module',
            message: `Missing dependency: ${body.slice(0, 200)}`,
            autoFixable: true,
          })
        } else if (body.includes('VIBEY_API_URL')) {
          issues.push({
            type: 'missing_env',
            message: 'VIBEY_API_URL not configured',
            autoFixable: true,
          })
        } else {
          issues.push({
            type: 'runtime_error',
            message: `App returned ${res.status}: ${body.slice(0, 300)}`,
            autoFixable: false,
          })
        }
      }
    } catch (err) {
      issues.push({
        type: 'unreachable',
        message: `Deployment unreachable: ${err instanceof Error ? err.message : String(err)}`,
        autoFixable: false,
      })
    }

    try {
      const errRes = await fetch(`${deploymentUrl}/api/__errors`, {
        signal: AbortSignal.timeout(10_000),
      })
      if (!errRes.ok && errRes.status >= 500) {
        issues.push({
          type: 'serverless_error',
          message: `API routes returning ${errRes.status}`,
          autoFixable: false,
        })
      }
    } catch {}

    return { healthy: issues.length === 0, issues }
  }

  private async findProjectByName(name: string): Promise<string | null> {
    const url = this.buildUrl(`/v10/projects/${name}`)
    const res = await fetch(url, { headers: this.headers }).catch(() => null)
    if (!res?.ok) return null
    const data = (await res.json()) as { id: string }
    return data.id ?? null
  }
}
