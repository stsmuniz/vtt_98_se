<script setup lang="ts">
/**
 * Formulário de criação/edição de token, cenário, cena ou sala (a criação de
 * sala usa o assistente). Envia multipart como as rotas esperam, valida com
 * caixas de mensagem (nada de alert()) e atualiza todas as pastas abertas.
 */
import type { EditableAttribute } from '~/components/ui/AttributeEditor.vue'
import { RESOURCES, resourceCacheKey, withArticle, type ResourceKind, type ResourceRecord } from '~/desktop/resources'
import { errorMessage, useResourceList } from '~~/composables/useResourceActions'
import { useDesktop } from '~~/composables/useDesktop'
import { useDialog } from '~~/composables/useDialog'
import { useLoadingWindow } from '~~/composables/useLoadingWindow'
import { useWindow } from '~~/composables/useWindow'

const props = defineProps<{ resource: ResourceKind; id?: number }>()

const win = useWindow()
const desktop = useDesktop()
const dialog = useDialog()
const { withLoading } = useLoadingWindow()
const desc = RESOURCES[props.resource]
const isEdit = computed(() => props.id !== undefined)
const { data: records } = await useResourceList(props.resource)

const original = computed<ResourceRecord | null>(() => (isEdit.value ? records.value?.find(r => r.id === props.id) ?? null : null))

// ---------- estado do formulário ----------
const name = ref('')
const tags = ref<string[]>([])
const attributes = ref<EditableAttribute[]>([])
const imageFile = ref<File | null>(null)
const imageDims = ref<{ width: number; height: number } | null>(null)
const scenario = ref<ResourceRecord | null>(null)
const newPassword = ref('')
const isOpen = ref(true)
const submitting = ref(false)

const tagSuggestions = computed(() => [...new Set((records.value ?? []).flatMap(r => (Array.isArray(r.tags) ? r.tags as string[] : [])))])

function fillFrom(r: ResourceRecord) {
  name.value = r.name
  tags.value = Array.isArray(r.tags) ? [...r.tags as string[]] : []
  attributes.value = Array.isArray(r.attributes)
    ? (r.attributes as { name: string; value: unknown }[]).map(a => ({ name: a.name, value: Number(a.value) || 0 }))
    : []
  if (desc.form.hasImage && r.width && r.height) imageDims.value = { width: Number(r.width), height: Number(r.height) }
  if (desc.form.scenarioPicker) scenario.value = (r.scenario as ResourceRecord | undefined) ?? null
  if (desc.form.roomFields) isOpen.value = Boolean(r.isOpen)
}

watch(original, (r) => { if (r) fillFrom(r) }, { immediate: true })

function onImageChange(info: { width: number; height: number }) {
  imageDims.value = { width: info.width, height: info.height }
}

async function chooseScenario() {
  const chosen = await desktop.pick<ResourceRecord>('scenarios', { ownerId: win.id, confirmLabel: 'Usar este cenário' })
  if (chosen) scenario.value = chosen
}

// ---------- validação e envio ----------
async function validate(): Promise<boolean> {
  const problems: string[] = []
  if (!name.value.trim()) problems.push(`Digite um nome para ${withArticle(desc)}.`)
  if (desc.form.hasImage && !isEdit.value && !imageFile.value) problems.push('Escolha uma imagem.')
  if (desc.form.scenarioPicker && !isEdit.value && !scenario.value) problems.push('Escolha o cenário da cena.')
  if (!problems.length) return true
  await dialog.alert(problems.join('\n'), { title: 'Campos obrigatórios', icon: 'warning' })
  return false
}

