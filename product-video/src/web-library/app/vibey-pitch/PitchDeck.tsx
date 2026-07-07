'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ChevronDown, Download, FileText, Presentation } from 'lucide-react'
import { SESSION_KEY } from './pitch-deck/constants'
import { PasswordGate } from './pitch-deck/password-gate'
import { SLIDES, TOTAL_SLIDES } from './pitch-deck/slides'

export function PitchDeck() {
  const [unlocked, setUnlocked] = useState(false)
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(0)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') setUnlocked(true)
  }, [])

  const go = useCallback((delta: number) => {
    setCurrent((prev) => {
      const next = prev + delta
      if (next < 0 || next >= TOTAL_SLIDES) return prev
      setDirection(delta)
      return next
    })
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        go(1)
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        go(-1)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [go])

  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    if (exportOpen) document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [exportOpen])

  const handleExport = useCallback(
    async (format: 'pdf' | 'pptx') => {
      setExportOpen(false)

      const saved = current
      const slideContainer = document.getElementById('pitch-slide-container')
      if (!slideContainer) return

      const { default: html2canvas } = await import('html2canvas')

      const images: string[] = []
      for (let i = 0; i < TOTAL_SLIDES; i++) {
        setDirection(i > saved ? 1 : -1)
        setCurrent(i)
        await new Promise((r) => setTimeout(r, 1200))

        const canvas = await html2canvas(slideContainer, {
          backgroundColor: '#09090b',
          scale: 2,
          useCORS: true,
          logging: false,
        })
        images.push(canvas.toDataURL('image/png'))
      }

      setCurrent(saved)
      setDirection(0)

      if (format === 'pdf') {
        const { default: jsPDF } = await import('jspdf')
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] })
        for (let i = 0; i < images.length; i++) {
          if (i > 0) pdf.addPage([1920, 1080], 'landscape')
          pdf.addImage(images[i]!, 'PNG', 0, 0, 1920, 1080)
        }
        pdf.save('Vibey-Pitch-Deck.pdf')
      } else {
        await new Promise<void>((resolve, reject) => {
          if ((window as any).PptxGenJS) {
            resolve()
            return
          }
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js'
          s.onload = () => resolve()
          s.onerror = () => reject(new Error('Failed to load pptxgenjs'))
          document.head.appendChild(s)
        })
        const PptxGenJS = (window as any).PptxGenJS
        const pptx = new PptxGenJS()
        pptx.layout = 'LAYOUT_WIDE'
        for (const img of images) {
          const slide = pptx.addSlide()
          slide.background = { color: '09090b' }
          slide.addImage({ data: img, x: 0, y: 0, w: 13.33, h: 7.5 })
        }
        await pptx.writeFile({ fileName: 'Vibey-Pitch-Deck.pptx' })
      }
    },
    [current],
  )

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  const SlideComponent = SLIDES[current]!

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#09090b]">
      {/* Progress bar */}
      <div className="absolute left-0 right-0 top-0 z-50 h-0.5 bg-white/5">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
          animate={{ width: `${((current + 1) / TOTAL_SLIDES) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Export button — top right */}
      <div ref={exportRef} className="absolute right-4 top-3 z-[60]">
        <button
          type="button"
          onClick={() => setExportOpen(!exportOpen)}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:bg-white/10 hover:text-white/70"
        >
          <Download size={13} />
          Export
          <ChevronDown
            size={12}
            className={`transition-transform ${exportOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {exportOpen && (
          <div className="absolute right-0 top-full mt-1 w-40 overflow-hidden rounded-lg border border-white/10 bg-[#18181b] shadow-xl">
            <button
              type="button"
              onClick={() => handleExport('pdf')}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              <FileText size={13} />
              Export as PDF
            </button>
            <button
              type="button"
              onClick={() => handleExport('pptx')}
              className="flex w-full items-center gap-2 border-t border-white/5 px-3 py-2.5 text-left text-xs text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Presentation size={13} />
              Export as PPTX
            </button>
          </div>
        )}
      </div>

      {/* Slide content */}
      <div id="pitch-slide-container" className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            initial={{ opacity: 0, x: direction >= 0 ? 60 : -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction >= 0 ? -60 : 60 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0"
          >
            <SlideComponent />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="relative z-50 flex items-center justify-between border-t border-white/5 bg-[#09090b] px-6 py-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={current === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-20"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setDirection(i > current ? 1 : -1)
                setCurrent(i)
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? 'w-6 bg-emerald-500' : 'w-1.5 bg-white/15 hover:bg-white/25'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-white/30">
            {current + 1}/{TOTAL_SLIDES}
          </span>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={current === TOTAL_SLIDES - 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-20"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
