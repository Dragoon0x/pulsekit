# pulsekit

Living data components. 132 visualization modes across 25 categories. One canvas per component, 60fps interpolation, two props, zero dependencies.

```
npm install pulsekit
```

## Two props

```jsx
import { Pulse } from 'pulsekit'

<div style={{ height: 200 }}>
  <Pulse value={cpu} mode="ring" />
</div>
```

`value` is a number. `mode` picks the visualization. That's it.

## 132 Modes in 25 Categories

**Core (30):** ring, gauge, bar, spark, ticker, delta, dot, wave, heat, meter, needle, heartbeat, spectrum, bubble, radar, signal, battery, equalizer, pendulum, ripple, orbit, flame, tide, compass, thermometer, clock, progress, arc, segments, binary

**Shape (6):** donut, pie, dial, knob, slider, step — **Pattern (4):** spiral, helix, dna, spring — **Waveform (6):** oscilloscope, seismograph, ecg, pulse-wave, sawtooth, square-wave — **Audio (4):** volume, loudness, decibel, waveform — **Instrument (4):** speedometer, tachometer, altimeter, pressure — **Time (4):** hourglass, stopwatch, countdown, timer — **System (6):** cpu, memory, disk, network, uptime, latency — **Health (4):** heart, lungs, oxygen, temperature — **Weather (4):** wind, humidity, uv, rain-gauge — **Financial (4):** stock, crypto, percentage, currency — **Rating (4):** stars, rating, score, rank — **Loading (4):** loading, spinner, dots-loading, pulse-loading — **Status (4):** badge, chip, tag, indicator — **Spatial (4):** minimap, horizon, level, gyroscope — **Digital (4):** pixel, led, matrix, seven-seg — **Chart (4):** bar-stack, bar-group, histogram, waterfall — **Radial (4):** radial-bar, sunburst, polar, rose-chart — **Gauge+ (4):** gauge-mini, gauge-flat, gauge-digital, gauge-neon — **Ring+ (4):** ring-thick, ring-thin, ring-dashed, ring-gradient — **Wave+ (4):** wave-square, wave-triangle, wave-noise, wave-pulse — **Meter+ (4):** meter-horizontal, meter-arc, meter-digital, meter-segment — **Spark+ (4):** spark-bar, spark-area, spark-dot, spark-step — **Alert (4):** status, health, alert, warning — **Fill (4):** fill-circle, fill-square, fill-diamond, fill-hex

## How it works

One canvas, one requestAnimationFrame loop. When a new value arrives, nothing jumps. The display lerps toward the target at 8% per frame. History, momentum, and color all follow the same interpolation.

## Vanilla JS

```js
import { PulseEngine } from 'pulsekit'

const engine = new PulseEngine({ value: 50, mode: 'gauge' })
engine.mount(document.querySelector('canvas'))
engine.start()

setInterval(() => engine.setValue(Math.random() * 100), 1000)
```

## Disclaimer

Experimental software. DYOR.

## License

MIT. Built by [0xDragoon](https://github.com/dragoon0x).
