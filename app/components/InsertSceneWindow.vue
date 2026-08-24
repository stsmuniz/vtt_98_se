<script setup lang="ts">
import {int} from "drizzle-orm/sqlite-core";

defineProps([
  'tags'
])

const emit = defineEmits(['close-window'])

const form = reactive({
  name: '',
  tags: [] as string[],
  width: 0,
  height: 0,
  scenarioId: int
})

const scenarioName = ref<String>('')

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

const selectedTag = ref<string | null>(null)
const selectedScenario = ref<Scenario | null>(null)

const selectScenario = (scenario: Scenario) => {
  console.log("Scenario selecionado:", scenario)
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

const { data: scenarios, refresh: refreshScenarios } = await useFetch('/api/v1/scenarios', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})

const selectedTags = ref<string[]>([])
const tagToInsert = ref("")

const removeTag = (tag: string) => {
  selectedTags.value = selectedTags.value.filter(t => t !== tag)
}
const addTag = () => {
  if (!tagToInsert.value) return;
  selectedTags.value.push(tagToInsert.value)
  tagToInsert.value = ""
}

const addScene = async () => {
  if (!form.name) {
    alert("Por favor, insira um nome para o Cenário.")
    return
  }

  const formData = new FormData()

  formData.append('name', form.name)
  formData.append('width', selectedScenario.value?.width.toString())
  formData.append('height', selectedScenario.value?.height.toString())
  formData.append('tags', JSON.stringify(selectedTags.value))
  formData.append('scenarioId', selectedScenario.value?.id)

  try {
    const result = await $fetch.raw('/api/v1/scenes', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer ' + (localStorage.getItem('token') || '')
      },
      body: formData
    })

    if (result.ok) {
      emit('close-window')
    }
  } catch (error) {
    console.error("Erro ao enviar a cena:", error)
    alert("Falha ao salvar a cena.")
  }
}
</script>

<template>
  <form @submit.prevent="addScene" enctype="multipart/form-data">
    <div class="form-content">
      <div class="form-fields">
        <div class="field-row">
          <label for="name">Nome: </label>
          <input
              v-model="form.name"
              type="text"
              name="name"
              id="name" style="width: 100%;"
              placeholder="Nome do Cenário"
          >
        </div>
        <div class="field-row" style="display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.5rem;">
          <label>Tags: </label>
          <table style="width: 100%;" id="tags-table" class="tags-table">
            <thead>
            <tr>
              <td>Nome</td>
              <td>Ações</td>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(tag, idx) in selectedTags" :key="idx">
              <td>{{tag}}</td>
              <td class="action-cell">
                <button class="action-button" @click.prevent="removeTag(tag)">Remover</button>
              </td>
            </tr>
            <tr style="background-color: silver;">
              <td>
                <input
                    type="text"
                    style="width: 100%"
                    v-model="tagToInsert"
                    placeholder="nome-da-tag"
                    list="tag-names"
                    id="tag-input"
                />
                <datalist id="tag-names" v-if="scenarioTags">
                  <option v-for="(tag, idx) in scenarioTags" :key="idx">{{tag}}</option>
                </datalist>
              </td>
              <td class="action-cell">
                <button class="action-button" @click.prevent="addTag">Adicionar</button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
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
                  v-if="filteredScenarios"
                  v-for="scenario in filteredScenarios"
                  :key="scenario.id"
                  @click="selectScenario(scenario)"
              >
                <img :src="scenario.image" alt="scenario.name"  class="scenario-preview-img"/>
                <p class="scenario-preview-name">{{scenario.name}}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="form-actions">
      <button type="submit">OK</button>
      <button type="button" @click.prevent="$emit('close-window')">Cancelar</button>
    </div>
  </form>
</template>

<style lang="css" scoped>
.form-content {
  display: flex;
  gap: 1rem;

  label {
    min-width: 60px;
  }

  .tags-table tbody tr:hover {
    background-color: darkblue;
    color: white;
  }

  .action-cell {
    padding: 0;
    .action-button {
      width: 100%;
      cursor: pointer;
    }
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
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
  gap: 0.25rem;
}
</style>