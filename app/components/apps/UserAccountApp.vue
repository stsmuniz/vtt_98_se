<script setup lang="ts">
/** Conta do usuário: nome, senha, plano (beta) e exclusão da conta. */
import { authClient } from '~~/lib/auth-client'
import { formatDateTime } from '~/utils/listView'
import { useDesktop } from '~~/composables/useDesktop'
import { useDialog } from '~~/composables/useDialog'
import { useLoadingWindow } from '~~/composables/useLoadingWindow'
import { usePreferences } from '~~/composables/usePreferences'
import { useResourceList } from '~~/composables/useResourceActions'
import { useWindow } from '~~/composables/useWindow'
import { useWindowManager } from '~~/composables/useWindowManager'

const win = useWindow()
const desktop = useDesktop()
const dialog = useDialog()
const { withLoading } = useLoadingWindow()

const tab = ref('geral')
const tabs = [
  { id: 'geral', label: 'Geral' },
  { id: 'senha', label: 'Senha' },
  { id: 'plano', label: 'Plano' },
  { id: 'excluir', label: 'Excluir conta' },
]

const user = computed(() => desktop.user.value)
const MIN_PASSWORD = 8

// ---------- Geral ----------
const name = ref(user.value?.name ?? '')
watch(() => user.value?.name, (n) => { if (n && !name.value) name.value = n })
const nameChanged = computed(() => name.value.trim() !== '' && name.value.trim() !== user.value?.name)

async function saveName() {
  const value = name.value.trim()
  if (!value) {
    await dialog.alert('Digite um nome.', { title: 'Nome', icon: 'warning' })
    return
  }
  const { error } = await withLoading(() => authClient.updateUser({ name: value }), 'Salvando nome...')
  if (error) {
    await dialog.alert(error.message ?? 'Não foi possível alterar o nome.', { title: 'Erro', icon: 'error' })
    return
  }
  await dialog.alert('Seu nome foi alterado.', { title: 'Conta' })
}

// ---------- Senha ----------
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

async function changePassword() {
  const problems: string[] = []
  if (!currentPassword.value) problems.push('Digite a senha atual.')
  if (newPassword.value.length < MIN_PASSWORD) problems.push(`A nova senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`)
  if (newPassword.value !== confirmPassword.value) problems.push('A confirmação não confere com a nova senha.')
  if (problems.length) {
    await dialog.alert(problems.join('\n'), { title: 'Alterar senha', icon: 'warning' })
    return
  }
  const { error } = await withLoading(() => authClient.changePassword({
    currentPassword: currentPassword.value,
    newPassword: newPassword.value,
    revokeOtherSessions: true,
  }), 'Alterando senha...')
  if (error) {
    const wrong = error.code === 'INVALID_PASSWORD'
    await dialog.alert(wrong ? 'A senha atual está incorreta.' : (error.message ?? 'Não foi possível alterar a senha.'), { title: 'Alterar senha', icon: 'error' })
    return
  }
  currentPassword.value = newPassword.value = confirmPassword.value = ''
  await dialog.alert('Senha alterada. As outras sessões abertas foram desconectadas.', { title: 'Alterar senha' })
}

// ---------- Excluir conta ----------
const lists = {
  tokens: (await useResourceList('tokens')).data,
  documents: (await useResourceList('documents')).data,
  scenarios: (await useResourceList('scenarios')).data,
  scenes: (await useResourceList('scenes')).data,
  rooms: (await useResourceList('rooms')).data,
}
const counts = computed(() => ({
  tokens: lists.tokens.value?.length ?? 0,
  documents: lists.documents.value?.length ?? 0,
  scenarios: lists.scenarios.value?.length ?? 0,
  scenes: lists.scenes.value?.length ?? 0,
  rooms: lists.rooms.value?.length ?? 0,
}))
const deletePassword = ref('')
const understood = ref(false)

async function deleteAccount() {
  if (!deletePassword.value || !understood.value) return
  const ok = await dialog.confirm(
    'Tem certeza absoluta? Sua conta e tudo o que você criou serão apagados para sempre.',
    { title: 'Excluir conta', icon: 'warning', okLabel: 'Excluir', cancelLabel: 'Cancelar' },
  )
  if (!ok) return
  const { error } = await withLoading(() => authClient.deleteUser({ password: deletePassword.value }), 'Excluindo conta...', 'delete')
  if (error) {
    const wrong = error.code === 'INVALID_PASSWORD'
    await dialog.alert(wrong ? 'Senha incorreta. A conta não foi excluída.' : (error.message ?? 'Não foi possível excluir a conta.'), { title: 'Excluir conta', icon: 'error' })
    return
  }
  const wm = useWindowManager()
  for (const w of [...wm.windows.value]) wm.unregister(w.id)
  usePreferences().reset()
  await navigateTo('/login?conta=excluida')
}

