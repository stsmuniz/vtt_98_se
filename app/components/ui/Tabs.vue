<script setup lang="ts">
/**
 * Abas (Propriedades, Configurações, janela de tokens da cena).
 * O conteúdo de cada aba vem do slot com o mesmo nome do `id` da aba.
 * Teclado: ←/→ (e Home/End) trocam de aba com o foco na fileira de abas.
 */
export interface TabDef {
  id: string
  label: string
  disabled?: boolean
}

const props = defineProps<{ tabs: TabDef[] }>()
const active = defineModel<string>({ required: true })

const tabEls = ref<(HTMLElement | null)[]>([])
const baseId = useId()

const enabled = computed(() => props.tabs.filter(t => !t.disabled))

function select(id: string, focus = false) {
  const tab = props.tabs.find(t => t.id === id)
  if (!tab || tab.disabled) return
  active.value = id
  if (focus) nextTick(() => tabEls.value[props.tabs.indexOf(tab)]?.focus())
}

function onKeyDown(event: KeyboardEvent) {
  const list = enabled.value
  const pos = list.findIndex(t => t.id === active.value)
  let next: TabDef | undefined
  if (event.key === 'ArrowRight') next = list[(pos + 1) % list.length]
  else if (event.key === 'ArrowLeft') next = list[(pos - 1 + list.length) % list.length]
  else if (event.key === 'Home') next = list[0]
  else if (event.key === 'End') next = list.at(-1)
  if (!next) return
  event.preventDefault()
  select(next.id, true)
}
</script>

<template>
  <div class="ui-tabs">
    <menu role="tablist" class="ui-tablist" @keydown="onKeyDown">
      <li
        v-for="(tab, i) in tabs"
        :id="`${baseId}-tab-${tab.id}`"
        :key="tab.id"
        :ref="(el) => { tabEls[i] = el as HTMLElement | null }"
        role="tab"
        :aria-selected="active === tab.id"
        :aria-controls="`${baseId}-panel`"
        :aria-disabled="tab.disabled || undefined"
        :tabindex="active === tab.id ? 0 : -1"
        :class="{ disabled: tab.disabled }"
        @click="select(tab.id)"
      >
        <a>{{ tab.label }}</a>
      </li>
    </menu>
    <div
      :id="`${baseId}-panel`"
      class="window ui-tabpanel"
      role="tabpanel"
      :aria-labelledby="`${baseId}-tab-${active}`"
    >
      <div class="window-body ui-tabpanel-body">
        <slot :name="active" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-tabs {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
  font-family: var(--font-ui);
  font-size: var(--fs-1);
}
.ui-tablist {
  flex-shrink: 0;
  margin: 0;
}
.ui-tablist > li {
  font-family: var(--font-ui);
  font-size: var(--fs-1);
  cursor: default;
}
.ui-tablist > li > a {
  padding: var(--sp-1) var(--sp-3);
  text-decoration: none;
  color: inherit;
}
.ui-tablist > li:focus {
  outline: none;
}
.ui-tablist > li:focus-visible > a {
  outline: 1px dotted var(--c-text);
}
.ui-tablist > li.disabled {
  color: var(--c-text-disabled);
  text-shadow: 1px 1px 0 var(--c-highlight);
}
.ui-tabpanel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.ui-tabpanel-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  margin: 0;
  padding: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
</style>
