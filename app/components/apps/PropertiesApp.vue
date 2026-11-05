<script setup lang="ts">
/** Propriedades de um token/cenário/cena/sala (aba Geral), no estilo do Win98. */
import { iconUrl } from '~/utils/icons'
import { formatDateTime } from '~/utils/listView'
import { RESOURCES, type ResourceKind } from '~/desktop/resources'
import { useResourceActions, useResourceList } from '~~/composables/useResourceActions'
import { useWindow } from '~~/composables/useWindow'

const props = defineProps<{ resource: ResourceKind; id: number }>()

const win = useWindow()
const desc = RESOURCES[props.resource]
const actions = useResourceActions(props.resource)
const { data: records } = await useResourceList(props.resource)
const record = computed(() => records.value?.find(r => r.id === props.id) ?? null)

const tab = ref('geral')
const tabs = [{ id: 'geral', label: 'Geral' }]

const thumb = computed(() => (record.value ? desc.thumb(record.value) : null))
const tags = computed(() => (Array.isArray(record.value?.tags) ? (record.value!.tags as string[]) : []))
const attributes = computed(() => (Array.isArray(record.value?.attributes) ? (record.value!.attributes as { name: string; value: unknown }[]) : []))

watch(record, (r) => {
  if (r) win.setTitle(`Propriedades de ${r.name}`)
}, { immediate: true })
</script>

<template>
  <div class="properties">
    <UiTabs v-model="tab" :tabs="tabs">
      <template #geral>
        <p v-if="!record" class="properties-missing">Este item não existe mais.</p>
        <template v-else>
          <div class="properties-head">
            <img :src="iconUrl(desc.itemIcon, 32)" alt="" width="32" height="32">
            <span class="properties-name">{{ record.name }}</span>
          </div>
          <hr class="properties-rule">
          <dl class="properties-grid">
            <dt>Tipo:</dt>
            <dd>{{ desc.singular.charAt(0).toUpperCase() + desc.singular.slice(1) }}</dd>
            <template v-for="f in desc.previewFields(record)" :key="f.label">
              <dt>{{ f.label }}:</dt>
              <dd>{{ f.value }}</dd>
            </template>
          </dl>
          <hr class="properties-rule">
          <dl class="properties-grid">
            <dt>Criado em:</dt>
            <dd>{{ formatDateTime(record.createdAt) || '—' }}</dd>
            <dt>Modificado em:</dt>
            <dd>{{ formatDateTime(record.updatedAt) || '—' }}</dd>
            <dt>Tags:</dt>
            <dd>{{ tags.length ? tags.join(', ') : '(nenhuma)' }}</dd>
          </dl>
          <template v-if="attributes.length">
            <hr class="properties-rule">
            <dl class="properties-grid">
              <template v-for="a in attributes" :key="a.name">
                <dt>{{ a.name }}:</dt>
                <dd>{{ a.value }}</dd>
              </template>
            </dl>
          </template>
          <div v-if="thumb" class="properties-thumb">
            <img :src="thumb" :alt="`Imagem de ${record.name}`">
          </div>
          <div v-if="resource === 'rooms'" class="properties-actions">
            <button type="button" @click="actions.copyRoomLink(record)">Copiar link da sala</button>
          </div>
        </template>
      </template>
    </UiTabs>
  </div>
</template>

<style scoped>
.properties {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}
.properties-head {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}
.properties-head img {
  image-rendering: pixelated;
}
.properties-name {
  font-weight: bold;
  overflow-wrap: anywhere;
}
.properties-rule {
  width: 100%;
  margin: 0;
  border: none;
  border-top: 1px solid var(--c-shadow);
  border-bottom: 1px solid var(--c-highlight);
}
.properties-grid {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: var(--sp-2) var(--sp-3);
  margin: 0;
}
.properties-grid dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.properties-thumb {
  display: flex;
  justify-content: center;
  padding: 2px;
  box-shadow: var(--bevel-thin-sunken);
  background: repeating-conic-gradient(#e0e0e0 0 25%, var(--c-window) 0 50%) 0 0 / 16px 16px;
}
.properties-thumb img {
  max-width: 100%;
  max-height: 140px;
  object-fit: contain;
}
.properties-actions {
  display: flex;
  justify-content: flex-start;
}
.properties-missing {
  color: var(--c-text-disabled);
}
</style>
