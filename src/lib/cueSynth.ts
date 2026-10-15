/**
 * Synthesized (non-voice) cues: round-start chime, round-end bell, and the
 * warning clapper. Framework-free and written against `BaseAudioContext`, so
 * the exact same code runs live (AudioContext, via useAudioPlayer.ts) and in
 * offline renders (OfflineAudioContext) for measuring peaks and listening to
 * changes — see CLAUDE.md's Audio section for the design bar these are held to.
 *
 * Three techniques do most of the work of making these sound recorded rather
 * than like test tones:
 *  - a shared room reverb (every cue used to be bone-dry);
 *  - detuned partial pairs, which beat against each other the way a real
 *    bowl or bell "breathes" instead of holding a static sine;
 *  - physical excitation: a short strike transient feeding resonances,
 *    rather than a waveform that's simply switched on.
 */

export interface CueBus {
  ctx: BaseAudioContext
  /** Dry path (to the master chain). */
  output: AudioNode
  /** Reverb send. */
  reverb: AudioNode
  /** One second of white noise, shared by every noise-based excitation. */
  noise: AudioBuffer
}

/**
 * Master volume + peak limiter that every cue (voice clips included) passes
 * through. Volume goes up to 3.0 (300%) to give phone speakers real
 * headroom, and the synthesized cues peak close to unity on their own, so
 * without a limiter boosting would hard-clip into audible crackle.
 * Threshold -6dB / 1ms attack was chosen from real OfflineAudioContext
 * renders: -2dB / 2ms still let stacked additive partials overshoot to
 * +0.89dB at 300% (a fast attack still isn't instant), and the default
 * -24dB threshold squashed everything, undoing the boost. Re-verify with
 * an offline render (see CLAUDE.md's Audio section) whenever a cue changes.
 */
export function createMasterChain(ctx: BaseAudioContext, volume: number): { input: GainNode } {
  const gain = ctx.createGain()
  gain.gain.value = volume
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -6
  limiter.knee.value = 0
  limiter.ratio.value = 20
  limiter.attack.value = 0.001
  limiter.release.value = 0.1
  gain.connect(limiter)
  limiter.connect(ctx.destination)
  return { input: gain }
}

/** A small, slightly dark room: ~2s tail, high frequencies dying faster than lows, like real air and walls. */
function createRoomImpulse(ctx: BaseAudioContext): AudioBuffer {
  const seconds = 2.2
  const preDelay = Math.floor(0.012 * ctx.sampleRate)
  const length = Math.floor(seconds * ctx.sampleRate)
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel)
    let lowpassed = 0
    for (let i = preDelay; i < length; i++) {
      const t = (i - preDelay) / ctx.sampleRate
      // -60dB at ~1.9s.
      const envelope = Math.exp((-6.9 * t) / 1.9)
      // One-pole lowpass that closes as the tail ages: bright early
      // reflections, darker late reverb.
      const damping = Math.min(0.2 + t * 0.45, 0.9)
      lowpassed = (1 - damping) * (Math.random() * 2 - 1) + damping * lowpassed
      data[i] = lowpassed * envelope
    }
  }
  return impulse
}

export function createCueBus(ctx: BaseAudioContext, output: AudioNode): CueBus {
  const convolver = ctx.createConvolver()
  convolver.buffer = createRoomImpulse(ctx)
  convolver.connect(output)

  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

  return { ctx, output, reverb: convolver, noise }
}

/** A cue's own output stage: one gain feeding both the dry path and the reverb at its own mix. */
function cueOutput(bus: CueBus, wet: number): GainNode {
  const node = bus.ctx.createGain()
  node.connect(bus.output)
  const send = bus.ctx.createGain()
  send.gain.value = wet
  node.connect(send)
  send.connect(bus.reverb)
  return node
}

/** Fast attack, exponential decay to silence — the shape of anything struck. */
function strikeEnvelope(param: AudioParam, at: number, peak: number, attack: number, decay: number) {
  param.setValueAtTime(0.0001, at)
  param.exponentialRampToValueAtTime(peak, at + attack)
  param.exponentialRampToValueAtTime(0.0001, at + attack + decay)
}

