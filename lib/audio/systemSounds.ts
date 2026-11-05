/**
 * Sons do sistema sintetizados (originais, inspirados na sonoridade dos anos 90 —
 * nenhum som da Microsoft): inicialização, erro e desligamento.
 */

export type SystemSound = 'startup' | 'error' | 'shutdown' | 'ding'

/** Reverb simples a partir de uma resposta ao impulso gerada (ruído decaindo). */
function makeReverb(ctx: AudioContext, seconds = 1.8, decay = 2.5): ConvolverNode {
  const length = Math.ceil(ctx.sampleRate * seconds)
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay
  }
  const convolver = ctx.createConvolver()
  convolver.buffer = impulse
  return convolver
}

const midiToHz = (note: number) => 440 * 2 ** ((note - 69) / 12)

interface Note { midi: number; at: number; dur: number; gain?: number; type?: OscillatorType }

function playNotes(ctx: AudioContext, destination: AudioNode, notes: Note[], wet = 0.35): number {
  const now = ctx.currentTime + 0.02
  const dry = ctx.createGain()
  dry.gain.value = 1 - wet
  const wetGain = ctx.createGain()
  wetGain.gain.value = wet
  const reverb = makeReverb(ctx)
  const bus = ctx.createGain()
  bus.gain.value = 0.22
  bus.connect(dry).connect(destination)
  bus.connect(reverb).connect(wetGain).connect(destination)

  let end = 0
  for (const n of notes) {
    const t = now + n.at
    const osc = ctx.createOscillator()
    osc.type = n.type ?? 'triangle'
    osc.frequency.value = midiToHz(n.midi)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(n.gain ?? 0.6, t + 0.02)
    env.gain.exponentialRampToValueAtTime(0.0001, t + n.dur)
    osc.connect(env).connect(bus)
    osc.start(t)
    osc.stop(t + n.dur + 0.05)
    end = Math.max(end, n.at + n.dur)
  }
  return end + 1.5 // inclui a cauda do reverb
}

/** Toca um som do sistema; retorna a duração aproximada em segundos. */
export function playSystemSound(ctx: AudioContext, sound: SystemSound, destination: AudioNode = ctx.destination): number {
  switch (sound) {
    case 'startup':
      // Acorde de Ré maior com nona, arpejado subindo e sustentado.
      return playNotes(ctx, destination, [
        { midi: 50, at: 0, dur: 2.6, gain: 0.35, type: 'sine' },
        { midi: 62, at: 0.0, dur: 2.4 },
        { midi: 66, at: 0.14, dur: 2.2 },
        { midi: 69, at: 0.28, dur: 2.0 },
        { midi: 73, at: 0.42, dur: 1.9 },
        { midi: 76, at: 0.56, dur: 1.8, gain: 0.45 },
      ], 0.45)
    case 'shutdown':
      // O mesmo acorde descendo e se apagando.
      return playNotes(ctx, destination, [
        { midi: 76, at: 0, dur: 1.2, gain: 0.45 },
        { midi: 73, at: 0.16, dur: 1.2 },
        { midi: 69, at: 0.32, dur: 1.3 },
        { midi: 66, at: 0.48, dur: 1.5 },
        { midi: 62, at: 0.64, dur: 1.9 },
        { midi: 50, at: 0.64, dur: 2.0, gain: 0.35, type: 'sine' },
      ], 0.45)
    case 'error':
      // Duas notas secas, a segunda mais grave ("bonk").
      return playNotes(ctx, destination, [
        { midi: 64, at: 0, dur: 0.18, gain: 0.7, type: 'square' },
        { midi: 57, at: 0.12, dur: 0.3, gain: 0.7, type: 'square' },
      ], 0.15)
    case 'ding':
      return playNotes(ctx, destination, [
        { midi: 81, at: 0, dur: 0.9, gain: 0.5, type: 'sine' },
        { midi: 88, at: 0, dur: 0.6, gain: 0.25, type: 'sine' },
      ], 0.3)
  }
}
