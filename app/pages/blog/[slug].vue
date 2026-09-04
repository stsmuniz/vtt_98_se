<script setup lang="ts">
const route = useRoute()

definePageMeta({
  layout: 'website'
})

const { data: post } = await useAsyncData(`blog-${route.path}`, () =>
  queryCollection('blog').path(route.path).first()
)

useSeoMeta({
  title: post.value?.title,
  description: post.value?.description
})
</script>
<template>
  <article v-if="post" class="page-content post-page">
    <nav class="actions-nav" aria-label="Navegação de retorno">
      <NuxtLink to="/blog" class="back-link">&larr; Voltar para a lista de publicações</NuxtLink>
    </nav>
    <header class="post-header">
      <h2>{{ post.title }}</h2>
      <time class="post-date" :datetime="post.date">Data: {{ post.date }}</time>
    </header>
    <hr class="post-divider" />
    <div class="markdown-body">
      <ContentRenderer :value="post" />
    </div>
    <footer class="post-footer">
      <NuxtLink to="/blog" class="back-link">&larr; Voltar para a lista de publicações</NuxtLink>
    </footer>
  </article>
  <article v-else class="page-content not-found-page">
    <header class="page-header">
      <h2>Artigo não encontrado</h2>
    </header>
    <p>O artigo que você está procurando não foi encontrado ou não está mais disponível.</p>
    <div class="actions">
      <NuxtLink to="/blog" class="back-link">&larr; Voltar para a lista de publicações</NuxtLink>
    </div>
  </article>
</template>
<style lang="css" scoped>
.actions-nav,
.post-footer {
  margin: 1rem 0;
}

.back-link {
  color: #0000ee;
  text-decoration: underline;
  font-size: 0.95rem;
}

.post-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.post-header h2 {
  margin-bottom: 0.5rem;
}

.post-date {
  display: block;
  font-size: 0.95rem;
  color: #555555;
}

.post-divider {
  border: 0;
  border-top: 1px solid #808080;
  margin: 1.5rem 0;
}

.markdown-body {
  line-height: 1.7;
  overflow-wrap: break-word;
  word-break: break-word;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  color: #000080;
  margin-top: 1.75rem;
  margin-bottom: 0.75rem;
  text-align: left;
}

.markdown-body :deep(p) {
  margin-top: 0.5rem;
  margin-bottom: 1.25rem;
}

.markdown-body :deep(blockquote) {
  border-left: 4px solid #808080;
  background-color: #f0f0f0;
  padding: 0.75rem 1rem;
  margin: 1.25rem 0;
  font-style: italic;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1.5rem 0;
  display: block;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #808080;
  padding: 0.6rem 0.8rem;
}

.markdown-body :deep(th) {
  background-color: #000080;
  color: #ffffff;
}

.markdown-body :deep(code) {
  background-color: #f0f0f0;
  border: 1px solid #dfdfdf;
  padding: 0.15rem 0.35rem;
  font-family: monospace;
  font-size: 0.9em;
}

.markdown-body :deep(pre) {
  background-color: #f8f8f8;
  border: 1px solid #808080;
  padding: 1rem;
  overflow-x: auto;
  margin: 1.25rem 0;
}

.markdown-body :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1rem auto;
}

.not-found-page {
  text-align: center;
}
</style>