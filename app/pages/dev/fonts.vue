<script setup lang="ts">
/**
 * Página de comparação de fontes (somente em desenvolvimento).
 *
 * Renderiza cada fonte candidata em múltiplos inteiros do seu tamanho nativo,
 * dentro de controles reais do 98.css, e detecta quais caracteres do PT-BR
 * caem em fonte de fallback (= glifo ausente na fonte).
 */
import { CHICAGO95_ICONS, iconUrl } from '~/utils/icons'

if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Página não encontrada' })
}

definePageMeta({ layout: false })
useHead({ title: 'Comparação de fontes — VTT 98 SE' })

interface Candidate {
  id: string
  label: string
  family: string
  /** Tamanho (px) em que 1 pixel da grade da fonte = 1 pixel de tela. */
  nativePx: number
  multipliers: number[]
  license: string
  notes: string[]
}

const candidates: Candidate[] = [
  {
    id: 'pixel-operator',
    label: 'Pixel Operator',
    family: 'Cand Pixel Operator',
    nativePx: 16,
    multipliers: [1, 2],
    license: 'CC0 1.0 (domínio público)',
    notes: [
      'Todos os acentos do PT-BR alinhados à grade (0 coordenadas fora da grade).',
      'Tem negrito e variante monoespaçada. Faltam só ª e º.',
    ],
  },
  {
    id: 'pixel-operator-8',
    label: 'Pixel Operator 8',
    family: 'Cand Pixel Operator 8',
    nativePx: 8,
    multipliers: [2, 3],
    license: 'CC0 1.0 (domínio público)',
    notes: [
      'Mesma família, grade de 8px: em 16px fica com o aspecto "bloco" de uma fonte antiga ampliada 2×.',
      'Acentos alinhados à grade. Faltam só ª e º.',
    ],
  },
  {
    id: 'w95fa',
    label: 'W95FA',
    family: 'Cand W95FA',
    nativePx: 12.5,
    multipliers: [1, 2],
    license: 'SIL Open Font License 1.1',
    notes: [
      'Recriação do MS Sans Serif do Windows 95 — a mais parecida com o original.',
      'Atenção: as letras acentuadas foram desenhadas fora da grade de pixels (560 de 1432 coordenadas), então os acentos tendem a ficar borrados.',
      'Grade de 12,5px (nítida em 12,5px e 25px). Faltam ª, º, reticências e travessões.',
    ],
  },
  {
    id: 'munro',
    label: 'Munro (atual)',
    family: 'Munro',
    nativePx: 10.24,
    multipliers: [1, 2],
    license: 'SIL OFL',
    notes: ['Fonte atual da interface. Não tem NENHUMA letra acentuada — é a origem do problema.'],
  },
  {
    id: 'ms-sans-serif',
    label: 'Pixelated MS Sans Serif (98.css)',
    family: 'Pixelated MS Sans Serif',
    nativePx: 11,
    multipliers: [1, 2],
    license: 'Incluída no 98.css',
    notes: ['Fonte padrão do 98.css. Também não tem letras acentuadas.'],
  },
]

const PT_CHARS = 'ÁÀÂÃÉÊÍÓÔÕÚÜÇáàâãéêíóôõúüç'
const EXTRA_CHARS = 'ªº“”‘’…—–€'

const samples = [
  'Ação, coração, pão, avô, você — à é í ó ú â ê ô ã õ ç',
  'ÁÉÍÓÚ ÂÊÔ ÃÕ À Ç Ü ü “aspas” ‘simples’ … ª º R$ 1.234,56',
  'O rápido cão marrom pulou sobre a raposa preguiçosa.',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789',
]

const missing = ref<Record<string, string[]>>({})
const smoothingOff = ref(true)
const bg = ref<'surface' | 'window' | 'desktop'>('surface')

/**
 * Um glifo está ausente se a largura medida muda conforme a fonte de fallback
 * (monospace vs serif): se a candidata tivesse o glifo, o fallback não seria usado.
 */
function detectMissing(family: string, size: number): string[] {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return []
  const width = (ch: string, fallback: string) => {
    ctx.font = `${size * 4}px "${family}", ${fallback}`
    return ctx.measureText(ch).width
  }
  return [...PT_CHARS + EXTRA_CHARS].filter(ch => width(ch, 'monospace') !== width(ch, 'serif'))
}

