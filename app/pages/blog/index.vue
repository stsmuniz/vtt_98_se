<script setup lang="ts">
definePageMeta({
  layout: 'website'
})

const { data: posts } = await useAsyncData('blog-list', () =>
  queryCollection('blog').order('date', 'DESC').all()
)
</script>
<template>
  <article class="page-content blog-page">
    <header class="page-header">
      <h2>Blog</h2>
      <p class="subtitle">Notas de atualização e bastidores do desenvolvimento do VTT 98 SE.</p>
    </header>

    <section class="posts-list" aria-label="Lista de publicações">
      <article v-for="post in posts" :key="post.path" class="post-item">
        <header class="post-item-header">
          <h3>
            <NuxtLink :to="post.path">{{ post.title }}</NuxtLink>
          </h3>
          <time class="post-date" :datetime="post.date">Publicado em: {{ post.date }}</time>
        </header>
        <p class="post-description">{{ post.description }}</p>
      </article>
    </section>
  </article>
</template>
<style lang="css" scoped>
.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.subtitle {
  text-align: center;
  font-style: italic;
  margin-top: 0.25rem;
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.post-item {
  border-bottom: 1px dotted #808080;
  padding-bottom: 1.25rem;
}

.post-item:last-child {
  border-bottom: none;
}

.post-item-header h3 {
  text-align: left;
  margin-top: 0;
  margin-bottom: 0.25rem;
}

.post-item-header h3 a {
  color: #000080;
  text-decoration: underline;
}

.post-item-header h3 a:hover {
  color: #0000ee;
}

.post-date {
  display: block;
  font-size: 0.9rem;
  color: #555555;
  margin-bottom: 0.5rem;
}

.post-description {
  margin: 0;
}
</style>