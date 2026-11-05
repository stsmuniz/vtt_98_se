/**
 * Descritores dos recursos exibidos nas pastas (Tokens, Cenários, Cenas, Salas).
 *
 * O Explorer, o formulário, as Propriedades e os seletores ("pick") são
 * genéricos; tudo o que muda de um recurso para outro está aqui.
 */
import type { IconName } from '~/utils/icons'
import type { ListViewItem } from '~/utils/listView'
import type { ResourceKind } from '~~/lib/preferences'

export type { ResourceKind }

/** Registro cru como vem da API (cada recurso tem campos próprios). */
export type ResourceRecord = Record<string, unknown> & { id: number; name: string }

export interface ExplorerItem extends ListViewItem {
  id: number
  name: string
  icon: IconName
  createdAt: string | null
  tags: string[]
  thumb: string | null
  raw: ResourceRecord
}

/** O que "Abrir" (duplo clique / Enter) faz em cada recurso. */
export type DefaultVerb = 'edit' | 'view-image' | 'open-editor' | 'enter-room'

export interface ResourceDescriptor {
  kind: ResourceKind
  /** Nome da pasta (plural). */
  title: string
  singular: string
  article: 'o' | 'a'
  itemIcon: IconName
  endpoint: string
  /** Texto da barra lateral quando nada está selecionado. */
  description: string
  defaultVerb: DefaultVerb
  /** Rótulo do verbo padrão no menu de contexto. */
  defaultVerbLabel: string
  thumb: (raw: ResourceRecord) => string | null
  previewFields: (raw: ResourceRecord) => { label: string; value: string }[]
  form: {
    hasImage: boolean
    /** Cenários guardam o mapa na resolução original. */
    keepImageResolution?: boolean
    hasAttributes?: boolean
    /** Cena: escolher o cenário. */
    scenarioPicker?: boolean
    /** Sala: senha e "sala aberta". */
    roomFields?: boolean
    /** Criação por assistente em vez de formulário. */
    insertWith: 'form' | 'room-wizard'
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v : null)
const tagsOf = (raw: ResourceRecord) => (Array.isArray(raw.tags) ? (raw.tags as unknown[]).filter((t): t is string => typeof t === 'string') : [])
const dims = (raw: ResourceRecord) => (raw.width && raw.height ? `${raw.width} × ${raw.height} px` : '—')

export const RESOURCES: Record<ResourceKind, ResourceDescriptor> = {
  tokens: {
    kind: 'tokens',
    title: 'Tokens',
    singular: 'token',
    article: 'o',
    itemIcon: 'token',
    endpoint: '/api/v1/tokens',
    description: 'Personagens, criaturas e objetos que você coloca nas cenas.',
    defaultVerb: 'edit',
    defaultVerbLabel: '&Abrir',
    thumb: raw => str(raw.image),
    previewFields: raw => [
      { label: 'Tamanho', value: dims(raw) },
      { label: 'Atributos', value: String(Array.isArray(raw.attributes) ? raw.attributes.length : 0) },
    ],
    form: { hasImage: true, hasAttributes: true, insertWith: 'form' },
  },
  scenarios: {
    kind: 'scenarios',
    title: 'Cenários',
    singular: 'cenário',
    article: 'o',
    itemIcon: 'scenario',
    endpoint: '/api/v1/scenarios',
    description: 'Mapas e planos de fundo usados como base das cenas.',
    defaultVerb: 'view-image',
    defaultVerbLabel: '&Visualizar',
    thumb: raw => str(raw.image),
    previewFields: raw => [{ label: 'Tamanho', value: dims(raw) }],
    form: { hasImage: true, keepImageResolution: true, insertWith: 'form' },
  },
  scenes: {
    kind: 'scenes',
    title: 'Cenas',
    singular: 'cena',
    article: 'a',
    itemIcon: 'scene',
    endpoint: '/api/v1/scenes',
    description: 'Um cenário com tokens posicionados, pronto para jogar.',
    defaultVerb: 'open-editor',
    defaultVerbLabel: '&Abrir no editor',
    thumb: raw => str((raw.scenario as ResourceRecord | undefined)?.image),
    previewFields: raw => [
      { label: 'Cenário', value: (raw.scenario as ResourceRecord | undefined)?.name ?? '—' },
      { label: 'Tokens', value: String(Array.isArray(raw.tokens) ? raw.tokens.length : 0) },
    ],
    form: { hasImage: false, scenarioPicker: true, insertWith: 'form' },
  },
  rooms: {
    kind: 'rooms',
    title: 'Salas',
    singular: 'sala',
    article: 'a',
    itemIcon: 'room',
    endpoint: '/api/v1/rooms',
    description: 'Mesas de jogo ao vivo para compartilhar com seus jogadores.',
    defaultVerb: 'enter-room',
    defaultVerbLabel: '&Entrar na sala',
    thumb: raw => str(raw.image),
    previewFields: raw => [
      { label: 'Código', value: str(raw.code) ?? '—' },
      { label: 'Situação', value: raw.isOpen ? 'Aberta' : 'Fechada' },
      { label: 'Senha', value: raw.hasPassword ? 'Sim' : 'Não' },
      { label: 'Cena', value: (raw.sourceScene as ResourceRecord | null | undefined)?.name ?? '(excluída)' },
    ],
    form: { hasImage: false, roomFields: true, insertWith: 'room-wizard' },
  },
}

export function toExplorerItem(desc: ResourceDescriptor, raw: ResourceRecord): ExplorerItem {
  return {
    id: raw.id,
    name: raw.name,
    icon: desc.itemIcon,
    createdAt: str(raw.createdAt),
    tags: tagsOf(raw),
    thumb: desc.thumb(raw),
    raw,
  }
}

/** Chave do cache compartilhado: todas as janelas do mesmo recurso usam a mesma lista. */
export const resourceCacheKey = (kind: ResourceKind) => `resource:${kind}`

/** "o token" / "a cena" */
export const withArticle = (desc: ResourceDescriptor) => `${desc.article} ${desc.singular}`
