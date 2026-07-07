'use client'

import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Download, Monitor, RectangleHorizontal, Smartphone } from 'lucide-react'
import {
  createCreativeRepairFn,
  looksLikeInvalidCreativeTsx,
  SAFE_FALLBACK_AD_TSX,
} from '@/features/studio/lib/creative-tsx-validation'
import { downloadBlob, exportElementToPngBlob } from '@/features/studio/lib/png-export'
import { createTsxRunnerScope } from '@/features/studio/lib/tsx-runner-scope'
import { useSelfHealingPreview } from '@/features/studio/lib/use-self-healing-preview'
import { useEsbuildRunner } from '@/hooks/use-esbuild-runner'

export type AdAspectRatio = '1:1' | '4:5' | '9:16'

export interface AdSandpackPreviewHandle {
  exportPng: () => Promise<Blob | null>
}

interface AdSandpackPreviewProps {
  tsx: string
  initialAspectRatio?: AdAspectRatio
  onExportPng?: (blob: Blob) => void
  showToolbar?: boolean
}

const DIMENSIONS: Record<AdAspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1440, height: 1800 },
  '9:16': { width: 1080, height: 1920 },
}

const adSandpackRepairFn = createCreativeRepairFn()

function AdRuntime({ code, width, height }: { code: string; width: number; height: number }) {
  const scope = useMemo(() => createTsxRunnerScope(), [])
  const shouldFallback = useCallback(
    (candidate: string) => looksLikeInvalidCreativeTsx(candidate),
    [],
  )
  const repairCode = useCallback(
    async (brokenCode: string, error: string) => adSandpackRepairFn(brokenCode, error),
    [],
  )
  const { resolvedCode, status } = useSelfHealingPreview({
    code,
    shouldFallback,
    fallbackCode: SAFE_FALLBACK_AD_TSX,
    maxAttempts: 3,
    repairCode,
  })
  const appCode = useMemo(
    () => `
${resolvedCode}
export default function VibeyAdRoot() {
  const C = typeof AdCreative !== 'undefined' ? AdCreative : null
  if (!C) return <div style={{ width: '${width}px', height: '${height}px', margin: '0 auto', display: 'grid', placeItems: 'center', background: '#18181b', color: '#a1a1aa' }}>No creative found</div>
  return (
    <div data-vibey-ad-root style={{ width: '${width}px', height: '${height}px', margin: '0 auto' }}>
      <C width={${width}} height={${height}} />
    </div>
  )
}
`,
    [resolvedCode, height, width],
  )
  const { element } = useEsbuildRunner({ code: appCode, scope })

  if (status === 'validating' || status === 'fixing') {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
        Preparing preview...
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-auto">
      <style>{`html, body, #root { margin: 0; padding: 0; width: 100%; min-height: 100%; overflow: auto; background: transparent; }`}</style>
      {element}
    </div>
  )
}

export const AdSandpackPreview = forwardRef<AdSandpackPreviewHandle, AdSandpackPreviewProps>(
  function AdSandpackPreview(
    { tsx, initialAspectRatio = '4:5', onExportPng, showToolbar = true },
    ref,
  ) {
    const [aspectRatio, setAspectRatio] = useState<AdAspectRatio>(initialAspectRatio)
    const previewRef = useRef<HTMLDivElement>(null)
    const [isExporting, setIsExporting] = useState(false)

    const { width, height } = DIMENSIONS[aspectRatio]

    const exportPng = useCallback(async (): Promise<Blob | null> => {
      const target =
        (previewRef.current?.querySelector('[data-vibey-ad-root]') as HTMLElement | null) ??
        previewRef.current
      if (!target) return null
      const blob = await exportElementToPngBlob(target)
      if (blob) {
        onExportPng?.(blob)
      }
      return blob
    }, [onExportPng])

    useImperativeHandle(ref, () => ({ exportPng }), [exportPng])

    const handleDownload = useCallback(async () => {
      if (isExporting) return
      setIsExporting(true)
      try {
        const blob = await exportPng()
        if (!blob) return
        downloadBlob(blob, `ad-${aspectRatio}.png`)
      } finally {
        setIsExporting(false)
      }
    }, [aspectRatio, exportPng, isExporting])

    return (
      <div className="bg-card flex h-full flex-col overflow-hidden rounded-tl-2xl">
        {showToolbar && (
          <div className="border-b-glass flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setAspectRatio('1:1')}
                className={`rounded-md p-1.5 transition-colors ${
                  aspectRatio === '1:1'
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
                title="1:1"
              >
                <RectangleHorizontal className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('4:5')}
                className={`rounded-md p-1.5 transition-colors ${
                  aspectRatio === '4:5'
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
                title="4:5"
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`rounded-md p-1.5 transition-colors ${
                  aspectRatio === '9:16'
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
                title="9:16"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              className="button-glass-neutral rounded-lg px-3 py-1.5 text-xs"
            >
              <span className="relative z-10 inline-flex items-center gap-1">
                <Download className="h-3.5 w-3.5" />
                {isExporting ? 'Exporting...' : 'Export as PNG'}
              </span>
            </button>
          </div>
        )}

        <div
          ref={previewRef}
          className="relative flex flex-1 items-center justify-center overflow-auto p-4"
        >
          <div
            className="border-border w-full max-w-[560px] overflow-hidden rounded-xl border bg-black"
            style={{ aspectRatio: aspectRatio.replace(':', ' / ') }}
          >
            <AdRuntime code={tsx} width={width} height={height} />
          </div>
        </div>
      </div>
    )
  },
)
