/**
 * Sons do sistema e do disco rígido, respeitando Configurações > Sons.
 *
 * Os navegadores só liberam áudio depois de um gesto do usuário (clique/tecla):
 * o AudioContext é criado/retomado na primeira oportunidade e reaproveitado.
 */
import { createHardDiskSound, type HardDiskSound } from '~~/lib/audio/hdd'
import { playSystemSound, type SystemSound } from '~~/lib/audio/systemSounds'
import { usePreferences } from '~~/composables/usePreferences'

let ctx: AudioContext | null = null

/** O navegador só permite áudio depois de alguma interação do usuário com a página. */
function userHasInteracted(): boolean {
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
  return activation ? activation.hasBeenActive : true
}

function audioContext(): AudioContext | null {
  if (!import.meta.client) return null
  // Criar o AudioContext antes de qualquer interação só gera um aviso no console e
  // um contexto suspenso — melhor esperar o primeiro clique/tecla.
  if (!ctx && !userHasInteracted()) return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

const STARTUP_FLAG = 'vtt98:som-inicializacao'

export function useSystemSounds() {
  const prefs = usePreferences()
  const enabled = computed(() => prefs.preferences.value.sounds)

  /** Chame dentro de um clique/tecla para liberar o áudio antes de precisar dele. */
  function unlock() {
    audioContext()
  }

  /** Toca um som do sistema (se os sons estiverem ligados, ou se `force`). Retorna a duração em segundos. */
  function play(sound: SystemSound, { force = false } = {}): number {
    if (!enabled.value && !force) return 0
    const c = audioContext()
    if (!c || c.state !== 'running') return 0
    return playSystemSound(c, sound)
  }

  /** Som de inicialização: uma vez por sessão do navegador. */
  function playStartupOnce() {
    try {
      if (sessionStorage.getItem(STARTUP_FLAG)) return
    } catch { /* armazenamento bloqueado: toca mesmo assim */ }
    const c = audioContext()
    // Sem gesto prévio (ex.: recarregar a página) o áudio fica bloqueado: não marca como tocado.
    if (!c || c.state !== 'running') return
    play('startup')
    try {
      sessionStorage.setItem(STARTUP_FLAG, '1')
    } catch { /* ignore */ }
  }

  /** Disco rígido trabalhando (tela de desligar). Retorna null se o áudio estiver indisponível/desligado. */
  function hardDisk({ force = false } = {}): HardDiskSound | null {
    if (!enabled.value && !force) return null
    const c = audioContext()
    if (!c) return null
    return createHardDiskSound(c)
  }

  return { enabled, unlock, play, playStartupOnce, hardDisk }
}
