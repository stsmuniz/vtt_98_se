<script setup lang="ts">
defineEmits(['close-window'])

const { data: topics } = await useAsyncData('help-manual-topics', () =>
  queryCollection('manual').order('order', 'ASC').all()
)

const isSidebarVisible = ref(true)

// Histórico de navegação dentro do manual (como o Voltar/Avançar de um visualizador de ajuda .chm)
const history = ref<string[]>([])
const historyIndex = ref(-1)

const currentPath = computed(() => history.value[historyIndex.value] ?? null)
const currentTopic = computed(() => topics.value?.find(t => t.path === currentPath.value) ?? null)

const canGoBack = computed(() => historyIndex.value > 0)
const canGoForward = computed(() => historyIndex.value < history.value.length - 1)

function openTopic(path: string) {
  if (path === currentPath.value) return
  // Descarta qualquer histórico "à frente" ao navegar para um tópico novo
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

watch(topics, (list) => {
  if (list && list.length && history.value.length === 0) {
    history.value = [list[0].path]
    historyIndex.value = 0
  }
}, { immediate: true })
</script>

<template>
  <FloatingWindow title="Manual do VTT 98 SE" icon="help" @close-window="$emit('close-window')">
    <div class="help-manual">
      <div class="help-toolbar">
        <button :disabled="!canGoBack" @click="goBack">&larr; Voltar</button>
        <button :disabled="!canGoForward" @click="goForward">Avançar &rarr;</button>
        <button @click="isSidebarVisible = !isSidebarVisible">
          {{ isSidebarVisible ? 'Ocultar' : 'Sumário' }}
        </button>
        <button @click="printTopic">Imprimir</button>
      </div>
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
                <img
                    v-if="topic.icon"
                    :src="`/assets/icons/${topic.icon}.png`"
                    class="help-toc-icon"
                    alt=""
                />
                {{ topic.title }}
              </a>
            </li>
          </ul>
        </aside>
        <div class="help-topic sunken-panel">
          <div v-if="currentTopic" class="markdown-body">
            <h1>{{ currentTopic.title }}</h1>
            <ContentRenderer :value="currentTopic"/>
          </div>
          <p v-else class="help-empty">Selecione um tópico no sumário ao lado.</p>
        </div>
      </div>
    </div>
  </FloatingWindow>
</template>

<style lang="css" scoped>
.help-manual {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 46rem;
  max-width: 80vw;
  height: 32rem;
  max-height: 75vh;
}

.help-toolbar {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;

  button {
    min-width: 0;
    padding: 0 0.6rem;
  }
}

.help-panes {
  display: grid;
  grid-template-columns: 12rem 1fr;
  gap: 0.5rem;
  flex: 1;
  min-height: 0;
}

.help-panes.sidebar-hidden {
  grid-template-columns: 0 1fr;

  .help-toc {
    display: none;
  }
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
  width: 1rem;
  height: 1rem;
  vertical-align: text-bottom;
  margin-right: 0.25rem;
}

.help-toc a.active {
  background-color: navy;
  color: white;
}

.help-topic {
  min-height: 0;
  overflow-y: auto;
  padding: 0.75rem 1rem;
  font-family: Arial, sans-serif;
}

.help-empty {
  color: #555;
  font-style: italic;
}

.markdown-body {
  line-height: 1.6;
  overflow-wrap: break-word;
  word-break: break-word;
}

.markdown-body h1 {
  font-size: 1.3rem;
  color: #000080;
  margin: 0 0 0.75rem;
  border-bottom: 1px solid #808080;
  padding-bottom: 0.35rem;
}

.markdown-body :deep(h2) {
  font-size: 1.1rem;
  color: #000080;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

.markdown-body :deep(h3) {
  font-size: 1rem;
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
  font-family: monospace;
  font-size: 0.9em;
}

.markdown-body :deep(strong) {
  font-weight: bold;
}
</style>