onMounted(async () => {
  await Promise.all(candidates.map(c => document.fonts.load(`${c.nativePx}px "${c.family}"`).catch(() => [])))
  await document.fonts.ready
  missing.value = Object.fromEntries(candidates.map(c => [c.id, detectMissing(c.family, c.nativePx)]))
})

const sizeLabel = (c: Candidate, m: number) => `${m}× = ${+(c.nativePx * m).toFixed(2)}px`
</script>

<template>
  <div class="page" :class="[`bg-${bg}`, { 'no-smoothing': smoothingOff }]">
    <div class="window intro">
      <div class="title-bar">
        <div class="title-bar-text">Comparação de fontes — somente desenvolvimento</div>
      </div>
      <div class="window-body">
        <p>
          Cada fonte aparece em múltiplos <strong>inteiros</strong> do seu tamanho nativo — só assim fontes pixel
          ficam nítidas. Os caracteres em <span class="miss-sample">vermelho</span> não existem na fonte e seriam
          desenhados com outra fonte (fallback).
        </p>
        <fieldset>
          <legend>Opções de visualização</legend>
          <div class="field-row">
            <input id="smooth" v-model="smoothingOff" type="checkbox">
            <label for="smooth">Desligar suavização de fonte (como no Win98)</label>
          </div>
          <div class="field-row">
            <span>Fundo:</span>
            <input id="bg-surface" v-model="bg" type="radio" value="surface">
            <label for="bg-surface">Cinza</label>
            <input id="bg-window" v-model="bg" type="radio" value="window">
            <label for="bg-window">Branco</label>
            <input id="bg-desktop" v-model="bg" type="radio" value="desktop">
            <label for="bg-desktop">Área de trabalho</label>
          </div>
        </fieldset>
      </div>
    </div>

    <section v-for="c in candidates" :key="c.id" class="window candidate">
      <div class="title-bar">
        <div class="title-bar-text">{{ c.label }} — {{ c.license }}</div>
      </div>
      <div class="window-body">
        <ul class="notes">
          <li v-for="n in c.notes" :key="n">{{ n }}</li>
        </ul>
        <p class="detect">
          Caracteres ausentes detectados:
          <template v-if="!missing[c.id]">verificando…</template>
          <template v-else-if="missing[c.id]!.length === 0">nenhum</template>
          <span v-else class="miss-sample">{{ missing[c.id]!.join(' ') }}</span>
        </p>

        <div v-for="m in c.multipliers" :key="m" class="scale-block" :style="{ fontFamily: `'${c.family}', monospace`, fontSize: `${c.nativePx * m}px` }">
          <h4 class="scale-label">{{ sizeLabel(c, m) }}</h4>

          <p v-for="s in samples" :key="s" class="sample">
            <template v-for="(ch, i) in [...s]" :key="i">
              <span v-if="missing[c.id]?.includes(ch)" class="miss">{{ ch }}</span>
              <template v-else>{{ ch }}</template>
            </template>
          </p>

          <!-- Mini janela com controles reais, herdando a fonte/tamanho do bloco -->
          <div class="window mock" :style="{ fontFamily: 'inherit', fontSize: 'inherit' }">
            <div class="title-bar">
              <div class="title-bar-text mock-inherit">
                <img :src="iconUrl('folder', 16)" alt="" width="16" height="16"> Cenários — Configurações
              </div>
              <div class="title-bar-controls">
                <button aria-label="Minimize" />
                <button aria-label="Maximize" />
                <button aria-label="Close" />
              </div>
            </div>
            <div class="mock-menubar mock-inherit">
              <span><u>A</u>rquivo</span><span><u>E</u>ditar</span><span>E<u>x</u>ibir</span><span>Aj<u>u</u>da</span>
            </div>
            <div class="window-body mock-inherit">
              <div class="field-row">
                <label :for="`busca-${c.id}-${m}`" class="mock-inherit">Procurar:</label>
                <input :id="`busca-${c.id}-${m}`" class="mock-inherit" type="text" value="Ação na taverna">
                <button class="mock-inherit">Configurações…</button>
              </div>
              <table class="mock-table mock-inherit">
                <thead>
                  <tr><th>Nome</th><th>Data de criação</th><th>Tags</th></tr>
                </thead>
                <tbody>
                  <tr class="sel"><td>Dragão Vermelho</td><td>05/11/2026 10:42</td><td>vilão, chefão</td></tr>
                  <tr><td>Taverna do Javali</td><td>03/11/2026 21:15</td><td>cidade, início</td></tr>
                  <tr><td>Calabouço Úmido</td><td>28/10/2026 19:03</td><td>masmorra</td></tr>
                </tbody>
              </table>
              <div class="status-bar mock-inherit">
                <p class="status-bar-field">3 objeto(s)</p>
                <p class="status-bar-field">Usuário: João Conceição</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="window candidate">
      <div class="title-bar">
        <div class="title-bar-text">Ícones Chicago95 copiados para o projeto (16 / 32 / 48 px)</div>
      </div>
      <div class="window-body icon-grid">
        <figure v-for="name in CHICAGO95_ICONS" :key="name">
          <div class="icon-row">
            <img :src="iconUrl(name, 16)" alt="" width="16" height="16">
            <img :src="iconUrl(name, 32)" alt="" width="32" height="32">
            <img :src="iconUrl(name, 48)" alt="" width="48" height="48">
          </div>
          <figcaption>{{ name }}</figcaption>
        </figure>
      </div>
    </section>
  </div>
