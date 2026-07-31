const FALLBACK = '\x1b[100m'

function blend(
  foreground: [number, number, number],
  background: [number, number, number],
  alpha: number,
): [number, number, number] {
  return [
    Math.round(foreground[0] * alpha + background[0] * (1 - alpha)),
    Math.round(foreground[1] * alpha + background[1] * (1 - alpha)),
    Math.round(foreground[2] * alpha + background[2] * (1 - alpha)),
  ]
}

function toAnsi(red: number, green: number, blue: number): string {
  const colorTerm = process.env.COLORTERM ?? ''
  if (colorTerm.includes('truecolor') || colorTerm.includes('24bit')) {
    return `\x1b[48;2;${red};${green};${blue}m`
  }
  const redIndex = Math.round((red / 255) * 5)
  const greenIndex = Math.round((green / 255) * 5)
  const blueIndex = Math.round((blue / 255) * 5)
  return `\x1b[48;5;${16 + 36 * redIndex + 6 * greenIndex + blueIndex}m`
}

function queryTerminalBackground(timeoutMs = 200): Promise<[number, number, number] | null> {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve(null)
      return
    }

    const wasRaw = process.stdin.isRaw
    let buffer = ''
    const cleanup = () => {
      clearTimeout(timer)
      process.stdin.off('data', onData)
      process.stdin.setRawMode(wasRaw)
      process.stdin.pause()
    }
    const onData = (data: Buffer) => {
      buffer += data.toString()
      const match = buffer.match(/\x1b\]11;rgb:([0-9a-fA-F]+)\/([0-9a-fA-F]+)\/([0-9a-fA-F]+)/)
      if (!match) return
      cleanup()
      resolve([
        Number.parseInt(match[1]?.slice(0, 2) ?? '00', 16),
        Number.parseInt(match[2]?.slice(0, 2) ?? '00', 16),
        Number.parseInt(match[3]?.slice(0, 2) ?? '00', 16),
      ])
    }
    const timer = setTimeout(() => {
      cleanup()
      resolve(null)
    }, timeoutMs)

    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('data', onData)
    process.stdout.write('\x1b]11;?\x07')
  })
}

export async function detectBackground(): Promise<string> {
  const background = await queryTerminalBackground()
  if (!background) return FALLBACK
  const [red, green, blue] = background
  const light = 0.299 * red + 0.587 * green + 0.114 * blue > 128
  const [blendedRed, blendedGreen, blendedBlue] = blend(
    light ? [0, 0, 0] : [255, 255, 255],
    background,
    light ? 0.04 : 0.12,
  )
  return toAnsi(blendedRed, blendedGreen, blendedBlue)
}
