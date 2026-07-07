INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_16$references/type6-components/FunnelHeroPageThreeCanvas.md$body_fp_16$, $body_c_16$# FunnelHeroPageThreeCanvas

> Hero / above-the-fold block; use as a cover slide or section opener.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/FunnelHeroPageThreeCanvas.tsx`
- Website source: `apps/website/src/components/feature-pages/FunnelHeroPageThreeCanvas.tsx`
- Import alias: `@/components/feature-pages/FunnelHeroPageThreeCanvas`

## Props

```ts
type FunnelHeroPageThreeProps = {
  scrollTriggerRootRef: RefObject<HTMLElement | null>
  bigTitle: string
  leftColumn: string
  rightColumn: string
  footerLine?: string
}
```

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `duration-100`
- `ease-out`
- `funnel-p3-big-title`
- `funnel-p3-big-title-text`
- `funnel-p3-footer`
- `funnel-p3-footer-text`
- `funnel-p3-side-left`
- `funnel-p3-side-right`
- `funnel-p3-side-text`
- `sm:left-8`
- `sm:right-8`
- `transition-transform`

## Source

```tsx
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

```
$body_c_16$, $body_ct_16$text/markdown$body_ct_16$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_17$references/type6-components/FunnelHeroPageTwoWebGl.md$body_fp_17$, $body_c_17$# FunnelHeroPageTwoWebGl

> Hero / above-the-fold block; use as a cover slide or section opener.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/FunnelHeroPageTwoWebGl.tsx`
- Website source: `apps/website/src/components/feature-pages/FunnelHeroPageTwoWebGl.tsx`
- Import alias: `@/components/feature-pages/FunnelHeroPageTwoWebGl`

## Props

```ts
type FunnelHeroPageTwoProps = {
  trustBadge?: { text: string; icons?: ReactNode[] }
  headline: { line1: string; line2: string }
  subtitle: string
  /** Smaller type + spacing for embedded previews (e.g. studio mockup). */
  compact?: boolean
}
```

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `object-cover`
- `touch-none`

## Source

```tsx
'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'

export type FunnelHeroPageTwoProps = {
  trustBadge?: { text: string; icons?: ReactNode[] }
  headline: { line1: string; line2: string }
  subtitle: string
  /** Smaller type + spacing for embedded previews (e.g. studio mockup). */
  compact?: boolean
}

const defaultShaderSource = `#version 300 es
/*********
* made by Matthias Hurrle (@atzedent)
*
*	To explore strange new worlds, to seek out new life
*	and new civilizations, to boldly go where no man has
*	gone before.
*/
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)
float rnd(vec2 p) {
  p=fract(p*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}
float noise(in vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
  float
  a=rnd(i),
  b=rnd(i+vec2(1,0)),
  c=rnd(i+vec2(0,1)),
  d=rnd(i+1.);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p) {
  float t=.0, a=1.; mat2 m=mat2(1.,-.5,.2,1.2);
  for (int i=0; i<5; i++) {
    t+=a*noise(p);
    p*=2.*m;
    a*=.5;
  }
  return t;
}
float clouds(vec2 p) {
	float d=1., t=.0;
	for (float i=.0; i<3.; i++) {
		float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);
		t=mix(t,d,a);
		d=a;
		p*=2./(i+1.);
	}
	return t;
}
void main(void) {
	vec2 uv=(FC-.5*R)/MN,st=uv*vec2(2,1);
	vec3 col=vec3(0);
	float bg=clouds(vec2(st.x+T*.5,-st.y));
	uv*=1.-.3*(sin(T*.2)*.5+.5);
	for (float i=1.; i<12.; i++) {
		uv+=.1*cos(i*vec2(.1+.01*i, .8)+i*i+T*.5+.1*uv.x);
		vec2 p=uv;
		float d=length(p);
		col+=.00125/d*(cos(sin(i)*vec3(1,2,3))+1.);
		float b=noise(i+p+bg*1.731);
		col+=.002*b/length(max(p,vec2(b*p.x*.02,p.y)));
		col=mix(col,vec3(bg*.25,bg*.137,bg*.05),d);
	}
	O=vec4(col,1);
}`

class GlShaderRenderer {
  private canvas: HTMLCanvasElement
  private gl: WebGL2RenderingContext
  private program: WebGLProgram | null = null
  private vs: WebGLShader | null = null
  private fs: WebGLShader | null = null
  private buffer: WebGLBuffer | null = null
  private shaderSource: string
  private mouseMove = [0, 0]
  private mouseCoords = [0, 0]
  private pointerCoords = [0, 0]
  private nbrOfPointers = 0

  private vertexSrc = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`

  private vertices = [-1, 1, -1, -1, 1, 1, 1, -1]

  private uniformResolution: WebGLUniformLocation | null = null
  private uniformTime: WebGLUniformLocation | null = null
  private uniformMove: WebGLUniformLocation | null = null
  private uniformTouch: WebGLUniformLocation | null = null
  private uniformPointerCount: WebGLUniformLocation | null = null
  private uniformPointers: WebGLUniformLocation | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('webgl2')
    if (!ctx) throw new Error('WebGL2 required')
    this.gl = ctx
    this.shaderSource = defaultShaderSource
  }

  updateShader(source: string) {
    this.reset()
    this.shaderSource = source
    this.setup()
    this.init()
  }

  updateMove(deltas: number[]) {
    this.mouseMove = deltas
  }

  updateMouse(coords: number[]) {
    this.mouseCoords = coords
  }

  updatePointerCoords(coords: number[]) {
    this.pointerCoords = coords
  }

  updatePointerCount(nbr: number) {
    this.nbrOfPointers = nbr
  }

  compile(shader: WebGLShader, source: string) {
    const gl = this.gl
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader))
    }
  }

  test(source: string) {
    let result: string | null = null
    const gl = this.gl
    const shader = gl.createShader(gl.FRAGMENT_SHADER)
    if (!shader) return 'no shader'
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      result = gl.getShaderInfoLog(shader)
    }
    gl.deleteShader(shader)
    return result
  }

  reset() {
    const gl = this.gl
    if (this.program && !gl.getProgramParameter(this.program, gl.DELETE_STATUS)) {
      if (this.vs) {
        gl.detachShader(this.program, this.vs)
        gl.deleteShader(this.vs)
      }
      if (this.fs) {
        gl.detachShader(this.program, this.fs)
        gl.deleteShader(this.fs)
      }
      gl.deleteProgram(this.program)
    }
    this.vs = null
    this.fs = null
    this.program = null
  }

  setup() {
    const gl = this.gl
    this.vs = gl.createShader(gl.VERTEX_SHADER)
    this.fs = gl.createShader(gl.FRAGMENT_SHADER)
    if (!this.vs || !this.fs) return
    this.compile(this.vs, this.vertexSrc)
    this.compile(this.fs, this.shaderSource)
    this.program = gl.createProgram()
    if (!this.program) return
    gl.attachShader(this.program, this.vs)
    gl.attachShader(this.program, this.fs)
    gl.linkProgram(this.program)
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(this.program))
    }
  }

  init() {
    const gl = this.gl
    const program = this.program
    if (!program) return

    this.buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW)

    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    this.uniformResolution = gl.getUniformLocation(program, 'resolution')
    this.uniformTime = gl.getUniformLocation(program, 'time')
    this.uniformMove = gl.getUniformLocation(program, 'move')
    this.uniformTouch = gl.getUniformLocation(program, 'touch')
    this.uniformPointerCount = gl.getUniformLocation(program, 'pointerCount')
    this.uniformPointers = gl.getUniformLocation(program, 'pointers')
  }

  resizeViewport() {
    const gl = this.gl
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
  }

  render(now = 0) {
    const gl = this.gl
    const program = this.program
    if (!program || gl.getProgramParameter(program, gl.DELETE_STATUS)) return

    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    if (this.buffer) gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)

    if (this.uniformResolution) gl.uniform2f(this.uniformResolution, this.canvas.width, this.canvas.height)
    if (this.uniformTime) gl.uniform1f(this.uniformTime, now * 1e-3)
    if (this.uniformMove) gl.uniform2f(this.uniformMove, this.mouseMove[0], this.mouseMove[1])
    if (this.uniformTouch) gl.uniform2f(this.uniformTouch, this.mouseCoords[0], this.mouseCoords[1])
    if (this.uniformPointerCount) gl.uniform1i(this.uniformPointerCount, this.nbrOfPointers)
    if (this.uniformPointers) {
      const pc = this.pointerCoords.length >= 2 ? this.pointerCoords : [0, 0]
      gl.uniform2fv(this.uniformPointers, new Float32Array(pc))
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
}

