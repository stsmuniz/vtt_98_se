/**
 * Som sintetizado de um disco rígido antigo em leitura/escrita aleatória
 * (Web Audio, sem arquivos de áudio):
 *
 * - motor: dente-de-serra grave (~90 Hz, 5400 rpm) + 2ª harmônica, filtrado,
 *   com "spin-up" ao ligar e desaceleração ao parar, mais um chiado de ar baixo;
 * - cabeça de leitura: rajadas aleatórias de cliques curtos (ruído filtrado com
 *   envelope rápido) acompanhados de um "toc" grave amortecido.
 *
 * Cada execução soa diferente (tudo é sorteado).
 */

const rand = (min: number, max: number) => min + Math.random() * (max - min)

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  // Ruído "rosado" simples (média móvel de ruído branco): mais natural que o branco puro.
  let last = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.04 * white) / 1.04
    data[i] = last * 3.5
  }
  return buffer
}

export interface HardDiskSound {
  start: () => void
  /** Desacelera o motor e encerra; resolve quando o som termina. */
  stop: () => Promise<void>
}

export function createHardDiskSound(ctx: AudioContext, destination: AudioNode = ctx.destination): HardDiskSound {
  const master = ctx.createGain()
  master.gain.value = 0.9
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -18
  compressor.ratio.value = 6
  master.connect(compressor).connect(destination)

  const clickNoise = noiseBuffer(ctx, 0.05)
  let spindle: { oscs: OscillatorNode[]; gain: GainNode; air: AudioBufferSourceNode } | null = null
  let schedulerTimer: ReturnType<typeof setInterval> | null = null
  let nextBurstAt = 0

  function startSpindle() {
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.035, now + 1.2)
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 400
    gain.connect(lowpass).connect(master)

    const oscs = [1, 2].map((harmonic) => {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(20 * harmonic, now)
      osc.frequency.exponentialRampToValueAtTime(90 * harmonic, now + 1.5)
      const g = ctx.createGain()
      g.gain.value = harmonic === 1 ? 1 : 0.35
      osc.connect(g).connect(gain)
      osc.start(now)
      return osc
    })

    // Chiado de ar das cabeças voando sobre o prato.
    const air = ctx.createBufferSource()
    air.buffer = noiseBuffer(ctx, 2)
    air.loop = true
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 3000
    band.Q.value = 0.7
    const airGain = ctx.createGain()
    airGain.gain.setValueAtTime(0, now)
    airGain.gain.linearRampToValueAtTime(0.006, now + 1.5)
    air.connect(band).connect(airGain).connect(master)
    air.start(now)

    spindle = { oscs, gain, air }
  }

  /** Um clique de busca da cabeça no instante `t`. */
  function seekClick(t: number) {
    const src = ctx.createBufferSource()
    src.buffer = clickNoise
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = rand(1500, 4000)
    band.Q.value = rand(2, 6)
    const env = ctx.createGain()
    const length = rand(0.002, 0.006)
    env.gain.setValueAtTime(rand(0.5, 0.9), t)
    env.gain.exponentialRampToValueAtTime(0.0001, t + length + 0.01)
    src.connect(band).connect(env).connect(master)
    src.start(t, rand(0, 0.03), length + 0.012)

    // "Toc" grave do braço atuador parando.
    const thump = ctx.createOscillator()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(rand(150, 300), t)
    thump.frequency.exponentialRampToValueAtTime(80, t + 0.02)
    const tg = ctx.createGain()
    tg.gain.setValueAtTime(rand(0.15, 0.3), t)
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.025)
    thump.connect(tg).connect(master)
    thump.start(t)
    thump.stop(t + 0.03)
  }

  /** Agenda rajadas de cliques um pouco à frente do tempo atual (lookahead). */
  function schedule() {
    const horizon = ctx.currentTime + 0.12
    while (nextBurstAt < horizon) {
      const clicks = Math.round(rand(3, 12))
      let t = nextBurstAt
      for (let i = 0; i < clicks; i++) {
        seekClick(t)
        t += rand(0.015, 0.06)
      }
      nextBurstAt = t + rand(0.08, 0.4)
    }
  }

  return {
    start() {
      if (spindle) return
      startSpindle()
      nextBurstAt = ctx.currentTime + 0.9 // começa a "ler" depois do spin-up
      schedulerTimer = setInterval(schedule, 25)
    },
    stop() {
      if (schedulerTimer) clearInterval(schedulerTimer)
      schedulerTimer = null
      const s = spindle
      spindle = null
      if (!s) return Promise.resolve()
      const now = ctx.currentTime
      s.oscs.forEach(o => o.frequency.exponentialRampToValueAtTime(15, now + 0.6))
      s.gain.gain.setTargetAtTime(0, now, 0.15)
      return new Promise((resolve) => {
        setTimeout(() => {
          s.oscs.forEach(o => o.stop())
          s.air.stop()
          master.disconnect()
          resolve()
        }, 700)
      })
    },
  }
}
