<script setup lang="ts">
/**
 * Janela "Configurações de Sala" (só o mestre): nome, senha, abrir/fechar, popup de dados e
 * exclusão. Quem declara a janela (a página da sala) executa as ações; aqui só há a interface.
 */
import type { DicePopupMode } from '#server/db/schema.ts'

const props = defineProps<{
  name: string
  hasPassword: boolean
  isOpen: boolean
  /** Quem está conectado agora, quem sou eu e quem foi removido (gerenciados aqui). */
  participants: { id: string; name: string; role: 'gm' | 'player' }[]
  selfId?: string
  kicked: { id: string; name: string; at: number; denied?: boolean }[]
}>()

const emit = defineEmits<{
  rename: [name: string]
  setPassword: [password: string]
  removePassword: []
  toggleOpen: []
  deleteRoom: []
  kick: [participant: { id: string; name: string }]
  unkick: [participant: { id: string; name: string }]
}>()

/** O mestre não se remove, então só os jogadores conectados aparecem com o botão. */
const removable = computed(() => props.participants.filter(p => p.role !== 'gm' && p.id !== props.selfId))

const open = defineModel<boolean>('open', { default: false })
const dicePopup = defineModel<DicePopupMode>('dicePopup', { default: 'window' })
const allowPlayerRolls = defineModel<boolean>('allowPlayerRolls', { default: true })
const requireApproval = defineModel<boolean>('requireApproval', { default: false })

const OPTIONS: { value: DicePopupMode; label: string; hint: string }[] = [
  { value: 'window', label: 'Janela de resultado', hint: 'abre a janela com os dados e o total.' },
  { value: 'joey', label: 'Joey (mascote)', hint: 'Joey aparece com um balão com o resultado.' },
  { value: 'off', label: 'Nenhum', hint: 'só atualiza o histórico, sem popup.' },
]