function sine(ctx: BaseAudioContext, frequency: number, destination: AudioNode, at: number, stopAt: number) {
  const osc = ctx.createOscillator()
  osc.frequency.value = frequency
  osc.connect(destination)
  osc.start(at)
  osc.stop(stopAt)
  return osc
}

/** A burst of the shared noise buffer, shaped by its own decay — the "contact" of a strike. */
function noiseBurst(bus: CueBus, destination: AudioNode, at: number, peak: number, decay: number) {
  const { ctx } = bus
  const source = ctx.createBufferSource()
  source.buffer = bus.noise
  // Random offset so repeated strikes aren't sample-identical.
  const offset = Math.random() * (bus.noise.duration - decay - 0.05)
  const env = ctx.createGain()
  strikeEnvelope(env.gain, at, peak, 0.0008, decay)
  source.connect(env)
  env.connect(destination)
  source.start(at, offset)
  source.stop(at + decay + 0.02)
}

// ---------------------------------------------------------------------------
// Round-end bell: a struck singing bowl. Deep 220Hz fundamental, inharmonic
// overtones (measured bowl ratios, roughly 1 : 2.76 : 5.4 : 8.9), each one a
// pair of oscillators a hair apart in pitch so they slowly beat — the
// characteristic "wah-wah" shimmer of a real bowl — with higher partials
// dying faster, as they physically do. A soft mallet transient at the start
// gives it an attack you can place in time, and the room carries the tail.
// ---------------------------------------------------------------------------
const BELL_FUNDAMENTAL = 220
const BELL_PARTIALS = [
  { ratio: 1, gain: 0.42, decay: 4.8, beatHz: 0.9 },
  { ratio: 2.76, gain: 0.22, decay: 3.4, beatHz: 1.6 },
  { ratio: 5.4, gain: 0.1, decay: 2.0, beatHz: 2.4 },
  { ratio: 8.93, gain: 0.045, decay: 1.1, beatHz: 3.1 },
  { ratio: 13.34, gain: 0.02, decay: 0.55, beatHz: 0 },
]
// Detuned pairs at unequal levels: the tone swells and eases by roughly
// ±40% rather than cutting out entirely, which reads as a wobbly tremolo
// effect instead of a bowl's gentle breathing.
const BELL_BEAT_MIX = [0.68, 0.32]
export const BELL_DURATION_S = 5

export function playBell(bus: CueBus, at = bus.ctx.currentTime) {
  const { ctx } = bus
  const out = cueOutput(bus, 0.32)

  for (const { ratio, gain, decay, beatHz } of BELL_PARTIALS) {
    const env = ctx.createGain()
    strikeEnvelope(env.gain, at, gain, 0.006, decay)
    env.connect(out)
    const frequency = BELL_FUNDAMENTAL * ratio
    const stopAt = at + decay + 0.1
    if (beatHz > 0) {
      // Two oscillators beatHz apart = one tone whose loudness swells and
      // eases beatHz times a second.
      for (const [i, level] of BELL_BEAT_MIX.entries()) {
        const mix = ctx.createGain()
        mix.gain.value = level
        mix.connect(env)
        sine(ctx, frequency + i * beatHz, mix, at, stopAt)
      }
    } else {
      sine(ctx, frequency, env, at, stopAt)
    }
  }

  // Mallet contact: a short, soft band of noise around 2kHz.
  const mallet = ctx.createBiquadFilter()
  mallet.type = 'bandpass'
  mallet.frequency.value = 2200
  mallet.Q.value = 0.8
  mallet.connect(out)
  noiseBurst(bus, mallet, at, 0.18, 0.035)
}

// ---------------------------------------------------------------------------
// Round-start chime: a quick rising "bling" in a glockenspiel-like FM tone —
// bright where the bell is deep, short where it's long, rising where it
// rings down, so the two are unmistakable by ear. A grace note (E5) leads
// into an open B5+E6 fifth. Everything has struck by ~80ms, ahead of the
// round announcement that follows 200ms later (ROUND_START_VOICE_DELAY_MS).
// ---------------------------------------------------------------------------
const CHIME_NOTES = [
  { offset: 0, frequency: 659.25, gain: 0.13, decay: 0.55 },
  { offset: 0.075, frequency: 987.77, gain: 0.17, decay: 1.2 },
  { offset: 0.075, frequency: 1318.51, gain: 0.1, decay: 0.9 },
]
export const CHIME_DURATION_S = 1.5