function buildForm(): FormData {
  const fd = new FormData()
  fd.append('name', name.value.trim())
  fd.append('tags', JSON.stringify(tags.value))
  if (desc.form.hasImage) {
    // O servidor regrava largura/altura: sem imagem nova, reenvia as dimensões atuais.
    fd.append('width', String(imageDims.value?.width ?? original.value?.width ?? 0))
    fd.append('height', String(imageDims.value?.height ?? original.value?.height ?? 0))
    if (imageFile.value) fd.append('image', imageFile.value)
  }
  if (desc.form.hasAttributes) fd.append('attributes', JSON.stringify(attributes.value))
  if (desc.form.scenarioPicker && scenario.value && !isEdit.value) {
    fd.append('scenarioId', String(scenario.value.id))
    fd.append('width', String(scenario.value.width ?? 0))
    fd.append('height', String(scenario.value.height ?? 0))
  }
  if (desc.form.roomFields) {
    fd.append('isOpen', String(isOpen.value))
    if (newPassword.value) fd.append('password', newPassword.value)
  }
  return fd
}

async function submit() {
  if (submitting.value || !(await validate())) return
  submitting.value = true
  const verb = isEdit.value ? 'Atualizando' : 'Salvando'
  try {
    await withLoading(
      () => $fetch(isEdit.value ? `${desc.endpoint}/${props.id}` : desc.endpoint, {
        method: isEdit.value ? 'PUT' : 'POST',
        body: buildForm(),
      }),
      `${verb} ${withArticle(desc)}...`,
    )
    await refreshNuxtData(resourceCacheKey(props.resource))
    if (props.resource === 'scenarios') await refreshNuxtData(resourceCacheKey('scenes'))
    await win.close()
  } catch (error) {
    await dialog.alert(errorMessage(error, `Não foi possível salvar ${withArticle(desc)}.`), { title: 'Erro', icon: 'error' })
  } finally {
    submitting.value = false
  }
}

win.shortcuts({ 'ctrl+s': { run: submit, allowInInput: true } })
</script>

<template>
  <form class="resource-form" @submit.prevent="submit">
    <p v-if="isEdit && !original" class="form-missing">Este item não existe mais.</p>
    <fieldset v-else class="form-fieldset" :disabled="submitting">
      <div class="form-columns">
        <div class="form-main">
          <UiTextField v-model="name" label="Nome:" autofocus :maxlength="120" data-test="form-name" />

          <template v-if="desc.form.roomFields">
            <UiTextField v-model="newPassword" type="password" label="Nova senha:" autocomplete="new-password" hint="Deixe em branco para manter a senha atual." />
            <UiCheckbox v-model="isOpen" label="Sala aberta para visitantes" />
          </template>

          <UiGroupBox v-if="desc.form.scenarioPicker" label="Cenário">
            <div class="scenario-pick">
              <img v-if="scenario?.image" :src="String(scenario.image)" alt="" class="scenario-thumb">
              <span class="scenario-name" data-test="form-scenario">{{ scenario?.name ?? '(nenhum)' }}</span>
              <button v-if="!isEdit" type="button" data-test="form-choose-scenario" @click="chooseScenario">Procurar…</button>
            </div>
          </UiGroupBox>

          <UiTagEditor v-model="tags" :suggestions="tagSuggestions" />
          <UiAttributeEditor v-if="desc.form.hasAttributes" v-model="attributes" />
        </div>

        <div v-if="desc.form.hasImage" class="form-side">
          <UiImagePicker
            v-model:file="imageFile"
            :current-url="original ? String(original.image ?? '') || null : null"
            :preview-size="180"
            @change="onImageChange"
          />
        </div>
      </div>
    </fieldset>

    <div class="form-buttons">
      <button type="submit" class="default" :disabled="submitting || (isEdit && !original)" data-test="form-ok">OK</button>
      <button type="button" :disabled="submitting" @click="win.close()">Cancelar</button>
    </div>
  </form>
</template>

<style scoped>
.resource-form {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  padding: var(--sp-4);
  gap: var(--sp-4);
}
.form-fieldset {
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
  padding: 0;
  border: none;
  overflow: auto;
}
.form-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sp-5);
}
.form-main {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  min-width: 0;
}
.scenario-pick {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.scenario-thumb {
  width: 64px;
  height: 40px;
  object-fit: cover;
  box-shadow: var(--bevel-thin-sunken);
}
.scenario-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
}
.form-buttons {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-3);
  flex-shrink: 0;
}
.form-buttons button {
  min-width: 80px;
}
.form-missing {
  color: var(--c-text-disabled);
}
@media (max-width: 600px) {
  .form-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
