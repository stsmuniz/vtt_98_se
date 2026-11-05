<script setup lang="ts">
/**
 * Visualizador do manual (estilo arquivo de ajuda .chm): sumário à esquerda,
 * tópico à direita, histórico Voltar/Avançar. Conteúdo da coleção `manual`
 * do @nuxt/content (content/manual/*.md).
 */
import type { MenuDef } from '~/utils/menu'
import { iconUrl, isIconName } from '~/utils/icons'
import { useWindow } from '~~/composables/useWindow'

const props = defineProps<{ topic?: string }>()

const win = useWindow()

const { data: topics } = await useAsyncData('help-manual-topics', () =>
  queryCollection('manual').order('order', 'ASC').all(),
)

const isSidebarVisible = ref(true)

// Histórico de navegação dentro do manual (Voltar/Avançar)
const history = ref<string[]>([])
const historyIndex = ref(-1)

const currentPath = computed(() => history.value[historyIndex.value] ?? null)
const currentTopic = computed(() => topics.value?.find(t => t.path === currentPath.value) ?? null)
const canGoBack = computed(() => historyIndex.value > 0)
const canGoForward = computed(() => historyIndex.value < history.value.length - 1)

function openTopic(path: string) {
  if (path === currentPath.value) return
  history.value = [...history.value.slice(0, historyIndex.value + 1), path]
  historyIndex.value = history.value.length - 1
}

function goBack() {
  if (canGoBack.value) historyIndex.value -= 1
}

function goForward() {
  if (canGoForward.value) historyIndex.value += 1
}

function printTopic() {
  window.print()
}

function openExternal(path: string) {
  window.open(path, '_blank', 'noopener')
}

/** "/manual/07-salas" -> "salas" (o número só ordena o sumário). */
const topicSlug = (path: string) => (path.split('/').pop() ?? '').replace(/^\d+-/, '')

function topicIcon(icon?: string): string | null {
  return icon && isIconName(icon) ? iconUrl(icon, 16) : null
}

watch([topics, () => props.topic], ([list, topic]) => {
  if (!list?.length) return
  const wanted = topic ? (list.find(t => topicSlug(t.path) === topic) ?? list.find(t => topicSlug(t.path).includes(topic))) : undefined
  if (wanted) openTopic(wanted.path)
  else if (history.value.length === 0) openTopic(list[0]!.path)
}, { immediate: true })

const menus = computed<MenuDef[]>(() => [
  {
    id: 'arquivo',
    label: '&Arquivo',
    items: [
      { id: 'imprimir', label: '&Imprimir…', shortcut: 'Ctrl+P', action: printTopic },
      { type: 'separator' },
      { id: 'fechar', label: '&Fechar', action: () => win.close() },
    ],
  },
  {
    id: 'exibir',
    label: 'E&xibir',
    items: [
      { id: 'sumario', type: 'check', label: '&Sumário', checked: isSidebarVisible.value, action: () => { isSidebarVisible.value = !isSidebarVisible.value } },
    ],
  },
  {
    id: 'ir',
    label: '&Ir',
    items: [
      { id: 'voltar', label: '&Voltar', shortcut: 'Alt+Esquerda', disabled: !canGoBack.value, action: goBack },
      { id: 'avancar', label: '&Avançar', shortcut: 'Alt+Direita', disabled: !canGoForward.value, action: goForward },
    ],
  },
  {
    id: 'ajuda',
    label: 'Aj&uda',
    items: [
      { id: 'termos', label: '&Termos de Uso', action: () => openExternal('/termos') },
      { id: 'privacidade', label: '&Política de Privacidade', action: () => openExternal('/privacidade') },
      { type: 'separator' },
      { id: 'sobre', label: '&Sobre o VTT 98 SE', icon: 'info', action: () => openExternal('/about') },
    ],
  },
])

win.setMenus(menus.value)
watch(menus, m => win.setMenus(m))

win.shortcuts({
  'alt+arrowleft': goBack,
  'alt+arrowright': goForward,
})
</script>

