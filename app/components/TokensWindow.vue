<script setup lang="ts">
import FixedWindow from "@/components/FixedWIndow.vue";
import InsertTokenWindow from "~/components/InsertTokenWindow.vue";
import EditTokenWindow from "~/components/EditTokenWindow.vue";

defineProps(['addTokenToScene'])

const tags = computed(() => {
  if (!tokens.value) return []

  const uniqueTags = new Set<string>()

  tokens.value.forEach(token => {
    if (token.tags && Array.isArray(token.tags)) {
      token.tags.forEach((tag: string) => {
        if (tag) uniqueTags.add(tag.trim())
      })
    }
  })

  return Array.from(uniqueTags).sort()
})

const selectedTag = ref<string | null>(null)

const selectedToken = ref<Token | null>(null)

const selectToken = (token: Token) => {
  if (selectedToken.value?.id === token.id) {
    selectedToken.value = null
    return;
  }
  selectedToken.value = token
}

const toggleTagFilter = (tag: string) => {
  if (selectedTag.value === tag) {
    selectedTag.value = null
  } else {
    selectedTag.value = tag
  }
}

const filteredTokens = computed(() => {
  if (!tokens.value) return []

  if (!selectedTag.value) return tokens.value

  return tokens.value.filter(token => {
    return token.tags && Array.isArray(token.tags) && token.tags.includes(selectedTag.value)
  })
})

const { data: tokens, refresh: refreshTokens } = await useFetch('/api/v1/tokens', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})

const isInsertWindowOpen = ref(false)
const isEditWindowOpen = ref(false)
const isDeleteAlert = ref(false)
const isDuplicateAlert = ref(false)

const openInsertWindow = () => {
  isInsertWindowOpen.value = true
}

const openEditWindow = () => {
  isEditWindowOpen.value = true
}

const openDeleteAlert = () => {
  isDeleteAlert.value = true
}

const openDuplicateAlert = () => {
  isDuplicateAlert.value = true
}

