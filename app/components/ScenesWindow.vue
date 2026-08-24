<script setup lang="ts">
import FixedWindow from "@/components/FixedWIndow.vue";
import InsertSceneWindow from "~/components/InsertSceneWindow.vue";
import EditSceneWindow from "~/components/EditSceneWindow.vue";

const tags = computed(() => {
  if (!scenes.value) return []

  const uniqueTags = new Set<string>()

  scenes.value.forEach(scene => {
    if (scene.tags && Array.isArray(scene.tags)) {
      scene.tags.forEach((tag: string) => {
        if (tag) uniqueTags.add(tag.trim())
      })
    }
  })

  return Array.from(uniqueTags).sort()
})

const selectedTag = ref<string | null>(null)

const selectedScene = ref<Scene | null>(null)

const selectScene = (scene: Scene) => {
  if (selectedScene.value?.id === scene.id) {
    selectedScene.value = null
    return;
  }
  selectedScene.value = scene
}

const toggleTagFilter = (tag: string) => {
  if (selectedTag.value === tag) {
    selectedTag.value = null
  } else {
    selectedTag.value = tag
  }
}

const filteredScenes = computed(() => {
  if (!scenes.value) return []

  if (!selectedTag.value) return scenes.value

  return scenes.value.filter(scenario => {
    return scenario.tags && Array.isArray(scenario.tags) && scenario.tags.includes(selectedTag.value)
  })
})

const { data: scenes, refresh: refreshScenes } = await useFetch('/api/v1/scenes', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})

const isInsertWindowOpen = ref(false)
const isEditWindowOpen = ref(false)
const isDeleteAlert = ref(false)
const isDuplicateAlert = ref(false)

const openInsertWindow = () => {
  isInsertWindowOpen.value = true
}

const openEditWindow = () => {
  isEditWindowOpen.value = true
}

const openEditorWindow = () => {
  navigateTo(`/dashboard/scenes/${selectedScene.value?.id}`)
}

const openDeleteAlert = () => {
  isDeleteAlert.value = true
}

const openDuplicateAlert = () => {
  isDuplicateAlert.value = true
}

const deleteScenario = async () => {
  if (!selectedScene.value) return
  await $fetch(`/api/v1/scenes/${selectedScene.value.id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  isDeleteAlert.value = false
  await refreshScenes()
}

const duplicateScenario = async () => {
  if (!selectedScene.value) return;

  try {
    const payload = JSON.parse(JSON.stringify(selectedScene.value));

    delete payload.id;

    await $fetch(`/api/v1/scenes`, {
      method: 'POST',
      body: payload
    });

    closeScenarioWindow();

  } catch (error) {
    console.error('Erro ao duplicar a cena:', error);
  }
}

const closeDeleteAlert = () => {
  isDeleteAlert.value = false
}

const closeScenarioWindow = async () => {
  isInsertWindowOpen.value = false
  isEditWindowOpen.value = false
  isDuplicateAlert.value = false
  await refreshScenes()
}

</script>
<template>
  <fixed-window
      title="Adicionar Cena"
      icon="scenes"
      @close-window="isInsertWindowOpen = false"
      v-if="isInsertWindowOpen"
      style="z-index: 1000;"
  >
    <insert-scene-window
        :tags="tags"
        @close-window="closeScenarioWindow"
    />
  </fixed-window>
  <fixed-window
      title="Editar Cena"
      icon="scenes"
      @close-window="isEditWindowOpen = false"
      v-if="isEditWindowOpen"
      style="z-index: 1000;"
  >
    <edit-scene-window
        :scene="selectedScene"
        @close-window="closeScenarioWindow"
    />
  </fixed-window>
  <AlertWindow
      v-if="isDeleteAlert"
      title="Apagar Cena"
      icon="warning"
      @alert-button-OK="deleteScenario"
      :cancelAction="closeDeleteAlert"
  >
    <p>Tem certeza que deseja apagar a cena <strong>{{ selectedScene?.name }}</strong>?</p>
  </AlertWindow>
  <AlertWindow
      v-if="isDuplicateAlert"
      title="Duplicar Cena"
      icon="warning"
      @alert-button-OK="duplicateScenario"
      :cancelAction="closeScenarioWindow"
  >
    <p>Tem certeza que deseja duplicar a cena <strong>{{ selectedScene?.name }}</strong>?</p>
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
        <span>Cenas</span>
      </div>
      <div class="content">
        <div v-if="scenes" class="scenes-grid">
          <div
              v-for="scene in filteredScenes"
              :key="scene.id" class="scene-item"
              @click="selectScene(scene)"
              :class="{ 'token-selected': selectedScene?.id === scene.id }"
          >
            <img :src="scene.scenario.image" :alt="scene.scenario.name" />
            <span>{{ scene.name }}</span>
          </div>
        </div>
      </div>
    </section>
    <aside class="window-sidebar">
      <button :disabled="!selectedScene" @click="openEditWindow()">Editar</button>
      <button :disabled="!selectedScene" @click="openDeleteAlert()">Apagar</button>
      <button :disabled="!selectedScene" @click="openDuplicateAlert()">Duplicar</button>
      <button :disabled="!selectedScene" @click="openEditorWindow()">Abrir no editor</button>
      <button @click="$emit('close-window')">Fechar</button>
      <button>Buscar</button>
      <button>Ajuda</button>
      <button @click="openInsertWindow()">Adicionar...</button>
    </aside>
  </div>
</template>
<style lang="css" scoped>
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
    }

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