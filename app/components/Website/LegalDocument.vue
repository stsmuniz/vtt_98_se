<script setup lang="ts">
/**
 * Moldura comum dos documentos legais (Política de Privacidade, Termos de Uso):
 * título, versão/data de vigência, sumário e conteúdo em seções.
 */
defineProps<{
  title: string
  version: string
  effectiveDate: string
  /** Seções para o sumário: id da âncora + título. */
  toc: { id: string; title: string }[]
}>()
</script>

<template>
  <article class="page-content legal-document">
    <header class="page-header">
      <h1>{{ title }}</h1>
      <p class="legal-meta">Versão {{ version }} · Vigente desde {{ effectiveDate }}</p>
    </header>

    <nav class="legal-toc" aria-label="Sumário">
      <h2>Sumário</h2>
      <ol>
        <li v-for="item in toc" :key="item.id">
          <a :href="`#${item.id}`">{{ item.title }}</a>
        </li>
      </ol>
    </nav>

    <slot />
  </article>
</template>

<style scoped>
.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.legal-meta {
  margin: 0.5rem 0 0;
  color: #555555;
}

.legal-toc {
  margin: 0 0 2rem;
  padding: 1rem 1.25rem;
  border: 1px solid #808080;
  background-color: #f2f2f2;
}

.legal-toc h2 {
  margin-top: 0;
}

.legal-toc ol {
  margin: 0;
  padding-left: 1.5rem;
  columns: 2 260px;
}

.legal-toc li {
  margin: 0.2rem 0;
  break-inside: avoid;
}

.legal-document :deep(section) {
  margin-bottom: 2rem;
  scroll-margin-top: 1rem;
}

.legal-document :deep(li) {
  margin: 0.35rem 0;
}

.legal-document :deep(.legal-summary) {
  padding: 1rem 1.25rem;
  border: 2px solid #000080;
  background-color: #ffffe1;
}

.legal-document :deep(.legal-summary ul) {
  margin-bottom: 0;
}

.legal-document :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.legal-document :deep(th),
.legal-document :deep(td) {
  padding: 0.5rem 0.75rem;
  text-align: left;
  vertical-align: top;
  border: 1px solid #808080;
}

.legal-document :deep(thead th) {
  background-color: #000080;
  color: #ffffff;
}

.legal-document :deep(.table-responsive) {
  width: 100%;
  overflow-x: auto;
}
</style>
