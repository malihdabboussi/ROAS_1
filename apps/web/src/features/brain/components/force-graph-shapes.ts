export function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const px = x + r * Math.cos(angle)
    const py = y + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

export function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.lineTo(x + r, y)
  ctx.lineTo(x, y + r)
  ctx.lineTo(x - r, y)
  ctx.closePath()
}

export function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const w = r * 2
  const h = r * 2
  const rx = 4
  const left = x - w / 2
  const top = y - h / 2
  ctx.beginPath()
  ctx.moveTo(left + rx, top)
  ctx.lineTo(left + w - rx, top)
  ctx.quadraticCurveTo(left + w, top, left + w, top + rx)
  ctx.lineTo(left + w, top + h - rx)
  ctx.quadraticCurveTo(left + w, top + h, left + w - rx, top + h)
  ctx.lineTo(left + rx, top + h)
  ctx.quadraticCurveTo(left, top + h, left, top + h - rx)
  ctx.lineTo(left, top + rx)
  ctx.quadraticCurveTo(left, top, left + rx, top)
  ctx.closePath()
}
