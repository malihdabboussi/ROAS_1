'use client'

import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Send, X } from 'lucide-react'
import type { FunnelMarkupStroke, PresentationMarkupStrokePoint } from '../../types'

type FunnelDrawingStreamEvent = {
  id: number
  phase: 'start' | 'move' | 'end'
  point: PresentationMarkupStrokePoint | null
}

async function captureFunnelWithDrawing(drawingCanvas: HTMLCanvasElement): Promise<string> {
  const iframe = document.querySelector<HTMLIFrameElement>('[data-funnel-export-iframe]')
  const iframeDocument = iframe?.contentDocument
  const iframeWindow = iframe?.contentWindow
  if (!iframe || !iframeDocument?.documentElement || !iframeWindow) {
    throw new Error('Funnel preview not available for drawing capture')
  }

  const html2canvas = (await import('html2canvas-pro')).default
  const funnelCanvas = await html2canvas(iframeDocument.documentElement, {
    scale: 1,
    useCORS: true,
    logging: false,
    width: iframe.clientWidth,
    height: iframe.clientHeight,
    windowWidth: iframe.clientWidth,
    windowHeight: iframe.clientHeight,
    x: iframeWindow.scrollX,
    y: iframeWindow.scrollY,
  })

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = drawingCanvas.width
  outputCanvas.height = drawingCanvas.height
  const ctx = outputCanvas.getContext('2d')
  if (!ctx) throw new Error('Could not prepare drawing capture')

  ctx.drawImage(funnelCanvas, 0, 0, outputCanvas.width, outputCanvas.height)
  ctx.drawImage(drawingCanvas, 0, 0, outputCanvas.width, outputCanvas.height)

  return outputCanvas.toDataURL('image/png')
}

interface FunnelDrawingOverlayProps {
  funnelId: string
  funnelPageId: string | null
  streamEvent?: FunnelDrawingStreamEvent | null
  onCancel: () => void
  onSendDrawing: (note: string, dataUrl: string, strokes: FunnelMarkupStroke[]) => void
}

export function FunnelDrawingOverlay({
  funnelId,
  funnelPageId,
  streamEvent,
  onCancel,
  onSendDrawing,
}: FunnelDrawingOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [strokes, setStrokes] = useState<FunnelMarkupStroke[]>([])
  const [note, setNote] = useState('')

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const scaleX = rect.width > 0 ? event.currentTarget.clientWidth / rect.width : 1
    const scaleY = rect.height > 0 ? event.currentTarget.clientHeight / rect.height : 1
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  const redraw = (nextStrokes: FunnelMarkupStroke[]) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#dc2626'
    for (const stroke of nextStrokes) {
      ctx.beginPath()
      stroke.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y)
        else ctx.lineTo(point.x, point.y)
      })
      ctx.stroke()
    }
  }

  const resizeCanvas = (node: HTMLCanvasElement | null) => {
    canvasRef.current = node
    if (!node) return
    node.width = Math.max(1, Math.round(node.clientWidth))
    node.height = Math.max(1, Math.round(node.clientHeight))
    redraw(strokes)
  }

  useEffect(() => {
    if (!streamEvent?.point) return
    if (streamEvent.phase === 'start') {
      const stroke: FunnelMarkupStroke = {
        id: crypto.randomUUID(),
        funnel_id: funnelId,
        funnel_page_id: funnelPageId,
        color: 'red',
        points: [streamEvent.point],
      }
      setStrokes((prev) => {
        const next = [...prev, stroke]
        redraw(next)
        return next
      })
      setDrawing(true)
      return
    }
    if (streamEvent.phase === 'move') {
      setStrokes((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (!last) {
          const stroke: FunnelMarkupStroke = {
            id: crypto.randomUUID(),
            funnel_id: funnelId,
            funnel_page_id: funnelPageId,
            color: 'red',
            points: [streamEvent.point!],
          }
          const started = [stroke]
          redraw(started)
          return started
        }
        next[next.length - 1] = { ...last, points: [...last.points, streamEvent.point!] }
        redraw(next)
        return next
      })
      return
    }
    setDrawing(false)
  }, [funnelId, funnelPageId, streamEvent])

  const send = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = await captureFunnelWithDrawing(canvas)
    onSendDrawing(note.trim(), dataUrl, strokes)
  }

  return (
    <div className="absolute inset-0 z-40">
      <canvas
        ref={resizeCanvas}
        className="h-full w-full cursor-crosshair"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          const stroke: FunnelMarkupStroke = {
            id: crypto.randomUUID(),
            funnel_id: funnelId,
            funnel_page_id: funnelPageId,
            color: 'red',
            points: [getPoint(event)],
          }
          setStrokes((prev) => [...prev, stroke])
          setDrawing(true)
        }}
        onPointerMove={(event) => {
          if (!drawing) return
          const point = getPoint(event)
          setStrokes((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (!last) return prev
            next[next.length - 1] = { ...last, points: [...last.points, point] }
            redraw(next)
            return next
          })
        }}
        onPointerUp={() => setDrawing(false)}
      />
      <div className="border-border bg-card absolute bottom-6 left-1/2 flex w-full max-w-xl -translate-x-1/2 items-center gap-2 rounded-full border p-2 shadow-lg">
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add a note to your drawing"
          className="body-3 text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent px-3 outline-none"
        />
        <button
          type="button"
          onClick={() => {
            const next = strokes.slice(0, -1)
            setStrokes(next)
            redraw(next)
          }}
          className="btn-icon-bare"
          aria-label="Undo stroke"
        >
          <RotateCcw className="icon-sm" />
        </button>
        <button type="button" onClick={onCancel} className="btn-icon-bare" aria-label="Cancel">
          <X className="icon-sm" />
        </button>
        <button
          type="button"
          onClick={send}
          disabled={strokes.length === 0}
          className="button-default button-glass-primary gap-spacing-1 disabled:opacity-50"
        >
          <Send className="icon-xs" />
          Send
        </button>
      </div>
    </div>
  )
}
