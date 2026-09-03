<script setup lang="ts">
definePageMeta({
  layout: 'website'
})
const { data: posts } = await useAsyncData('blog-list', () =>
    queryCollection('blog').order('date', 'DESC').all()
)
</script>
<template>
  <section>
    <header>
      <h2>Blog</h2>
      <p>Notas de atualização e bastidores do desenvolvimento do vtt 98 se.</p>
    </header>
    <section class="posts-list">
      <article v-for="post in posts" :key="post.path" class="post-item">
        <header>
          <h3>
            <NuxtLink :to="post.path">{{post.title}}</NuxtLink>
          </h3>
          <small class="post-date">Publicado em: {{post.date}}</small>
          <p>{{post.description}}</p>
        </header>
      </article>
    </section>
  </section>
</template>