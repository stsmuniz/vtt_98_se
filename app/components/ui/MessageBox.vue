<script setup lang="ts" generic="T extends string | number | boolean">
/**
 * Caixa de mensagem (substitui alert/confirm nativos): janela de diálogo com
 * ícone, texto e botões. Enter aciona o botão padrão; Esc e o "X" acionam o
 * botão de cancelamento (ou o último botão, se nenhum for marcado).
 */
import type { IconName } from '~/utils/icons'

export interface MessageBoxButton<V> {
  label: string
  value: V
  default?: boolean
  cancel?: boolean
}

const props = withDefaults(defineProps<{
  title: string
  message?: string
  icon?: 'info' | 'warning' | 'error' | 'question' | null
  buttons: MessageBoxButton<T>[]
  active?: boolean
}>(), {
  message: undefined,
  icon: 'info',
  active: true,
})

const emit = defineEmits<{ choose: [value: T]; 'drag-start': [event: PointerEvent] }>()

const rootEl = ref<HTMLElement | null>(null)
const buttonEls = ref<(HTMLButtonElement | null)[]>([])

const iconName = computed<IconName | null>(() => props.icon)
const defaultIndex = computed(() => Math.max(0, props.buttons.findIndex(b => b.default)))
const cancelButton = computed(() => props.buttons.find(b => b.cancel) ?? props.buttons.at(-1))

onMounted(() => buttonEls.value[defaultIndex.value]?.focus())

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && cancelButton.value) {
    event.preventDefault()
    event.stopPropagation()
    emit('choose', cancelButton.value.value)
  } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    const i = buttonEls.value.findIndex(b => b === document.activeElement)
    const n = props.buttons.length
    const next = (i + (event.key === 'ArrowRight' ? 1 : -1) + n) % n
    buttonEls.value[next]?.focus()
    event.preventDefault()
  }
}

function onClose() {
  if (cancelButton.value) emit('choose', cancelButton.value.value)
}
</script>

<template>
  <div ref="rootEl" class="ui-message-box" @keydown="onKeyDown">
    <UiWindow
      :title="title"
      variant="dialog"
      :active="active"
      role="alertdialog"
      @close="onClose"
      @drag-start="emit('drag-start', $event)"
    >
      <div class="ui-message-box-content">
        <UiIcon v-if="iconName" :name="iconName" :size="32" />
        <div class="ui-message-box-text">
          <slot>
            <p v-for="(line, i) in (message ?? '').split('\n')" :key="i">{{ line }}</p>
          </slot>
        </div>
      </div>
      <template #footer>
        <div class="ui-message-box-buttons">
          <button
            v-for="(b, i) in buttons"
            :key="String(b.value)"
            :ref="(el) => { buttonEls[i] = el as HTMLButtonElement | null }"
            type="button"
            :class="{ default: i === defaultIndex }"
            @click="emit('choose', b.value)"
          >
            {{ b.label }}
          </button>
        </div>
      </template>
    </UiWindow>
  </div>
</template>

<style scoped>
.ui-message-box {
  display: inline-flex;
  max-width: min(480px, 100%);
}
.ui-message-box-content {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-5);
  padding: var(--sp-2) var(--sp-2) 0;
}
.ui-message-box-text p {
  margin: 0 0 var(--sp-2);
}
.ui-message-box-buttons {
  display: flex;
  justify-content: center;
  gap: var(--sp-3);
  width: 100%;
}
.ui-message-box-buttons button {
  min-width: 75px;
}
</style>
