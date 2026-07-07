import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { Controller, Get, Logger, NotFoundException, Param, Res, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { Response } from 'express'
import { AuthGuard, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

@Controller('chat/browser-media')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class BrowserMediaController {
  private readonly logger = new Logger(BrowserMediaController.name)

  private get gatewayUrl(): string {
    return process.env.OPENCLAW_GATEWAY_URL ?? 'http://localhost:18789'
  }

  private get gatewayToken(): string {
    return process.env.OPENCLAW_GATEWAY_TOKEN ?? ''
  }

  @Get(':filename')
  async serveMedia(@Param('filename') filename: string, @Res() res: Response) {
    const ext = path.extname(filename).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new NotFoundException('Not found')
    }
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new NotFoundException('Not found')
    }

    try {
      const proxyRes = await fetch(
        `${this.gatewayUrl}/v1/browser/media/${encodeURIComponent(filename)}`,
        {
          headers: {
            Authorization: `Bearer ${this.gatewayToken}`,
          },
          signal: AbortSignal.timeout(10_000),
        },
      )
      if (proxyRes.ok && proxyRes.body) {
        const contentType = proxyRes.headers.get('content-type') ?? `image/${ext.slice(1)}`
        if (contentType.startsWith('image/')) {
          res.setHeader('Content-Type', contentType)
          res.setHeader('Cache-Control', 'private, max-age=300')
          const buffer = Buffer.from(await proxyRes.arrayBuffer())
          res.send(buffer)
          return
        }
      }
    } catch {
      // gateway proxy failed — fall through to direct file serve
    }

    const openclawStateDir = process.env.OPENCLAW_STATE_DIR ?? path.join(os.homedir(), '.openclaw')
    const mediaDir = process.env.OPENCLAW_MEDIA_DIR ?? path.join(openclawStateDir, 'media')
    const candidates = [path.join(mediaDir, 'browser', filename), path.join(mediaDir, filename)]
    let resolved: string | null = null
    for (const candidate of candidates) {
      const abs = path.resolve(candidate)
      if (abs.startsWith(path.resolve(mediaDir)) && fs.existsSync(abs)) {
        resolved = abs
        break
      }
    }

    if (!resolved) {
      throw new NotFoundException('Not found')
    }

    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    }
    res.setHeader('Content-Type', mimeMap[ext] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'private, max-age=300')
    fs.createReadStream(resolved).pipe(res)
  }
}
