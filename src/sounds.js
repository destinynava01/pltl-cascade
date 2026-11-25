// Cascade sound effects, made with the browser's Web Audio API (no audio files). Browsers allow sound only after
// someone has tapped or clicked the page, which has happened by the time a game is running.

const SOUND_KEY = 'cascadeSound'
let audio = null

function context() {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!audio) audio = new Ctx()
  if (audio.state === 'suspended') audio.resume().catch(() => {})
  return audio
}

export function soundOn() {
  try { return localStorage.getItem(SOUND_KEY) !== 'off' } catch { return true }
}
export function setSoundOn(on) {
  try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off') } catch { /* storage blocked */ }
}

// One tone that slides from `from` to `to` Hz
function tone(ctx, { from, to = from, start = 0, length = 0.2, type = 'sine', volume = 0.15 }) {
  const t = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + length)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + length + 0.05)
}

// A burst of noise through a filter that sweeps down: the rumble of things falling
function rumble(ctx, { start = 0, length = 0.9, volume = 0.35 }) {
  const t = ctx.currentTime + start
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * length), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(2400, t)
  filter.frequency.exponentialRampToValueAtTime(120, t + length)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  noise.connect(filter).connect(gain).connect(ctx.destination)
  noise.start(t)
  noise.stop(t + length)
}

// 💥 The chain collapsing: a crash, a rumble, and blocks tumbling down (falling knocks, lower each time)
export function playCollapse() {
  if (!soundOn()) return
  const ctx = context()
  if (!ctx) return
  rumble(ctx, { length: 1.1, volume: 0.4 })
  tone(ctx, { from: 160, to: 45, length: 0.6, type: 'sawtooth', volume: 0.18 })
  ;[0.1, 0.24, 0.36, 0.5, 0.6, 0.72].forEach((start, i) => {
    tone(ctx, { from: 420 - i * 55, to: 120 - i * 12, start, length: 0.12, type: 'triangle', volume: 0.2 })
  })
}

// 💧 A card lands in the chain: a soft water-drop plink
export function playPlace() {
  if (!soundOn()) return
  const ctx = context()
  if (!ctx) return
  tone(ctx, { from: 1300, to: 520, length: 0.16, type: 'sine', volume: 0.16 })
}

// 🎉 A sequence is finished: a quick rising chime
export function playComplete() {
  if (!soundOn()) return
  const ctx = context()
  if (!ctx) return
  ;[523, 659, 784, 1047].forEach((f, i) => tone(ctx, { from: f, start: i * 0.09, length: 0.35, type: 'triangle', volume: 0.14 }))
}
