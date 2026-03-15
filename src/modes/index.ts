// ═══════════════════════════════════════════
// PULSEKIT — 30 Render Modes
// ═══════════════════════════════════════════

import type { PulseState, PulseMode, ColorPalette, PulseConfig } from '../types'

type RenderFn = (ctx: CanvasRenderingContext2D, W: number, H: number, s: PulseState, p: ColorPalette, c: PulseConfig) => void

const TAU = Math.PI * 2

function drawLabel(ctx: CanvasRenderingContext2D, W: number, H: number, s: PulseState, p: ColorPalette, c: Required<PulseConfig>) {
  if (c.showValue) {
    const text = c.formatValue(s.displayValue) + (c.unit ? ' ' + c.unit : '')
    ctx.font = `600 ${Math.min(W, H) * 0.2}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = p.fg
    ctx.fillText(text, W / 2, H / 2)
  }
  if (c.label) {
    ctx.font = `400 ${Math.min(W, H) * 0.08}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillStyle = p.text
    ctx.fillText(c.label, W / 2, H - Math.min(W, H) * 0.08)
  }
}

const modes: Record<PulseMode, RenderFn> = {

  // 1. Ring — circular progress
  ring(ctx, W, H, s, p, c) {
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.38
    const lineW = r * 0.15
    const startAngle = -Math.PI / 2
    const endAngle = startAngle + TAU * s.displayNormalized

    // Track
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU)
    ctx.strokeStyle = p.grid; ctx.lineWidth = lineW; ctx.lineCap = 'round'; ctx.stroke()

    // Fill
    if (s.displayNormalized > 0.001) {
      ctx.beginPath(); ctx.arc(cx, cy, r, startAngle, endAngle)
      ctx.strokeStyle = p.primary; ctx.lineWidth = lineW; ctx.lineCap = 'round'; ctx.stroke()
      if ((c as any).glow) {
        ctx.shadowColor = p.primary; ctx.shadowBlur = 12
        ctx.beginPath(); ctx.arc(cx, cy, r, startAngle, endAngle)
        ctx.strokeStyle = p.primary; ctx.lineWidth = lineW * 0.5; ctx.stroke()
        ctx.shadowBlur = 0
      }
    }
    drawLabel(ctx, W, H, s, p, c as Required<PulseConfig>)
  },

  // 2. Gauge — semicircle needle
  gauge(ctx, W, H, s, p, c) {
    const cx = W / 2, cy = H * 0.6, r = Math.min(W, H) * 0.4
    const startA = Math.PI, endA = TAU
    const needleAngle = startA + (endA - startA) * s.displayNormalized

    // Track arc
    ctx.beginPath(); ctx.arc(cx, cy, r, startA, endA)
    ctx.strokeStyle = p.grid; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round'; ctx.stroke()

    // Filled arc
    ctx.beginPath(); ctx.arc(cx, cy, r, startA, needleAngle)
    ctx.strokeStyle = p.primary; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round'; ctx.stroke()

    // Needle
    const nx = cx + Math.cos(needleAngle) * r * 0.85
    const ny = cy + Math.sin(needleAngle) * r * 0.85
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny)
    ctx.strokeStyle = p.fg; ctx.lineWidth = 2; ctx.stroke()

    // Center dot
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, TAU)
    ctx.fillStyle = p.primary; ctx.fill()

    drawLabel(ctx, W, H, s, p, c as Required<PulseConfig>)
  },

  // 3. Bar — horizontal level
  bar(ctx, W, H, s, p, c) {
    const pad = W * 0.1, barH = H * 0.25, y = H / 2 - barH / 2
    const barW = (W - pad * 2) * s.displayNormalized

    // Track
    ctx.fillStyle = p.grid
    ctx.beginPath(); roundRect(ctx, pad, y, W - pad * 2, barH, barH / 2); ctx.fill()

    // Fill
    if (barW > 0) {
      ctx.fillStyle = p.primary
      ctx.beginPath(); roundRect(ctx, pad, y, Math.max(barH, barW), barH, barH / 2); ctx.fill()
      if ((c as any).glow) { ctx.shadowColor = p.primary; ctx.shadowBlur = 8; ctx.beginPath(); roundRect(ctx, pad, y, barW, barH, barH / 2); ctx.fill(); ctx.shadowBlur = 0 }
    }
    drawLabel(ctx, W, H, s, p, c as Required<PulseConfig>)
  },

  // 4. Spark — mini sparkline
  spark(ctx, W, H, s, p) {
    const hist = s.history, pad = 8
    if (hist.length < 2) return
    const step = (W - pad * 2) / (hist.length - 1)

    ctx.beginPath()
    for (let i = 0; i < hist.length; i++) {
      const x = pad + i * step, y = H - pad - hist[i] * (H - pad * 2)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.strokeStyle = p.primary; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke()

    // Fill gradient
    const lastX = pad + (hist.length - 1) * step
    ctx.lineTo(lastX, H - pad); ctx.lineTo(pad, H - pad); ctx.closePath()
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, p.primary + '30'); grad.addColorStop(1, p.primary + '00')
    ctx.fillStyle = grad; ctx.fill()

    // Live dot
    const lx = lastX, ly = H - pad - hist[hist.length - 1] * (H - pad * 2)
    ctx.beginPath(); ctx.arc(lx, ly, 3, 0, TAU); ctx.fillStyle = p.primary; ctx.fill()
    if ((s as any).time) { const pulse = 1 + Math.sin(s.time * 4) * 0.3; ctx.beginPath(); ctx.arc(lx, ly, 3 * pulse + 2, 0, TAU); ctx.fillStyle = p.glow; ctx.fill() }
  },

  // 5. Ticker — big animated number
  ticker(ctx, W, H, s, p, c) {
    const text = (c as any).formatValue(s.displayValue) + ((c as any).unit ? ' ' + (c as any).unit : '')
    const size = Math.min(W, H) * 0.35
    ctx.font = `700 ${size}px system-ui, sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = p.fg; ctx.fillText(text, W / 2, H / 2)

    // Momentum indicator
    if (s.momentum !== 'flat') {
      ctx.font = `500 ${size * 0.3}px system-ui`
      ctx.fillStyle = s.momentum === 'up' ? p.up : p.down
      ctx.fillText(s.momentum === 'up' ? '▲' : '▼', W / 2, H / 2 + size * 0.55)
    }
    if ((c as any).label) { ctx.font = `400 ${size * 0.2}px system-ui`; ctx.fillStyle = p.text; ctx.fillText((c as any).label, W / 2, H / 2 - size * 0.5) }
  },

  // 6. Delta — change badge
  delta(ctx, W, H, s, p) {
    const size = Math.min(W, H)
    const color = s.momentum === 'up' ? p.up : s.momentum === 'down' ? p.down : p.muted

    // Arrow
    const arrowSize = size * 0.25
    const cx = W / 2, cy = H / 2 - arrowSize * 0.3
    if (s.momentum !== 'flat') {
      const dir = s.momentum === 'up' ? -1 : 1
      ctx.beginPath()
      ctx.moveTo(cx, cy + dir * arrowSize * -0.5)
      ctx.lineTo(cx - arrowSize * 0.4, cy + dir * arrowSize * 0.3)
      ctx.lineTo(cx + arrowSize * 0.4, cy + dir * arrowSize * 0.3)
      ctx.closePath(); ctx.fillStyle = color; ctx.fill()
    }

    // Value
    ctx.font = `600 ${size * 0.15}px system-ui`
    ctx.textAlign = 'center'; ctx.fillStyle = color
    ctx.fillText((s.momentum === 'up' ? '+' : '') + s.displayValue.toFixed(1), cx, cy + arrowSize * 0.8)
  },

  // 7. Dot — breathing presence
  dot(ctx, W, H, s, p) {
    const cx = W / 2, cy = H / 2
    const baseR = Math.min(W, H) * 0.15
    const breath = 1 + Math.sin(s.time * 2) * 0.15 * s.displayNormalized
    const r = baseR * breath * (0.5 + s.displayNormalized * 0.5)

    // Glow
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3)
    grad.addColorStop(0, p.primary + '20'); grad.addColorStop(1, p.primary + '00')
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)

    // Dot
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU)
    ctx.fillStyle = p.primary; ctx.fill()
  },

  // 8. Wave — sine waveform
  wave(ctx, W, H, s, p) {
    const freq = 2 + s.displayNormalized * 6
    const amp = H * 0.3 * s.displayNormalized
    ctx.beginPath()
    for (let x = 0; x <= W; x += 2) {
      const y = H / 2 + Math.sin(x / W * freq * TAU + s.time * 3) * amp
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.strokeStyle = p.primary; ctx.lineWidth = 2; ctx.stroke()

    // Fill
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
    const grad = ctx.createLinearGradient(0, H / 2 - amp, 0, H)
    grad.addColorStop(0, p.primary + '20'); grad.addColorStop(1, p.primary + '00')
    ctx.fillStyle = grad; ctx.fill()
  },

  // 9. Heat — color intensity cell
  heat(ctx, W, H, s, p) {
    const [r, g, b] = p.primaryRgb
    const alpha = 0.1 + s.displayNormalized * 0.8
    const pad = Math.min(W, H) * 0.1
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
    ctx.beginPath(); roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, Math.min(W, H) * 0.08); ctx.fill()
    drawLabel(ctx, W, H, s, p, {} as any)
  },

  // 10. Meter — vertical VU meter
  meter(ctx, W, H, s, p) {
    const segs = 12, pad = W * 0.25, segH = (H - 20) / segs, gap = 2
    const lit = Math.floor(s.displayNormalized * segs)

    for (let i = 0; i < segs; i++) {
      const y = H - 10 - (i + 1) * segH
      const ratio = i / segs
      let color = p.grid
      if (i < lit) {
        if (ratio > 0.8) color = p.danger
        else if (ratio > 0.6) color = p.warn
        else color = p.primary
      }
      ctx.fillStyle = color
      ctx.beginPath(); roundRect(ctx, pad, y + gap, W - pad * 2, segH - gap * 2, 2); ctx.fill()
    }
  },

  // 11. Needle — full circle dial
  needle(ctx, W, H, s, p) {
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.4
    const angle = -Math.PI * 0.75 + s.displayNormalized * Math.PI * 1.5

    // Outer ring
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.strokeStyle = p.grid; ctx.lineWidth = 2; ctx.stroke()

    // Ticks
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI * 0.75 + (i / 10) * Math.PI * 1.5
      const inner = r * 0.85, outer = r * 0.95
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner)
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer)
      ctx.strokeStyle = p.muted; ctx.lineWidth = 1; ctx.stroke()
    }

    // Needle
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * r * 0.8, cy + Math.sin(angle) * r * 0.8)
    ctx.lineTo(cx + Math.cos(angle + Math.PI + 0.1) * 6, cy + Math.sin(angle + Math.PI + 0.1) * 6)
    ctx.lineTo(cx + Math.cos(angle + Math.PI - 0.1) * 6, cy + Math.sin(angle + Math.PI - 0.1) * 6)
    ctx.closePath(); ctx.fillStyle = p.primary; ctx.fill()

    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, TAU); ctx.fillStyle = p.primary; ctx.fill()
    drawLabel(ctx, W, H, s, p, {} as any)
  },

  // 12. Heartbeat — ECG trace
  heartbeat(ctx, W, H, s, p) {
    const hist = s.history
    if (hist.length < 2) return
    const step = W / (hist.length - 1)
    const midY = H / 2, amp = H * 0.35

    ctx.beginPath()
    for (let i = 0; i < hist.length; i++) {
      const x = i * step
      // Create ECG-like peaks at random intervals based on value
      const phase = (i / 8 + s.time * 2) % 1
      let y = midY
      if (phase < 0.1) y = midY - amp * hist[i] * (phase / 0.1)
      else if (phase < 0.15) y = midY + amp * 0.3 * hist[i]
      else if (phase < 0.25) y = midY - amp * 1.2 * hist[i] * ((0.25 - phase) / 0.1)
      else y = midY + Math.sin(phase * 20) * 2

      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.strokeStyle = p.primary; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke()

    // Glow on latest point
    const lx = (hist.length - 1) * step
    ctx.beginPath(); ctx.arc(lx, midY, 4, 0, TAU); ctx.fillStyle = p.primary; ctx.fill()
    ctx.shadowColor = p.primary; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(lx, midY, 3, 0, TAU); ctx.fillStyle = p.primary; ctx.fill(); ctx.shadowBlur = 0
  },

  // 13. Spectrum — frequency bars
  spectrum(ctx, W, H, s, p) {
    const bars = 16, gap = 3, barW = (W - gap * (bars + 1)) / bars
    for (let i = 0; i < bars; i++) {
      const baseH = s.displayNormalized * 0.5 + Math.sin(s.time * 3 + i * 0.7) * 0.3 * s.displayNormalized + Math.cos(s.time * 2 + i * 1.3) * 0.15
      const h = Math.max(2, Math.abs(baseH) * (H - 10))
      const x = gap + i * (barW + gap), y = H - 5 - h
      const [r, g, b] = p.primaryRgb
      const alpha = 0.4 + (h / H) * 0.6
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
      ctx.beginPath(); roundRect(ctx, x, y, barW, h, 2); ctx.fill()
    }
  },

  // 14. Bubble — breathing circle
  bubble(ctx, W, H, s, p) {
    const cx = W / 2, cy = H / 2
    const maxR = Math.min(W, H) * 0.4
    const breath = 1 + Math.sin(s.time * 1.5) * 0.05
    const r = maxR * s.displayNormalized * breath

    // Outer glow
    const grad = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.5)
    grad.addColorStop(0, p.primary + '15'); grad.addColorStop(1, p.primary + '00')
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)

    // Bubble
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(4, r), 0, TAU)
    ctx.fillStyle = p.primary + '30'; ctx.fill()
    ctx.strokeStyle = p.primary; ctx.lineWidth = 2; ctx.stroke()

    // Highlight
    ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.15, 0, TAU)
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill()

    drawLabel(ctx, W, H, s, p, {} as any)
  },

  // 15. Radar — rotating sweep
  radar(ctx, W, H, s, p) {
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.4
    const sweepAngle = (s.time * 1.5) % TAU

    // Rings
    for (let i = 1; i <= 3; i++) ctx.beginPath(), ctx.arc(cx, cy, r * i / 3, 0, TAU), ctx.strokeStyle = p.grid, ctx.lineWidth = 1, ctx.stroke()
    // Cross
    ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r)
    ctx.strokeStyle = p.grid; ctx.lineWidth = 1; ctx.stroke()

    // Sweep
    const grad = ctx.createConicGradient(sweepAngle, cx, cy)
    grad.addColorStop(0, p.primary + '30'); grad.addColorStop(0.15, p.primary + '00'); grad.addColorStop(1, p.primary + '00')
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = grad; ctx.fill()

    // Blips based on value
    const blips = Math.floor(s.displayNormalized * 5) + 1
    for (let i = 0; i < blips; i++) {
      const ba = (i * 2.3 + 1) % TAU, bd = r * (0.3 + (i * 0.17) % 0.6)
      const age = ((sweepAngle - ba + TAU) % TAU) / TAU
      if (age < 0.4) {
        ctx.beginPath(); ctx.arc(cx + Math.cos(ba) * bd, cy + Math.sin(ba) * bd, 3, 0, TAU)
        ctx.fillStyle = p.primary + Math.round((1 - age / 0.4) * 200).toString(16).padStart(2, '0'); ctx.fill()
      }
    }
  },

  // 16. Signal — wifi bars
  signal(ctx, W, H, s, p) {
    const bars = 5, maxH = H * 0.6, barW = W * 0.08, gap = barW * 0.8
    const totalW = bars * barW + (bars - 1) * gap
    const startX = (W - totalW) / 2, baseY = H * 0.75
    const lit = Math.ceil(s.displayNormalized * bars)

    for (let i = 0; i < bars; i++) {
      const h = maxH * ((i + 1) / bars)
      const x = startX + i * (barW + gap), y = baseY - h
      ctx.fillStyle = i < lit ? p.primary : p.grid
      ctx.beginPath(); roundRect(ctx, x, y, barW, h, 2); ctx.fill()
    }
  },

  // 17. Battery — charge level
  battery(ctx, W, H, s, p) {
    const bW = W * 0.55, bH = H * 0.3, x = (W - bW) / 2, y = (H - bH) / 2
    const tipW = bW * 0.04, tipH = bH * 0.3, pad = 3

    // Shell
    ctx.strokeStyle = p.muted; ctx.lineWidth = 2
    ctx.beginPath(); roundRect(ctx, x, y, bW, bH, 4); ctx.stroke()
    // Tip
    ctx.fillStyle = p.muted
    ctx.beginPath(); roundRect(ctx, x + bW, y + (bH - tipH) / 2, tipW, tipH, 1); ctx.fill()

    // Fill
    const fillW = (bW - pad * 2) * s.displayNormalized
    if (fillW > 0) {
      ctx.fillStyle = s.displayNormalized < 0.2 ? p.danger : s.displayNormalized < 0.4 ? p.warn : p.primary
      ctx.beginPath(); roundRect(ctx, x + pad, y + pad, fillW, bH - pad * 2, 2); ctx.fill()
    }

    drawLabel(ctx, W, H, s, p, {} as any)
  },

  // 18. Equalizer — bouncing columns
  equalizer(ctx, W, H, s, p) {
    const bars = 8, gap = 4, barW = (W - gap * (bars + 1)) / bars
    for (let i = 0; i < bars; i++) {
      const phase = Math.sin(s.time * 4 + i * 1.1) * 0.5 + 0.5
      const h = (H - 16) * s.displayNormalized * (0.3 + phase * 0.7)
      const x = gap + i * (barW + gap), y = H - 8 - h
      const [r, g, b] = p.primaryRgb
      ctx.fillStyle = `rgba(${r},${g},${b},${0.5 + phase * 0.5})`
      ctx.beginPath(); roundRect(ctx, x, y, barW, h, barW / 2); ctx.fill()
    }
  },

  // 19. Pendulum — swinging bob
  pendulum(ctx, W, H, s, p) {
    const cx = W / 2, pivotY = H * 0.1
    const length = H * 0.6
    const speed = 0.5 + s.displayNormalized * 3
    const angle = Math.sin(s.time * speed) * 0.8 * s.displayNormalized
    const bobX = cx + Math.sin(angle) * length
    const bobY = pivotY + Math.cos(angle) * length
    const bobR = Math.min(W, H) * 0.06

    // String
    ctx.beginPath(); ctx.moveTo(cx, pivotY); ctx.lineTo(bobX, bobY)
    ctx.strokeStyle = p.muted; ctx.lineWidth = 1.5; ctx.stroke()

    // Bob
    ctx.beginPath(); ctx.arc(bobX, bobY, bobR, 0, TAU)
    ctx.fillStyle = p.primary; ctx.fill()

    // Pivot
    ctx.beginPath(); ctx.arc(cx, pivotY, 3, 0, TAU); ctx.fillStyle = p.muted; ctx.fill()

    // Trail ghost
    for (let i = 1; i <= 3; i++) {
      const pastAngle = Math.sin((s.time - i * 0.05) * speed) * 0.8 * s.displayNormalized
      const px = cx + Math.sin(pastAngle) * length, py = pivotY + Math.cos(pastAngle) * length
      ctx.beginPath(); ctx.arc(px, py, bobR * 0.6, 0, TAU); ctx.fillStyle = p.primary + Math.round(40 - i * 12).toString(16).padStart(2, '0'); ctx.fill()
    }
  },

  // 20. Ripple — expanding rings
  ripple(ctx, W, H, s, p) {
    const cx = W / 2, cy = H / 2
    const maxR = Math.min(W, H) * 0.45
    const ringCount = 4

    for (let i = 0; i < ringCount; i++) {
      const phase = ((s.time * (0.5 + s.displayNormalized) + i * 0.25) % 1)
      const r = phase * maxR
      const alpha = (1 - phase) * 0.4 * s.displayNormalized
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU)
      ctx.strokeStyle = `rgba(${p.primaryRgb.join(',')},${alpha})`
      ctx.lineWidth = 2; ctx.stroke()
    }

    // Center dot
    const pulse = 1 + Math.sin(s.time * 3) * 0.2
    ctx.beginPath(); ctx.arc(cx, cy, 4 * pulse, 0, TAU); ctx.fillStyle = p.primary; ctx.fill()
  },

  // 21. Orbit — orbiting dot
  orbit(ctx, W, H, s, p) {
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.35
    const speed = 0.3 + s.displayNormalized * 2
    const angle = s.time * speed

    // Orbit path
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.strokeStyle = p.grid; ctx.lineWidth = 1; ctx.stroke()

    // Trail
    for (let i = 0; i < 10; i++) {
      const ta = angle - i * 0.15
      const tx = cx + Math.cos(ta) * r, ty = cy + Math.sin(ta) * r
      ctx.beginPath(); ctx.arc(tx, ty, 3 - i * 0.25, 0, TAU)
      ctx.fillStyle = p.primary + Math.round(200 - i * 20).toString(16).padStart(2, '0'); ctx.fill()
    }

    // Dot
    const dx = cx + Math.cos(angle) * r, dy = cy + Math.sin(angle) * r
    ctx.beginPath(); ctx.arc(dx, dy, 5, 0, TAU); ctx.fillStyle = p.primary; ctx.fill()

    // Center
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU); ctx.fillStyle = p.muted; ctx.fill()
  },

  // 22. Flame — fire columns
  flame(ctx, W, H, s, p) {
    const cols = 7, gap = 4, colW = (W - gap * (cols + 1)) / cols
    for (let i = 0; i < cols; i++) {
      const centerDist = Math.abs(i - (cols - 1) / 2) / ((cols - 1) / 2)
      const base = s.displayNormalized * (1 - centerDist * 0.4)
      const flicker = Math.sin(s.time * 8 + i * 2.3) * 0.15 + Math.cos(s.time * 5 + i * 3.7) * 0.1
      const h = Math.max(4, (base + flicker) * (H - 12))
      const x = gap + i * (colW + gap), y = H - 6 - h

      const grad = ctx.createLinearGradient(x, y, x, y + h)
      grad.addColorStop(0, '#ef4444' + '80'); grad.addColorStop(0.4, '#f97316' + 'c0'); grad.addColorStop(1, '#fbbf24' + 'ff')
      ctx.fillStyle = grad
      ctx.beginPath(); roundRect(ctx, x, y, colW, h, colW / 2); ctx.fill()
    }
  },

  // 23. Tide — water level
  tide(ctx, W, H, s, p) {
    const waterY = H - H * s.displayNormalized * 0.8

    // Water body
    ctx.beginPath(); ctx.moveTo(0, waterY)
    for (let x = 0; x <= W; x += 3) {
      const wave = Math.sin(x * 0.03 + s.time * 2) * 6 + Math.sin(x * 0.06 + s.time * 1.5) * 3
      ctx.lineTo(x, waterY + wave)
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
    const grad = ctx.createLinearGradient(0, waterY, 0, H)
    grad.addColorStop(0, p.primary + '40'); grad.addColorStop(1, p.primary + '15')
    ctx.fillStyle = grad; ctx.fill()

    // Surface line
    ctx.beginPath(); ctx.moveTo(0, waterY)
    for (let x = 0; x <= W; x += 3) {
      ctx.lineTo(x, waterY + Math.sin(x * 0.03 + s.time * 2) * 6 + Math.sin(x * 0.06 + s.time * 1.5) * 3)
    }
    ctx.strokeStyle = p.primary; ctx.lineWidth = 2; ctx.stroke()
  },

  // 24. Compass — heading dial
  compass(ctx, W, H, s, p) {
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.38
    const heading = s.displayNormalized * TAU

    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.strokeStyle = p.grid; ctx.lineWidth = 2; ctx.stroke()

    // Ticks
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU - Math.PI / 2
      const inner = r * (i % 3 === 0 ? 0.8 : 0.9)
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner)
      ctx.lineTo(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95)
      ctx.strokeStyle = i % 3 === 0 ? p.fg : p.muted; ctx.lineWidth = i % 3 === 0 ? 2 : 1; ctx.stroke()
    }

    // Needle (north = red, south = dim)
    const na = heading - Math.PI / 2
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(na) * r * 0.7, cy + Math.sin(na) * r * 0.7)
    ctx.lineTo(cx + Math.cos(na + 0.15) * 4, cy + Math.sin(na + 0.15) * 4)
    ctx.lineTo(cx + Math.cos(na - 0.15) * 4, cy + Math.sin(na - 0.15) * 4)
    ctx.closePath(); ctx.fillStyle = p.danger; ctx.fill()

    ctx.beginPath(); ctx.moveTo(cx + Math.cos(na + Math.PI) * r * 0.5, cy + Math.sin(na + Math.PI) * r * 0.5)
    ctx.lineTo(cx + Math.cos(na + Math.PI + 0.15) * 4, cy + Math.sin(na + Math.PI + 0.15) * 4)
    ctx.lineTo(cx + Math.cos(na + Math.PI - 0.15) * 4, cy + Math.sin(na + Math.PI - 0.15) * 4)
    ctx.closePath(); ctx.fillStyle = p.muted; ctx.fill()

    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, TAU); ctx.fillStyle = p.fg; ctx.fill()
  },

  // 25. Thermometer — tube
  thermometer(ctx, W, H, s, p) {
    const tubeW = W * 0.12, tubeH = H * 0.6, bulbR = tubeW * 1.2
    const cx = W / 2, tubeTop = H * 0.1, tubeBot = tubeTop + tubeH
    const fillH = tubeH * s.displayNormalized

    // Tube
    ctx.beginPath(); roundRect(ctx, cx - tubeW / 2, tubeTop, tubeW, tubeH, tubeW / 2)
    ctx.strokeStyle = p.grid; ctx.lineWidth = 2; ctx.stroke()

    // Bulb
    ctx.beginPath(); ctx.arc(cx, tubeBot + bulbR * 0.5, bulbR, 0, TAU)
    ctx.fillStyle = p.primary; ctx.fill()

    // Mercury fill
    if (fillH > 0) {
      ctx.fillStyle = p.primary
      ctx.beginPath(); roundRect(ctx, cx - tubeW / 2 + 3, tubeBot - fillH, tubeW - 6, fillH, (tubeW - 6) / 2); ctx.fill()
    }

    // Ticks
    for (let i = 0; i <= 5; i++) {
      const y = tubeBot - (i / 5) * tubeH
      ctx.beginPath(); ctx.moveTo(cx + tubeW / 2 + 4, y); ctx.lineTo(cx + tubeW / 2 + 10, y)
      ctx.strokeStyle = p.muted; ctx.lineWidth = 1; ctx.stroke()
    }
  },

  // 26. Clock — analog hand
  clock(ctx, W, H, s, p) {
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.4
    const angle = -Math.PI / 2 + s.displayNormalized * TAU

    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.strokeStyle = p.grid; ctx.lineWidth = 2; ctx.stroke()

    // Hour marks
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU - Math.PI / 2
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85, 2, 0, TAU)
      ctx.fillStyle = p.muted; ctx.fill()
    }

    // Hand
    ctx.beginPath(); ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(angle) * r * 0.7, cy + Math.sin(angle) * r * 0.7)
    ctx.strokeStyle = p.primary; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke()

    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, TAU); ctx.fillStyle = p.primary; ctx.fill()
  },

  // 27. Progress — linear with glow
  progress(ctx, W, H, s, p) {
    const pad = W * 0.08, barH = H * 0.12, y = H / 2 - barH / 2
    const barW = (W - pad * 2)
    const fillW = barW * s.displayNormalized

    ctx.fillStyle = p.grid
    ctx.beginPath(); roundRect(ctx, pad, y, barW, barH, barH / 2); ctx.fill()

    if (fillW > barH) {
      ctx.fillStyle = p.primary
      ctx.beginPath(); roundRect(ctx, pad, y, fillW, barH, barH / 2); ctx.fill()

      // Shimmer
      const shimmerX = pad + ((s.time * 0.5) % 1) * fillW
      const grad = ctx.createLinearGradient(shimmerX - 30, 0, shimmerX + 30, 0)
      grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.15)'); grad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = grad
      ctx.beginPath(); roundRect(ctx, pad, y, fillW, barH, barH / 2); ctx.fill()
    }
    drawLabel(ctx, W, H, s, p, {} as any)
  },

  // 28. Arc — thick arc segment
  arc(ctx, W, H, s, p) {
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.38, lineW = r * 0.25
    const gap = 0.3
    const start = Math.PI / 2 + gap, end = Math.PI * 2.5 - gap
    const sweepAngle = start + (end - start) * s.displayNormalized

    ctx.beginPath(); ctx.arc(cx, cy, r, start, end)
    ctx.strokeStyle = p.grid; ctx.lineWidth = lineW; ctx.lineCap = 'round'; ctx.stroke()

    if (s.displayNormalized > 0.001) {
      ctx.beginPath(); ctx.arc(cx, cy, r, start, sweepAngle)
      ctx.strokeStyle = p.primary; ctx.lineWidth = lineW; ctx.lineCap = 'round'; ctx.stroke()
    }
    drawLabel(ctx, W, H, s, p, {} as any)
  },

  // 29. Segments — Apple Watch ring segments
  segments(ctx, W, H, s, p) {
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.38
    const segCount = 24, segGap = 0.03
    const segAngle = (TAU - segCount * segGap) / segCount
    const lit = Math.floor(s.displayNormalized * segCount)

    for (let i = 0; i < segCount; i++) {
      const start = -Math.PI / 2 + i * (segAngle + segGap)
      ctx.beginPath(); ctx.arc(cx, cy, r, start, start + segAngle)
      ctx.strokeStyle = i < lit ? p.primary : p.grid
      ctx.lineWidth = r * 0.12; ctx.lineCap = 'butt'; ctx.stroke()
    }
    drawLabel(ctx, W, H, s, p, {} as any)
  },

  // 30. Binary — on/off grid
  binary(ctx, W, H, s, p) {
    const cols = 8, rows = 4, gap = 3
    const cellW = (W - gap * (cols + 1)) / cols
    const cellH = (H - gap * (rows + 1)) / rows
    const total = cols * rows
    const lit = Math.floor(s.displayNormalized * total)

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col
        const x = gap + col * (cellW + gap), y = gap + row * (cellH + gap)
        const on = idx < lit
        ctx.fillStyle = on ? p.primary : p.grid
        ctx.beginPath(); roundRect(ctx, x, y, cellW, cellH, 3); ctx.fill()
      }
    }
  },

  // ═══════════════════════════════════════
  // 100 NEW MODES
  // ═══════════════════════════════════════

  // ─── Shape Variants (6) ───
  donut(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.35,lw=r*.3;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.strokeStyle=p.grid;ctx.lineWidth=lw;ctx.stroke();if(s.displayNormalized>.001){ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+TAU*s.displayNormalized);ctx.strokeStyle=p.primary;ctx.lineWidth=lw;ctx.lineCap='butt';ctx.stroke()} drawLabel(ctx,W,H,s,p,{} as any)},
  pie(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.4;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+TAU*s.displayNormalized);ctx.closePath();ctx.fillStyle=p.primary;ctx.fill();ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,-Math.PI/2+TAU*s.displayNormalized,-Math.PI/2+TAU);ctx.closePath();ctx.fillStyle=p.grid;ctx.fill() },
  dial(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.4;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.strokeStyle=p.grid;ctx.lineWidth=3;ctx.stroke();for(let i=0;i<24;i++){const a=(i/24)*TAU;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r*.88,cy+Math.sin(a)*r*.88);ctx.lineTo(cx+Math.cos(a)*r*.95,cy+Math.sin(a)*r*.95);ctx.strokeStyle=p.muted;ctx.lineWidth=1;ctx.stroke()}const a=-Math.PI/2+s.displayNormalized*TAU;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*r*.7,cy+Math.sin(a)*r*.7);ctx.strokeStyle=p.primary;ctx.lineWidth=2.5;ctx.lineCap='round';ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,5,0,TAU);ctx.fillStyle=p.primary;ctx.fill() },
  knob(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.35,gap=.5;ctx.beginPath();ctx.arc(cx,cy,r,Math.PI/2+gap,Math.PI*2.5-gap);ctx.strokeStyle=p.grid;ctx.lineWidth=r*.15;ctx.lineCap='round';ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,r,Math.PI/2+gap,Math.PI/2+gap+(TAU-gap*2)*s.displayNormalized);ctx.strokeStyle=p.primary;ctx.lineWidth=r*.15;ctx.lineCap='round';ctx.stroke();const ia=Math.PI/2+gap+(TAU-gap*2)*s.displayNormalized;ctx.beginPath();ctx.arc(cx+Math.cos(ia)*r*.6,cy+Math.sin(ia)*r*.6,3,0,TAU);ctx.fillStyle=p.fg;ctx.fill();ctx.beginPath();ctx.arc(cx,cy,r*.4,0,TAU);ctx.fillStyle=p.grid;ctx.fill();drawLabel(ctx,W,H,s,p,{} as any)},
  slider(ctx, W, H, s, p) { const pad=W*.1,trackY=H/2,trackH=4,thumbR=8;ctx.fillStyle=p.grid;ctx.beginPath();roundRect(ctx,pad,trackY-trackH/2,W-pad*2,trackH,2);ctx.fill();const fillW=(W-pad*2)*s.displayNormalized;ctx.fillStyle=p.primary;ctx.beginPath();roundRect(ctx,pad,trackY-trackH/2,fillW,trackH,2);ctx.fill();ctx.beginPath();ctx.arc(pad+fillW,trackY,thumbR,0,TAU);ctx.fillStyle=p.fg;ctx.fill();ctx.beginPath();ctx.arc(pad+fillW,trackY,thumbR,0,TAU);ctx.strokeStyle=p.primary;ctx.lineWidth=2;ctx.stroke() },
  step(ctx, W, H, s, p) { const steps=8,pad=W*.08,stepW=(W-pad*2)/steps,stepH=H*.4;const lit=Math.ceil(s.displayNormalized*steps);for(let i=0;i<steps;i++){const x=pad+i*stepW,y=H/2-stepH/2;ctx.fillStyle=i<lit?p.primary:p.grid;ctx.beginPath();roundRect(ctx,x+2,y,stepW-4,stepH,3);ctx.fill()} },

  // ─── Spiral/Helix (4) ───
  spiral(ctx, W, H, s, p) { const cx=W/2,cy=H/2,maxR=Math.min(W,H)*.4;ctx.beginPath();for(let a=0;a<s.displayNormalized*TAU*3;a+=.05){const r=maxR*(a/(TAU*3));ctx.lineTo(cx+Math.cos(a+s.time)*r,cy+Math.sin(a+s.time)*r)}ctx.strokeStyle=p.primary;ctx.lineWidth=2;ctx.lineCap='round';ctx.stroke() },
  helix(ctx, W, H, s, p) { const amp=H*.3*s.displayNormalized;for(let strand=0;strand<2;strand++){ctx.beginPath();for(let x=0;x<=W;x+=2){const t2=x/W*8+s.time*2+strand*Math.PI;const y=H/2+Math.sin(t2)*amp*(strand?1:-1)*.5+Math.cos(t2)*amp*.5;x===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.strokeStyle=strand?p.primary:p.muted;ctx.lineWidth=2;ctx.stroke()} },
  dna(ctx, W, H, s, p) { const cx=W/2,amp=W*.12*s.displayNormalized;for(let strand=0;strand<2;strand++){ctx.beginPath();for(let y=0;y<=H;y+=2){const x=cx+Math.sin(y/H*6+s.time+strand*Math.PI)*amp;y===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.strokeStyle=strand?p.primary:p.muted;ctx.lineWidth=2;ctx.stroke()}for(let i=0;i<12;i++){const y2=(i/12)*H+(s.time*20%((H)/12));if(y2<0||y2>H)continue;const x1=cx+Math.sin(y2/H*6+s.time)*amp,x2=cx+Math.sin(y2/H*6+s.time+Math.PI)*amp;ctx.beginPath();ctx.moveTo(x1,y2);ctx.lineTo(x2,y2);ctx.strokeStyle=p.grid;ctx.lineWidth=1;ctx.stroke()} },
  spring(ctx, W, H, s, p) { const coils=Math.floor(3+s.displayNormalized*8),amp=W*.15;ctx.beginPath();for(let y=10;y<H-10;y+=1){const progress=y/H;const x=W/2+Math.sin(progress*coils*TAU+s.time*2)*amp;y===10?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.strokeStyle=p.primary;ctx.lineWidth=2.5;ctx.lineCap='round';ctx.stroke() },

  // ─── Waveform Variants (6) ───
  oscilloscope(ctx, W, H, s, p) { ctx.strokeStyle=p.grid;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,H/2);ctx.lineTo(W,H/2);ctx.stroke();const amp=H*.35*s.displayNormalized;ctx.beginPath();for(let x=0;x<=W;x+=1){const t2=x/W*8+s.time*4;const y=H/2+Math.sin(t2)*amp*Math.sin(t2*.3);x===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.strokeStyle=p.primary;ctx.lineWidth=2;ctx.stroke();ctx.shadowColor=p.primary;ctx.shadowBlur=6;ctx.stroke();ctx.shadowBlur=0 },
  seismograph(ctx, W, H, s, p) { const hist=s.history;if(hist.length<2)return;const step=W/(hist.length-1);ctx.beginPath();for(let i=0;i<hist.length;i++){const x=i*step,spike=Math.sin(i*.5+s.time*3)*hist[i]*H*.4;const y=H/2+spike;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.strokeStyle=p.primary;ctx.lineWidth=1.5;ctx.stroke() },
  ecg(ctx, W, H, s, p) { const hist=s.history;if(hist.length<2)return;const step=W/(hist.length-1);ctx.strokeStyle=p.grid;ctx.lineWidth=1;for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(0,H*i/5);ctx.lineTo(W,H*i/5);ctx.stroke()}ctx.beginPath();for(let i=0;i<hist.length;i++){const x=i*step;const phase=(i/8+s.time*2)%1;let y=H/2;if(phase<.08)y=H/2-H*.35*hist[i]*(phase/.08);else if(phase<.12)y=H/2+H*.1*hist[i];else if(phase<.2)y=H/2-H*.45*hist[i]*((0.2-phase)/.08);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.strokeStyle=p.primary;ctx.lineWidth=2;ctx.stroke() },
  'pulse-wave'(ctx, W, H, s, p) { const amp=H*.3*s.displayNormalized;ctx.beginPath();for(let x=0;x<=W;x+=2){const t2=x/W*4+s.time*3;const raw=Math.sin(t2);const shaped=Math.sign(raw)*Math.pow(Math.abs(raw),.3);const y=H/2+shaped*amp;x===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.strokeStyle=p.primary;ctx.lineWidth=2;ctx.stroke() },
  sawtooth(ctx, W, H, s, p) { const amp=H*.3*s.displayNormalized,freq=3+s.displayNormalized*4;ctx.beginPath();for(let x=0;x<=W;x+=2){const t2=((x/W*freq+s.time)%1);const y=H/2+(t2*2-1)*amp;x===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.strokeStyle=p.primary;ctx.lineWidth=2;ctx.stroke() },
  'square-wave'(ctx, W, H, s, p) { const amp=H*.25*s.displayNormalized,freq=4+s.displayNormalized*4;ctx.beginPath();for(let x=0;x<=W;x+=1){const t2=Math.sin(x/W*freq*TAU+s.time*3);const y=H/2+(t2>0?-1:1)*amp;x===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.strokeStyle=p.primary;ctx.lineWidth=2;ctx.stroke() },

  // ─── Audio (4) ───
  volume(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.2;ctx.beginPath();ctx.moveTo(cx-r*.6,cy-r*.4);ctx.lineTo(cx-r*.2,cy-r*.4);ctx.lineTo(cx+r*.2,cy-r*.8);ctx.lineTo(cx+r*.2,cy+r*.8);ctx.lineTo(cx-r*.2,cy+r*.4);ctx.lineTo(cx-r*.6,cy+r*.4);ctx.closePath();ctx.fillStyle=p.primary;ctx.fill();const waves=Math.ceil(s.displayNormalized*3);for(let i=1;i<=waves;i++){ctx.beginPath();ctx.arc(cx+r*.3,cy,r*(.3+i*.25),-.5,.5);ctx.strokeStyle=p.primary+'90';ctx.lineWidth=2;ctx.stroke()} },
  loudness(ctx, W, H, s, p) { const bars=20,pad=W*.05,barW=(W-pad*2)/bars;for(let i=0;i<bars;i++){const dist=Math.abs(i-bars/2)/(bars/2);const h=(1-dist*.5)*s.displayNormalized*(H*.7)+Math.sin(s.time*6+i)*4*s.displayNormalized;const x=pad+i*barW,y=(H-h)/2;ctx.fillStyle=p.primary;ctx.beginPath();roundRect(ctx,x+1,y,barW-2,Math.max(2,h),1);ctx.fill()} },
  decibel(ctx, W, H, s, p) { const text=Math.round(s.displayValue).toString();const size=Math.min(W,H)*.3;ctx.font=`700 ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.fg;ctx.fillText(text,W/2,H/2-size*.15);ctx.font=`400 ${size*.25}px system-ui`;ctx.fillStyle=p.muted;ctx.fillText('dB',W/2,H/2+size*.35) },
  waveform(ctx, W, H, s, p) { const bars=32,barW=W/bars;for(let i=0;i<bars;i++){const v=Math.abs(Math.sin(i*.4+s.time*3))*s.displayNormalized;const h=v*H*.7;const x=i*barW,y=(H-h)/2;ctx.fillStyle=p.primary;ctx.beginPath();roundRect(ctx,x+1,y,barW-2,Math.max(1,h),1);ctx.fill()} },

  // ─── Instrument Gauges (4) ───
  speedometer(ctx, W, H, s, p) { const cx=W/2,cy=H*.55,r=Math.min(W,H)*.42;const sa=-Math.PI*.8,ea=Math.PI*.8+Math.PI;ctx.beginPath();ctx.arc(cx,cy,r,sa,ea);ctx.strokeStyle=p.grid;ctx.lineWidth=r*.08;ctx.lineCap='round';ctx.stroke();const na=sa+(ea-sa)*s.displayNormalized;ctx.beginPath();ctx.arc(cx,cy,r,sa,na);ctx.strokeStyle=p.primary;ctx.lineWidth=r*.08;ctx.lineCap='round';ctx.stroke();for(let i=0;i<=10;i++){const a=sa+(ea-sa)*(i/10);ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r*.85,cy+Math.sin(a)*r*.85);ctx.lineTo(cx+Math.cos(a)*r*.95,cy+Math.sin(a)*r*.95);ctx.strokeStyle=p.muted;ctx.lineWidth=i%5===0?2:1;ctx.stroke()}drawLabel(ctx,W,H,s,p,{} as any)},
  tachometer(ctx, W, H, s, p) { const cx=W/2,cy=H*.6,r=Math.min(W,H)*.4;ctx.beginPath();ctx.arc(cx,cy,r,Math.PI,TAU);ctx.strokeStyle=p.grid;ctx.lineWidth=r*.12;ctx.stroke();const danger=.8;const warnA=Math.PI+Math.PI*danger;ctx.beginPath();ctx.arc(cx,cy,r,warnA,TAU);ctx.strokeStyle=p.danger+'60';ctx.lineWidth=r*.12;ctx.stroke();const na=Math.PI+Math.PI*s.displayNormalized;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(na)*r*.75,cy+Math.sin(na)*r*.75);ctx.strokeStyle=s.displayNormalized>danger?p.danger:p.primary;ctx.lineWidth=2.5;ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,4,0,TAU);ctx.fillStyle=p.fg;ctx.fill() },
  altimeter(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.38;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.strokeStyle=p.grid;ctx.lineWidth=2;ctx.stroke();for(let i=0;i<12;i++){const a=(i/12)*TAU;const inner=i%3===0?r*.78:r*.88;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*inner,cy+Math.sin(a)*inner);ctx.lineTo(cx+Math.cos(a)*r*.94,cy+Math.sin(a)*r*.94);ctx.strokeStyle=p.muted;ctx.lineWidth=i%3===0?2:1;ctx.stroke()}const a1=-Math.PI/2+s.displayNormalized*TAU;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a1)*r*.6,cy+Math.sin(a1)*r*.6);ctx.strokeStyle=p.primary;ctx.lineWidth=3;ctx.lineCap='round';ctx.stroke();const a2=-Math.PI/2+s.displayNormalized*TAU*.1;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a2)*r*.4,cy+Math.sin(a2)*r*.4);ctx.strokeStyle=p.fg;ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,4,0,TAU);ctx.fillStyle=p.primary;ctx.fill() },
  pressure(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.38;ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI*.75,-Math.PI*.75+Math.PI*1.5);ctx.strokeStyle=p.grid;ctx.lineWidth=r*.1;ctx.lineCap='round';ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI*.75,-Math.PI*.75+Math.PI*1.5*s.displayNormalized);ctx.strokeStyle=p.primary;ctx.lineWidth=r*.1;ctx.lineCap='round';ctx.stroke();drawLabel(ctx,W,H,s,p,{} as any)},

  // ─── Time (4) ───
  hourglass(ctx, W, H, s, p) { const cx=W/2,topY=H*.15,botY=H*.85,midY=H/2,w=W*.25;ctx.beginPath();ctx.moveTo(cx-w,topY);ctx.lineTo(cx+w,topY);ctx.lineTo(cx+3,midY);ctx.lineTo(cx+w,botY);ctx.lineTo(cx-w,botY);ctx.lineTo(cx-3,midY);ctx.closePath();ctx.strokeStyle=p.muted;ctx.lineWidth=2;ctx.stroke();const sandTop=(1-s.displayNormalized)*(midY-topY-8);ctx.fillStyle=p.primary;ctx.beginPath();roundRect(ctx,cx-w+6,topY+4,w*2-12,sandTop,2);ctx.fill();const sandBot=s.displayNormalized*(botY-midY-8);ctx.beginPath();roundRect(ctx,cx-w+6,botY-4-sandBot,w*2-12,sandBot,2);ctx.fill() },
  stopwatch(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.38;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.strokeStyle=p.grid;ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.moveTo(cx-5,cy-r-4);ctx.lineTo(cx+5,cy-r-4);ctx.lineTo(cx+5,cy-r-10);ctx.lineTo(cx-5,cy-r-10);ctx.closePath();ctx.fillStyle=p.muted;ctx.fill();const a=-Math.PI/2+s.displayNormalized*TAU;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*r*.75,cy+Math.sin(a)*r*.75);ctx.strokeStyle=p.primary;ctx.lineWidth=2;ctx.lineCap='round';ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,3,0,TAU);ctx.fillStyle=p.primary;ctx.fill() },
  countdown(ctx, W, H, s, p) { const remaining=Math.ceil((1-s.displayNormalized)*99);const size=Math.min(W,H)*.35;ctx.font=`700 ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=s.displayNormalized>.9?p.danger:p.fg;ctx.fillText(String(remaining),W/2,H/2);const cx=W/2,cy=H/2,r=Math.min(W,H)*.42;ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+TAU*s.displayNormalized);ctx.strokeStyle=s.displayNormalized>.9?p.danger:p.primary;ctx.lineWidth=3;ctx.lineCap='round';ctx.stroke() },
  timer(ctx, W, H, s, p) { const mins=Math.floor(s.displayValue/60),secs=Math.floor(s.displayValue%60);const text=String(mins).padStart(2,'0')+':'+String(secs).padStart(2,'0');const size=Math.min(W,H)*.22;ctx.font=`600 ${size}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.fg;ctx.fillText(text,W/2,H/2);if(Math.floor(s.time*2)%2===0){ctx.beginPath();ctx.arc(W/2+size*.8,H/2-size*.4,3,0,TAU);ctx.fillStyle=p.primary;ctx.fill()} },

  // ─── System (6) ───
  cpu(ctx, W, H, s, p) { const sz=Math.min(W,H)*.5,x=(W-sz)/2,y=(H-sz)/2;ctx.strokeStyle=p.grid;ctx.lineWidth=2;ctx.beginPath();roundRect(ctx,x,y,sz,sz,sz*.1);ctx.stroke();for(let i=0;i<4;i++){const py=y+sz*.2+i*sz*.2;ctx.beginPath();ctx.moveTo(x-8,py);ctx.lineTo(x,py);ctx.moveTo(x+sz,py);ctx.lineTo(x+sz+8,py);ctx.strokeStyle=p.muted;ctx.lineWidth=2;ctx.stroke()}const fill=s.displayNormalized;ctx.fillStyle=fill>.9?p.danger:fill>.7?p.warn:p.primary;ctx.globalAlpha=.15+fill*.5;ctx.beginPath();roundRect(ctx,x+4,y+4,sz-8,sz-8,sz*.08);ctx.fill();ctx.globalAlpha=1;drawLabel(ctx,W,H,s,p,{} as any)},
  memory(ctx, W, H, s, p) { const cols=8,rows=4,gap=3,pad=12;const cw=(W-pad*2-gap*(cols-1))/cols,ch=(H-pad*2-gap*(rows-1))/rows;const total=cols*rows,used=Math.floor(s.displayNormalized*total);for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const idx=r*cols+c,px=pad+c*(cw+gap),py=pad+r*(ch+gap);ctx.fillStyle=idx<used?p.primary:p.grid;ctx.globalAlpha=idx<used?.3+Math.random()*.5:1;ctx.beginPath();roundRect(ctx,px,py,cw,ch,2);ctx.fill()}ctx.globalAlpha=1 },
  disk(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.38;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fillStyle=p.grid;ctx.fill();ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+TAU*s.displayNormalized);ctx.closePath();ctx.fillStyle=p.primary;ctx.fill();ctx.beginPath();ctx.arc(cx,cy,r*.25,0,TAU);ctx.fillStyle=p.bg;ctx.fill() },
  network(ctx, W, H, s, p) { const bars=6,maxH=H*.6,pad=W*.15,barW=(W-pad*2)/bars;for(let i=0;i<bars;i++){const h=maxH*s.displayNormalized*(0.3+Math.sin(s.time*3+i*1.5)*.7);const x=pad+i*barW;ctx.fillStyle=i%2===0?p.primary:p.primary+'80';ctx.beginPath();roundRect(ctx,x+2,H*.8-h,barW-4,h,2);ctx.fill()} },
  uptime(ctx, W, H, s, p) { const pct=(s.displayNormalized*100).toFixed(1);const size=Math.min(W,H)*.2;ctx.font=`700 ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=s.displayNormalized>.99?p.up:s.displayNormalized>.95?p.warn:p.danger;ctx.fillText(pct+'%',W/2,H/2);ctx.font=`400 ${size*.3}px system-ui`;ctx.fillStyle=p.muted;ctx.fillText('uptime',W/2,H/2+size*.6) },
  latency(ctx, W, H, s, p) { const hist=s.history;if(hist.length<2)return;const step=W/(hist.length-1);ctx.fillStyle=p.grid;ctx.fillRect(0,H*.8,W,1);for(let i=0;i<hist.length;i++){const x=i*step,h=hist[i]*H*.6;const y=H*.8-h;ctx.fillStyle=hist[i]>.7?p.danger:hist[i]>.5?p.warn:p.primary;ctx.beginPath();roundRect(ctx,x,y,Math.max(2,step-1),h,1);ctx.fill()} },

  // ─── Health (4) ───
  heart(ctx, W, H, s, p) { const cx=W/2,cy=H/2,scale=Math.min(W,H)*.012*(0.8+s.displayNormalized*.4)*(1+Math.sin(s.time*4)*.08);ctx.save();ctx.translate(cx,cy);ctx.scale(scale,scale);ctx.beginPath();ctx.moveTo(0,5);ctx.bezierCurveTo(-20,-15,-35,-5,-20,10);ctx.bezierCurveTo(-10,20,0,25,0,30);ctx.bezierCurveTo(0,25,10,20,20,10);ctx.bezierCurveTo(35,-5,20,-15,0,5);ctx.fillStyle=p.primary;ctx.fill();ctx.restore() },
  lungs(ctx, W, H, s, p) { const breath=Math.sin(s.time*1.5)*.5+.5;const w=W*.15+W*.1*breath*s.displayNormalized,h=H*.35+H*.1*breath*s.displayNormalized;const cx=W/2;ctx.beginPath();ctx.ellipse(cx-w*.8,H/2,w,h,0,0,TAU);ctx.fillStyle=p.primary+'30';ctx.fill();ctx.strokeStyle=p.primary;ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();ctx.ellipse(cx+w*.8,H/2,w,h,0,0,TAU);ctx.fillStyle=p.primary+'30';ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(cx,H*.25);ctx.lineTo(cx,H*.75);ctx.strokeStyle=p.muted;ctx.lineWidth=2;ctx.stroke() },
  oxygen(ctx, W, H, s, p) { const text=Math.round(s.displayValue).toString();const size=Math.min(W,H)*.3;ctx.font=`700 ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=s.displayNormalized>.95?p.up:s.displayNormalized>.9?p.warn:p.danger;ctx.fillText(text,W/2,H/2);ctx.font=`400 ${size*.25}px system-ui`;ctx.fillStyle=p.muted;ctx.fillText('SpO2',W/2,H/2+size*.5) },
  temperature(ctx, W, H, s, p) { const text=s.displayValue.toFixed(1);const size=Math.min(W,H)*.25;ctx.font=`600 ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=s.displayNormalized>.8?p.danger:s.displayNormalized>.6?p.warn:p.primary;ctx.fillText(text+'°',W/2,H/2) },

  // ─── Weather (4) ───
  wind(ctx, W, H, s, p) { for(let i=0;i<5;i++){const y=H*.2+i*H*.15,len=W*(.2+s.displayNormalized*.5)*(0.6+Math.sin(i*1.5)*.4);const x=W*.15+Math.sin(s.time*2+i)*(W*.1);ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+len*.5,y-8+Math.sin(s.time+i)*4,x+len,y);ctx.strokeStyle=p.primary;ctx.lineWidth=2;ctx.lineCap='round';ctx.stroke()} },
  humidity(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.15;ctx.beginPath();ctx.moveTo(cx,cy-r*2);ctx.quadraticCurveTo(cx+r*1.5,cy-r*.5,cx+r,cy+r*.3);ctx.arc(cx,cy+r*.3,r,0,Math.PI);ctx.quadraticCurveTo(cx-r*1.5,cy-r*.5,cx,cy-r*2);ctx.fillStyle=p.primary+'40';ctx.fill();ctx.strokeStyle=p.primary;ctx.lineWidth=2;ctx.stroke();const fillH=r*2*s.displayNormalized;ctx.beginPath();ctx.rect(cx-r,cy+r*.3+r-fillH,r*2,fillH);ctx.clip();ctx.beginPath();ctx.moveTo(cx,cy-r*2);ctx.quadraticCurveTo(cx+r*1.5,cy-r*.5,cx+r,cy+r*.3);ctx.arc(cx,cy+r*.3,r,0,Math.PI);ctx.quadraticCurveTo(cx-r*1.5,cy-r*.5,cx,cy-r*2);ctx.fillStyle=p.primary;ctx.fill() },
  uv(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.15;const rays=12;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fillStyle=s.displayNormalized>.7?'#ef4444':s.displayNormalized>.4?'#f59e0b':'#4ade80';ctx.fill();for(let i=0;i<rays;i++){const a=(i/rays)*TAU;const len=r*(.4+s.displayNormalized*.6)*(0.8+Math.sin(s.time*3+i)*.2);ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r*1.2,cy+Math.sin(a)*r*1.2);ctx.lineTo(cx+Math.cos(a)*(r*1.2+len),cy+Math.sin(a)*(r*1.2+len));ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=2;ctx.lineCap='round';ctx.stroke()}const text=Math.round(s.displayValue).toString();ctx.font='600 '+r*.8+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.bg;ctx.fillText(text,cx,cy) },
  'rain-gauge'(ctx, W, H, s, p) { const w=W*.3,h=H*.7,x=(W-w)/2,y=(H-h)/2;ctx.strokeStyle=p.grid;ctx.lineWidth=2;ctx.beginPath();roundRect(ctx,x,y,w,h,4);ctx.stroke();const fillH=h*s.displayNormalized;ctx.fillStyle=p.primary+'60';ctx.beginPath();roundRect(ctx,x+2,y+h-fillH-2,w-4,fillH,2);ctx.fill();for(let i=1;i<5;i++){const ty=y+h-h*(i/5);ctx.beginPath();ctx.moveTo(x+w+4,ty);ctx.lineTo(x+w+10,ty);ctx.strokeStyle=p.muted;ctx.lineWidth=1;ctx.stroke()} },

  // ─── Financial (4) ───
  stock(ctx, W, H, s, p) { const color=s.momentum==='up'?p.up:s.momentum==='down'?p.down:p.muted;const text=s.displayValue.toFixed(2);const size=Math.min(W,H)*.22;ctx.font=`700 ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.fg;ctx.fillText(text,W/2,H/2-size*.3);const arrow=s.momentum==='up'?'▲':s.momentum==='down'?'▼':'—';ctx.font=`500 ${size*.4}px system-ui`;ctx.fillStyle=color;ctx.fillText(arrow+' '+(s.momentum==='up'?'+':'')+((s.displayNormalized-.5)*10).toFixed(2)+'%',W/2,H/2+size*.3) },
  crypto(ctx, W, H, s, p) { const hist=s.history;if(hist.length<2)return;const step=W/(hist.length-1);const trending=hist[hist.length-1]>hist[0];ctx.beginPath();for(let i=0;i<hist.length;i++){const x=i*step,y=H-8-hist[i]*(H-16);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.strokeStyle=trending?p.up:p.down;ctx.lineWidth=2;ctx.stroke();ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,(trending?p.up:p.down)+'30');grad.addColorStop(1,(trending?p.up:p.down)+'00');ctx.fillStyle=grad;ctx.fill() },
  percentage(ctx, W, H, s, p) { const text=Math.round(s.displayNormalized*100)+'%';const size=Math.min(W,H)*.3;ctx.font=`700 ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.fg;ctx.fillText(text,W/2,H/2) },
  currency(ctx, W, H, s, p) { const text='$'+s.displayValue.toFixed(2);const size=Math.min(W,H)*.2;ctx.font=`600 ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.fg;ctx.fillText(text,W/2,H/2) },

  // ─── Rating (4) ───
  stars(ctx, W, H, s, p) { const total=5,filled=s.displayNormalized*total,starR=Math.min(W/(total*2.5),H*.25);for(let i=0;i<total;i++){const cx=W/2+(i-2)*starR*2.5,cy=H/2;drawStar(ctx,cx,cy,starR,i<Math.floor(filled)?1:i<filled?filled%1:0,p)} },
  rating(ctx, W, H, s, p) { const text=s.displayValue.toFixed(1);const size=Math.min(W,H)*.3;ctx.font=`700 ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.fg;ctx.fillText(text,W/2,H/2-size*.15);ctx.font=`400 ${size*.2}px system-ui`;ctx.fillStyle=p.muted;ctx.fillText('/10',W/2+size*.5,H/2-size*.05) },
  score(ctx, W, H, s, p) { const text=Math.round(s.displayValue).toString();const size=Math.min(W,H)*.35;ctx.font=`800 ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.primary;ctx.fillText(text,W/2,H/2) },
  rank(ctx, W, H, s, p) { const n=Math.max(1,Math.round(s.displayValue));const text='#'+n;const size=Math.min(W,H)*.3;ctx.font=`700 ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=n<=3?p.primary:p.fg;ctx.fillText(text,W/2,H/2) },

  // ─── Loading (4) ───
  loading(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.3;const a=s.time*3;ctx.beginPath();ctx.arc(cx,cy,r,a,a+Math.PI*1.5);ctx.strokeStyle=p.primary;ctx.lineWidth=3;ctx.lineCap='round';ctx.stroke() },
  spinner(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.3;const dots=8;for(let i=0;i<dots;i++){const a=(i/dots)*TAU+s.time*4;const alpha=((i/dots+s.time*.5)%1);ctx.beginPath();ctx.arc(cx+Math.cos(a)*r,cy+Math.sin(a)*r,3,0,TAU);ctx.fillStyle=`rgba(${p.primaryRgb.join(',')},${alpha})`;ctx.fill()} },
  'dots-loading'(ctx, W, H, s, p) { const dots=3,dotR=Math.min(W,H)*.06,gap=dotR*3;const startX=W/2-(dots-1)*gap/2;for(let i=0;i<dots;i++){const bounce=Math.sin(s.time*4+i*.8)*.5+.5;const x=startX+i*gap,y=H/2-bounce*H*.15;ctx.beginPath();ctx.arc(x,y,dotR,0,TAU);ctx.fillStyle=p.primary;ctx.globalAlpha=.4+bounce*.6;ctx.fill()}ctx.globalAlpha=1 },
  'pulse-loading'(ctx, W, H, s, p) { const cx=W/2,cy=H/2;for(let i=0;i<3;i++){const phase=((s.time*1.5+i*.3)%1);const r=Math.min(W,H)*.1+phase*Math.min(W,H)*.3;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.strokeStyle=`rgba(${p.primaryRgb.join(',')},${(1-phase)*.4})`;ctx.lineWidth=2;ctx.stroke()} },

  // ─── Status (4) ───
  badge(ctx, W, H, s, p) { const text=Math.round(s.displayValue).toString();const size=Math.min(W,H)*.4;const pad=size*.3;const tw=size*.6;ctx.beginPath();roundRect(ctx,W/2-tw/2-pad,H/2-size/2-pad*.3,tw+pad*2,size+pad*.6,size*.3);ctx.fillStyle=p.primary;ctx.fill();ctx.font=`700 ${size*.5}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(text,W/2,H/2) },
  chip(ctx, W, H, s, p) { const text=s.displayValue.toFixed(1)+(({} as any).unit||'');const size=Math.min(W,H)*.12;const w=W*.6,h=H*.25;ctx.beginPath();roundRect(ctx,(W-w)/2,(H-h)/2,w,h,h/2);ctx.strokeStyle=p.primary;ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle=p.primary+'15';ctx.fill();ctx.font=`500 ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.primary;ctx.fillText(text,W/2,H/2) },
  tag(ctx, W, H, s, p) { const text=Math.round(s.displayValue).toString();const size=Math.min(W,H)*.12,w=W*.4,h=H*.22;ctx.beginPath();roundRect(ctx,(W-w)/2,(H-h)/2,w,h,4);ctx.fillStyle=p.grid;ctx.fill();ctx.font=`600 ${size}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.fg;ctx.fillText(text,W/2,H/2) },
  indicator(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.2;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fillStyle=s.displayNormalized>.7?p.up:s.displayNormalized>.3?p.warn:p.danger;ctx.fill();ctx.beginPath();ctx.arc(cx,cy,r+4,0,TAU);ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=1;ctx.globalAlpha=.3;ctx.stroke();ctx.globalAlpha=1 },

  // ─── Spatial (4) ───
  minimap(ctx, W, H, s, p) { ctx.strokeStyle=p.grid;ctx.lineWidth=1;ctx.strokeRect(8,8,W-16,H-16);const dotX=8+(W-16)*s.displayNormalized,dotY=H/2+Math.sin(s.time)*H*.2;ctx.beginPath();ctx.arc(dotX,dotY,4,0,TAU);ctx.fillStyle=p.primary;ctx.fill();ctx.beginPath();ctx.arc(dotX,dotY,8+Math.sin(s.time*3)*2,0,TAU);ctx.strokeStyle=p.primary+'40';ctx.lineWidth=1;ctx.stroke() },
  horizon(ctx, W, H, s, p) { const tilt=(s.displayNormalized-.5)*40;const cy=H/2+tilt;ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();ctx.fillStyle=p.primary+'15';ctx.fillRect(0,cy,W,H);ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(W,cy);ctx.strokeStyle=p.primary;ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.moveTo(W/2,cy-6);ctx.lineTo(W/2-4,cy);ctx.lineTo(W/2+4,cy);ctx.closePath();ctx.fillStyle=p.primary;ctx.fill();ctx.restore() },
  level(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.35;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.strokeStyle=p.grid;ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.moveTo(cx-r*.8,cy);ctx.lineTo(cx+r*.8,cy);ctx.strokeStyle=p.muted;ctx.lineWidth=1;ctx.stroke();const angle=(s.displayNormalized-.5)*Math.PI*.3;const bx=cx+Math.sin(angle)*r*.5,by=cy+Math.cos(angle)*r*.5;ctx.beginPath();ctx.arc(bx,by,r*.15,0,TAU);ctx.fillStyle=p.primary;ctx.fill() },
  gyroscope(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.35;for(let i=0;i<3;i++){const tilt=i*.3+s.displayNormalized*.5;ctx.beginPath();ctx.ellipse(cx,cy,r,r*Math.abs(Math.cos(s.time+i*1.2))*0.8+r*.2,(s.time*.5+i*Math.PI/3),0,TAU);ctx.strokeStyle=i===0?p.primary:i===1?p.muted:p.grid;ctx.lineWidth=1.5;ctx.stroke()}ctx.beginPath();ctx.arc(cx,cy,4,0,TAU);ctx.fillStyle=p.primary;ctx.fill() },

  // ─── Digital (4) ───
  pixel(ctx, W, H, s, p) { const size=8,cols=Math.floor(W/size),rows=Math.floor(H/size);const total=cols*rows,lit=Math.floor(s.displayNormalized*total);for(let i=0;i<total;i++){const col=i%cols,row=Math.floor(i/cols);const on=i<lit;ctx.fillStyle=on?p.primary:p.grid;ctx.fillRect(col*size+1,row*size+1,size-2,size-2)} },
  led(ctx, W, H, s, p) { const cols=5,rows=3,gap=6;const cw=(W-gap*(cols+1))/cols,ch=(H-gap*(rows+1))/rows;const total=cols*rows,lit=Math.ceil(s.displayNormalized*total);for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const idx=r*cols+c,on=idx<lit;const x=gap+c*(cw+gap),y=gap+r*(ch+gap);ctx.beginPath();ctx.arc(x+cw/2,y+ch/2,Math.min(cw,ch)/2,0,TAU);ctx.fillStyle=on?p.primary:p.grid;ctx.fill()} },
  matrix(ctx, W, H, s, p) { const cols=8,rows=5,chars='01';ctx.font='10px monospace';for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const ch=chars[Math.floor(Math.abs(Math.sin(c*3.7+r*2.3+s.time*2))*chars.length)%chars.length];const lit=(r*cols+c)/(cols*rows)<s.displayNormalized;ctx.fillStyle=lit?p.primary:p.grid;ctx.fillText(ch,c*W/cols+4,r*H/rows+14)} },
  'seven-seg'(ctx, W, H, s, p) { const text=Math.round(s.displayValue).toString().padStart(3,' ');const size=Math.min(W/(text.length*1.2),H*.6);ctx.font=`700 ${size}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.grid;ctx.fillText('888',W/2,H/2);ctx.fillStyle=p.primary;ctx.fillText(text.trim(),W/2,H/2) },

  // ─── Chart Variants (4) ───
  'bar-stack'(ctx, W, H, s, p) { const bars=6,barW=W/bars;for(let i=0;i<bars;i++){const h1=s.displayNormalized*(H*.4)*(0.3+Math.sin(i)*.7),h2=s.displayNormalized*(H*.3)*(0.5+Math.cos(i*2)*.5);const x=i*barW;ctx.fillStyle=p.primary;ctx.beginPath();roundRect(ctx,x+3,H-8-h1-h2,barW-6,h1,2);ctx.fill();ctx.fillStyle=p.primary+'60';ctx.beginPath();roundRect(ctx,x+3,H-8-h2,barW-6,h2,2);ctx.fill()} },
  'bar-group'(ctx, W, H, s, p) { const groups=4,barsPerGroup=2,gw=W/groups;for(let g=0;g<groups;g++)for(let b=0;b<barsPerGroup;b++){const h=(H*.6)*s.displayNormalized*(0.3+Math.sin(g*2+b*3+s.time)*.7);const bw=gw/barsPerGroup*.7,x=g*gw+b*bw+gw*.15;ctx.fillStyle=b===0?p.primary:p.muted;ctx.beginPath();roundRect(ctx,x,H-8-h,bw-2,h,2);ctx.fill()} },
  histogram(ctx, W, H, s, p) { const bins=12,barW=W/bins;for(let i=0;i<bins;i++){const center=bins/2;const dist=Math.abs(i-center)/center;const h=(1-dist*.7)*s.displayNormalized*(H*.7)*(0.8+Math.sin(i*.5+s.time)*.2);ctx.fillStyle=p.primary;ctx.fillRect(i*barW+1,H-6-h,barW-2,h)} },
  waterfall(ctx, W, H, s, p) { const bars=8,barW=W/bars;let cumulative=0;for(let i=0;i<bars;i++){const change=s.displayNormalized*(H*.08)*(Math.sin(i*2.5+1)>.3?1:-0.5);const y=H*.8-cumulative;ctx.fillStyle=change>0?p.primary:p.down;ctx.beginPath();roundRect(ctx,i*barW+3,change>0?y-change:y,barW-6,Math.abs(change),2);ctx.fill();cumulative+=change} },

  // ─── Radial Variants (4) ───
  'radial-bar'(ctx, W, H, s, p) { const cx=W/2,cy=H/2;const rings=3;for(let i=0;i<rings;i++){const r=Math.min(W,H)*(.2+i*.08);const portion=s.displayNormalized*(0.6+i*.2);ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.strokeStyle=p.grid;ctx.lineWidth=r*.15;ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+TAU*portion);ctx.strokeStyle=i===0?p.primary:i===1?p.warn:p.up;ctx.lineWidth=r*.15;ctx.lineCap='round';ctx.stroke()} },
  sunburst(ctx, W, H, s, p) { const cx=W/2,cy=H/2,slices=8;for(let i=0;i<slices;i++){const a1=(i/slices)*TAU-Math.PI/2,a2=((i+1)/slices)*TAU-Math.PI/2;const r=Math.min(W,H)*(.15+s.displayNormalized*.25*(0.5+Math.sin(i*1.5)*.5));ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,a1,a2);ctx.closePath();ctx.fillStyle=i%2===0?p.primary:p.primary+'60';ctx.fill()} },
  polar(ctx, W, H, s, p) { const cx=W/2,cy=H/2,points=8,r=Math.min(W,H)*.38;ctx.beginPath();for(let i=0;i<=points;i++){const a=(i/points)*TAU-Math.PI/2;const pr=r*s.displayNormalized*(0.4+Math.sin(i*1.5+s.time)*.6);const x=cx+Math.cos(a)*pr,y=cy+Math.sin(a)*pr;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.closePath();ctx.fillStyle=p.primary+'20';ctx.fill();ctx.strokeStyle=p.primary;ctx.lineWidth=2;ctx.stroke() },
  'rose-chart'(ctx, W, H, s, p) { const cx=W/2,cy=H/2,petals=6;for(let i=0;i<petals;i++){const a1=(i/petals)*TAU,a2=((i+.8)/petals)*TAU;const r=Math.min(W,H)*(.15+s.displayNormalized*.25*(0.5+Math.sin(i*2)*.5));ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,a1,a2);ctx.closePath();ctx.fillStyle=p.primary+Math.round(100+i*25).toString(16);ctx.fill()} },

  // ─── Gauge Variants (4) ───
  'gauge-mini'(ctx, W, H, s, p) { const cx=W/2,cy=H*.65,r=Math.min(W,H)*.3;ctx.beginPath();ctx.arc(cx,cy,r,Math.PI,TAU);ctx.strokeStyle=p.grid;ctx.lineWidth=4;ctx.lineCap='round';ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,r,Math.PI,Math.PI+Math.PI*s.displayNormalized);ctx.strokeStyle=p.primary;ctx.lineWidth=4;ctx.lineCap='round';ctx.stroke();drawLabel(ctx,W,H,s,p,{} as any)},
  'gauge-flat'(ctx, W, H, s, p) { const pad=W*.1,barH=H*.08,y=H*.45;ctx.fillStyle=p.grid;ctx.beginPath();roundRect(ctx,pad,y,W-pad*2,barH,2);ctx.fill();ctx.fillStyle=p.primary;ctx.beginPath();roundRect(ctx,pad,y,(W-pad*2)*s.displayNormalized,barH,2);ctx.fill();const text=Math.round(s.displayNormalized*100)+'%';ctx.font=`600 ${H*.2}px system-ui`;ctx.textAlign='center';ctx.fillStyle=p.fg;ctx.fillText(text,W/2,y+barH+H*.2) },
  'gauge-digital'(ctx, W, H, s, p) { const text=Math.round(s.displayValue).toString();const size=Math.min(W,H)*.35;ctx.font=`700 ${size}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.grid;ctx.fillText('000',W/2,H/2);ctx.fillStyle=p.primary;ctx.fillText(text.padStart(3,'0'),W/2,H/2) },
  'gauge-neon'(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.35;ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+TAU*s.displayNormalized);ctx.strokeStyle=p.primary;ctx.lineWidth=3;ctx.lineCap='round';ctx.stroke();ctx.shadowColor=p.primary;ctx.shadowBlur=12;ctx.stroke();ctx.shadowBlur=0;drawLabel(ctx,W,H,s,p,{} as any)},

  // ─── Ring Variants (4) ───
  'ring-thick'(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.32,lw=r*.4;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.strokeStyle=p.grid;ctx.lineWidth=lw;ctx.stroke();if(s.displayNormalized>.001){ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+TAU*s.displayNormalized);ctx.strokeStyle=p.primary;ctx.lineWidth=lw;ctx.lineCap='butt';ctx.stroke()}drawLabel(ctx,W,H,s,p,{} as any)},
  'ring-thin'(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.4;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.strokeStyle=p.grid;ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+TAU*s.displayNormalized);ctx.strokeStyle=p.primary;ctx.lineWidth=2;ctx.lineCap='round';ctx.stroke();drawLabel(ctx,W,H,s,p,{} as any)},
  'ring-dashed'(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.38;ctx.setLineDash([6,4]);ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.strokeStyle=p.grid;ctx.lineWidth=4;ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+TAU*s.displayNormalized);ctx.strokeStyle=p.primary;ctx.lineWidth=4;ctx.stroke();ctx.setLineDash([]);drawLabel(ctx,W,H,s,p,{} as any)},
  'ring-gradient'(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.38,lw=r*.12;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.strokeStyle=p.grid;ctx.lineWidth=lw;ctx.stroke();if(s.displayNormalized>.001){const grad=ctx.createConicGradient(-Math.PI/2,cx,cy);grad.addColorStop(0,p.primary);grad.addColorStop(s.displayNormalized*.99,p.primary+'40');grad.addColorStop(1,'transparent');ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+TAU*s.displayNormalized);ctx.strokeStyle=grad;ctx.lineWidth=lw;ctx.lineCap='round';ctx.stroke()}drawLabel(ctx,W,H,s,p,{} as any)},

  // ─── Wave Variants (4) ───
  'wave-square'(ctx, W, H, s, p) { const amp=H*.25*s.displayNormalized,freq=4;ctx.beginPath();let lastHigh=true;for(let x=0;x<=W;x++){const t2=((x/W*freq+s.time)%1);const high=t2<.5;const y=H/2+(high?-1:1)*amp;if(x===0)ctx.moveTo(x,y);else if(high!==lastHigh){ctx.lineTo(x,H/2+(lastHigh?-1:1)*amp);ctx.lineTo(x,y)}else ctx.lineTo(x,y);lastHigh=high}ctx.strokeStyle=p.primary;ctx.lineWidth=2;ctx.stroke() },
  'wave-triangle'(ctx, W, H, s, p) { const amp=H*.3*s.displayNormalized,freq=3;ctx.beginPath();for(let x=0;x<=W;x+=2){const t2=((x/W*freq+s.time)%1);const tri=t2<.5?t2*4-1:(1-t2)*4-1;const y=H/2+tri*amp;x===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.strokeStyle=p.primary;ctx.lineWidth=2;ctx.stroke() },
  'wave-noise'(ctx, W, H, s, p) { const amp=H*.25*s.displayNormalized;ctx.beginPath();for(let x=0;x<=W;x+=2){const noise=Math.sin(x*.1+s.time*5)*Math.cos(x*.07+s.time*3)*Math.sin(x*.13+s.time*7);const y=H/2+noise*amp;x===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.strokeStyle=p.primary;ctx.lineWidth=1.5;ctx.stroke() },
  'wave-pulse'(ctx, W, H, s, p) { const amp=H*.35*s.displayNormalized;ctx.beginPath();for(let x=0;x<=W;x+=1){const t2=((x/W*3+s.time*2)%1);const pulse=Math.exp(-50*(t2-.5)*(t2-.5));const y=H/2-pulse*amp;x===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.strokeStyle=p.primary;ctx.lineWidth=2;ctx.stroke() },

  // ─── Meter Variants (4) ───
  'meter-horizontal'(ctx, W, H, s, p) { const segs=16,pad=8,segW=(W-pad*2)/segs,segH=H*.3;const y=(H-segH)/2,lit=Math.floor(s.displayNormalized*segs);for(let i=0;i<segs;i++){const ratio=i/segs;let color=p.grid;if(i<lit){color=ratio>.8?p.danger:ratio>.6?p.warn:p.primary}ctx.fillStyle=color;ctx.beginPath();roundRect(ctx,pad+i*segW+1,y,segW-2,segH,2);ctx.fill()} },
  'meter-arc'(ctx, W, H, s, p) { const cx=W/2,cy=H*.6,r=Math.min(W,H)*.42;const segs=12;for(let i=0;i<segs;i++){const a1=Math.PI+i*(Math.PI/segs),a2=Math.PI+(i+.8)*(Math.PI/segs);const lit=i<Math.floor(s.displayNormalized*segs);const ratio=i/segs;ctx.beginPath();ctx.arc(cx,cy,r,a1,a2);ctx.strokeStyle=lit?(ratio>.8?p.danger:ratio>.6?p.warn:p.primary):p.grid;ctx.lineWidth=r*.1;ctx.lineCap='butt';ctx.stroke()} },
  'meter-digital'(ctx, W, H, s, p) { const pct=Math.round(s.displayNormalized*100);const size=Math.min(W,H)*.3;ctx.font=`700 ${size}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.grid;ctx.fillText('100',W/2,H/2);ctx.fillStyle=s.displayNormalized>.9?p.danger:s.displayNormalized>.7?p.warn:p.primary;ctx.fillText(String(pct),W/2,H/2) },
  'meter-segment'(ctx, W, H, s, p) { const segs=8,r=Math.min(W,H)*.38,cx=W/2,cy=H/2;const lit=Math.floor(s.displayNormalized*segs);for(let i=0;i<segs;i++){const a1=-Math.PI/2+i*(TAU/segs)+.05,a2=-Math.PI/2+(i+.8)*(TAU/segs);ctx.beginPath();ctx.arc(cx,cy,r,a1,a2);ctx.strokeStyle=i<lit?p.primary:p.grid;ctx.lineWidth=r*.15;ctx.stroke()} },

  // ─── Spark Variants (4) ───
  'spark-bar'(ctx, W, H, s, p) { const hist=s.history;if(hist.length<2)return;const barW=W/hist.length;for(let i=0;i<hist.length;i++){const h=hist[i]*(H-8);ctx.fillStyle=p.primary;ctx.beginPath();roundRect(ctx,i*barW+1,H-4-h,barW-2,h,1);ctx.fill()} },
  'spark-area'(ctx, W, H, s, p) { const hist=s.history;if(hist.length<2)return;const step=W/(hist.length-1);ctx.beginPath();ctx.moveTo(0,H);for(let i=0;i<hist.length;i++){ctx.lineTo(i*step,H-8-hist[i]*(H-16))}ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=p.primary+'25';ctx.fill();ctx.beginPath();for(let i=0;i<hist.length;i++){const x=i*step,y=H-8-hist[i]*(H-16);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.strokeStyle=p.primary;ctx.lineWidth=1.5;ctx.stroke() },
  'spark-dot'(ctx, W, H, s, p) { const hist=s.history;if(hist.length<2)return;const step=W/(hist.length-1);for(let i=0;i<hist.length;i++){const x=i*step,y=H-8-hist[i]*(H-16);const alpha=i/(hist.length-1);ctx.beginPath();ctx.arc(x,y,1.5+alpha,0,TAU);ctx.fillStyle=`rgba(${p.primaryRgb.join(',')},${.2+alpha*.8})`;ctx.fill()} },
  'spark-step'(ctx, W, H, s, p) { const hist=s.history;if(hist.length<2)return;const step=W/(hist.length-1);ctx.beginPath();for(let i=0;i<hist.length;i++){const x=i*step,y=H-8-hist[i]*(H-16);if(i===0)ctx.moveTo(x,y);else{ctx.lineTo(x,H-8-hist[i-1]*(H-16));ctx.lineTo(x,y)}}ctx.strokeStyle=p.primary;ctx.lineWidth=1.5;ctx.stroke() },

  // ─── Alert States (4) ───
  status(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.2;const color=s.displayNormalized>.7?p.up:s.displayNormalized>.3?p.warn:p.danger;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fillStyle=color;ctx.fill();const pulse=1+Math.sin(s.time*3)*.15;ctx.beginPath();ctx.arc(cx,cy,r*pulse+4,0,TAU);ctx.strokeStyle=color+'40';ctx.lineWidth=2;ctx.stroke() },
  health(ctx, W, H, s, p) { const text=s.displayNormalized>.8?'HEALTHY':s.displayNormalized>.5?'WARNING':s.displayNormalized>.2?'DEGRADED':'CRITICAL';const color=s.displayNormalized>.8?p.up:s.displayNormalized>.5?p.warn:p.danger;const size=Math.min(W,H)*.1;ctx.font=`600 ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,W/2,H/2);const cx=W/2,r=Math.min(W,H)*.03;ctx.beginPath();ctx.arc(cx-ctx.measureText(text).width/2-r*3,H/2,r,0,TAU);ctx.fill() },
  alert(ctx, W, H, s, p) { const flash=Math.sin(s.time*6)>.3;const cx=W/2,cy=H/2,r=Math.min(W,H)*.25;if(s.displayNormalized>.7){ctx.beginPath();ctx.moveTo(cx,cy-r);ctx.lineTo(cx+r*.9,cy+r*.6);ctx.lineTo(cx-r*.9,cy+r*.6);ctx.closePath();ctx.fillStyle=flash?p.danger:p.danger+'60';ctx.fill();ctx.font=`700 ${r*.8}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.bg;ctx.fillText('!',cx,cy+r*.1)}else{ctx.beginPath();ctx.arc(cx,cy,r*.6,0,TAU);ctx.fillStyle=p.up;ctx.fill();ctx.font=`700 ${r*.6}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.bg;ctx.fillText('✓',cx,cy)} },
  warning(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.3;const pulse=1+Math.sin(s.time*4)*.05*s.displayNormalized;ctx.save();ctx.translate(cx,cy);ctx.scale(pulse,pulse);ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*.85,r*.6);ctx.lineTo(-r*.85,r*.6);ctx.closePath();ctx.fillStyle=p.warn;ctx.fill();ctx.font=`700 ${r*.7}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.bg;ctx.fillText('!',0,r*.1);ctx.restore() },

  // ─── Fill Shapes (4) ───
  'fill-circle'(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.4;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fillStyle=p.grid;ctx.fill();ctx.save();ctx.beginPath();ctx.rect(0,H-H*s.displayNormalized,W,H);ctx.clip();ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fillStyle=p.primary;ctx.fill();ctx.restore() },
  'fill-square'(ctx, W, H, s, p) { const sz=Math.min(W,H)*.7,x=(W-sz)/2,y=(H-sz)/2;ctx.fillStyle=p.grid;ctx.beginPath();roundRect(ctx,x,y,sz,sz,4);ctx.fill();const fillH=sz*s.displayNormalized;ctx.fillStyle=p.primary;ctx.beginPath();roundRect(ctx,x,y+sz-fillH,sz,fillH,4);ctx.fill() },
  'fill-diamond'(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.38;ctx.beginPath();ctx.moveTo(cx,cy-r);ctx.lineTo(cx+r,cy);ctx.lineTo(cx,cy+r);ctx.lineTo(cx-r,cy);ctx.closePath();ctx.fillStyle=p.grid;ctx.fill();ctx.save();ctx.beginPath();ctx.rect(0,H-H*s.displayNormalized,W,H);ctx.clip();ctx.beginPath();ctx.moveTo(cx,cy-r);ctx.lineTo(cx+r,cy);ctx.lineTo(cx,cy+r);ctx.lineTo(cx-r,cy);ctx.closePath();ctx.fillStyle=p.primary;ctx.fill();ctx.restore() },
  'fill-hex'(ctx, W, H, s, p) { const cx=W/2,cy=H/2,r=Math.min(W,H)*.38;function hex(){ctx.beginPath();for(let i=0;i<6;i++){const a=(i/6)*TAU-Math.PI/2;i===0?ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r)}ctx.closePath()}hex();ctx.fillStyle=p.grid;ctx.fill();ctx.save();ctx.beginPath();ctx.rect(0,H-H*s.displayNormalized,W,H);ctx.clip();hex();ctx.fillStyle=p.primary;ctx.fill();ctx.restore() },
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fill: number, p: ColorPalette) {
  const spikes = 5, step = Math.PI / spikes
  ctx.beginPath()
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45
    const angle = i * step - Math.PI / 2
    i === 0 ? ctx.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius) : ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
  }
  ctx.closePath()
  ctx.fillStyle = fill >= 1 ? p.primary : fill > 0 ? p.primary + '60' : p.grid
  ctx.fill()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2)
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y)
}

export function renderMode(mode: PulseMode, ctx: CanvasRenderingContext2D, W: number, H: number, s: PulseState, p: ColorPalette, c: PulseConfig): void {
  const fn = modes[mode]
  if (fn) fn(ctx, W, H, s, p, c)
}

export function getAllModeNames(): PulseMode[] {
  return Object.keys(modes) as PulseMode[]
}