class GlPointerHandler {
  private canvas: HTMLCanvasElement
  private active = false
  private pointers = new Map<number, number[]>()
  private lastCoords = [0, 0]
  private moves = [0, 0]

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas

    const map = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const x = (clientX - rect.left) * (canvas.width / rect.width)
      const y = canvas.height - (clientY - rect.top) * (canvas.height / rect.height)
      return [x, y]
    }

    canvas.addEventListener('pointerdown', (e) => {
      this.active = true
      this.pointers.set(e.pointerId, map(e.clientX, e.clientY))
    })

    canvas.addEventListener('pointerup', (e) => {
      if (this.count === 1) {
        this.lastCoords = [...this.first]
      }
      this.pointers.delete(e.pointerId)
      this.active = this.pointers.size > 0
    })

    canvas.addEventListener('pointerleave', (e) => {
      if (this.count === 1) {
        this.lastCoords = [...this.first]
      }
      this.pointers.delete(e.pointerId)
      this.active = this.pointers.size > 0
    })

    canvas.addEventListener('pointermove', (e) => {
      if (!this.active) return
      const m = map(e.clientX, e.clientY)
      this.lastCoords = [...m]
      this.pointers.set(e.pointerId, m)
      this.moves = [this.moves[0] + e.movementX, this.moves[1] + e.movementY]
    })
  }

  get count() {
    return this.pointers.size
  }

  get move() {
    return this.moves
  }

  get coords() {
    return this.pointers.size > 0 ? Array.from(this.pointers.values()).flat() : [0, 0]
  }

  get first(): number[] {
    const v = this.pointers.values().next().value
    return v ? [...v] : [...this.lastCoords]
  }
}

function sizeCanvasToContainer(canvas: HTMLCanvasElement, w: number, h: number) {
  const dpr = Math.max(1, 0.5 * (typeof window !== 'undefined' ? window.devicePixelRatio : 1))
  canvas.width = Math.max(1, Math.floor(w * dpr))
  canvas.height = Math.max(1, Math.floor(h * dpr))
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
}

