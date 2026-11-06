<script setup lang="ts">
/**
 * Janela "Tokens" do editor: aba com os tokens da cena (lista em Detalhes,
 * com remover/duplicar/centralizar; documentos também aparecem aqui) e abas com os
 * tokens e os documentos cadastrados (pastas embutidas em modo seletor) para
 * adicionar à cena.
 */
import type { SceneToken } from '#server/db/schema.ts'
import type { ResourceRecord } from '~/desktop/resources'
import type { ListViewColumn, ListViewItem, ListViewItemId } from '~/utils/listView'

const props = defineProps<{
  tokens: SceneToken[]
  selected: number | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  select: [id: number | null]
  remove: []
  duplicate: []
  center: []
  add: [token: ResourceRecord]
  'add-document': [document: ResourceRecord]
}>()

const tab = ref('cena')
const tabs = [
  { id: 'cena', label: 'Tokens da cena' },
  { id: 'catalogo', label: 'Tokens cadastrados' },
  { id: 'documentos', label: 'Documentos cadastrados' },
]

const columns: ListViewColumn[] = [
  { key: 'name', label: 'Nome', width: 200 },
  { key: 'position', label: 'Posição', width: 110 },
  { key: 'size', label: 'Tamanho', width: 100 },
]

const items = computed<ListViewItem[]>(() => props.tokens.map(t => ({
  id: t.id,
  name: t.name,
  icon: t.kind === 'document' ? 'image' : 'token',
  position: `${Math.round(t.x)}, ${Math.round(t.y)}`,
  size: `${Math.round(t.width)} × ${Math.round(t.height)}`,
})))

const selectedModel = computed<ListViewItemId | null>({
  get: () => props.selected,
  set: v => emit('select', v === null ? null : Number(v)),
})
</script>

<template>
  <DesktopInlineWindow
    id="tokens-da-cena"
    v-model:open="open"
    title="Tokens"
    icon="token"
    :width="560"
    :height="460"
    :min-width="360"
    :min-height="300"
    :scroll-body="false"
  >
    <div class="scene-tokens">
      <UiTabs v-model="tab" :tabs="tabs">
        <template #cena>
          <UiToolbar label="Ações do token">
            <UiToolbarButton label="Remover" icon="delete" show-label :disabled="selected === null" @click="emit('remove')" />
            <UiToolbarButton label="Duplicar" icon="copy" show-label :disabled="selected === null" @click="emit('duplicate')" />
            <UiToolbarButton label="Centralizar" icon="fullscreen" show-label :disabled="selected === null" @click="emit('center')" />
          </UiToolbar>
          <UiListView
            v-model:selected="selectedModel"
            class="scene-tokens-list"
            :items="items"
            :columns="columns"
            view="details"
            label="Tokens da cena"
            empty-text="Nenhum token na cena. Adicione pela aba &quot;Tokens cadastrados&quot;."
            @delete="emit('remove')"
          />
        </template>
        <template #documentos>
          <Suspense>
            <AppsExplorerResourceExplorer
              resource="documents"
              mode="pick"
              embedded
              confirm-label="Adicionar na cena"
              @pick="emit('add-document', $event)"
              @cancel="open = false"
            />
          </Suspense>
        </template>
        <template #catalogo>
          <Suspense>
            <AppsExplorerResourceExplorer
              resource="tokens"
              mode="pick"
              embedded
              confirm-label="Adicionar na cena"
              @pick="emit('add', $event)"
              @cancel="open = false"
            />
          </Suspense>
        </template>
      </UiTabs>
    </div>
  </DesktopInlineWindow>
</template>

<style scoped>
.scene-tokens {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  padding: var(--sp-2);
}
.scene-tokens-list {
  min-height: 160px;
}
</style>
