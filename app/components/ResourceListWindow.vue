<script setup lang="ts">
import { ref } from 'vue'
import { useTagFilter } from '~~/composables/useTagFilter'
import FixedWindow from '~/components/FixedWIndow.vue'
import AlertWindow from '~/components/AlertWindow.vue'

const props = withDefaults(defineProps<{
  endpoint: string
  sectionTitle: string
  resourceLabel: string
  resourceArticle?: string
  insertTitle: string
  editTitle: string
  icon: string
  insertButtonLabel?: string
}>(), {
  resourceArticle: 'o',
  insertButtonLabel: 'Novo...',
})

const emit = defineEmits(['close-window'])

const { data: items, refresh } = await useFetch<any[]>(props.endpoint, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})

const { tags, selectedTag, toggleTagFilter, filteredItems } = useTagFilter(items)

const selectedItem = ref<any | null>(null)
const isInsertWindowOpen = ref(false)
const isEditWindowOpen = ref(false)
const isDeleteAlert = ref(false)
const isDuplicateAlert = ref(false)

const resourceLabelCap = props.resourceLabel.charAt(0).toUpperCase() + props.resourceLabel.slice(1)

const selectItem = (item: any) => {
  selectedItem.value = selectedItem.value?.id === item.id ? null : item
}

const openInsertWindow = () => { isInsertWindowOpen.value = true }
const openEditWindow = () => { isEditWindowOpen.value = true }
const openDeleteAlert = () => { isDeleteAlert.value = true }
const openDuplicateAlert = () => { isDuplicateAlert.value = true }
const closeDeleteAlert = () => { isDeleteAlert.value = false }

const closeFormWindows = async () => {
  isInsertWindowOpen.value = false
  isEditWindowOpen.value = false
  isDuplicateAlert.value = false
  await refresh()
}

const deleteItem = async () => {
  if (!selectedItem.value) return
  await $fetch(`${props.endpoint}/${selectedItem.value.id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  isDeleteAlert.value = false
  await refresh()
}

const duplicateItem = async () => {
  if (!selectedItem.value) return

  try {
    const payload = JSON.parse(JSON.stringify(selectedItem.value))
    delete payload.id

    await $fetch(props.endpoint, {
      method: 'POST',
      body: payload
    })

    await closeFormWindows()
  } catch (error) {
    console.error(`Erro ao duplicar ${props.resourceArticle} ${props.resourceLabel}:`, error)
  }
}
</script>
<template>
  <fixed-window
      :title="insertTitle"
      :icon="icon"
      @close-window="isInsertWindowOpen = false"
      v-if="isInsertWindowOpen"
      style="z-index: 1000;"
  >
    <slot name="insert-window" :tags="tags" :close="closeFormWindows"/>
  </fixed-window>
  <fixed-window
      :title="editTitle"
      :icon="icon"
      @close-window="isEditWindowOpen = false"
      v-if="isEditWindowOpen"
      style="z-index: 1000;"
  >
    <slot name="edit-window" :item="selectedItem" :close="closeFormWindows"/>
  </fixed-window>
  <AlertWindow
      v-if="isDeleteAlert"
      :title="`Apagar ${resourceLabelCap}`"
      icon="warning"
      @alert-button-OK="deleteItem"
      :cancelAction="closeDeleteAlert"
  >
    <p>Tem certeza que deseja apagar {{ resourceArticle }} {{ resourceLabel }} <strong>{{ selectedItem?.name }}</strong>?</p>
  </AlertWindow>
  <AlertWindow
      v-if="isDuplicateAlert"
      :title="`Duplicar ${resourceLabelCap}`"
      icon="warning"
      @alert-button-OK="duplicateItem"
      :cancelAction="closeFormWindows"
  >
    <p>Tem certeza que deseja duplicar {{ resourceArticle }} {{ resourceLabel }} <strong>{{ selectedItem?.name }}</strong>?</p>
  </AlertWindow>
  <div class="window-content-container">
    <aside>
      <div class="section-header">
        <span>Tags</span>
      </div>
      <div class="content">
        <ul class="tag-list">
          <li v-if="selectedTag" @click="selectedTag = null">Todos</li>
          <li
              v-for="(tag, idx) in tags"
              :key="idx"
              @click="toggleTagFilter(tag)"
              :class="{ 'tag-active': selectedTag === tag }"
          >
            {{ tag }}
          </li>
        </ul>
      </div>
    </aside>
    <section>
      <div class="section-header">
        <span>{{ sectionTitle }}</span>
      </div>
      <div class="content">
        <div v-if="items" class="scenes-grid">
          <div
              v-for="item in filteredItems"
              :key="item.id" class="scene-item"
              @click="selectItem(item)"
              :class="{ 'token-selected': selectedItem?.id === item.id }"
          >
            <slot name="item" :item="item">
              <img :src="item.image" :alt="item.name"/>
              <span>{{ item.name }}</span>
            </slot>
          </div>
        </div>
      </div>
    </section>
    <aside class="window-sidebar">
      <button :disabled="!selectedItem" @click="openEditWindow()">Editar</button>
      <button :disabled="!selectedItem" @click="openDeleteAlert()">Apagar</button>
      <button :disabled="!selectedItem" @click="openDuplicateAlert()">Duplicar</button>
      <slot name="extra-actions-before-close" :item="selectedItem"/>
      <button @click="$emit('close-window')">Fechar</button>
      <button>Buscar</button>
      <button>Ajuda</button>
      <button @click="openInsertWindow()">{{ insertButtonLabel }}</button>
      <slot name="extra-actions-after-insert" :item="selectedItem"/>
    </aside>
  </div>
</template>
<style lang="css">
.window-content-container {
  width: 90vw;
  display: grid;
  grid-template-columns: 1fr 6fr 1fr;
  gap: 0.25rem;

  .section-header {
    background-color: black;
    color: white;
    padding: 0.25rem;
    border-radius: 0.25rem 0.25rem 0 0;
  }

  .content {
    background-color: white;
    color: black;
    padding: 0.25rem;
    border: 2px solid;
    border-color: #333333 lightgray lightgray #333333;
    min-height: 54vh;
    max-height: 60vh;
    overflow-y: auto;
    .scenes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 0.25rem;
      .scene-item {
        width: 150px;
        display: flex;
        padding: 0.25rem;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        gap: 0.25rem;
        cursor: pointer;
        &:hover, &.token-selected {
          background-color: darkblue;
          color: white;
        }
        img {
          max-width: 100%;
          max-height: 200px;
        }
      }
    }

    .tag-list {
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin: 0;

      li {
        padding: 0.25rem;
        border: 1px solid;
        border-radius: 0.25rem;
        cursor: pointer;
        background-color: #eee;

        &:hover, &.tag-active {
          background-color: darkblue;
          color: white;
        }
      }
    }
  }
}

.window-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

@media screen and (min-width: 768px) {
  .window-content-container {
    width: 60vw;
    min-height: 50vh;
  }
}
</style>
