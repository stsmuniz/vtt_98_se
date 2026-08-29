<script setup lang="ts">
import {TabContent} from "vue3-form-wizard";
import {reactive} from "vue";
import {useTagManager} from "~~/composables/useTagManager.ts";

defineProps<{ tagSuggestions?: string[] }>()
const emit = defineEmits(['close-window'])
const { tags, tagToInsert, addTag, removeTag } = useTagManager()
const form = reactive({ name: '' , password: '', isOpen: false, tags: [''], sceneId: null as number | null})
const selectedScene = ref<number | null>(null)

watch(tags.value, () => {
  form.tags = tags.value
})

watch(selectedScene, () => {
  form.sceneId = selectedScene.value
})

const scenes = await $fetch('/api/v1/scenes', {
  headers: {
    authorization: 'Bearer ' + (localStorage.getItem('token') || ''),
  },
  method: 'GET',
})

const addRoom = async () => {
  if (!form.name) {
    alert('Por favor, insira um nome para a sala.')
    return
  }
  if (!form.sceneId) {
    alert('Por favor, selecione uma cena inicial para a sala.')
    return
  }

  try {
    const result = await $fetch('/api/v1/rooms', {
      headers: {
        authorization: 'Bearer ' + (localStorage.getItem('token') || ''),
      },
      method: 'POST',
      body: {
        name: form.name,
        password: form.password,
        tags: form.tags,
        sceneId: form.sceneId,
      },
    })
    emit('close-window')
  } catch (error) {
    console.error('Erro ao adicionar sala:', error)
    alert('Falha ao adicionar sala.')
  }
}

</script>
<template>
  <WizardWindow
      wizard-title="Wizard para Adicionar Sala"
      next-button-text="Avançar >"
      @completed-wizard="addRoom"
      @close-window="$emit('close-window')"
  >
    <tab-content class="tab-container">
      <img src="/assets/wizard_side.png" alt="wizard-illustration" class="wizard-illustration"/>
      <div class="tab-content">
        <h2>Adicionar Sala</h2>
        <p>Este Wizard guiará você no processo de criação de sala, te ajudando a informar os dados necessários.</p>
        <p>Clique em "Avançar" para começar o processo.</p>
      </div>
    </tab-content>
    <tab-content class="tab-container">
      <img src="/assets/wizard_side.png" alt="wizard-illustration" class="wizard-illustration"/>
      <div class="tab-content">
        <h2>Informações básicas</h2>
        <p>Para criar a sala, é necessário coletar algumas informações básicas. Preencha o formulário a seguir:</p>
        <div class="field-row">
          <label for="name">Nome da sala</label>
          <input type="text" id="name" v-model="form.name">
        </div>
        <div class="field-row">
          <label for="password">Senha da sala</label>
          <input type="password" id="password" v-model="form.password">
        </div>
      </div>
    </tab-content>
    <tab-content class="tab-container">
      <img src="/assets/wizard_side.png" alt="wizard-illustration" class="wizard-illustration"/>
      <div class="tab-content">
        <h2>Tags da Sala</h2>
        <p>Adicione tags para facilitar a busca e categorização da sala.</p>
        <div class="field-row" style="display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.5rem;">
          <table style="width: 100%;" id="tags-table" class="tags-table">
            <thead>
            <tr>
              <td>Nome</td>
              <td>Ações</td>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(tag, idx) in tags" :key="idx">
              <td>{{ tag }}</td>
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
                    :list="tagSuggestions ? 'tag-names' : undefined"
                    id="tag-input"
                />
                <datalist v-if="tagSuggestions" id="tag-names">
                  <option v-for="(tag, idx) in tagSuggestions" :key="idx">{{ tag }}</option>
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
    </tab-content>
    <tab-content class="tab-container">
      <img src="/assets/wizard_side.png" alt="wizard-illustration" class="wizard-illustration"/>
      <div class="tab-content">
        <h2>Escolher Cena</h2>
        <p>Escolha a cena inicial para a sala. Você pode trocar de cena depois, na janela da sala.</p>
        <div class="scene-container">
          <ul class="scene-list">
            <li
                v-for="scene in scenes"
                :key="scene.id"
                class="scene-item"
                :class="{ 'selected': selectedScene === scene.id }"
                @click="selectedScene = scene.id"
            >
              <img :src="scene.scenario.image" :alt="scene.name" class="scene-image">
              <span class="scene-name">{{scene.name}}</span>
            </li>
          </ul>
        </div>
      </div>
    </tab-content>
    <tab-content class="tab-container">
      <img src="/assets/wizard_side.png" alt="wizard-illustration" class="wizard-illustration"/>
      <div class="tab-content">
        <h2>Informações da sala coletadas</h2>
        <p>Sua sala está pronta pra ser cadastrada, Clique em finalizar para terminar o processo e cadastrar a cena.</p>
      </div>
    </tab-content>
  </WizardWindow>
</template>
<style lang="css" scoped>
.scene-container {
  background-color: white;
  border: 2px solid;
  border-color: #808080 #ffffff #ffffff #808080;
  overflow-y: scroll;
  padding: 0.5rem;
  max-width: 27rem;
  height: 15rem;
  .scene-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    flex-wrap: wrap;
    .scene-item {
      cursor: pointer;
      display: flex;
      align-items: center;
      flex-direction: column;
      width: 200px;
      padding-top: 0.5rem;
      &:hover, &.selected {
        background-color: darkblue;
        color: white;
      }
      .scene-image {
        max-width: 90%;
      }
    }
  }
}
</style>