/**
 * FM bell tone: a sine carrier whose pitch is wobbled by a second sine at an
 * inharmonic 3.5x ratio. The wobble depth decays much faster than the note,
 * so it starts metallic/sparkly and settles into a pure tone — the way a
 * struck metal bar sounds.
 */
function fmBell(bus: CueBus, destination: AudioNode, at: number, frequency: number, gain: number, decay: number) {
  const { ctx } = bus
  const env = ctx.createGain()
  strikeEnvelope(env.gain, at, gain, 0.002, decay)
  env.connect(destination)

  const carrier = ctx.createOscillator()
  carrier.frequency.value = frequency
  const modulator = ctx.createOscillator()
  modulator.frequency.value = frequency * 3.5
  const depth = ctx.createGain()
  strikeEnvelope(depth.gain, at, frequency * 1.6, 0.001, decay * 0.18)
  modulator.connect(depth)
  depth.connect(carrier.frequency)
  carrier.connect(env)

  const stopAt = at + decay + 0.05
  carrier.start(at)
  modulator.start(at)
  carrier.stop(stopAt)
  modulator.stop(stopAt)
}

export function playStartChime(bus: CueBus, at = bus.ctx.currentTime) {
  const out = cueOutput(bus, 0.3)
  for (const note of CHIME_NOTES) {
    fmBell(bus, out, at + note.offset, note.frequency, note.gain, note.decay)
  }
}

// ---------------------------------------------------------------------------
// Warning clapper: two wooden sticks (hyoshigi), the "10 seconds left"
// signal in combat sports. Each hit is a very short noise impulse ringing a
// bank of tuned resonators (a wood block's modes) plus a low "tock" body
// with a quick pitch drop — wood, not filtered static. The second stick is
// pitched a little lower, as no two real sticks match. Kept bright, loud and
// nearly dry: it's the cue that has to cut through a noisy gym, and a long
// room tail would smear the two hits together.
// ---------------------------------------------------------------------------
const WOOD_MODES = [
  { frequency: 880, q: 14, gain: 1 },
  { frequency: 1720, q: 16, gain: 0.65 },
  { frequency: 2960, q: 18, gain: 0.4 },
  { frequency: 4500, q: 12, gain: 0.22 },
]
const CLAP_HITS = [
  { offset: 0, pitch: 1 },
  { offset: 0.14, pitch: 0.93 },
]
export const CLAP_DURATION_S = 0.8

function woodHit(bus: CueBus, destination: AudioNode, at: number, pitch: number) {
  const { ctx } = bus

  // Resonators, excited by a ~4ms impulse. High-Q bandpasses pass very
  // little of a broadband impulse's energy, hence the large makeup gain.
  const resonance = ctx.createGain()
  resonance.gain.value = 10
  resonance.connect(destination)
  const excitation = ctx.createGain()
  for (const mode of WOOD_MODES) {
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = mode.frequency * pitch
    filter.Q.value = mode.q
    const level = ctx.createGain()
    level.gain.value = mode.gain
    excitation.connect(filter)
    filter.connect(level)
    level.connect(resonance)
  }
  noiseBurst(bus, excitation, at, 1, 0.004)

  // A bright click on top for the attack edge.
  const click = ctx.createBiquadFilter()
  click.type = 'highpass'
  click.frequency.value = 2000
  click.connect(destination)
  noiseBurst(bus, click, at, 0.5, 0.007)

  // Body: a short sine "tock" that drops in pitch as it dies.
  const body = ctx.createOscillator()
  body.frequency.setValueAtTime(520 * pitch, at)
  body.frequency.exponentialRampToValueAtTime(330 * pitch, at + 0.05)
  const bodyEnv = ctx.createGain()
  strikeEnvelope(bodyEnv.gain, at, 0.16, 0.001, 0.05)
  body.connect(bodyEnv)
  bodyEnv.connect(destination)
  body.start(at)
  body.stop(at + 0.09)
}

export function playWarningClap(bus: CueBus, at = bus.ctx.currentTime) {
  const out = cueOutput(bus, 0.05)
  for (const hit of CLAP_HITS) woodHit(bus, out, at + hit.offset, hit.pitch)
}
