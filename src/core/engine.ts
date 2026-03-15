// ═══════════════════════════════════════════
// PULSEKIT — Engine
// ═══════════════════════════════════════════

import type { PulseConfig, PulseState, PulseMode, ColorPalette, Momentum } from '../types'
import { renderMode } from '../modes'

export class PulseEngine {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private config: Required<PulseConfig>
  private state: PulseState
  private palette: ColorPalette
  private raf = 0
  private running = false

  constructor(config: PulseConfig) {
    const c = config
    this.config = {
      mode: c.mode || 'ring',
      value: c.value,
      min: c.min ?? 0,
      max: c.max ?? 100,
      color: c.color || '#3b82f6',
      theme: c.theme || 'dark',
      showValue: c.showValue ?? false,
      formatValue: c.formatValue || ((v: number) => v % 1 === 0 ? String(v) : v.toFixed(1)),
      unit: c.unit || '',
      label: c.label || '',
      lerpSpeed: c.lerpSpeed ?? 0.08,
      glow: c.glow !== false,
      historyLength: c.historyLength ?? 60,
      thresholds: c.thresholds || [70, 90],
      thresholdColors: c.thresholdColors || ['#fbbf24', '#ef4444'],
    }

    this.palette = derivePalette(this.config.color, this.config.theme, this.config.thresholdColors)

    const norm = this.normalize(this.config.value)
    this.state = {
      value: this.config.value,
      displayValue: this.config.value,
      normalizedValue: norm,
      displayNormalized: norm,
      history: [norm],
      momentum: 'flat',
      momentumStrength: 0,
      time: 0,
      lastChange: 0,
      changeCount: 0,
    }
  }

  mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.resize()
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.loop()
  }

  stop(): void {
    this.running = false
    if (this.raf) cancelAnimationFrame(this.raf)
  }

  destroy(): void {
    this.stop()
    this.canvas = null
    this.ctx = null
  }

  resize(): void {
    if (!this.canvas) return
    const parent = this.canvas.parentElement
    const w = parent ? parent.clientWidth : 200
    const h = parent ? parent.clientHeight : 200
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = w * dpr
    this.canvas.height = h * dpr
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
    this.ctx?.scale(dpr, dpr)
  }

  setValue(value: number): void {
    const prev = this.state.value
    this.config.value = value
    this.state.value = value
    this.state.normalizedValue = this.normalize(value)

    // Momentum detection
    const diff = value - prev
    if (Math.abs(diff) > (this.config.max - this.config.min) * 0.001) {
      this.state.momentum = diff > 0 ? 'up' : 'down'
      this.state.momentumStrength = Math.min(1, Math.abs(diff) / ((this.config.max - this.config.min) * 0.1))
      this.state.lastChange = this.state.time
      this.state.changeCount++
    } else {
      this.state.momentumStrength *= 0.95
      if (this.state.momentumStrength < 0.01) this.state.momentum = 'flat'
    }
  }

  setConfig(config: Partial<PulseConfig>): void {
    Object.assign(this.config, config)
    if (config.color || config.theme || config.thresholdColors) {
      this.palette = derivePalette(this.config.color, this.config.theme, this.config.thresholdColors)
    }
    if (config.value !== undefined) this.setValue(config.value)
  }

  getState(): PulseState { return { ...this.state } }
  getConfig(): PulseConfig { return { ...this.config } }

  // ─── Core Loop ───

  private loop(): void {
    if (!this.running || !this.ctx || !this.canvas) return
    this.state.time += 0.016

    // Lerp display values toward target
    const ls = this.config.lerpSpeed
    this.state.displayValue += (this.state.value - this.state.displayValue) * ls
    this.state.displayNormalized += (this.state.normalizedValue - this.state.displayNormalized) * ls

    // Push to history
    if (this.state.history.length >= this.config.historyLength) this.state.history.shift()
    this.state.history.push(this.state.displayNormalized)

    // Render
    const parent = this.canvas.parentElement
    const W = parent ? parent.clientWidth : 200
    const H = parent ? parent.clientHeight : 200

    this.ctx.save()
    this.ctx.clearRect(0, 0, W, H)

    // Resolve active color (threshold-aware)
    const activePalette = this.getActivePalette()

    renderMode(this.config.mode, this.ctx, W, H, this.state, activePalette, this.config)
    this.ctx.restore()

    this.raf = requestAnimationFrame(() => this.loop())
  }

  private normalize(value: number): number {
    return Math.max(0, Math.min(1, (value - this.config.min) / (this.config.max - this.config.min)))
  }

  private getActivePalette(): ColorPalette {
    const v = this.state.value
    const [warn, danger] = this.config.thresholds!
    if (v >= danger) return { ...this.palette, primary: this.palette.danger, primaryRgb: this.palette.dangerRgb, glow: this.palette.danger + '40' }
    if (v >= warn) return { ...this.palette, primary: this.palette.warn, primaryRgb: this.palette.warnRgb, glow: this.palette.warn + '40' }
    return this.palette
  }
}

// ─── Color Derivation ───

function derivePalette(color: string, theme: 'dark' | 'light', thresholdColors: [string, string]): ColorPalette {
  const rgb = hexToRgb(color)
  const dark = theme === 'dark'

  return {
    primary: color,
    primaryRgb: rgb,
    glow: color + '40',
    dim: color + '20',
    bg: dark ? '#0a0a0e' : '#ffffff',
    fg: dark ? '#e0e0e8' : '#1a1a1a',
    grid: dark ? '#1c1c28' : '#e8e8e8',
    text: dark ? '#909098' : '#666666',
    muted: dark ? '#404050' : '#bbbbbb',
    warn: thresholdColors[0],
    warnRgb: hexToRgb(thresholdColors[0]),
    danger: thresholdColors[1],
    dangerRgb: hexToRgb(thresholdColors[1]),
    up: '#4ade80',
    down: '#f87171',
  }
}

function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace('#', '')
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  return [parseInt(hex.substr(0, 2), 16), parseInt(hex.substr(2, 2), 16), parseInt(hex.substr(4, 2), 16)]
}