/** "15/11 14:32" — quando o mestre removeu a pessoa (vazio se o registro não tiver data). */
function formatKickedAt(at: number): string {
  if (!at) return ''
  return new Date(at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const tab = ref('geral')
const tabs = [
  { id: 'geral', label: 'Geral' },
  { id: 'acesso', label: 'Acesso' },
  { id: 'participantes', label: 'Participantes' },
  { id: 'dados', label: 'Dados' },
]

const nameDraft = ref(props.name)
watch(() => props.name, (value) => { nameDraft.value = value })

const nameChanged = computed(() => nameDraft.value.trim() !== '' && nameDraft.value.trim() !== props.name)

function submitName() {
  if (nameChanged.value) emit('rename', nameDraft.value.trim())
}

const passwordDraft = ref('')

function submitPassword() {
  const password = passwordDraft.value
  if (!password.trim()) return
  emit('setPassword', password)
  passwordDraft.value = ''
}
</script>

<template>
  <DesktopInlineWindow
    id="configuracoes-sala"
    v-model:open="open"
    title="Configurações de Sala"
    icon="room"
    :width="460"
    :height="460"
    :min-height="360"
  >
    <UiTabs v-model="tab" :tabs="tabs">
      <template #geral>
        <fieldset class="room-settings-group">
          <legend>Nome da sala</legend>
          <form class="room-settings-row" @submit.prevent="submitName">
            <UiTextField v-model="nameDraft" label="Nome:" :maxlength="120" />
            <button type="submit" :disabled="!nameChanged">Renomear</button>
          </form>
        </fieldset>

        <fieldset class="room-settings-group">
          <legend>Excluir sala</legend>
          <p class="room-settings-note">
            Exclui a sala e encerra a sessão de todos que estão nela.
            <strong>Esta ação não pode ser desfeita.</strong>
          </p>
          <div class="room-settings-actions">
            <button type="button" @click="emit('deleteRoom')">Excluir sala…</button>
          </div>
        </fieldset>
      </template>

      <template #acesso>
        <fieldset class="room-settings-group">
          <legend>Entrada</legend>
          <p class="room-settings-note">
            {{ isOpen ? 'A sala está aberta: visitantes podem entrar. Fechar desconecta todos os jogadores.' : 'A sala está fechada: ninguém além de você consegue entrar.' }}
          </p>
          <div class="room-settings-actions">
            <button type="button" @click="emit('toggleOpen')">{{ isOpen ? 'Fechar sala…' : 'Abrir sala…' }}</button>
          </div>
        </fieldset>

        <fieldset class="room-settings-group">
          <legend>Aprovação</legend>
          <div class="room-settings-option">
            <input id="require-approval" v-model="requireApproval" type="checkbox" data-test="require-approval">
            <label for="require-approval">Aprovar cada pessoa antes de ela entrar</label>
          </div>
          <p class="room-settings-note">
            Depois de informar o nome, a pessoa espera. Você recebe um aviso com as opções de aprovar ou recusar.
            Recusar barra o acesso e coloca a pessoa na lista de removidos. Quem já está na sala não é afetado.
          </p>
        </fieldset>

        <fieldset class="room-settings-group">
          <legend>Senha</legend>
          <p class="room-settings-note">
            {{ hasPassword ? 'Esta sala é protegida por senha.' : 'Esta sala não tem senha: qualquer pessoa com o código entra.' }}
          </p>
          <form class="room-settings-row" @submit.prevent="submitPassword">
            <UiTextField
              v-model="passwordDraft"
              type="password"
              :label="hasPassword ? 'Nova senha:' : 'Senha:'"
              autocomplete="new-password"
              :maxlength="72"
            />
            <button type="submit" :disabled="!passwordDraft.trim()">{{ hasPassword ? 'Alterar senha' : 'Definir senha' }}</button>
          </form>
          <div v-if="hasPassword" class="room-settings-actions">
            <button type="button" @click="emit('removePassword')">Remover senha…</button>
          </div>
        </fieldset>
      </template>

      <template #participantes>
        <fieldset class="room-settings-group">
          <legend>Conectados agora</legend>
          <p class="room-settings-note">
            Remover desconecta a pessoa na hora e a impede de voltar por até 12 horas.
          </p>
          <div class="sunken-panel room-settings-table-panel">
            <table class="interactive room-settings-table" data-test="settings-participants">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th class="actions-col"><span class="visually-hidden">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="participant in removable" :key="participant.id">
                  <td>{{ participant.name }}</td>
                  <td class="actions-cell">
                    <UiToolbarButton :label="`Remover ${participant.name} da sala`" icon="delete" data-test="kick-participant" @click="emit('kick', participant)" />
                  </td>
                </tr>
                <tr v-if="!removable.length">
                  <td colspan="2" class="room-settings-empty">Nenhum jogador conectado.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </fieldset>

        <fieldset class="room-settings-group">
          <legend>Removidos</legend>
          <p class="room-settings-note">Pessoas barradas nesta sala. Readmitir permite que entrem de novo.</p>
          <div class="sunken-panel room-settings-table-panel">
            <table class="interactive room-settings-table" data-test="settings-kicked">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Removido em</th>
                  <th class="actions-col"><span class="visually-hidden">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in kicked" :key="item.id">
                  <td>{{ item.name }}<span v-if="item.denied" class="room-settings-empty"> (recusado)</span></td>
                  <td>{{ formatKickedAt(item.at) }}</td>
                  <td class="actions-cell">
                    <UiToolbarButton :label="`Readmitir ${item.name}`" icon="refresh" data-test="unkick-participant" @click="emit('unkick', item)" />
                  </td>
                </tr>
                <tr v-if="!kicked.length">
                  <td colspan="3" class="room-settings-empty">Ninguém foi removido.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </fieldset>
      </template>

      <template #dados>
        <fieldset class="room-settings-group">
          <legend>Rolagens</legend>
          <div class="room-settings-option">
            <input id="allow-player-rolls" v-model="allowPlayerRolls" type="checkbox">
            <label for="allow-player-rolls">Permitir outros jogadores rolarem dados</label>
          </div>
        </fieldset>

        <fieldset class="room-settings-group">
          <legend>Popup de resultado</legend>
          <p class="room-settings-note">Como o resultado das rolagens aparece para todos na sala.</p>
          <div v-for="option in OPTIONS" :key="option.value" class="room-settings-option">
            <input
              :id="`dice-popup-${option.value}`"
              v-model="dicePopup"
              type="radio"
              name="dice-popup"
              :value="option.value"
            >
            <label :for="`dice-popup-${option.value}`">{{ option.label }}: {{ option.hint }}</label>
          </div>
        </fieldset>
      </template>
    </UiTabs>
  </DesktopInlineWindow>
</template>

<style scoped>
.room-settings-group { margin: 0; display: flex; flex-direction: column; gap: var(--sp-3); }
.room-settings-note { margin: 0; }
.room-settings-row { display: flex; align-items: flex-end; gap: var(--sp-3); }
.room-settings-row > :first-child { flex: 1; min-width: 0; }
.room-settings-actions { display: flex; justify-content: flex-end; }
.room-settings-option { display: flex; align-items: flex-start; gap: var(--sp-3); }
.room-settings-table-panel { max-height: 140px; overflow: auto; }
.room-settings-table { width: 100%; }
.room-settings-table .actions-col { width: 1%; }
.room-settings-table .actions-cell { text-align: right; padding: 1px; white-space: nowrap; }
.room-settings-empty { color: var(--c-text-disabled); }
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
