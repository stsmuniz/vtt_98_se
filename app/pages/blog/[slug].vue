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
  <article v-if="post" class="post-page">
    <div class="actions">
      <NuxtLink to="/blog">Voltar para a lista de publicações</NuxtLink>
    </div>
    <header class="post-header">
      <h2>{{post.title}}</h2>
      <span class="post-date">Data: {{post.date}}</span>
    </header>
    <hr />
    <main class="markdown-body">
      <ContentRenderer :value="post" />
    </main>
  </article>
  <div v-else>
    <p>Artigo não encontrado.</p>
    <NuxtLink to="/blog">Voltar para a lista de publicações</NuxtLink>
  </div>
</template>
<style lang="css" scoped>
/* Estilização retrô para os elementos renderizados do Markdown */
.markdown-body h1,
.markdown-body h2,
.markdown-body h3 {
  color: #000080; /* Azul clássico de títulos ou a cor de destaque do seu tema */
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.markdown-body blockquote {
  border-left: 3px solid #808080;
  background-color: #e0e0e0;
  padding: 8px 12px;
  margin: 10px 0;
  font-style: italic;
}

.markdown-body table {
  border: 2px inset #ffffff;
  border-collapse: collapse;
  width: 100%;
}

.markdown-body th,
.markdown-body td {
  border: 1px solid #808080;
  padding: 6px;
}
</style>