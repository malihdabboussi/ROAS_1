import { All, Controller, Headers, Logger, Param, Req, Res } from '@nestjs/common'
import type { Request, Response } from 'express'
import { verifyProjectSessionKey } from '@vibey/api-shared'
import { ProjectSdkProxyService } from '../services/project-sdk-proxy.service'

const STARTING_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Starting App</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0f;color:#fff;font-family:system-ui,-apple-system,sans-serif;height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:24px}
.spinner{width:32px;height:32px;border:2px solid rgba(255,255,255,.1);border-top-color:rgba(255,255,255,.5);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
h1{font-size:20px;font-weight:300;letter-spacing:.02em;opacity:.8}
p{font-size:14px;font-weight:300;opacity:.4;max-width:320px;text-align:center;line-height:1.6}
</style><script>setTimeout(()=>location.reload(),5000)</script></head>
<body><div class="spinner"></div><h1>Starting your app</h1>
<p>The application is being prepared. This page will refresh automatically.</p></body></html>`

@Controller('sdk-proxy')
export class ProjectSdkProxyController {
  private readonly logger = new Logger(ProjectSdkProxyController.name)

  constructor(private readonly sdkProxyService: ProjectSdkProxyService) {}

  @All(':projectId')
  async proxyRoot(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Res() res: Response,
    @Headers('x-vibey-session-key') sessionKey?: string,
    @Headers('x-internal-token') internalToken?: string,
  ) {
    return this.proxy(projectId, req, res, sessionKey, internalToken)
  }

  @All(':projectId/*path')
  async proxyWithPath(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Res() res: Response,
    @Headers('x-vibey-session-key') sessionKey?: string,
    @Headers('x-internal-token') internalToken?: string,
  ) {
    return this.proxy(projectId, req, res, sessionKey, internalToken)
  }

  private async proxy(
    projectId: string,
    req: Request,
    res: Response,
    sessionKey?: string,
    _internalToken?: string,
  ) {
    const projectSessionKey = sessionKey ?? this.getHeaderValue(req.headers['x-session-key'])
    if (!verifyProjectSessionKey(projectId, projectSessionKey, process.env.VIBEY_SESSION_KEY)) {
      return res.status(401).json({ error: 'Invalid session key' })
    }

    const target = await this.sdkProxyService.resolveTarget(projectId)
    if (target.status === 'service_unavailable') {
      return res.status(500).json({ error: 'Service unavailable' })
    }
    if (target.status === 'not_found') {
      return res.status(404).json({ error: 'Project not found' })
    }
    if (target.status === 'sandbox_unavailable') {
      const accept = req.headers.accept ?? ''
      if (accept.includes('text/html')) {
        return res.status(200).setHeader('Content-Type', 'text/html').send(STARTING_HTML)
      }
      return res.status(503).json({ error: 'Sandbox unavailable' })
    }

    this.sdkProxyService.touchLastDeployedAt(target.supabase, projectId)

    const fullPath = req.originalUrl.replace(`/api/sdk-proxy/${projectId}`, '')
    const targetUrl = `${target.targetBaseUrl}${fullPath}`

    try {
      const headers: Record<string, string> = {}
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string' && key !== 'host' && key !== 'connection') {
          headers[key] = value
        }
      }

      const fetchInit: RequestInit = {
        method: req.method,
        headers,
        signal: AbortSignal.timeout(120_000),
      }

      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        fetchInit.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
      }

      const upstream = await fetch(targetUrl, fetchInit)

      res.status(upstream.status)
      for (const [key, value] of upstream.headers.entries()) {
        if (key === 'transfer-encoding' || key === 'content-encoding' || key === 'content-length')
          continue
        res.setHeader(key, value)
      }

      if (upstream.body) {
        const reader = (upstream.body as ReadableStream<Uint8Array>).getReader()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) res.write(value)
        }
        res.end()
      } else {
        const body = await upstream.text()
        res.send(body)
      }
    } catch (err) {
      this.logger.error(`[SdkProxy] Proxy to ${targetUrl} failed: ${err}`)
      if (!res.headersSent) {
        res.status(502).json({ error: 'Failed to reach project app' })
      }
    }
  }

  private getHeaderValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0]
    return value
  }
}
