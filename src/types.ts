// ═══════════════════════════════════════════
// PULSEKIT — Types
// ═══════════════════════════════════════════

export type PulseMode =
  // ─── Original 30 ───
  | 'ring' | 'gauge' | 'bar' | 'spark' | 'ticker' | 'delta' | 'dot' | 'wave'
  | 'heat' | 'meter' | 'needle' | 'heartbeat' | 'spectrum' | 'bubble' | 'radar'
  | 'signal' | 'battery' | 'equalizer' | 'pendulum' | 'ripple' | 'orbit'
  | 'flame' | 'tide' | 'compass' | 'thermometer' | 'clock' | 'progress'
  | 'arc' | 'segments' | 'binary'
  // ─── 100 New Modes ───
  | 'donut' | 'pie' | 'dial' | 'knob' | 'slider' | 'step'
  | 'spiral' | 'helix' | 'dna' | 'spring'
  | 'oscilloscope' | 'seismograph' | 'ecg' | 'pulse-wave' | 'sawtooth' | 'square-wave'
  | 'volume' | 'loudness' | 'decibel' | 'waveform'
  | 'speedometer' | 'tachometer' | 'altimeter' | 'pressure'
  | 'hourglass' | 'stopwatch' | 'countdown' | 'timer'
  | 'cpu' | 'memory' | 'disk' | 'network' | 'uptime' | 'latency'
  | 'heart' | 'lungs' | 'oxygen' | 'temperature'
  | 'wind' | 'humidity' | 'uv' | 'rain-gauge'
  | 'stock' | 'crypto' | 'percentage' | 'currency'
  | 'stars' | 'rating' | 'score' | 'rank'
  | 'loading' | 'spinner' | 'dots-loading' | 'pulse-loading'
  | 'badge' | 'chip' | 'tag' | 'indicator'
  | 'minimap' | 'horizon' | 'level' | 'gyroscope'
  | 'pixel' | 'led' | 'matrix' | 'seven-seg'
  | 'bar-stack' | 'bar-group' | 'histogram' | 'waterfall'
  | 'radial-bar' | 'sunburst' | 'polar' | 'rose-chart'
  | 'gauge-mini' | 'gauge-flat' | 'gauge-digital' | 'gauge-neon'
  | 'ring-thick' | 'ring-thin' | 'ring-dashed' | 'ring-gradient'
  | 'wave-square' | 'wave-triangle' | 'wave-noise' | 'wave-pulse'
  | 'meter-horizontal' | 'meter-arc' | 'meter-digital' | 'meter-segment'
  | 'spark-bar' | 'spark-area' | 'spark-dot' | 'spark-step'
  | 'status' | 'health' | 'alert' | 'warning'
  | 'fill-circle' | 'fill-square' | 'fill-diamond' | 'fill-hex'

export type Momentum = 'up' | 'down' | 'flat'

export interface PulseConfig {
  /** Visualization mode. Default: 'ring' */
  mode?: PulseMode
  /** Current value. */
  value: number
  /** Minimum value for normalization. Default: 0 */
  min?: number
  /** Maximum value for normalization. Default: 100 */
  max?: number
  /** Accent color. Entire palette derived from this. Default: '#3b82f6' */
  color?: string
  /** Theme. Default: 'dark' */
  theme?: 'dark' | 'light'
  /** Show value label. Default: false */
  showValue?: boolean
  /** Value format function */
  formatValue?: (v: number) => string
  /** Unit label (e.g. '%', 'ms', '°C') */
  unit?: string
  /** Label text below the visualization */
  label?: string
  /** Lerp speed 0-1. Default: 0.08 */
  lerpSpeed?: number
  /** Glow effect. Default: true */
  glow?: boolean
  /** History length for spark/heartbeat. Default: 60 */
  historyLength?: number
  /** Threshold values for color changes: [warn, danger] */
  thresholds?: [number, number]
  /** Threshold colors. Default: ['#fbbf24', '#ef4444'] */
  thresholdColors?: [string, string]
}

export interface PulseProps extends PulseConfig {
  /** CSS class name */
  className?: string
  /** Inline styles for the container */
  style?: Record<string, any>
  /** Width. Default: fills parent */
  width?: number
  /** Height. Default: fills parent */
  height?: number
}

export interface PulseState {
  value: number
  displayValue: number
  normalizedValue: number
  displayNormalized: number
  history: number[]
  momentum: Momentum
  momentumStrength: number
  time: number
  lastChange: number
  changeCount: number
}

export interface ColorPalette {
  primary: string
  primaryRgb: [number, number, number]
  glow: string
  dim: string
  bg: string
  fg: string
  grid: string
  text: string
  muted: string
  warn: string
  warnRgb: [number, number, number]
  danger: string
  dangerRgb: [number, number, number]
  up: string
  down: string
}

export const ALL_MODES: PulseMode[] = [
  'ring','gauge','bar','spark','ticker','delta','dot','wave','heat','meter',
  'needle','heartbeat','spectrum','bubble','radar','signal','battery','equalizer',
  'pendulum','ripple','orbit','flame','tide','compass','thermometer','clock',
  'progress','arc','segments','binary',
  'donut','pie','dial','knob','slider','step',
  'spiral','helix','dna','spring',
  'oscilloscope','seismograph','ecg','pulse-wave','sawtooth','square-wave',
  'volume','loudness','decibel','waveform',
  'speedometer','tachometer','altimeter','pressure',
  'hourglass','stopwatch','countdown','timer',
  'cpu','memory','disk','network','uptime','latency',
  'heart','lungs','oxygen','temperature',
  'wind','humidity','uv','rain-gauge',
  'stock','crypto','percentage','currency',
  'stars','rating','score','rank',
  'loading','spinner','dots-loading','pulse-loading',
  'badge','chip','tag','indicator',
  'minimap','horizon','level','gyroscope',
  'pixel','led','matrix','seven-seg',
  'bar-stack','bar-group','histogram','waterfall',
  'radial-bar','sunburst','polar','rose-chart',
  'gauge-mini','gauge-flat','gauge-digital','gauge-neon',
  'ring-thick','ring-thin','ring-dashed','ring-gradient',
  'wave-square','wave-triangle','wave-noise','wave-pulse',
  'meter-horizontal','meter-arc','meter-digital','meter-segment',
  'spark-bar','spark-area','spark-dot','spark-step',
  'status','health','alert','warning',
  'fill-circle','fill-square','fill-diamond','fill-hex',
]