export function FunnelHeroPageTwoWebGl(props: FunnelHeroPageTwoProps) {
  const compact = props.compact === true
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<GlShaderRenderer | null>(null)
  const pointersRef = useRef<GlPointerHandler | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return

    let renderer: GlShaderRenderer
    try {
      renderer = new GlShaderRenderer(canvas)
    } catch {
      return
    }
    rendererRef.current = renderer
    pointersRef.current = new GlPointerHandler(canvas)

    const layout = () => {
      const w = root.clientWidth
      const h = root.clientHeight
      sizeCanvasToContainer(canvas, w, h)
      renderer.resizeViewport()
    }

    const loop = (now: number) => {
      const r = rendererRef.current
      const p = pointersRef.current
      if (!r || !p) return
      r.updateMouse(p.first)
      r.updatePointerCount(p.count)
      r.updatePointerCoords(p.coords)
      r.updateMove(p.move)
      r.render(now)
      rafRef.current = requestAnimationFrame(loop)
    }

    renderer.setup()
    renderer.init()
    layout()

    if (renderer.test(defaultShaderSource) === null) {
      renderer.updateShader(defaultShaderSource)
    }

    rafRef.current = requestAnimationFrame(loop)

    const ro = new ResizeObserver(() => layout())
    ro.observe(root)
    window.addEventListener('resize', layout)

    return () => {
      window.removeEventListener('resize', layout)
      ro.disconnect()
      cancelAnimationFrame(rafRef.current)
      rendererRef.current?.reset()
      rendererRef.current = null
      pointersRef.current = null
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className="relative h-full min-h-0 w-full overflow-hidden bg-black"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none object-cover"
        style={{ background: 'black' }}
      />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-white">
        {props.trustBadge && (
          <div className={`funnel-p2-fade-in-down ${compact ? 'mb-4 sm:mb-5' : 'mb-6 sm:mb-8'}`}>
            <div
              className={`funnel-p2-trust-badge flex items-center gap-2 rounded-full border ${compact ? 'px-3 py-1.5 text-[10px] sm:px-4 sm:py-2 sm:text-xs' : 'px-5 py-2.5 text-sm sm:px-6 sm:py-3'}`}
            >
              {props.trustBadge.icons && props.trustBadge.icons.length > 0 && (
                <div className="flex gap-0.5">
                  {props.trustBadge.icons.map((icon, index) => (
                    <span
                      key={index}
                      className={
                        index === 0
                          ? 'funnel-p2-icon-a'
                          : index === 1
                            ? 'funnel-p2-icon-b'
                            : 'funnel-p2-icon-c'
                      }
                    >
                      {icon}
                    </span>
                  ))}
                </div>
              )}
              <span className={`funnel-p2-trust-text ${compact ? 'font-medium' : ''}`}>
                {props.trustBadge.text}
              </span>
            </div>
          </div>
        )}

        <div
          className={`mx-auto w-full px-4 text-center sm:px-6 ${compact ? 'max-w-lg space-y-3' : 'max-w-7xl space-y-5 sm:space-y-6'}`}
        >
          <div className={compact ? 'space-y-1' : 'space-y-1 sm:space-y-2'}>
            <h2
              className={`funnel-p2-h1-a funnel-p2-fade-in-up funnel-p2-delay-200 font-bold leading-tight ${compact ? 'text-xl sm:text-2xl md:text-3xl' : 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl'}`}
            >
              {props.headline.line1}
            </h2>
            <h2
              className={`funnel-p2-h1-b funnel-p2-fade-in-up funnel-p2-delay-400 font-bold leading-tight ${compact ? 'text-xl sm:text-2xl md:text-3xl' : 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl'}`}
            >
              {props.headline.line2}
            </h2>
          </div>

          <div
            className={`funnel-p2-fade-in-up funnel-p2-delay-600 mx-auto w-full ${compact ? 'max-w-md' : 'max-w-5xl'}`}
          >
            <p
              className={`funnel-p2-subtitle font-light leading-relaxed ${compact ? 'text-[11px] sm:text-xs' : 'text-base sm:text-lg md:text-xl lg:text-2xl'}`}
            >
              {props.subtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

```
$body_c_17$, $body_ct_17$text/markdown$body_ct_17$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_18$references/type6-components/FunnelHeroStack.md$body_fp_18$, $body_c_18$# FunnelHeroStack

> Hero / above-the-fold block; use as a cover slide or section opener.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/FunnelHeroStack.tsx`
- Website source: `apps/website/src/components/feature-pages/FunnelHeroStack.tsx`
- Import alias: `@/components/feature-pages/FunnelHeroStack`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `lg:block`
- `lg:hidden`
- `lg:min-h-[270vh]`
- `shrink-0`
- `sticky`

## Source

```tsx
'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Globe, Lock, Zap } from 'lucide-react'
import { FunnelHeroPageOneWebGpu } from '@/components/feature-pages/FunnelHeroPageOneWebGpu'
import { FunnelHeroPageThreeCanvas } from '@/components/feature-pages/FunnelHeroPageThreeCanvas'
import { FunnelHeroPageTwoWebGl } from '@/components/feature-pages/FunnelHeroPageTwoWebGl'

export function FunnelHeroStack(props: { kicker: string; title: string; subtitle: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const peelDistance = 1000
  const peel1 = useTransform(scrollYProgress, [0, 0.32], [0, peelDistance])
  const peel2 = useTransform(scrollYProgress, [0, 0.36, 0.68], [0, 0, peelDistance])

  const layer1Opacity = useTransform(scrollYProgress, [0, 0.28, 0.38], [1, 1, 0])
  const layer2Opacity = useTransform(scrollYProgress, [0, 0.62, 0.76], [1, 1, 0])
  const layer1PointerEvents = useTransform(layer1Opacity, (o) => (o < 0.02 ? 'none' : 'auto'))
  const layer2PointerEvents = useTransform(layer2Opacity, (o) => (o < 0.02 ? 'none' : 'auto'))

  const scrollExplore = () => {
    window.scrollBy({
      top: window.innerHeight * 0.75,
      behavior: 'smooth',
    })
  }

  const pageOne = (
    <FunnelHeroPageOneWebGpu
      kicker={props.kicker}
      title={props.title}
      subtitle={props.subtitle}
      onScrollExplore={scrollExplore}
    />
  )

  const pageTwo = (
    <FunnelHeroPageTwoWebGl
      trustBadge={{
        text: 'Your brand, your domain',
        icons: [
          <Globe key="globe" size={14} />,
          <Lock key="lock" size={14} />,
          <Zap key="zap" size={14} />,
        ],
      }}
      headline={{ line1: 'One-click publish.', line2: 'Your custom domain.' }}
      subtitle="Go live on Vibey infrastructure or connect your own domain. SSL, DNS, and hosting handled automatically: just hit publish."
    />
  )

  const pageThree = (
    <FunnelHeroPageThreeCanvas
      scrollTriggerRootRef={containerRef}
      bigTitle="MEASURE"
      leftColumn={'SEO-ready pages.\nMeta tags & structured\ndata ship automatically.'}
      rightColumn={'Built-in analytics.\nConversions, visits &\nalerts in real time.'}
      footerLine="Industry-grade templates from conversation"
    />
  )

  const layerKeys = ['page-1-webgpu', 'page-2-webgl', 'page-3-canvas'] as const

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="pointer-events-none relative min-h-0 w-full lg:min-h-[270vh]"
      >
        <div className="w-full">
          <div className="relative min-h-0 lg:min-h-[270vh]">
            <div className="pointer-events-auto sticky top-0 z-0 flex min-h-[100dvh] w-full flex-col items-stretch">
              <div className="relative min-h-0 w-full flex-1">
                <div className="relative mx-auto h-[100dvh] min-h-0 w-full">
                  <div className="hidden lg:block">
                    <motion.div
                      key={layerKeys[0]}
                      className="absolute inset-0 w-full"
                      style={{
                        y: peel1,
                        opacity: layer1Opacity,
                        zIndex: 30,
                        pointerEvents: layer1PointerEvents,
                      }}
                    >
                      {pageOne}
                    </motion.div>
                    <motion.div
                      key={layerKeys[1]}
                      className="absolute inset-0 w-full"
                      style={{
                        y: peel2,
                        opacity: layer2Opacity,
                        zIndex: 20,
                        pointerEvents: layer2PointerEvents,
                      }}
                    >
                      {pageTwo}
                    </motion.div>
                    <div
                      key={layerKeys[2]}
                      className="absolute inset-0 w-full"
                      style={{ zIndex: 10 }}
                    >
                      {pageThree}
                    </div>
                  </div>

                  <div className="pointer-events-auto flex flex-col gap-0 lg:hidden">
                    <div className="relative h-[100dvh] min-h-0 w-full shrink-0 overflow-hidden">
                      {pageOne}
                    </div>
                    <div className="relative h-[100dvh] min-h-0 w-full shrink-0 overflow-hidden">
                      {pageTwo}
                    </div>
                    <div className="relative h-[100dvh] min-h-0 w-full shrink-0 overflow-hidden">
                      {pageThree}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

```
$body_c_18$, $body_ct_18$text/markdown$body_ct_18$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_19$references/type6-components/FunnelRegisterPagePreview.md$body_fp_19$, $body_c_19$# FunnelRegisterPagePreview

> Artifact preview (ad / funnel / email); use as slide body.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/capabilities-carousel-previews/FunnelRegisterPagePreview.tsx`
- Website source: `apps/website/src/components/marketing/capabilities-carousel-previews/FunnelRegisterPagePreview.tsx`
- Import alias: `@/components/marketing/capabilities-carousel-previews/FunnelRegisterPagePreview`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```


## Source

```tsx
/**
 * Funnel — opt-in landing page with hero, checklist, and registration form.
 * Matches funnel-builder skill output: premium TSX, theme-driven, conversion-focused.
 * Designed to fit 100% of the carousel card without downscaling.
 */
export function FunnelRegisterPagePreview() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#0A0A0A',
        fontFamily: '"Inter", system-ui, sans-serif',
        containerType: 'inline-size',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 95% 55% at 15% 0%, rgba(16,185,129,0.16) 0%, transparent 55%), radial-gradient(ellipse 70% 45% at 100% 100%, rgba(16,185,129,0.09) 0%, transparent 55%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: 'rgba(16,185,129,0.14)',
          borderBottom: '1px solid rgba(16,185,129,0.25)',
          padding: '8px 12px',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <span
          style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: 11,
            color: '#10B981',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          Live Training Event — April 16, 2026
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          boxSizing: 'border-box',
          height: '100%',
          width: '100%',
          padding: 'max(14px, min(3.2cqi, 26px)) max(12px, min(2.8cqi, 22px))',
          paddingTop: 'calc(max(14px, min(3.2cqi, 26px)) + 36px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'max(14px, min(3cqi, 22px))',
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: 'max(10px, min(2.4cqi, 18px))',
            minWidth: 0,
            flexShrink: 0,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 'max(1.65rem, min(8.25cqi + 0.5rem, 2.85rem))',
              fontWeight: 900,
              color: '#F5F5F5',
              lineHeight: 1.06,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
            }}
          >
            STOP LOSING LEADS
            <br />
            ON <span style={{ color: '#10B981' }}>COLD TRAFFIC</span>
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 'max(0.875rem, min(2.35cqi + 0.5rem, 1.0625rem))',
              color: 'rgba(245,245,245,0.65)',
              lineHeight: 1.45,
              maxWidth: 'none',
            }}
          >
            The exact funnel system that helped 200+ founders build a self-running pipeline —
            without writing a single line of code.
          </p>
        </div>

        <div style={{ flexShrink: 0, width: '100%', minWidth: 0 }}>
          <div
            style={{
              background:
                'linear-gradient(145deg, rgba(20,20,20,0.95) 0%, rgba(12,12,12,0.98) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: 'max(14px, min(3cqi, 22px))',
              borderRadius: 18,
              boxShadow: '0 24px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <h2
              style={{
                fontSize: 'max(0.75rem, min(1.8cqi + 0.45rem, 0.9rem))',
                fontWeight: 800,
                color: '#F5F5F5',
                margin: '0 0 max(10px, min(1.8cqi, 14px))',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              CLAIM YOUR SPOT
            </h2>
            {['Work Email', 'Company'].map((label) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(245,245,245,0.45)',
                    marginBottom: 7,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    fontWeight: 600,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    height: 48,
                    background: '#141414',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                  }}
                />
              </div>
            ))}
            <div
              style={{
                marginTop: 18,
                background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
                color: '#fff',
                textAlign: 'center',
                padding: 'max(12px, min(2cqi, 16px)) 12px',
                fontWeight: 800,
                fontSize: 'max(0.78rem, min(1.5cqi + 0.48rem, 0.88rem))',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: 12,
                boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
              }}
            >
              REGISTER NOW →
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

```
$body_c_19$, $body_ct_19$text/markdown$body_ct_19$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_20$references/type6-components/FunnelStackBrowserCard.md$body_fp_20$, $body_c_20$# FunnelStackBrowserCard

> Single card module; use inline within a larger slide.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/FunnelStackBrowserCard.tsx`
- Website source: `apps/website/src/components/feature-pages/FunnelStackBrowserCard.tsx`
- Import alias: `@/components/feature-pages/FunnelStackBrowserCard`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `grayscale`
- `lg:h-[min(82vh,760px)]`
- `lg:rounded-2xl`
- `self-center`
- `shrink-0`
- `sm:gap-10`
- `sm:gap-3`
- `sm:gap-8`
- `sm:mb-3`
- `sm:mb-6`
- `sm:mb-8`
- `sm:pb-6`
- `sm:pt-9`
- `sm:px-4`
- `sm:px-6`
- `sm:px-8`
- `sm:py-3`
- `sm:py-5`
- `sm:text-[10px]`
- `sm:text-[11px]`
- `sm:text-[12px]`
- `sm:text-base`
- `sm:text-lg`
- `sm:text-xl`
- `truncate`
- `typo-caption`

## Source

```tsx
import type { ReactNode } from 'react'
import { Globe, LayoutTemplate } from 'lucide-react'

export type FunnelStackCardContent = {
  url: string
  funnelLabel: string
  pill: string
  headline: string
  headlineLine2?: string
  subcopy: string
  ctaLabel: string
  variant: 'draft' | 'live' | 'analytics'
}

function LandingChrome({
  content,
  children,
}: {
  content: FunnelStackCardContent
  children: ReactNode
}) {
  return (
    <div className="mockup-frame flex h-[min(78vh,720px)] w-full flex-col overflow-hidden rounded-xl lg:h-[min(82vh,760px)] lg:rounded-2xl">
      <div className="mockup-chrome shrink-0">
        <div className="mockup-dots">
          <span />
          <span />
          <span />
        </div>
        <div className="mockup-url truncate">{content.url}</div>
      </div>

      <div className="mockup-toolbar shrink-0">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <LayoutTemplate size={14} className="shrink-0 text-color-muted" />
          <span className="truncate text-[12px] font-medium text-white">{content.funnelLabel}</span>
          {content.variant === 'draft' && (
            <span className="border-color-glass shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-color-muted">
              Draft
            </span>
          )}
          {(content.variant === 'live' || content.variant === 'analytics') && (
            <span className="mockup-badge-emerald shrink-0 px-2 py-0.5">
              <span className="mockup-dot-active" />
              <span className="text-color-emerald text-[10px]">Live</span>
            </span>
          )}
        </div>
        {(content.variant === 'live' || content.variant === 'analytics') && (
          <div className="mockup-btn-publish shrink-0 px-3 py-1">
            <Globe size={12} className="text-color-emerald" />
            <span className="text-color-emerald text-[11px] font-medium">Publish</span>
          </div>
        )}
      </div>

      <div className="bg-color-deep-darker flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}

export function FunnelStackBrowserCard({
  content,
  embeddedHero,
}: {
  content: FunnelStackCardContent
  embeddedHero?: { kicker: string; title: string; subtitle: string }
}) {
  return (
    <LandingChrome content={content}>
      <div className="mockup-preview-gradient flex min-h-0 flex-1 flex-col px-5 pb-5 pt-7 text-center sm:px-8 sm:pb-6 sm:pt-9">
        {embeddedHero ? (
          <>
            {embeddedHero.kicker ? (
              <span className="typo-caption text-secondary mb-2 block font-semibold uppercase tracking-widest sm:mb-3">
                {embeddedHero.kicker}
              </span>
            ) : null}
            <h4 className="mb-2 text-base font-bold uppercase leading-tight tracking-tight text-white sm:mb-3 sm:text-lg md:text-xl">
              {embeddedHero.title}
            </h4>
            <p className="text-color-muted mx-auto mb-5 max-w-md text-[11px] leading-relaxed sm:mb-6 sm:text-[12px]">
              {embeddedHero.subtitle}
            </p>
          </>
        ) : (
          <>
            <div className="mockup-pill-emerald mb-3 inline-block self-center px-3 py-0.5 text-[10px] sm:text-[11px]">
              {content.pill}
            </div>
            <h4 className="mb-2 text-lg font-bold leading-tight tracking-tight text-white sm:text-xl">
              {content.headline}
              {content.headlineLine2 ? (
                <>
                  <br />
                  {content.headlineLine2}
                </>
              ) : null}
            </h4>
            <p className="text-color-muted mx-auto mb-5 max-w-sm text-[11px] leading-relaxed sm:mb-6 sm:text-[12px]">
              {content.subcopy}
            </p>
          </>
        )}
        <div className="mockup-btn-emerald mb-6 inline-block self-center px-6 py-2.5 text-[11px] sm:mb-8 sm:px-8 sm:py-3 sm:text-[12px]">
          {content.ctaLabel}
        </div>

        {content.variant === 'draft' && (
          <div className="border-color-glass-dim mt-auto border-t px-2 py-4 sm:py-5">
            <p className="text-color-dimmer mb-3 text-[9px] font-medium uppercase tracking-widest sm:text-[10px]">
              Sections ready to ship
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {['Hero', 'Social proof', 'FAQ', 'Footer CTA'].map((label) => (
                <span
                  key={label}
                  className="border-color-glass rounded-lg border bg-white/5 px-2.5 py-1 text-[9px] text-color-muted sm:text-[10px]"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {content.variant === 'live' && (
          <div className="border-color-glass-dim mt-auto border-t px-4 py-4 text-center sm:px-6 sm:py-5">
            <p className="text-color-dimmer mb-3 text-[9px] font-medium uppercase tracking-widest sm:text-[10px]">
              Trusted by founders at
            </p>
            <div className="flex items-center justify-center gap-6 opacity-40 grayscale sm:gap-8">
              {['YC', 'Techstars', '500'].map((name) => (
                <span key={name} className="text-[11px] font-bold tracking-tight text-white sm:text-[12px]">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {content.variant === 'analytics' && (
          <div className="border-color-glass-dim mt-auto space-y-4 border-t px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
              {[
                { k: 'Views', v: '12.4k' },
                { k: 'Leads', v: '842' },
                { k: 'CVR', v: '4.2%' },
              ].map(({ k, v }) => (
                <div key={k} className="text-center">
                  <p className="text-sm font-semibold text-white sm:text-base">{v}</p>
                  <p className="text-color-dimmer text-[9px] uppercase tracking-wider sm:text-[10px]">{k}</p>
                </div>
              ))}
            </div>
            <div className="border-color-glass rounded-lg border bg-white/5 px-3 py-2.5 text-left sm:px-4">
              <p className="text-color-dimmer mb-1 text-[9px] font-medium uppercase tracking-wider">Latest signups</p>
              <p className="text-color-muted text-[10px] leading-relaxed sm:text-[11px]">
                alex@company.com · 2m ago · <span className="text-color-emerald">Confirmed</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </LandingChrome>
  )
}

export const FUNNEL_HERO_STACK_CARDS: FunnelStackCardContent[] = [
  {
    variant: 'live',
    url: 'your-funnel.govibey.com',
    funnelLabel: 'Lead Gen Funnel',
    pill: 'Live in workspace',
    headline: 'Stop Losing Leads.',
    headlineLine2: 'Start Automating Sales.',
    subcopy:
      'The same page your visitors see-forms and opt-ins wired to your workspace the moment you publish.',
    ctaLabel: 'Get the Free Playbook',
  },
  {
    variant: 'analytics',
    url: 'your-funnel.govibey.com',
    funnelLabel: 'Lead Gen Funnel',
    pill: 'Ship & measure',
    headline: 'Built to rank.',
    headlineLine2: 'Built to convert.',
    subcopy:
      'Semantic structure for search, built-in performance metrics, and alerts when someone converts-so every revision compounds.',
    ctaLabel: 'See live funnel',
  },
]

```
$body_c_20$, $body_ct_20$text/markdown$body_ct_20$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_21$references/type6-components/IntegrationKnowledgeIndexerMockup.md$body_fp_21$, $body_c_21$# IntegrationKnowledgeIndexerMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/IntegrationKnowledgeIndexerMockup.tsx`
- Website source: `apps/website/src/components/marketing/IntegrationKnowledgeIndexerMockup.tsx`
- Import alias: `@/components/marketing/IntegrationKnowledgeIndexerMockup`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `!min-h-[400px]`
- `filter`
- `object-contain`
- `object-cover`
- `transition-transform`

## Source

```tsx
'use client'

import React, { useId } from 'react'
import { VIBEY_MARKETING_PORTRAIT_FALLBACK } from '@/lib/agent-library-fallback'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

const INTEGRATIONS = [
  { id: 'ig', logo: '/Integrations/Instagram.png', label: 'Instagram', side: 'left' as const },
  { id: 'hubspot', logo: '/Integrations/HubSpot.png', label: 'HubSpot', side: 'left' as const },
  { id: 'github', logo: '/Integrations/GitHub.png', label: 'GitHub', side: 'left' as const },
  { id: 'gmail', logo: '/Integrations/Gmail.png', label: 'Gmail', side: 'right' as const },
  { id: 'slack', logo: '/Integrations/Slack.png', label: 'Slack', side: 'right' as const },
  { id: 'stripe', logo: '/Integrations/Stripe.png', label: 'Stripe', side: 'right' as const, logoScale: 1.3 },
]

/** Same line + purple pulse treatment as `MarketingOrgConnectorLines` (Meet your specialists). */
const INTEGRATION_CONNECTOR_PATHS = [
  'M 15 25 Q 35 25 50 50',
  'M 15 50 H 50',
  'M 15 75 Q 35 75 50 50',
  'M 85 25 Q 65 25 50 50',
  'M 85 50 H 50',
  'M 85 75 Q 65 75 50 50',
] as const

function IntegrationConnectorLines() {
  const uid = useId()
  const g = (suffix: string) => `${uid.replace(/:/g, '')}-${suffix}`

  return (
    <svg
      className="text-color-dimmer pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <radialGradient id={g('purple-grad')} fx="1">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        {INTEGRATION_CONNECTOR_PATHS.map((d, i) => (
          <mask key={i} id={g(`mask-${i}`)}>
            <path d={d} strokeWidth="1" stroke="white" fill="none" />
          </mask>
        ))}
      </defs>

      <g stroke="currentColor" fill="none" strokeWidth="0.4" strokeDasharray="100 100" pathLength="100">
        {INTEGRATION_CONNECTOR_PATHS.map((d, i) => (
          <path key={i} id={g(`path-${i}`)} d={d}>
            <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" fill="freeze" />
          </path>
        ))}
      </g>

      {INTEGRATION_CONNECTOR_PATHS.map((_, idx) => (
        <g key={idx} mask={`url(#${g(`mask-${idx}`)})`}>
          <circle r="6" fill={`url(#${g('purple-grad')})`}>
            <animateMotion dur="2s" repeatCount="indefinite" begin={`${idx * 0.5}s`}>
              <mpath href={`#${g(`path-${idx}`)}`} />
            </animateMotion>
          </circle>
        </g>
      ))}
    </svg>
  )
}

export function IntegrationKnowledgeIndexerMockup(props?: { vibeyPortraitUrl?: string }) {
  const vibeySrc = props?.vibeyPortraitUrl?.trim() || VIBEY_MARKETING_PORTRAIT_FALLBACK

  return (
    <FeatureFloatingMockShell className="!min-h-[400px]">
      <div className="relative flex h-full min-h-[400px] w-full items-center justify-center p-8">
        <IntegrationConnectorLines />

        {/* Central Vibey Agent */}
        <div className="relative z-20">
          <div className="border-color-glass h-20 w-20 overflow-hidden rounded-full border">
            <img src={vibeySrc} alt="Vibey CEO" className="h-full w-full object-cover" />
          </div>
        </div>

        {/* Integration Nodes - Left Side */}
        <div className="absolute inset-y-0 left-8 flex flex-col justify-around py-12">
          {INTEGRATIONS.filter((i) => i.side === 'left').map((item) => (
            <div key={item.id} className="relative z-20 flex flex-col items-center gap-2">
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white p-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] ring-1 ring-black/5 transition-transform hover:scale-110">
                <img 
                  src={item.logo} 
                  alt="" 
                  className="h-full w-full object-contain filter" 
                  style={{ transform: (item as any).logoScale ? `scale(${(item as any).logoScale})` : 'scale(1)' }}
                />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Integration Nodes - Right Side */}
        <div className="absolute inset-y-0 right-8 flex flex-col justify-around py-12">
          {INTEGRATIONS.filter((i) => i.side === 'right').map((item) => (
            <div key={item.id} className="relative z-20 flex flex-col items-center gap-2">
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white p-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] ring-1 ring-black/5 transition-transform hover:scale-110">
                <img 
                  src={item.logo} 
                  alt="" 
                  className="h-full w-full object-contain filter" 
                  style={{ transform: (item as any).logoScale ? `scale(${(item as any).logoScale})` : 'scale(1)' }}
                />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </FeatureFloatingMockShell>
  )
}

```
$body_c_21$, $body_ct_21$text/markdown$body_ct_21$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_22$references/type6-components/IntegrationPermissionScoperMockup.md$body_fp_22$, $body_c_22$# IntegrationPermissionScoperMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/IntegrationPermissionScoperMockup.tsx`
- Website source: `apps/website/src/components/marketing/IntegrationPermissionScoperMockup.tsx`
- Import alias: `@/components/marketing/IntegrationPermissionScoperMockup`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `!bg-[#1a1a1a]`
- `!bg-white/[0.03]`
- `!min-h-[500px]`
- `-translate-x-1/2`
- `body-1`
- `body-2`
- `body-3`
- `button-glass-neutral`
- `card-glass`
- `card-glass-user`
- `chip-glass-blue`
- `dropdown-menu-solid`
- `group`
- `input-glass`
- `object-contain`
- `studio-app-preview-root`
- `transition-colors`
- `typo-caption`

## Source

```tsx
'use client'

import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Mic, Paperclip, Settings2 } from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

const INTEGRATIONS = [
  { id: 'meta', name: 'Meta', logo: '/Integrations/Meta.png', enabled: true },
  {
    id: 'stripe',
    name: 'Stripe',
    logo: '/Integrations/Stripe.png',
    enabled: false,
    logoScale: 1.3,
  },
  { id: 'slack', name: 'Slack', logo: '/Integrations/Slack.png', enabled: true },
  { id: 'hubspot', name: 'HubSpot', logo: '/Integrations/HubSpot.png', enabled: true },
]

export function IntegrationPermissionScoperMockup() {
  return (
    <FeatureFloatingMockShell className="!min-h-[500px]">
      <div className="studio-app-preview-root relative flex h-full min-h-[500px] w-full flex-col p-6">
        {/* Chat History Area */}
        <div className="mb-8 flex-1 space-y-6 overflow-hidden pt-4">
          {/* User Message */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-end"
          >
            <div className="card-glass card-glass-user max-w-[80%] px-4 py-2">
              <p className="body-2 font-normal text-white">Can you get my Stripe payment data?</p>
            </div>
          </motion.div>

          {/* Assistant Message */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="flex flex-col items-start"
          >
            <div className="body-1 text-chat px-spacing-2 group flex max-w-[90%] flex-col">
              <div className="gap-spacing-3 flex flex-col">
                <p className="body-2 font-normal leading-relaxed text-white/90">
                  <strong className="font-bold">I can&apos;t access your Stripe</strong> right now
                  as it&apos;s disconnected, but I do have access to your Meta, Slack, and HubSpot
                  data to proceed with the mission.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Chat Input Area (Pixel Perfect Replica) */}
        <div className="relative mt-auto">
          {/* Actual Input Replica */}
          <div className="input-glass flex flex-col rounded-2xl border border-white/10 !bg-white/[0.03] shadow-2xl">
            <div className="px-4 pb-1 pt-3">
              <p className="body-2 font-normal text-white/30">Message Vibe...</p>
            </div>

            <div className="mt-2 flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-1.5">
                {/* Model Button */}
                <div className="chip-glass-blue flex h-8 items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 text-[11px] font-medium text-blue-400">
                  <span className="typo-caption font-medium">Auto</span>
                  <ChevronDown size={12} className="opacity-60" />
                </div>

                {/* Attach Button */}
                <div className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40">
                  <Paperclip size={14} />
                </div>

                {/* Integration Button (Active) with Dropdown aligned to it */}
                <div className="relative">
                  {/* Integration Dropdown (Open State) — centered above button via wrapper */}
                  <div className="absolute bottom-[calc(100%+12px)] left-1/2 z-[100] w-64 -translate-x-1/2">
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, delay: 1.5 }}
                      className="dropdown-menu-solid w-full rounded-xl border border-white/10 !bg-[#1a1a1a] shadow-2xl shadow-black/50"
                    >
                      <div className="py-1">
                        {INTEGRATIONS.map((int) => (
                          <div
                            key={int.id}
                            className="px-spacing-3 py-spacing-2 flex items-center justify-between transition-colors hover:bg-white/[0.03]"
                          >
                            <div className="gap-spacing-2 flex items-center">
                              <div className="flex h-6 w-6 items-center justify-center">
                                <div className="flex h-5 w-5 items-center justify-center overflow-hidden rounded bg-white p-0.5 shadow-sm">
                                  <img
                                    src={int.logo}
                                    alt={int.name}
                                    className="h-full w-full object-contain"
                                    style={{
                                      transform: int.logoScale ? `scale(${int.logoScale})` : 'none',
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="body-3 font-medium text-white/95">{int.name}</span>
                            </div>

                            {/* Switch Replica */}
                            <div
                              className={`switch-glass-primary relative inline-flex h-5 w-9 items-center overflow-hidden rounded-full transition-colors ${!int.enabled ? 'border-white/10 !bg-white/5' : ''}`}
                              aria-checked={int.enabled}
                            >
                              <span
                                className={`switch-glass-primary-thumb inline-block h-4 w-4 transform rounded-full transition-transform ${int.enabled ? 'translate-x-4 bg-white' : 'translate-x-1 bg-white/20'}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-white/5 bg-white/[0.02]">
                        <button className="body-3 w-full py-2.5 text-center font-medium text-white/40 transition-colors hover:text-white">
                          Manage All Integrations
                        </button>
                      </div>
                    </motion.div>
                  </div>

                  <div className="flex h-8 items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/20 px-2.5 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                    <Settings2 size={14} />
                    <span className="typo-caption font-bold">3</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <div className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40">
                  <Mic size={14} />
                </div>
                <div className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/20">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Polish */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.05),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.005),rgba(0,0,255,0.01))] bg-[length:100%_2px,3px_100%] opacity-[0.03]" />
    </FeatureFloatingMockShell>
  )
}

```
$body_c_22$, $body_ct_22$text/markdown$body_ct_22$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
