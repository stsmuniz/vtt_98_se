<script setup lang="ts">
import { ref, reactive } from 'vue'
import {number} from "better-auth";
const emit = defineEmits(['close-window'])

const props = defineProps<{scenario?: Scenario}>()

const form = reactive({
  name: '',
  tags: [] as string[],
  image: null as File | null,
  width: 0,
  height: 0
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

const imagePreviewUrl = ref<string | null>(null)

const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    form.image = file;

    if (imagePreviewUrl.value) {
      URL.revokeObjectURL(imagePreviewUrl.value);
    }

    imagePreviewUrl.value = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      form.width = img.width;
      form.height = img.height;
    }

    img.src = URL.createObjectURL(file);
  } else {
    form.image = null;
    imagePreviewUrl.value = null;
  }
}

onMounted(() => {
  if (props.scene) {
    form.name = props.scene.name
    form.width = props.scene.width
    form.height = props.scene.height

    tags.value = props.scene.tags ? [...props.scene.tags] : []

    if (props.scene.image) {
      imagePreviewUrl.value = props.scene.image
    }
  }
})

const updateScenario = async () => {
  if (!form.name) {
    alert("Por favor, insira um nome para o cenário.")
    return
  }

  // Na edição, não validamos a obrigatoriedade da imagem pois ela já pode existir no banco
  if (!imagePreviewUrl.value && !tags.value.length) {
    alert("Por favor, insira pelo menos uma imagem ou uma tag.")
    return
  }

  const formData = new FormData()
  formData.append('name', form.name)
  formData.append('width', form.width.toString())
  formData.append('height', form.height.toString())

  // Só anexa o arquivo se o usuário tiver feito upload de um NOVO arquivo
  if (form.image) {
    formData.append('image', form.image)
  }

  formData.append('tags', JSON.stringify(tags.value))

  try {
    const result = await $fetch.raw(`/api/v1/scenarios/${props.scene?.id}`, {
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
    console.error("Erro ao atualizar o cenário:", error)
    alert("Falha ao atualizar o cenário.")
  }
}
</script>

<template>
  <form @submit.prevent="updateScenario" enctype="multipart/form-data">
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
      <div class="image">
        <div class="field-row">
          <label for="image">Imagem: </label>
          <input
              type="file"
              name="image"
              id="image"
              accept="image/*"
              @change="handleImageUpload"
          >
        </div>
        <div class="field-row image-preview-container" style="margin-top: 0.5rem;">
          <div class="image-preview">
            <img
                v-if="imagePreviewUrl"
                :src="imagePreviewUrl"
                alt="Preview"
                class="preview-img"
            />
          </div>
        </div>
        <p>Largura: {{form.width}}px | Altura: {{form.height}}px</p>
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

  .image {
    display: flex;
    flex-direction: column;
  }

  .image-preview-container {
    display: flex;
    justify-content: end;
    align-items: center;
  }

  .image-preview {
    background-image:
        url("data:image/svg+xml;utf8,\
            <svg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'>\
                <rect fill='%23ccc' width='25' height='25' x='0' y='0' />\
                <rect fill='%23fff' width='25' height='25' x='0' y='25' />\
                <rect fill='%23fff' width='25' height='25' x='25' y='0' />\
                <rect fill='%23ccc' width='25' height='25' x='25' y='25' />\
            </svg>");
    width: 100%;
    min-width: 300px;
    height: 300px;
    border: 2px solid;
    border-color: #666 lightgray lightgray #666;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .preview-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
  gap: 0.25rem;
}
</style>