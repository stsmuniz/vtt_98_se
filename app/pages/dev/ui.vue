<script setup lang="ts">
/**
 * Vitrine dos componentes ui/* (somente desenvolvimento). Também serve de
 * alvo para os testes automatizados de teclado/mouse (atributos data-test).
 */
import type { MenuDef, MenuItemDef } from '~/utils/menu'
import { formatDateTime, toDate, type ListViewColumn, type ListViewItem, type ListViewItemId, type ListViewMode, type ListViewSort } from '~/utils/listView'
import type { EditableAttribute } from '~/components/ui/AttributeEditor.vue'

if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Página não encontrada' })
}

definePageMeta({ layout: false })
useHead({ title: 'Componentes UI — VTT 98 SE' })

const log = ref<string[]>([])
function record(msg: string) {
  log.value = [msg, ...log.value].slice(0, 8)
}
const lastEvent = computed(() => log.value[0] ?? '')

// ---------- Menus ----------
const view = ref<ListViewMode>('icons')
const showStatus = ref(true)

const menus: MenuDef[] = [
  {
    id: 'arquivo',
    label: '&Arquivo',
    items: [
      { id: 'novo', label: '&Novo', icon: 'new', items: [
        { id: 'novo-token', label: '&Token', icon: 'token', action: () => record('acao:novo-token') },
        { id: 'novo-cenario', label: '&Cenário', icon: 'scenario', action: () => record('acao:novo-cenario') },
      ] },
      { id: 'abrir', label: '&Abrir', icon: 'open', shortcut: 'Enter', default: true, action: () => record('acao:abrir') },
      { id: 'salvar', label: '&Salvar', icon: 'save', shortcut: 'Ctrl+S', action: () => record('acao:salvar') },
      { type: 'separator' },
      { id: 'desabilitado', label: '&Imprimir', disabled: true, action: () => record('acao:imprimir') },
      { id: 'fechar', label: '&Fechar', action: () => record('acao:fechar') },
    ],
  },
  {
    id: 'exibir',
    label: 'E&xibir',
    items: () => [
      { id: 'barra-status', type: 'check', label: '&Barra de status', checked: showStatus.value, action: () => { showStatus.value = !showStatus.value; record('acao:barra-status') } },
      { type: 'separator' },
      { id: 'icones', type: 'radio', label: 'Í&cones', checked: view.value === 'icons', action: () => { view.value = 'icons' } },
      { id: 'lista', type: 'radio', label: '&Lista', checked: view.value === 'list', action: () => { view.value = 'list' } },
      { id: 'detalhes', type: 'radio', label: '&Detalhes', checked: view.value === 'details', action: () => { view.value = 'details' } },
    ],
  },
  {
    id: 'ajuda',
    label: 'Aj&uda',
    items: [{ id: 'sobre', label: '&Sobre…', icon: 'help', action: () => record('acao:sobre') }],
  },
]

// ---------- ListView ----------
const names = ['Dragão Vermelho', 'Taverna do Javali', 'Calabouço Úmido', 'Árvore Ancestral', 'Bandido', 'Esqueleto', 'Goblin Arqueiro', 'Ogro', 'Ação Rápida', 'Zumbi', 'Elfo Mago', 'Cão de Caça']
const items = ref<ListViewItem[]>(names.map((name, i) => ({
  id: i + 1,
  name,
  icon: i % 3 === 0 ? 'token' : i % 3 === 1 ? 'scenario' : 'scene',
  createdAt: new Date(Date.UTC(2026, 9, 1 + i * 2, 12, i)).toISOString(),
  tags: i % 2 ? ['vilão', 'chefão'] : ['cidade'],
})))
const columns: ListViewColumn[] = [
  { key: 'name', label: 'Nome' },
  { key: 'createdAt', label: 'Data de criação', width: 150, value: it => toDate(it.createdAt), format: it => formatDateTime(it.createdAt) },
  { key: 'tags', label: 'Tags', width: 160 },
]
const selected = ref<ListViewItemId | null>(null)
const sort = ref<ListViewSort | null>({ key: 'name', dir: 'asc' })
const columnOrder = ref<string[] | undefined>(undefined)