const nameId = useId()
</script>

<template>
  <div class="account">
    <UiTabs v-model="tab" :tabs="tabs">
      <template #geral>
        <div class="account-head">
          <UiIcon name="users" :size="48" />
          <div>
            <strong>{{ user?.name }}</strong>
            <p>{{ user?.email }}</p>
          </div>
        </div>
        <UiGroupBox label="Dados da conta">
          <div class="field-row-stacked">
            <label :for="nameId">Nome:</label>
            <input :id="nameId" v-model="name" type="text" maxlength="80" data-test="account-name">
          </div>
          <UiTextField :model-value="user?.email ?? ''" label="E-mail:" disabled hint="O e-mail não pode ser alterado por enquanto." />
          <p v-if="user?.createdAt" class="muted">Conta criada em {{ formatDateTime(user.createdAt) }}</p>
          <div class="row-end">
            <button type="button" :disabled="!nameChanged" data-test="account-save-name" @click="saveName">Salvar nome</button>
          </div>
        </UiGroupBox>
      </template>

      <template #senha>
        <form class="stack" @submit.prevent="changePassword">
          <UiTextField v-model="currentPassword" type="password" label="Senha atual:" autocomplete="current-password" stacked />
          <UiTextField v-model="newPassword" type="password" label="Nova senha:" autocomplete="new-password" stacked :hint="`Pelo menos ${MIN_PASSWORD} caracteres.`" />
          <UiTextField v-model="confirmPassword" type="password" label="Confirme a nova senha:" autocomplete="new-password" stacked />
          <p class="muted">Ao alterar a senha, as outras sessões abertas (outros navegadores e aparelhos) são desconectadas.</p>
          <div class="row-end">
            <button type="submit">Alterar senha</button>
          </div>
        </form>
      </template>

      <template #plano>
        <div class="account-head">
          <UiIcon name="info" :size="32" />
          <div>
            <strong>Plano atual: Beta gratuito</strong>
            <p>Durante o beta, todos os recursos estão liberados sem custo.</p>
          </div>
        </div>
        <div class="row-end">
          <button type="button" disabled title="Indisponível durante o beta">Mudar plano…</button>
        </div>
      </template>

      <template #excluir>
        <div class="account-head">
          <UiIcon name="warning" :size="32" />
          <p>
            Excluir a conta apaga <strong>permanentemente</strong> seus dados e tudo o que você criou,
            inclusive as imagens enviadas. Esta ação não pode ser desfeita.
          </p>
        </div>
        <UiGroupBox label="Será apagado">
          <ul class="delete-list" data-test="account-delete-counts">
            <li>{{ counts.tokens }} token(s)</li>
            <li>{{ counts.documents }} documento(s)</li>
            <li>{{ counts.scenarios }} cenário(s)</li>
            <li>{{ counts.scenes }} cena(s)</li>
            <li>{{ counts.rooms }} sala(s) — os jogadores conectados serão desconectados</li>
          </ul>
        </UiGroupBox>
        <UiTextField v-model="deletePassword" type="password" label="Digite sua senha para confirmar:" autocomplete="current-password" stacked data-test="account-delete-password" />
        <UiCheckbox v-model="understood" label="Entendo que esta ação não pode ser desfeita." data-test="account-delete-understood" />
        <div class="row-end">
          <button type="button" :disabled="!deletePassword || !understood" data-test="account-delete" @click="deleteAccount">Excluir minha conta</button>
        </div>
      </template>
    </UiTabs>

    <div class="account-buttons">
      <button type="button" class="default" @click="win.close()">Fechar</button>
    </div>
  </div>
</template>

<style scoped>
.account {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  gap: var(--sp-3);
}
.account-head {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-4);
}
.account-head p {
  margin: var(--sp-1) 0 0;
}
.field-row-stacked input {
  height: auto;
  font: inherit;
}
.stack {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.muted {
  margin: 0;
  color: var(--c-shadow);
}
.row-end {
  display: flex;
  justify-content: flex-end;
}
.delete-list {
  margin: 0;
  padding-left: var(--sp-5);
}
.account-buttons {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}
.account-buttons button {
  min-width: 75px;
}
</style>