</template>

<style>
@font-face {
  font-family: "Cand Pixel Operator";
  src: url("/fonts/candidates/pixel-operator/PixelOperator.ttf") format("truetype");
  font-weight: 400;
}
@font-face {
  font-family: "Cand Pixel Operator";
  src: url("/fonts/candidates/pixel-operator/PixelOperator-Bold.ttf") format("truetype");
  font-weight: 700;
}
@font-face {
  font-family: "Cand Pixel Operator 8";
  src: url("/fonts/candidates/pixel-operator/PixelOperator8.ttf") format("truetype");
  font-weight: 400;
}
@font-face {
  font-family: "Cand Pixel Operator 8";
  src: url("/fonts/candidates/pixel-operator/PixelOperator8-Bold.ttf") format("truetype");
  font-weight: 700;
}
@font-face {
  font-family: "Cand W95FA";
  src: url("/fonts/candidates/w95fa/w95fa.woff2") format("woff2");
  font-weight: 400;
}
</style>

<style scoped>
.page {
  min-height: 100vh;
  padding: var(--sp-5);
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  font-family: Arial, sans-serif;
}
.bg-surface { background: var(--c-surface); }
.bg-window { background: var(--c-window); }
.bg-desktop { background: var(--c-desktop); }
.no-smoothing, .no-smoothing * {
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: unset;
  font-smooth: never;
}
.intro p, .notes, .detect { font-family: Arial, sans-serif; font-size: 13px; }
.notes { margin: 0 0 var(--sp-3); padding-left: 20px; }
.miss-sample, .miss { color: #d00000; background: #ffe0e0; }
.scale-block {
  border-top: 1px solid var(--c-shadow);
  padding: var(--sp-3) 0 var(--sp-5);
  line-height: var(--lh);
  color: var(--c-text);
}
.scale-label {
  margin: 0 0 var(--sp-2);
  font: bold 12px Arial, sans-serif;
  color: var(--c-selection);
}
.sample { margin: 0 0 var(--sp-2); }
.mock { max-width: 760px; margin-top: var(--sp-3); }
/* 98.css fixa fonte/tamanho nos controles; aqui forçamos herdar do bloco de teste */
.mock-inherit, .mock-inherit *, .mock .title-bar, .mock .title-bar-text, .mock button, .mock input, .mock label, .mock table {
  font-family: inherit !important;
  font-size: inherit !important;
}
.mock .title-bar-text { display: flex; align-items: center; gap: var(--sp-2); }
.mock .title-bar { font-size: inherit; }
.mock-menubar { display: flex; gap: var(--sp-4); padding: var(--sp-1) var(--sp-3); }
.mock .field-row { gap: var(--sp-3); }
.mock-table {
  width: 100%;
  margin: var(--sp-3) 0;
  border-collapse: collapse;
  background: var(--c-window);
  box-shadow: var(--bevel-sunken);
}
.mock-table th {
  text-align: left;
  font-weight: normal;
  padding: var(--sp-1) var(--sp-3);
  background: var(--c-surface);
  box-shadow: var(--bevel-thin-raised);
}
.mock-table td { padding: var(--sp-1) var(--sp-3); }
.mock-table tr.sel td { background: var(--c-selection); color: var(--c-selection-text); }
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: var(--sp-3);
}
.icon-grid figure { margin: 0; text-align: center; }
.icon-row { display: flex; align-items: flex-end; justify-content: center; gap: var(--sp-2); }
.icon-grid figcaption { font-size: 12px; margin-top: var(--sp-1); }
</style>
