<script setup lang="ts">
import { ref, reactive } from 'vue'
import {number} from "better-auth";
const emit = defineEmits(['close-window'])

const props = defineProps<{scene?: Scene}>()

const form = reactive({
  name: '',
  tags: [] as string[],
})

const tags = ref<string[]>([])
const tagToInsert = ref("")

const removeTag = (tag: string) => {
  tags.value = tags.value.filter(t => t !== tag)
}
const addTag = () => {
  if (!tagToInsert.value) return;
  tags.value.push(tagToInsert.value)
  tagToInsert.value = ""
}

onMounted(() => {
  if (props.scene) {
    form.name = props.scene.name
    tags.value = props.scene.tags ? [...props.scene.tags] : []
  }
})

const updateScene = async () => {
  if (!form.name) {
    alert("Por favor, insira um nome para o cenário.")
    return
  }

  const formData = new FormData()
  formData.append('name', form.name)
  formData.append('tags', JSON.stringify(tags.value))

  try {
    const result = await $fetch.raw(`/api/v1/scenes/${props.scene?.id}`, {
      method: 'PUT',
      headers: {
        'authorization': 'Bearer ' + (localStorage.getItem('token') || '')
      },
      body: formData
    })

    if (result.ok) {
      emit('close-window')
    }
  } catch (error) {
    console.error("Erro ao atualizar a cena:", error)
    alert("Falha ao atualizar a cena.")
  }
}
</script>

<template>
  <form @submit.prevent="updateScene">
    <div class="form-content">
      <div class="form-fields">
        <div class="field-row">
          <label for="name">Nome: </label>
          <input v-model="form.name" type="text" name="name" id="name" style="width: 100%;">
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
            <tr v-for="(tag, idx) in tags" :key="idx">
              <td>{{tag}}</td>
              <td class="action-cell">
                <button class="action-button" @click.prevent="removeTag(tag)">Remover</button>
              </td>
            </tr>
            <tr style="background-color: silver;">
              <td><input type="text" style="width: 100%" v-model="tagToInsert" placeholder="nome-da-tag" /></td>
              <td class="action-cell">
                <button class="action-button" @click.prevent="addTag">Adicionar</button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="form-actions">
      <button type="submit">OK</button>
      <button type="button" @click="$emit('close-window')">Cancelar</button>
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
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
  gap: 0.25rem;
}
</style>