const ctx = reactive({ open: false, x: 0, y: 0, viaKeyboard: false, item: null as ListViewItem | null })
const ctxItems = computed<MenuItemDef[]>(() => [
  { id: 'ctx-abrir', label: '&Abrir', default: true, action: () => record(`ctx:abrir:${ctx.item?.name}`) },
  { id: 'ctx-renomear', label: '&Renomear', action: () => record(`ctx:renomear:${ctx.item?.name}`) },
  { type: 'separator' },
  { id: 'ctx-excluir', label: '&Excluir', icon: 'delete', action: () => record(`ctx:excluir:${ctx.item?.name}`) },
  { id: 'ctx-propriedades', label: 'P&ropriedades', action: () => record(`ctx:propriedades:${ctx.item?.name}`) },
])
function onContext(p: { item: ListViewItem; x: number; y: number; viaKeyboard: boolean }) {
  Object.assign(ctx, p, { open: true })
}
function onRename(item: ListViewItem, name: string) {
  const target = items.value.find(i => i.id === item.id)
  if (target) target.name = name
  record(`rename:${name}`)
}

// ---------- Abas / formulário ----------
const tab = ref('geral')
const tabs = [
  { id: 'geral', label: 'Geral' },
  { id: 'aparencia', label: 'Aparência' },
  { id: 'avancado', label: 'Avançado', disabled: true },
]
const name = ref('Ação Rápida')
const scale = ref<number>(1)
const sounds = ref(true)
const wallpaper = ref<'none' | 'clouds'>('none')
const volume = ref(70)
const tags = ref<string[]>(['vilão', 'chefão'])
const attributes = ref<EditableAttribute[]>([{ name: 'Força', value: 14 }, { name: 'Destreza', value: 12 }])
const imageFile = ref<File | null>(null)

// ---------- Wizard / MessageBox ----------
const wizardStep = ref(0)
const roomName = ref('')
const wizardSteps = [
  { id: 'boas-vindas', title: 'Bem-vindo ao assistente de sala', description: 'Este assistente cria uma sala de jogo.' },
  { id: 'nome', title: 'Nome da sala', description: 'Digite um nome para a sala.' },
  { id: 'fim', title: 'Pronto', description: 'Clique em Concluir para criar a sala.' },
]
const canAdvance = computed(() => wizardStep.value !== 1 || roomName.value.trim().length > 0)

const msgOpen = ref(true)
function onChoose(value: string) {
  record(`msg:${value}`)
  msgOpen.value = false
  setTimeout(() => { msgOpen.value = true }, 50)
}

const tree = [
  { id: 'intro', label: 'Introdução', icon: 'help-contents' as const },
  { id: 'pastas', label: 'Pastas', icon: 'folder' as const, open: true, children: [
    { id: 'tokens', label: 'Tokens', icon: 'token' as const },
    { id: 'cenarios', label: 'Cenários', icon: 'scenario' as const },
  ] },
]
const treeSelected = ref<string | null>('intro')
</script>

