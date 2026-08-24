<script setup lang="ts">
import FixedWindow from "@/components/FixedWIndow.vue";
import InsertScenarioWindow from "~/components/InsertScenarioWindow.vue";
import EditScenarioWindow from "~/components/EditScenarioWindow.vue";

defineProps(['setScenarioToScene'])

const tags = computed(() => {
  if (!scenarios.value) return []

  const uniqueTags = new Set<string>()

  scenarios.value.forEach(scenario => {
    if (scenario.tags && Array.isArray(scenario.tags)) {
      scenario.tags.forEach((tag: string) => {
        if (tag) uniqueTags.add(tag.trim())
      })
    }
  })

  return Array.from(uniqueTags).sort()
})

const selectedTag = ref<string | null>(null)

const selectedScenario = ref<Scenario | null>(null)

const selectScenario = (scenario: Scenario) => {
  if (selectedScenario.value?.id === scenario.id) {
    selectedScenario.value = null
    return;
  }
  selectedScenario.value = scenario
}

const toggleTagFilter = (tag: string) => {
  if (selectedTag.value === tag) {
    selectedTag.value = null
  } else {
    selectedTag.value = tag
  }
}

const filteredScenarios = computed(() => {
  if (!scenarios.value) return []

  if (!selectedTag.value) return scenarios.value

  return scenarios.value.filter(scenario => {
    return scenario.tags && Array.isArray(scenario.tags) && scenario.tags.includes(selectedTag.value)
  })
})

const { data: scenarios, refresh: refreshScenarios } = await useFetch('/api/v1/scenarios', {
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

const openDeleteAlert = () => {
  isDeleteAlert.value = true
}

const openDuplicateAlert = () => {
  isDuplicateAlert.value = true
}

const deleteScenario = async () => {
  if (!selectedScenario.value) return
  await $fetch(`/api/v1/scenarios/${selectedScenario.value.id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  isDeleteAlert.value = false
  await refreshScenarios()
}

const duplicateScenario = async () => {
  if (!selectedScenario.value) return;

  try {
    const payload = JSON.parse(JSON.stringify(selectedScenario.value));

    delete payload.id;

    await $fetch(`/api/v1/scenarios`, {
      method: 'POST',
      body: payload
    });

    closeScenarioWindow();

  } catch (error) {
    console.error('Erro ao duplicar o cenário:', error);
  }
}

const closeDeleteAlert = () => {
  isDeleteAlert.value = false
}

const closeScenarioWindow = async () => {
  isInsertWindowOpen.value = false
  isEditWindowOpen.value = false
  isDuplicateAlert.value = false
  await refreshScenarios()
}

</script>
<template>
  <fixed-window
      title="Adicionar Cenário"
      icon="scenario"
      @close-window="isInsertWindowOpen = false"
      v-if="isInsertWindowOpen"
      style="z-index: 1000;"
  >
    <insert-scenario-window
        :tags="tags"
        @close-window="closeScenarioWindow"
    />
  </fixed-window>
  <fixed-window
      title="Editar Cenário"
      icon="scenario"
      @close-window="isEditWindowOpen = false"
      v-if="isEditWindowOpen"
      style="z-index: 1000;"
  >
    <edit-scenario-window
        :scenario="selectedScenario"
        @close-window="closeScenarioWindow"
    />
  </fixed-window>
  <AlertWindow
      v-if="isDeleteAlert"
      title="Apagar Cenário"
      icon="warning"
      @alert-button-OK="deleteScenario"
      :cancelAction="closeDeleteAlert"
  >
    <p>Tem certeza que deseja apagar o cenário <strong>{{ selectedScenario?.name }}</strong>?</p>
  </AlertWindow>
  <AlertWindow
      v-if="isDuplicateAlert"
      title="Duplicar Cenário"
      icon="warning"
      @alert-button-OK="duplicateScenario"
      :cancelAction="closeScenarioWindow"
  >
    <p>Tem certeza que deseja duplicar o cenário <strong>{{ selectedScenario?.name }}</strong>?</p>
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
        <span>Cenários</span>
      </div>
      <div class="content">
        <div v-if="scenarios" class="scenes-grid">
          <div
              v-for="token in filteredScenarios"
              :key="token.id" class="scene-item"
              @click="selectScenario(token)"
              :class="{ 'token-selected': selectedScenario?.id === token.id }"
          >
            <img :src="token.image" :alt="token.name" />
            <span>{{ token.name }}</span>
          </div>
        </div>
      </div>
    </section>
    <aside class="window-sidebar">
      <button :disabled="!selectedScenario" @click="openEditWindow()">Editar</button>
      <button :disabled="!selectedScenario" @click="openDeleteAlert()">Apagar</button>
      <button :disabled="!selectedScenario" @click="openDuplicateAlert()">Duplicar</button>
      <button @click="$emit('close-window')">Fechar</button>
      <button>Buscar</button>
      <button>Ajuda</button>
      <button @click="openInsertWindow()">Novo...</button>
      <button v-if="setScenarioToScene" @click="$emit('setScenarioToScene', selectedScenario)">Adicionar na cena</button>
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