import * as React from 'react'
import type { Root } from 'react-dom/client'
import { backendUpload } from '@/lib/api/backend-client'
import { transformTsx } from '@/lib/esbuild-transform'

export interface PngExportOptions {
  scale?: number
  useCORS?: boolean
  backgroundColor?: string | null
  logging?: boolean
  format?: 'png' | 'jpeg'
  quality?: number
}

const DEFAULT_PNG_EXPORT_OPTIONS: Required<PngExportOptions> = {
  scale: 4,
  useCORS: true,
  backgroundColor: null,
  logging: false,
  format: 'png',
  quality: 0.95,
}

async function inlineCrossOriginImages(clonedDoc: Document): Promise<void> {
  const images = [...clonedDoc.querySelectorAll<HTMLImageElement>('img')]
  await Promise.all(
    images.map(async (img) => {
      if (!img.src || img.src.startsWith('data:')) return
      try {
        const res = await fetch(img.src)
        if (!res.ok) return
        const blob = await res.blob()
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        img.src = dataUrl
      } catch {
        /* leave original src if fetch fails */
      }
    }),
  )
}

export async function exportElementToPngBlob(
  target: HTMLElement,
  options?: PngExportOptions,
): Promise<Blob | null> {
  const merged = { ...DEFAULT_PNG_EXPORT_OPTIONS, ...(options ?? {}) }
  const html2canvas = (await import('html2canvas-pro')).default
  const canvas = await html2canvas(target, {
    scale: merged.scale,
    useCORS: merged.useCORS,
    backgroundColor: merged.backgroundColor,
    logging: merged.logging,
    onclone: async (_doc: Document, clonedEl: HTMLElement) => {
      await inlineCrossOriginImages(clonedEl.ownerDocument)
    },
  })
  const mime = merged.format === 'jpeg' ? 'image/jpeg' : 'image/png'
  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      mime,
      merged.format === 'jpeg' ? merged.quality : undefined,
    )
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function renderAndUploadSocialImage(
  target: HTMLElement,
  _userId: string,
  campaignId: string,
  postId: string,
  options?: PngExportOptions,
): Promise<string> {
  const blob = await exportElementToPngBlob(target, options)
  if (!blob) throw new Error('Failed to render social post image')
  const ext = options?.format === 'jpeg' ? 'jpg' : 'png'
  const mime = options?.format === 'jpeg' ? 'image/jpeg' : 'image/png'
  const file = new File([blob], `${postId}.${ext}`, { type: mime })
  const formData = new FormData()
  formData.append('file', file)
  formData.append('campaign_id', campaignId)
  formData.append('folder', 'social-posts')
  const uploaded = await backendUpload<{ url: string }>('/api/media/campaigns/upload', formData)
  return uploaded.url
}

// ── Off-screen TSX → PNG rasterization ──

const SOCIAL_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
  '1.91:1': { width: 1200, height: 627 },
}

export function socialPostRenderDimensions(
  postType: string,
  platform: string,
): { width: number; height: number } {
  let aspect = '4:5'
  if (postType === 'story' || postType === 'reel') aspect = '9:16'
  else if (postType === 'single_image' || postType === 'carousel') aspect = '4:5'
  else if (platform === 'linkedin') aspect = '1.91:1'
  return SOCIAL_DIMENSIONS[aspect] ?? SOCIAL_DIMENSIONS['4:5']!
}

const RENDER_SETTLE_MS = 400

export async function rasterizeSocialPostOffscreen(
  tsxCode: string,
  renderWidth: number,
  renderHeight: number,
  userId: string,
  campaignId: string,
  postId: string,
  options?: PngExportOptions,
): Promise<string> {
  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-9999px;top:0;width:${renderWidth}px;height:${renderHeight}px;overflow:hidden;z-index:-1;pointer-events:none;`
  document.body.appendChild(container)

  let root: Root | undefined
  try {
    const ReactDOM = await import('react-dom/client')
    const RunnerMod = await import('react-runner')
    const { createTsxRunnerScope } = await import('./tsx-runner-scope')

    const rawAppCode =
      `${tsxCode}\nexport default function VibeySocialRoot(){` +
      `const C=typeof SocialCreative!=='undefined'?SocialCreative:typeof AdCreative!=='undefined'?AdCreative:null;` +
      `if(!C)return <div style={{width:'${renderWidth}px',height:'${renderHeight}px',display:'grid',placeItems:'center',background:'#18181b',color:'#a1a1aa'}}>No creative</div>;` +
      `return <div data-vibey-social-root style={{width:'100%',maxWidth:'${renderWidth}px',aspectRatio:'${renderWidth}/${renderHeight}',overflow:'hidden'}}><C width={${renderWidth}} height={${renderHeight}} /></div>}`
    const preTransformed = await transformTsx(rawAppCode)

    const target = await new Promise<HTMLElement>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Off-screen TSX render timed out')), 15_000)

      function Renderer() {
        const scope = React.useMemo(() => createTsxRunnerScope(), [])
        const { element, error } = RunnerMod.useRunner({ code: preTransformed, scope })

        React.useEffect(() => {
          if (error) {
            clearTimeout(timer)
            reject(new Error(`TSX render error: ${String(error)}`))
            return
          }
          if (!element) return
          const settle = setTimeout(() => {
            clearTimeout(timer)
            resolve(
              (container.querySelector('[data-vibey-social-root]') as HTMLElement) ?? container,
            )
          }, RENDER_SETTLE_MS)
          return () => clearTimeout(settle)
        }, [element, error])

        return element ?? null
      }

      root = ReactDOM.createRoot(container)
      root.render(React.createElement(Renderer))
    })

    return await renderAndUploadSocialImage(target, userId, campaignId, postId, options)
  } finally {
    root?.unmount()
    document.body.removeChild(container)
  }
}