const deleteToken = async () => {
  if (!selectedToken.value) return
  await $fetch(`/api/v1/tokens/${selectedToken.value.id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  isDeleteAlert.value = false
  await refreshTokens()
}

const duplicateToken = async () => {
  if (!selectedToken.value) return;

  try {
    // 1. Cria uma cópia totalmente limpa, sem os "Proxies" de reatividade do Vue
    const payload = JSON.parse(JSON.stringify(selectedToken.value));

    // 2. Remove o ID para a API entender que é um novo registro
    delete payload.id;

    // Opcional: Se seu banco tiver campos de data automática, remova-os também
    // delete payload.createdAt;
    // delete payload.updatedAt;

    // Coloquei este console para você garantir que o objeto não está vazio:
    console.log("Enviando payload para duplicação:", payload);

    // 3. Removemos o .raw (já que estamos usando try/catch, se der sucesso, ele passa direto)
    await $fetch(`/api/v1/tokens`, {
      method: 'POST',
      body: payload
      // Não é necessário passar 'Content-Type', o $fetch faz isso automaticamente para objetos.
    });

    // Se chegou até aqui, a requisição deu 200/201 (Sucesso)
    closeTokenWindow();

  } catch (error) {
    console.error('Erro ao duplicar o token:', error);
  }
}

const closeDeleteAlert = () => {
  isDeleteAlert.value = false
}

const closeTokenWindow = async () => {
  isInsertWindowOpen.value = false
  isEditWindowOpen.value = false
  isDuplicateAlert.value = false
  await refreshTokens()
}

</script>
<template>
  <fixed-window
      title="Adicionar Token"
      icon="tokens"
      @close-window="isInsertWindowOpen = false"
      v-if="isInsertWindowOpen"
      style="z-index: 1000;"
  >
    <insert-token-window
        :tags="tags"
        @close-window="closeTokenWindow"
    />
  </fixed-window>
  <fixed-window
      title="Editar Token"
      icon="tokens"
      @close-window="isEditWindowOpen = false"
      v-if="isEditWindowOpen"
      style="z-index: 1000;"
  >
    <edit-token-window
        :token="selectedToken"
        @close-window="closeTokenWindow"
    />
  </fixed-window>
  <AlertWindow
      v-if="isDeleteAlert"
      title="Apagar Token"
      icon="warning"
      @alert-button-OK="deleteToken"
      :cancelAction="closeDeleteAlert"
  >
    <p>Tem certeza que deseja apagar o token <strong>{{ selectedToken?.name }}</strong>?</p>
  </AlertWindow>
  <AlertWindow
      v-if="isDuplicateAlert"
      title="Duplicar Token"
      icon="warning"
      @alert-button-OK="duplicateToken"
      :cancelAction="closeTokenWindow"
  >
    <p>Tem certeza que deseja duplicar o token <strong>{{ selectedToken?.name }}</strong>?</p>
  </AlertWindow>
  <div class="window-content-container">
    <aside>
      <div class="section-header">
        <span>Tags</span>
      </div>
      <div class="content">
        <ul class="tag-list">
          <li v-if="selectedTag" @click="selectedTag = null">Todos</li>
          <li
              v-for="(tag, idx) in tags"
              :key="idx"
              @click="toggleTagFilter(tag)"
              :class="{ 'tag-active': selectedTag === tag }"
          >
            {{ tag }}
          </li>
        </ul>
      </div>
    </aside>
    <section>
      <div class="section-header">
        <span>Tokens</span>
      </div>
      <div class="content">
        <div v-if="tokens" class="scenes-grid">
          <div
              v-for="token in filteredTokens"
              :key="token.id" class="scene-item"
              @click="selectToken(token)"
              :class="{ 'token-selected': selectedToken?.id === token.id }"
          >
            <img :src="token.image" :alt="token.name" />
            <span>{{ token.name }}</span>
          </div>
        </div>
      </div>
    </section>
    <aside class="window-sidebar">
      <button :disabled="!selectedToken" @click="openEditWindow()">Editar</button>
      <button :disabled="!selectedToken" @click="openDeleteAlert()">Apagar</button>
      <button :disabled="!selectedToken" @click="openDuplicateAlert()">Duplicar</button>
      <button @click="$emit('close-window')">Fechar</button>
      <button>Buscar</button>
      <button>Ajuda</button>
      <button @click="openInsertWindow()">Novo...</button>
      <button
          v-if="addTokenToScene"
          @click="$emit('addTokenToScene', selectedToken)"
      >Adicionar na cena</button>
    </aside>
  </div>
</template>
<style lang="css" scoped>
.window-content-container {
  width: 90vw;
  display: grid;
  grid-template-columns: 1fr 6fr 1fr;
  gap: 0.25rem;

  .section-header {
    background-color: black;
    color: white;
    padding: 0.25rem;
    border-radius: 0.25rem 0.25rem 0 0;
  }

  .content {
    background-color: white;
    color: black;
    padding: 0.25rem;
    border: 2px solid;
    border-color: #333333 lightgray lightgray #333333;
    min-height: 54vh;
    max-height: 60vh;
    overflow-y: auto;
    .scenes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 0.25rem;
    }

    .scene-item {
      width: 150px;
      display: flex;
      padding: 0.25rem;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      gap: 0.25rem;
      cursor: pointer;
      &:hover, &.token-selected {
        background-color: darkblue;
        color: white;
      }
      img {
        max-width: 100%;
        max-height: 200px;
      }
    }

    .tag-list {
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin: 0;

      li {
        padding: 0.25rem;
        border: 1px solid;
        border-radius: 0.25rem;
        cursor: pointer;
        background-color: #eee;

        &:hover, &.tag-active {
          background-color: darkblue;
          color: white;
        }
      }
    }
  }
}

.window-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

@media screen and (min-width: 768px) {
  .window-content-container {
    width: 60vw;
    min-height: 50vh;
  }
}
</style>