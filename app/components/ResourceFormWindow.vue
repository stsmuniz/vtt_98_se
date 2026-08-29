<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { useTagManager } from '~~/composables/useTagManager'
import { useAttributeManager } from '~~/composables/useAttributeManager'
import { useImageUpload } from '~~/composables/useImageUpload'
import { useLoadingWindow } from '~~/composables/useLoadingWindow'
import type {input} from "better-auth";

const props = withDefaults(defineProps<{
  mode: 'insert' | 'edit'
  endpoint: string
  id?: number | string
  resourceLabel: string
  resourceArticle?: 'o' | 'a'
  hasImage?: boolean
  requireImageOnInsert?: boolean
  hasAttributes?: boolean
  omitImage: false | boolean
  initial?: {
    name?: string
    tags?: string[] | null
    attributes?: { name: string; value: number }[] | null
    password?: string | null
    isOpen?: boolean | null
    image?: string | null
    width?: number
    height?: number
  } | null
  missingFieldsMessage?: string
  tagSuggestions?: string[]
  getExtraFields?: () => Record<string, string>
  extraValid?: () => true | string
}>(), {
  resourceArticle: 'o',
  hasImage: true,
  requireImageOnInsert: true,
  hasAttributes: false,
  missingFieldsMessage: 'Por favor, insira pelo menos uma imagem ou uma tag.',
})

const emit = defineEmits(['close-window'])

const form = reactive({ name: '' , password: '', isOpen: false})
const { tags, tagToInsert, addTag, removeTag, setTags } = useTagManager()
const { attributes, attributeToInsert, attributeValueToInsert, addAttribute, removeAttribute, setAttributes } = useAttributeManager()
const { imageFile, imagePreviewUrl, imageWidth, imageHeight, handleImageUpload, setExistingImage } = useImageUpload()
const { withLoading } = useLoadingWindow()
const newPassword = ref('')
const isSubmitting = ref(false)

onMounted(() => {
  if (props.mode === 'edit' && props.initial) {
    form.name = props.initial.name ?? ''
    form.password = props.initial.password ?? ''
    form.isOpen = props.initial.isOpen ?? false
    setTags(props.initial.tags)
    if (props.hasAttributes) setAttributes(props.initial.attributes)
    if (props.hasImage) setExistingImage(props.initial.image, props.initial.width, props.initial.height)
  }
})

const enforceAtLeastOne = props.hasImage || props.hasAttributes

async function handleSubmit() {
  if (!form.name) {
    alert(`Por favor, insira um nome para ${props.resourceArticle} ${props.resourceLabel}.`)
    return
  }

  if (enforceAtLeastOne) {
    const hasTagsOrAttributes = tags.value.length > 0 || (props.hasAttributes && attributes.value.length > 0)
    if (!imagePreviewUrl.value && !hasTagsOrAttributes) {
      alert(props.missingFieldsMessage)
      return
    }
  }

  if (props.extraValid) {
    const result = props.extraValid()
    if (result !== true) {
      if (typeof result === 'string') alert(result)
      return
    }
  }

  const formData = new FormData()
  formData.append('name', form.name)

  if (newPassword.value) {
    formData.append('password', newPassword.value)
  }

  if (form.isOpen !== undefined) {
    formData.append('isOpen', String(form.isOpen))
  }

  if (props.hasImage) {
    formData.append('width', String(imageWidth.value))
    formData.append('height', String(imageHeight.value))
    if (imageFile.value) formData.append('image', imageFile.value)
  }

  formData.append('tags', JSON.stringify(tags.value))

  if (props.hasAttributes) {
    formData.append('attributes', JSON.stringify(attributes.value))
  }

  if (props.getExtraFields) {
    for (const [key, value] of Object.entries(props.getExtraFields())) {
      formData.append(key, value)
    }
  }

  const url = props.mode === 'insert' ? props.endpoint : `${props.endpoint}/${props.id}`
  const action = props.mode === 'insert' ? 'salvar' : 'atualizar'

  isSubmitting.value = true
  try {
    await withLoading(async () => {
      const result = await $fetch.raw(url, {
        method: props.mode === 'insert' ? 'POST' : 'PUT',
        headers: {
          authorization: 'Bearer ' + (localStorage.getItem('token') || ''),
        },
        body: formData,
      })

      if (result.ok) {
        emit('close-window')
      }
    }, `${action === 'salvar' ? 'Salvando' : 'Atualizando'} ${props.resourceArticle} ${props.resourceLabel}...`)
  } catch (error) {
    console.error(`Erro ao ${action} ${props.resourceArticle} ${props.resourceLabel}:`, error)
    alert(`Falha ao ${action} ${props.resourceArticle} ${props.resourceLabel}.`)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" enctype="multipart/form-data">
    <fieldset :disabled="isSubmitting" class="form-fieldset">
    <div class="form-content">
      <div class="form-fields">
        <div class="field-row">
          <label for="name">Nome: </label>
          <input
              v-model="form.name"
              type="text"
              name="name"
              id="name" style="width: 100%;"
          >
        </div>
        <div class="field-row" v-if="props.mode === 'edit' && props.initial?.password !== null && props.initial?.password !== undefined && props.initial?.password !== ''">
          <label for="name">Password: </label>
          <input
              v-model="newPassword"
              type="password"
              name="password"
              id="password" style="width: 100%;"
              placeholder="********"
          >
        </div>
        <div v-if="props.initial?.isOpen !== null && props.initial?.isOpen !== undefined && props.mode === 'edit'"
             class="field-row">
          <input type="checkbox" id="is-open" v-model="form.isOpen" />
          <label for="is-open">Sala Aberta: </label>
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
        <div v-if="hasAttributes" class="field-row" style="display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.5rem;">
          <label>Atributos: </label>
          <table style="width: 100%;" id="attributes-table">
            <thead>
            <tr>
              <td>Nome</td>
              <td>Valor</td>
              <td>Ações</td>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(attribute, idx) in attributes" :key="idx">
              <td>{{ attribute.name }}</td>
              <td>{{ attribute.value }}</td>
              <td class="action-cell">
                <button class="action-button" @click.prevent="removeAttribute(idx)">Remover</button>
              </td>
            </tr>
            <tr style="background-color: silver;">
              <td><input type="text" v-model="attributeToInsert" placeholder="Nome do atributo" /></td>
              <td><input type="number" v-model="attributeValueToInsert" /></td>
              <td class="action-cell">
                <button class="action-button" @click.prevent="addAttribute()">Adicionar</button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
        <slot name="extra-fields"/>
      </div>
      <div v-if="hasImage && !omitImage" class="image">
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
        <p>Largura: {{ imageWidth }}px | Altura: {{ imageHeight }}px</p>
      </div>
      <slot name="right-panel"/>
    </div>
    <div class="form-actions">
      <button type="submit">OK</button>
      <button type="button" @click.prevent="$emit('close-window')">Cancelar</button>
    </div>
    </fieldset>
  </form>
</template>

<style lang="css" scoped>
.form-fieldset {
  border: none;
  margin: 0;
  padding: 0;
}

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
