'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

const LIGHT_CLEAR_BG: readonly [number, number, number] = [250 / 255, 249 / 255, 246 / 255]
const DARK_CLEAR_BG: readonly [number, number, number] = [0, 0, 0]

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
  private clearRgb: readonly [number, number, number] = DARK_CLEAR_BG

  setClear(rgb: readonly [number, number, number]) {
    this.clearRgb = rgb
  }

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

    gl.clearColor(this.clearRgb[0], this.clearRgb[1], this.clearRgb[2], 1)
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
  const { resolvedTheme } = useTheme()
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
    renderer.setClear(resolvedTheme === 'light' ? LIGHT_CLEAR_BG : DARK_CLEAR_BG)
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
  }, [resolvedTheme])

  return (
    <div
      ref={rootRef}
      className="relative h-full min-h-0 w-full overflow-hidden bg-[var(--bg-deep)]"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none object-cover"
        style={{ background: 'var(--bg-deep)' }}
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
