<template>
    <section>
        <h1>VTT Prototype 98 SE</h1>
        <p>A fatal exception {{ error.status }} ({{ error.statusText }}) has occured while trying to reach a resource. The current request will be terminated.</p>
        <p>* Press ALT + Left Arrow to go to the previous page.</p>
        <p>* Press CTRL + W to close this window. You will lose any unsaved information in your current application</p>

        <p>Details:</p>
        <p v-if="error.data">Data: {{ error.data }}</p>
        <p v-if="error.cause">Cause: {{ error.cause }}</p>
    </section>
</template>
<script setup lang="ts">
import type { NuxtError } from '#app';

defineProps<{error: NuxtError}>()
</script>
<style lang="css" scoped>
section {
    font-family: 'Courier New', Courier, monospace;
    background-color: navy;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
}
h1 {
    text-align: center;
    background-color: gray;
    color: navy;
    font-size: 2rem;
    display: inline-block;
    padding: 0 1rem;
}
p {
    color: white;
    font-size: 1.5rem;
    width: 90vw;
}
@media screen and (min-width: 960px) {
    p {
        width: 60rem;
    }
}
</style>