<template>
  <div class="help-manual">
    <UiToolbar label="Navegação do manual">
      <UiToolbarButton label="< Voltar" :disabled="!canGoBack" @click="goBack" />
      <UiToolbarButton label="Avançar >" :disabled="!canGoForward" @click="goForward" />
      <UiToolbarSeparator />
      <UiToolbarButton label="Sumário" icon="help-contents" :pressed="isSidebarVisible" @click="isSidebarVisible = !isSidebarVisible" />
      <UiToolbarButton label="Imprimir" @click="printTopic" />
    </UiToolbar>
    <div class="help-panes" :class="{ 'sidebar-hidden': !isSidebarVisible }">
      <aside class="help-toc">
        <div class="help-toc-label">Sumário</div>
        <ul class="tree-view">
          <li v-for="topic in topics" :key="topic.path">
            <a
              href="#"
              :class="{ active: topic.path === currentPath }"
              @click.prevent="openTopic(topic.path)"
            >
              <img v-if="topicIcon(topic.icon)" :src="topicIcon(topic.icon)!" class="help-toc-icon" alt="">
              {{ topic.title }}
            </a>
          </li>
        </ul>
      </aside>
      <div class="help-topic sunken-panel">
        <div v-if="currentTopic" class="markdown-body">
          <h1>{{ currentTopic.title }}</h1>
          <ContentRenderer :value="currentTopic" />
        </div>
        <p v-else class="help-empty">Selecione um tópico no sumário ao lado.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.help-manual {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  gap: var(--sp-2);
  padding: 0 var(--sp-2) var(--sp-2);
}

.help-panes {
  display: grid;
  grid-template-columns: 12rem 1fr;
  gap: var(--sp-3);
  flex: 1;
  min-height: 0;
}
.help-panes.sidebar-hidden {
  grid-template-columns: 1fr;
}
.help-panes.sidebar-hidden .help-toc {
  display: none;
}

.help-toc {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.help-toc-label {
  font-weight: bold;
  padding: 0.15rem 0 0.35rem;
  flex-shrink: 0;
}
.help-toc .tree-view {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.help-toc-icon {
  width: 16px;
  height: 16px;
  vertical-align: text-bottom;
  margin-right: 0.25rem;
}
.help-toc a.active {
  background-color: var(--c-selection);
  color: var(--c-selection-text);
}

.help-topic {
  min-height: 0;
  overflow-y: auto;
  padding: 0.75rem 1rem;
  font-family: var(--font-ui);
  background: var(--c-window);
}
.help-empty {
  color: #555;
  font-style: italic;
}

.markdown-body {
  line-height: var(--lh);
  overflow-wrap: break-word;
  word-break: break-word;
}
.markdown-body h1 {
  font-size: var(--fs-1);
  font-weight: 700;
  color: #000080;
  margin: 0 0 0.75rem;
  border-bottom: 1px solid #808080;
  padding-bottom: 0.35rem;
}
.markdown-body :deep(h2) {
  font-size: var(--fs-1);
  font-weight: 700;
  color: #000080;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}
.markdown-body :deep(h3) {
  font-size: var(--fs-1);
  font-weight: 400;
  text-decoration: underline;
  color: #000080;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}
.markdown-body :deep(p) {
  margin: 0 0 0.85rem;
}
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0 0 0.85rem;
  padding-left: 1.5rem;
}
.markdown-body :deep(li) {
  margin-bottom: 0.35rem;
}
.markdown-body :deep(li > p) {
  margin-bottom: 0;
}
.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0 0 1rem;
}
.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #808080;
  padding: 0.4rem 0.6rem;
  text-align: left;
}
.markdown-body :deep(th) {
  background-color: #000080;
  color: #ffffff;
}
.markdown-body :deep(code) {
  background-color: #f0f0f0;
  border: 1px solid #dfdfdf;
  padding: 0.1rem 0.3rem;
  font-family: var(--font-mono);
  font-size: var(--fs-1);
}

</style>
