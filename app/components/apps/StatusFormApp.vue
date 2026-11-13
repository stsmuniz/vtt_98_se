<script setup lang="ts">
/** Diálogo para criar/editar um status personalizado (nome + cor). */
import { MAX_STATUS_NAME_LENGTH } from '~~/lib/tokenStatuses'
import { useDialog } from '~~/composables/useDialog'
import { useStatuses } from '~~/composables/useStatuses'
import { useWindow } from '~~/composables/useWindow'

const props = defineProps<{ rowId?: number; name?: string; color?: string }>()

const win = useWindow()
const dialog = useDialog()
const { save } = useStatuses()

const name = ref(props.name ?? '')
const color = ref(props.color ?? '#3fa535')
const busy = ref(false)

const nameId = useId()
const colorId = useId()

async function ok() {
  if (busy.value) return
  if (!name.value.trim()) {
    await dialog.alert('Digite um nome para o status.', { title: 'Status', icon: 'warning' })
    return
  }
  busy.value = true
  try {
    await save({ rowId: props.rowId, name: name.value.trim(), color: color.value })
    await win.close()
  } catch (error) {
    await dialog.alert((error as Error).message, { title: 'Erro', icon: 'error' })
  } finally {
    busy.value = false
  }
}

win.shortcuts({ enter: { run: ok, allowInInput: true } })
</script>

<template>
  <div class="status-form">
    <div class="field-row-stacked">
      <label :for="nameId">Nome:</label>
      <input :id="nameId" v-model="name" type="text" :maxlength="MAX_STATUS_NAME_LENGTH" data-test="status-name">
    </div>
    <div class="field-row-stacked">
      <label :for="colorId">Cor:</label>
      <input :id="colorId" v-model="color" type="color" class="color-input" data-test="status-color">
    </div>
    <div class="status-form-buttons">
      <button type="button" class="default" :disabled="busy" data-test="status-ok" @click="ok">OK</button>
      <button type="button" @click="win.close()">Cancelar</button>
    </div>
  </div>
</template>

<style scoped>
.status-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-3);
}
.status-form input[type=text] {
  height: auto;
  font: inherit;
}
.color-input {
  width: 64px;
  height: 24px;
  padding: 0;
}
.status-form-buttons {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
}
</style>
