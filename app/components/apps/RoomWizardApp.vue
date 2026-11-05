<script setup lang="ts">
/** Assistente para criar uma sala (nome/senha → tags → cena inicial → resumo). */
import type { WizardStepDef } from '~/components/ui/Wizard.vue'
import { resourceCacheKey, type ResourceRecord } from '~/desktop/resources'
import { errorMessage, useResourceList } from '~~/composables/useResourceActions'
import { useDesktop } from '~~/composables/useDesktop'
import { useDialog } from '~~/composables/useDialog'
import { useLoadingWindow } from '~~/composables/useLoadingWindow'
import { useWindow } from '~~/composables/useWindow'

const win = useWindow()
const desktop = useDesktop()
const dialog = useDialog()
const { withLoading } = useLoadingWindow()
const { data: rooms } = await useResourceList('rooms')

const step = ref(0)
const name = ref('')
const password = ref('')
const tags = ref<string[]>([])
const scene = ref<ResourceRecord | null>(null)
const busy = ref(false)

const steps: WizardStepDef[] = [
  { id: 'inicio', title: 'Bem-vindo ao Assistente para Adicionar Sala', description: 'Este assistente ajuda você a criar uma sala de jogo para compartilhar com seus jogadores.' },
  { id: 'basico', title: 'Informações básicas', description: 'Digite um nome para a sala. A senha é opcional: sem ela, qualquer pessoa com o link pode entrar.' },
  { id: 'tags', title: 'Tags da sala', description: 'Tags ajudam a encontrar a sala depois. Esta etapa é opcional.' },
  { id: 'cena', title: 'Cena inicial', description: 'Escolha a cena que os jogadores verão ao entrar. Você pode trocar de cena depois, na janela da sala.' },
  { id: 'resumo', title: 'Concluindo o assistente', description: 'Confira os dados e clique em Concluir para criar a sala.' },
]

const tagSuggestions = computed(() => [...new Set((rooms.value ?? []).flatMap(r => (Array.isArray(r.tags) ? r.tags as string[] : [])))])

const canAdvance = computed(() => {
  const id = steps[step.value]?.id
  if (id === 'basico') return name.value.trim().length > 0
  if (id === 'cena') return scene.value !== null
  return true
})

async function chooseScene() {
  const chosen = await desktop.pick<ResourceRecord>('scenes', { ownerId: win.id, confirmLabel: 'Usar esta cena' })
  if (chosen) scene.value = chosen
}

async function finish() {
  if (!scene.value || busy.value) return
  busy.value = true
  try {
    const room = await withLoading(() => $fetch<ResourceRecord>('/api/v1/rooms', {
      method: 'POST',
      body: { name: name.value.trim(), password: password.value, tags: tags.value, sceneId: scene.value!.id },
    }), 'Criando sala...')
    await refreshNuxtData(resourceCacheKey('rooms'))
    await win.close()
    if (await dialog.confirm(`A sala "${room.name}" foi criada.\nDeseja entrar nela agora?`, { title: 'Sala criada', icon: 'info' })) {
      await navigateTo(`/rooms/${room.code}`)
    }
  } catch (error) {
    await dialog.alert(errorMessage(error, 'Não foi possível criar a sala.'), { title: 'Erro', icon: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="room-wizard">
    <UiWizard
      v-model:step="step"
      :steps="steps"
      :can-advance="canAdvance"
      :busy="busy"
      data-test="room-wizard"
      @finish="finish"
      @cancel="win.close()"
    >
      <template #step-inicio>
        <p>Clique em "Avançar" para começar.</p>
      </template>
      <template #step-basico>
        <UiTextField v-model="name" label="Nome da sala:" autofocus :maxlength="120" data-test="wizard-name" />
        <UiTextField v-model="password" type="password" label="Senha (opcional):" autocomplete="new-password" />
      </template>
      <template #step-tags>
        <UiTagEditor v-model="tags" :suggestions="tagSuggestions" />
      </template>
      <template #step-cena>
        <UiGroupBox label="Cena inicial">
          <div class="scene-pick">
            <img v-if="scene?.scenario" :src="String((scene.scenario as ResourceRecord).image)" alt="" class="scene-thumb">
            <span class="scene-name" data-test="wizard-scene">{{ scene?.name ?? '(nenhuma cena escolhida)' }}</span>
            <button type="button" data-test="wizard-choose-scene" @click="chooseScene">Procurar…</button>
          </div>
        </UiGroupBox>
      </template>
      <template #step-resumo>
        <dl class="summary">
          <dt>Nome:</dt><dd>{{ name }}</dd>
          <dt>Senha:</dt><dd>{{ password ? 'Sim' : 'Não' }}</dd>
          <dt>Tags:</dt><dd>{{ tags.length ? tags.join(', ') : '(nenhuma)' }}</dd>
          <dt>Cena:</dt><dd>{{ scene?.name }}</dd>
        </dl>
      </template>
    </UiWizard>
  </div>
</template>

<style scoped>
.room-wizard {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}
.scene-pick {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.scene-thumb {
  width: 64px;
  height: 40px;
  object-fit: cover;
  box-shadow: var(--bevel-thin-sunken);
}
.scene-name {
  flex: 1 1 auto;
  min-width: 0;
}
.summary {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--sp-2) var(--sp-4);
  margin: 0;
}
.summary dd {
  margin: 0;
}
</style>
