export type SoundName =
  | 'spin'
  | 'reelStop'
  | 'win'
  | 'bigWin'
  | 'jackpot'
  | 'cardDeal'
  | 'cardFlip'
  | 'chipPlace'
  | 'chipCollect'
  | 'coinDrop'
  | 'buttonClick'
  | 'ambient'

type SoundDefinition = {
  play: (ctx: AudioContext, destination: AudioNode) => AudioNode[]
  loop?: boolean
}

/**
 * Attempt to resume an AudioContext that may be suspended due to browser
 * autoplay policies. Returns true if the context is running.
 */
async function ensureContextRunning(ctx: AudioContext): Promise<boolean> {
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      // Browser blocked resume — nothing we can do
    }
  }
  return ctx.state === 'running'
}

// ---------------------------------------------------------------------------
// Oscillator-based sound definitions
// ---------------------------------------------------------------------------

function createOsc(
  ctx: AudioContext,
  dest: AudioNode,
  type: OscillatorType,
  frequency: number,
  startTime: number,
  duration: number,
  gain: number = 0.3,
): [OscillatorNode, GainNode] {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = frequency
  g.gain.setValueAtTime(gain, startTime)
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  osc.connect(g)
  g.connect(dest)
  osc.start(startTime)
  osc.stop(startTime + duration)
  return [osc, g]
}

const SOUND_DEFS: Record<SoundName, SoundDefinition> = {
  // --- Slot machine ---
  spin: {
    play(ctx, dest) {
      const nodes: AudioNode[] = []
      const now = ctx.currentTime
      // Quick ascending sweep
      for (let i = 0; i < 6; i++) {
        const [osc, g] = createOsc(ctx, dest, 'sawtooth', 200 + i * 80, now + i * 0.04, 0.08, 0.15)
        nodes.push(osc, g)
      }
      return nodes
    },
  },

  reelStop: {
    play(ctx, dest) {
      const now = ctx.currentTime
      const [osc, g] = createOsc(ctx, dest, 'square', 150, now, 0.1, 0.25)
      const [osc2, g2] = createOsc(ctx, dest, 'sine', 80, now, 0.15, 0.2)
      return [osc, g, osc2, g2]
    },
  },

  win: {
    play(ctx, dest) {
      const nodes: AudioNode[] = []
      const now = ctx.currentTime
      const notes = [523, 659, 784, 1047] // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const [osc, g] = createOsc(ctx, dest, 'sine', freq, now + i * 0.12, 0.25, 0.25)
        nodes.push(osc, g)
      })
      return nodes
    },
  },

  bigWin: {
    play(ctx, dest) {
      const nodes: AudioNode[] = []
      const now = ctx.currentTime
      // Fanfare arpeggio
      const notes = [523, 659, 784, 1047, 1319, 1568]
      notes.forEach((freq, i) => {
        const [osc, g] = createOsc(ctx, dest, 'sine', freq, now + i * 0.1, 0.4, 0.3)
        nodes.push(osc, g)
        // Add harmonics
        const [osc2, g2] = createOsc(ctx, dest, 'triangle', freq * 2, now + i * 0.1, 0.3, 0.1)
        nodes.push(osc2, g2)
      })
      return nodes
    },
  },

  jackpot: {
    play(ctx, dest) {
      const nodes: AudioNode[] = []
      const now = ctx.currentTime
      // Dramatic ascending with chords
      const chords = [
        [523, 659, 784],
        [587, 740, 880],
        [659, 831, 988],
        [784, 988, 1175],
        [1047, 1319, 1568],
      ]
      chords.forEach((chord, ci) => {
        chord.forEach((freq) => {
          const [osc, g] = createOsc(ctx, dest, 'sine', freq, now + ci * 0.18, 0.5, 0.2)
          nodes.push(osc, g)
        })
      })
      return nodes
    },
  },

  // --- Card games ---
  cardDeal: {
    play(ctx, dest) {
      const now = ctx.currentTime
      // Short whoosh-like noise burst
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(800, now)
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.06)
      g.gain.setValueAtTime(0.15, now)
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
      osc.connect(g)
      g.connect(dest)
      osc.start(now)
      osc.stop(now + 0.06)
      return [osc, g]
    },
  },

  cardFlip: {
    play(ctx, dest) {
      const now = ctx.currentTime
      const [osc, g] = createOsc(ctx, dest, 'triangle', 1200, now, 0.08, 0.2)
      const [osc2, g2] = createOsc(ctx, dest, 'sine', 600, now + 0.03, 0.06, 0.15)
      return [osc, g, osc2, g2]
    },
  },

  // --- Chips / coins ---
  chipPlace: {
    play(ctx, dest) {
      const now = ctx.currentTime
      const [osc, g] = createOsc(ctx, dest, 'sine', 1800, now, 0.05, 0.15)
      const [osc2, g2] = createOsc(ctx, dest, 'triangle', 2400, now + 0.02, 0.04, 0.1)
      return [osc, g, osc2, g2]
    },
  },

  chipCollect: {
    play(ctx, dest) {
      const nodes: AudioNode[] = []
      const now = ctx.currentTime
      for (let i = 0; i < 4; i++) {
        const [osc, g] = createOsc(ctx, dest, 'sine', 1800 + i * 200, now + i * 0.04, 0.06, 0.12)
        nodes.push(osc, g)
      }
      return nodes
    },
  },

  coinDrop: {
    play(ctx, dest) {
      const nodes: AudioNode[] = []
      const now = ctx.currentTime
      // Metallic bouncing sound
      const bounces = [2000, 2400, 2200, 2600, 2100]
      bounces.forEach((freq, i) => {
        const [osc, g] = createOsc(ctx, dest, 'sine', freq, now + i * 0.07, 0.08, 0.15 - i * 0.02)
        nodes.push(osc, g)
      })
      return nodes
    },
  },

  // --- UI ---
  buttonClick: {
    play(ctx, dest) {
      const now = ctx.currentTime
      const [osc, g] = createOsc(ctx, dest, 'sine', 1000, now, 0.04, 0.15)
      return [osc, g]
    },
  },

  // --- Ambient ---
  ambient: {
    loop: true,
    play(ctx, dest) {
      const now = ctx.currentTime

      // Low-frequency hum
      const osc1 = ctx.createOscillator()
      const g1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.value = 60
      g1.gain.value = 0.04
      osc1.connect(g1)
      g1.connect(dest)
      osc1.start(now)

      // Subtle second harmonic
      const osc2 = ctx.createOscillator()
      const g2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.value = 120
      g2.gain.value = 0.02
      osc2.connect(g2)
      g2.connect(dest)
      osc2.start(now)

      // Very slow LFO to modulate amplitude for a breathing effect
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.type = 'sine'
      lfo.frequency.value = 0.15
      lfoGain.gain.value = 0.015
      lfo.connect(lfoGain)
      lfoGain.connect(g1.gain)
      lfo.start(now)

      return [osc1, g1, osc2, g2, lfo, lfoGain]
    },
  },
}

