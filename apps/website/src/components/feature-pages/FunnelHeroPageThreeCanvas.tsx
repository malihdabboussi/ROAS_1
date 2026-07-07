'use client'

import type { RefObject } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export type FunnelHeroPageThreeProps = {
  scrollTriggerRootRef: RefObject<HTMLElement | null>
  bigTitle: string
  leftColumn: string
  rightColumn: string
  footerLine?: string
}

export function FunnelHeroPageThreeCanvas(props: FunnelHeroPageThreeProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const grainCanvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const scrollProgressRef = useRef(0)
  const timeRef = useRef(0)
  const [scrollProgress, setScrollProgress] = useState(0)

  useLayoutEffect(() => {
    scrollProgressRef.current = scrollProgress
  }, [scrollProgress])

  useEffect(() => {
    const canvas = canvasRef.current
    const grainCanvas = grainCanvasRef.current
    const wrap = wrapRef.current
    const triggerEl = props.scrollTriggerRootRef.current
    if (!canvas || !grainCanvas || !wrap || !triggerEl) return

    const ctx = canvas.getContext('2d')
    const grainCtx = grainCanvas.getContext('2d')
    if (!ctx || !grainCtx) return

    const density = ' .:-=+*#%@'

    const params = {
      rotation: 0,
      atmosphereShift: 0,
      glitchIntensity: 0,
      glitchFrequency: 0,
    }

    const tweens: gsap.core.Tween[] = [
      gsap.to(params, {
        rotation: Math.PI * 2,
        duration: 20,
        repeat: -1,
        ease: 'none',
      }),
      gsap.to(params, {
        atmosphereShift: 1,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      }),
      gsap.to(params, {
        glitchIntensity: 1,
        duration: 0.1,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut',
        repeatDelay: Math.random() * 3 + 1,
      }),
      gsap.to(params, {
        glitchFrequency: 1,
        duration: 0.05,
        repeat: -1,
        yoyo: true,
        ease: 'none',
      }),
    ]

    const st = ScrollTrigger.create({
      trigger: triggerEl,
      start: 'top top',
      end: 'bottom top',
      scrub: 1,
      onUpdate: (self) => {
        scrollProgressRef.current = self.progress
        setScrollProgress(self.progress)
      },
    })

    const generateFilmGrain = (width: number, height: number, intensity = 0.15) => {
      const imageData = grainCtx.createImageData(width, height)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const grain = (Math.random() - 0.5) * intensity * 255
        data[i] = Math.max(0, Math.min(255, 128 + grain))
        data[i + 1] = Math.max(0, Math.min(255, 128 + grain))
        data[i + 2] = Math.max(0, Math.min(255, 128 + grain))
        data[i + 3] = Math.abs(grain) * 3
      }
      return imageData
    }

    const drawGlitchedOrb = (
      centerX: number,
      centerY: number,
      radius: number,
      hue: number,
      _time: number,
      glitchIntensity: number,
      drawW: number,
      drawH: number,
    ) => {
      ctx.save()

      const shouldGlitch = Math.random() < 0.1 && glitchIntensity > 0.5
      const glitchOffset = shouldGlitch ? (Math.random() - 0.5) * 20 * glitchIntensity : 0
      const glitchScale = shouldGlitch ? 1 + (Math.random() - 0.5) * 0.3 * glitchIntensity : 1

      if (shouldGlitch) {
        ctx.translate(glitchOffset, glitchOffset * 0.8)
        ctx.scale(glitchScale, 1 / glitchScale)
      }

      const orbGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.5)
      orbGradient.addColorStop(0, `hsla(${hue + 10}, 100%, 95%, 0.9)`)
      orbGradient.addColorStop(0.2, `hsla(${hue + 20}, 90%, 80%, 0.7)`)
      orbGradient.addColorStop(0.5, `hsla(${hue}, 70%, 50%, 0.4)`)
      orbGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = orbGradient
      ctx.fillRect(0, 0, drawW, drawH)

      const centerRadius = radius * 0.3
      ctx.fillStyle = `hsla(${hue + 20}, 100%, 95%, 0.8)`
      ctx.beginPath()
      ctx.arc(centerX, centerY, centerRadius, 0, Math.PI * 2)
      ctx.fill()

      if (shouldGlitch) {
        ctx.globalCompositeOperation = 'screen'
        ctx.fillStyle = `hsla(100, 100%, 50%, ${0.6 * glitchIntensity})`
        ctx.beginPath()
        ctx.arc(centerX + glitchOffset * 0.5, centerY, centerRadius, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `hsla(240, 100%, 50%, ${0.5 * glitchIntensity})`
        ctx.beginPath()
        ctx.arc(centerX - glitchOffset * 0.5, centerY, centerRadius, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * glitchIntensity})`
        ctx.lineWidth = 1
        for (let i = 0; i < 5; i++) {
          const y = centerY - radius + Math.random() * radius * 2
          const startX = centerX - radius + Math.random() * 20
          const endX = centerX + radius - Math.random() * 20
          ctx.beginPath()
          ctx.moveTo(startX, y)
          ctx.lineTo(endX, y)
          ctx.stroke()
        }
        ctx.fillStyle = `rgba(255, 0, 255, ${0.4 * glitchIntensity})`
        for (let i = 0; i < 3; i++) {
          const blockX = centerX - radius + Math.random() * radius * 2
          const blockY = centerY - radius + Math.random() * radius * 2
          const blockSize = Math.random() * 10 + 2
          ctx.fillRect(blockX, blockY, blockSize, blockSize)
        }
      }

      ctx.strokeStyle = `hsla(${hue + 20}, 80%, 70%, 0.6)`
      ctx.lineWidth = 2
      if (shouldGlitch) {
        const segments = 8
        for (let i = 0; i < segments; i++) {
          const startAngle = (i / segments) * Math.PI * 2
          const endAngle = ((i + 1) / segments) * Math.PI * 2
          const ringRadius = radius * 1.2 + (Math.random() - 0.5) * 10 * glitchIntensity
          ctx.beginPath()
          ctx.arc(centerX, centerY, ringRadius, startAngle, endAngle)
          ctx.stroke()
        }
      } else {
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius * 1.2, 0, Math.PI * 2)
        ctx.stroke()
      }

      if (shouldGlitch && Math.random() < 0.3) {
        ctx.globalCompositeOperation = 'difference'
        ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * glitchIntensity})`
        for (let i = 0; i < 3; i++) {
          const barY = centerY - radius + Math.random() * radius * 2
          const barHeight = Math.random() * 5 + 1
          ctx.fillRect(centerX - radius, barY, radius * 2, barHeight)
        }
        ctx.globalCompositeOperation = 'source-over'
      }

      ctx.restore()
    }

    const getMonoFont = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--font-site-mono').trim()
      if (v) return v.replace(/^["']|["']$/g, '')
      return 'ui-monospace, monospace'
    }

    let monoFamily = getMonoFont()
    let logicalW = 1
    let logicalH = 1

    const layoutCanvas = () => {
      const w = Math.max(1, wrap.clientWidth)
      const h = Math.max(1, wrap.clientHeight)
      const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      grainCanvas.width = canvas.width
      grainCanvas.height = canvas.height
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      grainCanvas.style.width = `${w}px`
      grainCanvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      grainCtx.setTransform(1, 0, 0, 1, 0, 0)
      monoFamily = getMonoFont()
      logicalW = w
      logicalH = h
    }

    layoutCanvas()

    const render = () => {
      timeRef.current += 0.016
      const time = timeRef.current
      const w = Math.max(1, wrap.clientWidth)
      const h = Math.max(1, wrap.clientHeight)
      if (w !== logicalW || h !== logicalH) {
        layoutCanvas()
      }

      const W = logicalW
      const H = logicalH

      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, W, H)

      const centerX = W / 2
      const centerY = H / 2
      const radius = Math.min(W, H) * 0.2

      const bgGradient = ctx.createRadialGradient(
        centerX,
        centerY - 50,
        0,
        centerX,
        centerY,
        Math.max(W, H) * 0.8,
      )
      const hue = 180 + params.atmosphereShift * 60
      bgGradient.addColorStop(0, `hsla(${hue + 40}, 80%, 60%, 0.4)`)
      bgGradient.addColorStop(0.3, `hsla(${hue}, 60%, 40%, 0.3)`)
      bgGradient.addColorStop(0.6, `hsla(${hue - 20}, 40%, 20%, 0.2)`)
      bgGradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)')
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, W, H)

      drawGlitchedOrb(centerX, centerY, radius, hue, time, params.glitchIntensity, W, H)

      ctx.font = `10px ${monoFamily}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const spacing = 9
      const cols = Math.floor(W / spacing)
      const rows = Math.floor(H / spacing)

      for (let i = 0; i < cols && i < 150; i++) {
        for (let j = 0; j < rows && j < 100; j++) {
          const x = (i - cols / 2) * spacing + centerX
          const y = (j - rows / 2) * spacing + centerY
          const dx = x - centerX
          const dy = y - centerY
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < radius && Math.random() > 0.4) {
            const z = Math.sqrt(Math.max(0, radius * radius - dx * dx - dy * dy))
            const angle = params.rotation
            const rotZ = dx * Math.sin(angle) + z * Math.cos(angle)
            const brightness = (rotZ + radius) / (radius * 2)

            if (rotZ > -radius * 0.3) {
              const charIndex = Math.min(
                density.length - 1,
                Math.max(0, Math.floor(brightness * (density.length - 1))),
              )
              let char = density[charIndex]!
              if (dist < radius * 0.8 && params.glitchIntensity > 0.8 && Math.random() < 0.3) {
                const glitchChars = ['█', '▓', '▒', '░', '▄', '▀', '■', '□']
                char = glitchChars[Math.floor(Math.random() * glitchChars.length)]!
              }
              const alpha = Math.max(0.2, brightness)
              ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
              ctx.fillText(char, x, y)
            }
          }
        }
      }

      grainCtx.setTransform(1, 0, 0, 1, 0, 0)
      grainCtx.clearRect(0, 0, grainCanvas.width, grainCanvas.height)
      const grainIntensity = 0.22 + Math.sin(time * 10) * 0.03
      const grainImageData = generateFilmGrain(grainCanvas.width, grainCanvas.height, grainIntensity)
      grainCtx.putImageData(grainImageData, 0, 0)

      if (params.glitchIntensity > 0.5) {
        grainCtx.globalCompositeOperation = 'screen'
        for (let i = 0; i < 200; i++) {
          const x = Math.random() * grainCanvas.width
          const y = Math.random() * grainCanvas.height
          const size = Math.random() * 3 + 0.5
          const opacity = Math.random() * 0.5 * params.glitchIntensity
          grainCtx.fillStyle = `rgba(255, 255, 255, ${opacity})`
          grainCtx.beginPath()
          grainCtx.arc(x, y, size, 0, Math.PI * 2)
          grainCtx.fill()
        }
      }

      grainCtx.globalCompositeOperation = 'screen'
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * grainCanvas.width
        const y = Math.random() * grainCanvas.height
        const size = Math.random() * 2 + 0.5
        const opacity = Math.random() * 0.3
        grainCtx.fillStyle = `rgba(255, 255, 255, ${opacity})`
        grainCtx.beginPath()
        grainCtx.arc(x, y, size, 0, Math.PI * 2)
        grainCtx.fill()
      }

      grainCtx.globalCompositeOperation = 'multiply'
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * grainCanvas.width
        const y = Math.random() * grainCanvas.height
        const size = Math.random() * 1.5 + 0.5
        const opacity = Math.random() * 0.5 + 0.5
        grainCtx.fillStyle = `rgba(0, 0, 0, ${opacity})`
        grainCtx.beginPath()
        grainCtx.arc(x, y, size, 0, Math.PI * 2)
        grainCtx.fill()
      }

      rafRef.current = requestAnimationFrame(render)
    }

    const ro = new ResizeObserver(() => {
      layoutCanvas()
      ScrollTrigger.refresh()
    })
    ro.observe(wrap)

    rafRef.current = requestAnimationFrame(render)

    return () => {
      ro.disconnect()
      cancelAnimationFrame(rafRef.current)
      tweens.forEach((tw) => tw.kill())
      gsap.killTweensOf(params)
      st.kill()
    }
  }, [props.scrollTriggerRootRef])

  const sp = scrollProgress

  return (
    <div
      ref={rootRef}
      className="relative h-full min-h-0 w-full overflow-hidden bg-black"
    >
      <div ref={wrapRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full bg-black" />
        <canvas
          ref={grainCanvasRef}
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full mix-blend-overlay opacity-60"
        />
      </div>

      <div
        className="funnel-p3-big-title pointer-events-none absolute bottom-[12%] left-0 right-0 z-[20] text-center transition-transform duration-100 ease-out"
        style={{
          transform: `translateY(${sp * 100}px)`,
          opacity: Math.max(0, 1 - sp * 1.5),
        }}
      >
        <span className="funnel-p3-big-title-text">{props.bigTitle}</span>
      </div>

      <div
        className="funnel-p3-side-left pointer-events-none absolute left-4 top-[38%] z-[20] max-w-[150px] transition-transform duration-100 ease-out sm:left-8"
        style={{
          transform: `translateX(${-sp * 200}px)`,
          opacity: Math.max(0, 1 - sp * 2),
        }}
      >
        <p className="funnel-p3-side-text whitespace-pre-line">{props.leftColumn}</p>
      </div>

      <div
        className="funnel-p3-side-right pointer-events-none absolute right-4 top-[38%] z-[20] max-w-[150px] text-right transition-transform duration-100 ease-out sm:right-8"
        style={{
          transform: `translateX(${sp * 200}px)`,
          opacity: Math.max(0, 1 - sp * 2),
        }}
      >
        <p className="funnel-p3-side-text whitespace-pre-line">{props.rightColumn}</p>
      </div>

      {props.footerLine ? (
        <div
          className="funnel-p3-footer pointer-events-none absolute bottom-[6%] left-4 z-[20] transition-transform duration-100 ease-out sm:left-8"
          style={{
            transform: `translateY(${sp * 50}px)`,
            opacity: Math.max(0, 1 - sp * 1.5),
          }}
        >
          <p className="funnel-p3-footer-text">{props.footerLine}</p>
        </div>
      ) : null}
    </div>
  )
}
