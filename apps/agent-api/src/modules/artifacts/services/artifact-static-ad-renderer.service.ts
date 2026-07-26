import { execFile } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { ArtifactMediaAssetsRepository } from '../repositories/artifact-media-assets.repository'
import type { ArtifactMediaProcessingOperationRuntime } from './artifact-media-processing-advanced-operations.service'

const execFileAsync = promisify(execFile)
const STATIC_AD_WIDTH = 1080
const STATIC_AD_HEIGHTS = { '4:5': 1350, '9:16': 1920 } as const
const IMAGE_TOKEN = /(?:BG_IMAGE|IMAGE|PHOTO|MOCKUP|AVATAR|PROOF|PROP1|PROP2)$/
const SAFE_RAW_TAGS = new Set(['b', 'br', 'div', 'em', 'li', 'span', 'strong'])

type ProgressFn = (message: string) => void | Promise<void>

export const STATIC_AD_TEMPLATE_IDS = new Set([
  'hero_framing',
  'identity_callout',
  'case_study',
  'workshop_event',
  'tweet_receipt',
  'chat_receipt',
  'press_authority',
  'fake_news',
  'myth_vs_system',
  'offer_stack',
])

export class ArtifactStaticAdRendererService {
  constructor(
    private readonly repository: ArtifactMediaAssetsRepository = new ArtifactMediaAssetsRepository(),
  ) {}

  async render(
    target: Record<string, any>,
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const templateId = runtime.requireString(input, 'template_id')
    if (!STATIC_AD_TEMPLATE_IDS.has(templateId)) throw new Error('template_id is not supported')
    const aspectRatio = input.aspect_ratio === '9:16' ? '9:16' : '4:5'
    const height = STATIC_AD_HEIGHTS[aspectRatio]
    const spec = this.readSpec(input.spec)

    await onProgress?.('Loading deterministic static ad template')
    const { data, error } = await this.repository.findStaticAdTemplate(
      target.serviceClient,
      templateId,
    )
    if (error) throw new Error(`Static ad template lookup failed: ${error.message}`)
    const template = typeof data?.content === 'string' ? data.content : ''
    if (!template) throw new Error(`Static ad template not found: ${templateId}`)

    const htmlPath = join(tempRoot, 'static-ad.html')
    const outputPath = join(tempRoot, 'output.png')
    await writeFile(
      htmlPath,
      this.materializeTemplate(template, spec, STATIC_AD_WIDTH, height),
      'utf8',
    )

    await onProgress?.('Rendering exact static ad typography')
    const chromiumPath = process.env.STATIC_AD_CHROMIUM_PATH || '/usr/bin/chromium'
    await runtime.runWithTimeout(
      execFileAsync(
        chromiumPath,
        [
          '--headless',
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--hide-scrollbars',
          '--allow-file-access-from-files',
          `--window-size=${STATIC_AD_WIDTH},${height}`,
          `--screenshot=${outputPath}`,
          `file://${htmlPath}`,
        ],
        { maxBuffer: 1024 * 1024 },
      ).then(() => undefined),
      'render_static_ad',
    )

    return { outputPath, outputFormat: 'png' }
  }

  private readSpec(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('spec must be an object')
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        item === null || item === undefined ? '' : String(item),
      ]),
    )
  }

  private materializeTemplate(
    template: string,
    spec: Record<string, string>,
    width: number,
    height: number,
  ): string {
    let html = template
      .replaceAll('{{FONT_CSS}}', this.fontCss())
      .replaceAll('{{W}}', String(width))
      .replaceAll('{{H}}', String(height))
    const tokens = new Set(Array.from(html.matchAll(/\{\{([A-Z0-9_]+)\}\}/g), (match) => match[1]!))
    for (const token of tokens) {
      const raw = spec[token] ?? ''
      const value = token.endsWith('_HTML')
        ? this.sanitizeRawHtml(raw)
        : IMAGE_TOKEN.test(token)
          ? this.safeImageSource(raw)
          : this.escapeHtml(raw)
      html = html.replaceAll(`{{${token}}}`, value)
    }
    return html.replace(
      '</body>',
      `<script>addEventListener('load',()=>{const b=document.body,H=innerHeight,sh=b.scrollHeight;if(sh>H){b.style.height=sh+'px';b.style.zoom=String((H/sh)*.998)}})</script></body>`,
    )
  }

  private fontCss(): string {
    return [
      "@font-face{font-family:'Anton';font-weight:400;src:url(file:///usr/local/share/fonts/Anton-Regular.ttf) format('truetype')}",
      "@font-face{font-family:'Inter';font-weight:400;src:url(file:///usr/local/share/fonts/Inter-Regular.woff2) format('woff2')}",
      "@font-face{font-family:'Inter';font-weight:700;src:url(file:///usr/local/share/fonts/Inter-Bold.woff2) format('woff2')}",
      "@font-face{font-family:'Inter';font-weight:900;src:url(file:///usr/local/share/fonts/Inter-Black.woff2) format('woff2')}",
    ].join('\n')
  }

  private safeImageSource(value: string): string {
    if (!value) return ''
    if (/^https:\/\//i.test(value) || /^data:image\//i.test(value)) {
      return this.escapeHtml(value)
    }
    throw new Error('Static ad image values must use https or data:image URLs')
  }

  private sanitizeRawHtml(value: string): string {
    const tags = value.match(/<[^>]*>/g) ?? []
    for (const tag of tags) {
      const match = tag.match(/^<\/?([a-z0-9]+)(?:\s+class="([a-z0-9 _-]+)")?\s*\/?>$/i)
      if (!match || !SAFE_RAW_TAGS.has(match[1]!.toLowerCase())) {
        throw new Error('Static ad HTML fields contain unsupported markup')
      }
    }
    return value
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }
}