// ---------------------------------------------------------------------------
// SoundManager singleton
// ---------------------------------------------------------------------------

export class SoundManager {
  private static instance: SoundManager | null = null

  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private muted = false
  private activeNodes: Map<SoundName, AudioNode[]> = new Map()

  private constructor() {
    // Private — use getInstance()
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager()
    }
    return SoundManager.instance
  }

  // Lazily create the AudioContext (must happen after user gesture in most browsers)
  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null

    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = this.muted ? 0 : 1
      this.masterGain.connect(this.ctx.destination)
    }
    return this.ctx
  }

  async play(sound: SoundName): Promise<void> {
    if (typeof window === 'undefined') return

    const ctx = this.getContext()
    if (!ctx || !this.masterGain) return

    const running = await ensureContextRunning(ctx)
    if (!running) return

    // If this is a looping sound that is already playing, skip
    const def = SOUND_DEFS[sound]
    if (def.loop && this.activeNodes.has(sound)) return

    // Stop any existing instance of this sound
    this.stopSound(sound)

    const nodes = def.play(ctx, this.masterGain)
    this.activeNodes.set(sound, nodes)

    // For non-looping sounds, clean up reference when finished
    if (!def.loop) {
      const longestDuration = 2 // generous upper bound in seconds
      setTimeout(() => {
        this.activeNodes.delete(sound)
      }, longestDuration * 1000)
    }
  }

  stop(sound?: SoundName): void {
    if (sound) {
      this.stopSound(sound)
    } else {
      // Stop all
      for (const name of this.activeNodes.keys()) {
        this.stopSound(name)
      }
    }
  }

  private stopSound(sound: SoundName): void {
    const nodes = this.activeNodes.get(sound)
    if (!nodes) return

    for (const node of nodes) {
      try {
        if (node instanceof OscillatorNode) {
          node.stop()
          node.disconnect()
        } else if (node instanceof GainNode) {
          node.disconnect()
        }
      } catch {
        // Already stopped — ignore
      }
    }
    this.activeNodes.delete(sound)
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 1
    }
  }

  isMuted(): boolean {
    return this.muted
  }
}

/**
 * Default singleton instance.
 * Safe to import in SSR — all audio operations are no-ops when `window` is
 * unavailable.
 */
export const soundManager = SoundManager.getInstance()