<template>
  <div class="page">
    <!-- Explorer de exemplo -->
    <UiWindow
      class="demo-explorer"
      title="Tokens"
      icon="folder-open"
      :menus="menus"
      minimizable
      maximizable
      helpable
      :scroll-body="false"
      data-test="explorer"
      @close="record('janela:fechar')"
      @minimize="record('janela:minimizar')"
      @maximize="record('janela:maximizar')"
      @help="record('janela:ajuda')"
    >
      <template #toolbar>
        <UiToolbar>
          <UiToolbarButton label="Novo" icon="new" show-label @click="record('tb:novo')" />
          <UiToolbarButton label="Abrir" icon="open" show-label :disabled="selected === null" @click="record('tb:abrir')" />
          <UiToolbarButton label="Excluir" icon="delete" show-label :disabled="selected === null" @click="record('tb:excluir')" />
          <UiToolbarSeparator />
          <UiToolbarButton label="Ícones" icon="view-icons" :pressed="view === 'icons'" data-test="view-icons" @click="view = 'icons'" />
          <UiToolbarButton label="Lista" icon="view-list" :pressed="view === 'list'" data-test="view-list" @click="view = 'list'" />
          <UiToolbarButton label="Detalhes" icon="view-details" :pressed="view === 'details'" data-test="view-details" @click="view = 'details'" />
        </UiToolbar>
      </template>

      <UiListView
        v-model:selected="selected"
        v-model:sort="sort"
        v-model:column-order="columnOrder"
        data-test="listview"
        :items="items"
        :columns="columns"
        :view="view"
        renamable
        label="Tokens"
        @open="record(`open:${$event.name}`)"
        @delete="record(`delete:${$event.name}`)"
        @properties="record(`props:${$event.name}`)"
        @rename="onRename"
        @context="onContext"
      />

      <template v-if="showStatus" #statusbar>
        <UiStatusBar>
          <UiStatusField grow>{{ items.length }} objeto(s)</UiStatusField>
          <UiStatusField grow data-test="selected-name">{{ items.find(i => i.id === selected)?.name ?? '' }}</UiStatusField>
          <UiStatusField width="40%" data-test="last-event">{{ lastEvent }}</UiStatusField>
        </UiStatusBar>
      </template>
    </UiWindow>

    <UiContextMenu :open="ctx.open" :x="ctx.x" :y="ctx.y" :via-keyboard="ctx.viaKeyboard" :items="ctxItems" @close="ctx.open = false" />

    <div class="column">
      <UiWindow title="Propriedades de Vídeo" icon="display" variant="dialog" data-test="tabs-window">
        <UiTabs v-model="tab" :tabs="tabs" data-test="tabs">
          <template #geral>
            <UiTextField v-model="name" label="Nome:" data-test="name-field" />
            <UiSelect v-model="scale" label="Escala:" :options="[{ value: 1, label: '100%' }, { value: 1.5, label: '150%' }, { value: 2, label: '200%' }]" />
            <UiCheckbox v-model="sounds" label="Tocar sons do sistema" />
            <UiGroupBox label="Papel de parede">
              <UiRadioGroup v-model="wallpaper" :options="[{ value: 'none', label: '(nenhum)' }, { value: 'clouds', label: 'Nuvens' }]" />
            </UiGroupBox>
          </template>
          <template #aparencia>
            <UiSlider v-model="volume" label="Volume:" min-label="Baixo" max-label="Alto" />
            <p>Volume: {{ volume }}</p>
            <UiProgressBar :value="volume" />
            <UiProgressBar />
          </template>
        </UiTabs>
        <template #footer>
          <button class="default">OK</button>
          <button>Cancelar</button>
          <button>Aplicar</button>
        </template>
      </UiWindow>

      <UiWindow title="Editores" icon="edit" variant="tool">
        <UiTagEditor v-model="tags" :suggestions="['cidade', 'masmorra', 'vilão']" />
        <UiAttributeEditor v-model="attributes" />
        <UiImagePicker v-model:file="imageFile" current-url="/assets/icons/chicago95/48/token.png" :preview-size="96" />
      </UiWindow>
    </div>

    <div class="column">
      <UiWindow title="Assistente para Adicionar Sala" icon="room" variant="dialog" data-test="wizard-window">
        <UiWizard
          v-model:step="wizardStep"
          :steps="wizardSteps"
          :can-advance="canAdvance"
          data-test="wizard"
          @finish="record(`wizard:fim:${roomName}`)"
          @cancel="record('wizard:cancelar')"
        >
          <template #step-boas-vindas><p>Clique em Avançar para continuar.</p></template>
          <template #step-nome><UiTextField v-model="roomName" label="Nome:" data-test="room-name" /></template>
          <template #step-fim><p>A sala "{{ roomName }}" será criada.</p></template>
        </UiWizard>
      </UiWindow>

      <UiMessageBox
        v-if="msgOpen"
        data-test="msgbox"
        title="Excluir token"
        icon="question"
        message="Tem certeza de que deseja excluir “Dragão Vermelho”?&#10;Esta ação não pode ser desfeita."
        :buttons="[{ label: 'Sim', value: 'sim', default: true }, { label: 'Não', value: 'nao', cancel: true }]"
        @choose="onChoose"
      />

      <UiWindow title="Sumário" icon="help" variant="tool" :active="false">
        <UiSunkenPanel>
          <UiTreeView v-model:selected="treeSelected" :nodes="tree" @activate="record(`tree:${$event.id}`)" />
        </UiSunkenPanel>
      </UiWindow>

      <UiWindow title="Registro de eventos" icon="info" variant="tool">
        <ol class="log" data-test="log">
          <li v-for="(l, i) in log" :key="i">{{ l }}</li>
        </ol>
      </UiWindow>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--c-desktop);
  padding: var(--sp-5);
  display: grid;
  grid-template-columns: minmax(420px, 1.4fr) minmax(320px, 1fr) minmax(320px, 1fr);
  gap: var(--sp-5);
  align-items: start;
}
.demo-explorer {
  height: 560px;
}
.column {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}
.log {
  margin: 0;
  padding-left: 20px;
  min-height: 100px;
}
@media (max-width: 1100px) {
  .page {
    grid-template-columns: 1fr;
  }
}
</style>
