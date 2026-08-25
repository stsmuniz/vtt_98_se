<script setup lang="ts">
import { ref, computed } from 'vue'

defineEmits(['close-window'])

const { data: scenarios } = await useFetch('/api/v1/scenarios', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})

const scenarioName = ref('')
const selectedTag = ref<string | null>(null)
const selectedScenario = ref<Scenario | null>(null)

const scenarioTags = computed(() => {
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

const toggleTagFilter = (tag: string) => {
  selectedTag.value = selectedTag.value === tag ? null : tag
}

const selectScenario = (scenario: Scenario) => {
  selectedScenario.value = selectedScenario.value?.id === scenario.id ? null : scenario
}

const filteredScenarios = computed(() => {
  if (!scenarios.value) return []

  let filtered = scenarios.value

  if (selectedTag.value) {
    filtered = filtered.filter(scenario => {
      return scenario.tags && Array.isArray(scenario.tags) && scenario.tags.includes(selectedTag.value)
    })
  }

  if (scenarioName.value && scenarioName.value.trim().length > 0) {
    const searchTerm = scenarioName.value.toLowerCase().trim()

    filtered = filtered.filter(scenario => {
      return scenario.name && scenario.name.toLowerCase().includes(searchTerm)
    })
  }

  return filtered
})

const getExtraFields = () => ({
  width: String(selectedScenario.value?.width ?? 0),
  height: String(selectedScenario.value?.height ?? 0),
  scenarioId: String(selectedScenario.value?.id ?? ''),
})
</script>

<template>
  <ResourceFormWindow
      mode="insert"
      endpoint="/api/v1/scenes"
      resource-label="cena"
      resource-article="a"
      :has-image="false"
      :get-extra-fields="getExtraFields"
      @close-window="$emit('close-window')"
  >
    <template #right-panel>
      <div class="image">
        <div class="field-row">
          <label for="scenario-name">Cenário: </label>
          <input type="search" id="scenario-name" v-model="scenarioName">
        </div>
        <div class="field-row scenarios-selector-container">
          <div class="tags-list-container">
            <label class="scenarios-label" for="tags-name">Tags: </label>
            <ul class="tags-list">
              <li
                  class="tag-item"
                  v-if="selectedTag"
                  @click="toggleTagFilter('')"
              >Todos</li>
              <li
                  v-for="(tag, idx) in scenarioTags"
                  :key="idx"
                  class="tag-item"
                  :class="{selected: selectedTag === tag}"
                  @click="toggleTagFilter(tag)"
              >
                {{tag}}
              </li>
            </ul>
          </div>
          <div>
            <label class="scenarios-label" for="tags-name">Cenários: </label>
            <div class="field-row scenarios-preview-container">
              <div
                  class="scenarios-preview"
                  :class="{selected: selectedScenario?.id === scenario.id}"
                  v-for="scenario in filteredScenarios"
                  :key="scenario.id"
                  @click="selectScenario(scenario)"
              >
                <img :src="scenario.image" :alt="scenario.name" class="scenario-preview-img"/>
                <p class="scenario-preview-name">{{scenario.name}}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </ResourceFormWindow>
</template>

<style lang="css" scoped>
.image {
  display: flex;
  flex-direction: column;
}

.scenarios-selector-container {
  display: flex;
}

.tags-list-container {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 0;
  .tags-list {
    margin: 0;
    background-color: white;
    border: 2px solid;
    border-color: black white white black;
    padding: 0.5rem;
    height: 19rem;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    .tag-item {
      cursor: pointer;
      padding: 0.25rem;
      background-color: #eee;
      border-radius: 0.25rem;
      border: 1px solid black;
      &.selected {
        background-color: darkblue;
        color: white;
      }
    }
  }
}

.scenarios-label {
  height: 1rem;
  background-color: black;
  color: white;
  border-radius: 0.25rem 0.25rem 0 0;
  width: 100%;
  padding: 0 0.5rem;
  box-sizing: border-box;
}

.scenarios-preview-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  flex-wrap: wrap;
  gap: 0.125rem;
  height: 19rem;
  overflow-y: auto;
  width: 30rem;
  background-color: white;
  padding: 0.5rem;
  border: 2px solid;
  border-color: black white white black;
  margin: 0;
  .scenarios-preview {
    max-width: 300px;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    &.selected {
      background-color: darkblue;
      color: white;
    }
    .scenario-preview-img {
      max-width: 100%;
    }
  }
}
</style>
