import React, { useRef, useEffect } from 'react'
import type { PulseProps } from '../types'
import { PulseEngine } from '../core/engine'

export function Pulse({
  mode, value, min, max, color, theme, showValue, formatValue,
  unit, label, lerpSpeed, glow, historyLength, thresholds, thresholdColors,
  className, style, width, height,
}: PulseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<PulseEngine | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = new PulseEngine({
      mode, value, min, max, color, theme, showValue, formatValue,
      unit, label, lerpSpeed, glow, historyLength, thresholds, thresholdColors,
    })
    engine.mount(canvas)
    engine.start()
    engineRef.current = engine

    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)

    return () => { engine.destroy(); window.removeEventListener('resize', onResize) }
  }, [mode, color, theme, min, max, showValue, unit, label, lerpSpeed, glow, historyLength])

  useEffect(() => {
    if (engineRef.current) engineRef.current.setValue(value)
  }, [value])

  return React.createElement('canvas', {
    ref: canvasRef,
    className,
    style: { display: 'block', width: width || '100%', height: height || '100%', ...style },
    'aria-label': `${mode} visualization: ${value}${unit || ''}`,
    role: 'img',
  })
}
