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
}>()

const emit = defineEmits<{
  rename: [name: string]
  setPassword: [password: string]
  removePassword: []
  toggleOpen: []
  deleteRoom: []
}>()

const open = defineModel<boolean>('open', { default: false })
const dicePopup = defineModel<DicePopupMode>('dicePopup', { default: 'window' })
const allowPlayerRolls = defineModel<boolean>('allowPlayerRolls', { default: true })

const OPTIONS: { value: DicePopupMode; label: string; hint: string }[] = [
  { value: 'window', label: 'Janela de resultado', hint: 'abre a janela com os dados e o total.' },
  { value: 'joey', label: 'Joey (mascote)', hint: 'Joey aparece com um balão com o resultado.' },
  { value: 'off', label: 'Nenhum', hint: 'só atualiza o histórico, sem popup.' },
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
    :height="620"
    :min-height="360"
  >
    <div class="room-settings">
      <fieldset class="room-settings-group">
        <legend>Nome da sala</legend>
        <form class="room-settings-row" @submit.prevent="submitName">
          <UiTextField v-model="nameDraft" label="Nome:" :maxlength="120" />
          <button type="submit" :disabled="!nameChanged">Renomear</button>
        </form>
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
          />
          <button type="submit" :disabled="!passwordDraft.trim()">{{ hasPassword ? 'Alterar senha' : 'Definir senha' }}</button>
        </form>
        <div v-if="hasPassword" class="room-settings-actions">
          <button type="button" @click="emit('removePassword')">Remover senha…</button>
        </div>
      </fieldset>

      <fieldset class="room-settings-group">
        <legend>Acesso</legend>
        <p class="room-settings-note">
          {{ isOpen ? 'A sala está aberta: visitantes podem entrar.' : 'A sala está fechada: visitantes não conseguem entrar.' }}
        </p>
        <div class="room-settings-actions">
          <button type="button" @click="emit('toggleOpen')">{{ isOpen ? 'Fechar sala…' : 'Abrir sala…' }}</button>
        </div>
      </fieldset>

      <fieldset class="room-settings-group">
        <legend>Popup de rolagem de dados</legend>
        <div class="room-settings-option">
          <input id="allow-player-rolls" v-model="allowPlayerRolls" type="checkbox">
          <label for="allow-player-rolls">Permitir outros jogadores rolarem dados</label>
        </div>
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
    </div>
  </DesktopInlineWindow>
</template>

<style scoped>
.room-settings { display: flex; flex-direction: column; gap: var(--sp-3); }
.room-settings-group { margin: 0; display: flex; flex-direction: column; gap: var(--sp-3); }
.room-settings-note { margin: 0; }
.room-settings-row { display: flex; align-items: flex-end; gap: var(--sp-3); }
.room-settings-row > :first-child { flex: 1; min-width: 0; }
.room-settings-actions { display: flex; justify-content: flex-end; }
.room-settings-option { display: flex; align-items: flex-start; gap: var(--sp-3); }
</style>
