<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <LoadingWindow v-if="isLoadingWindowActive" :message="loadingWindowMessage" :image="loadingWindowImage" />
</template>
<script setup lang="ts">
import LoadingWindow from '~/components/LoadingWindow.vue'
import { useLoadingWindow } from '~~/composables/useLoadingWindow'

const { isActive: isLoadingWindowActive, message: loadingWindowMessage, image: loadingWindowImage } = useLoadingWindow()
</script>
<style lang="css">
body {
  margin: 0;
  padding: 0;
}
</style>