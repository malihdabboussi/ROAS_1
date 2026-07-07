const SAMPLE_RATE = 24000

export class AudioPlaybackQueue {
  private ctx: AudioContext | null = null
  private queue: AudioBuffer[] = []
  private playing = false
  private nextStartTime = 0
  private currentSource: AudioBufferSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private analyserData: Uint8Array<ArrayBuffer> | null = null
  private _onStateChange: ((playing: boolean) => void) | null = null

  set onStateChange(cb: ((playing: boolean) => void) | null) {
    this._onStateChange = cb
  }

  async init(): Promise<void> {
    if (this.ctx) return
    this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE })
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.8
    this.analyser.connect(this.ctx.destination)
    this.analyserData = new Uint8Array(this.analyser.frequencyBinCount)
  }

  enqueue(pcmBytes: ArrayBuffer): void {
    if (!this.ctx || !this.analyser) return

    const int16 = new Int16Array(pcmBytes)
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i]! / 32768
    }

    const buffer = this.ctx.createBuffer(1, float32.length, SAMPLE_RATE)
    buffer.getChannelData(0).set(float32)
    this.queue.push(buffer)

    if (!this.playing) {
      this.playing = true
      this._onStateChange?.(true)
      this.nextStartTime = this.ctx.currentTime
      this.scheduleNext()
    }
  }

  private scheduleNext(): void {
    if (!this.ctx || !this.analyser || this.queue.length === 0) {
      this.playing = false
      this._onStateChange?.(false)
      this.currentSource = null
      return
    }

    const buffer = this.queue.shift()!
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.connect(this.analyser)
    this.currentSource = source

    const startTime = Math.max(this.nextStartTime, this.ctx.currentTime)
    source.start(startTime)
    this.nextStartTime = startTime + buffer.duration

    source.onended = () => {
      if (this.currentSource === source) {
        this.scheduleNext()
      }
    }
  }

  flush(): void {
    this.queue.length = 0
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch {}
      this.currentSource = null
    }
    this.playing = false
    this._onStateChange?.(false)
    if (this.ctx) {
      this.nextStartTime = this.ctx.currentTime
    }
  }

  getAmplitude(): number {
    if (!this.analyser || !this.analyserData || !this.playing) return 0
    this.analyser.getByteFrequencyData(this.analyserData)
    let sum = 0
    for (let i = 0; i < this.analyserData.length; i++) {
      sum += this.analyserData[i]!
    }
    return sum / (this.analyserData.length * 255)
  }

  isPlaying(): boolean {
    return this.playing
  }

  destroy(): void {
    this.flush()
    if (this.ctx) {
      this.ctx.close().catch(() => {})
      this.ctx = null
    }
    this.analyser = null
    this.analyserData = null
  }
}
