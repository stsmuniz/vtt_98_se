import { computed, ref, type Ref } from 'vue'

type Taggable = { tags?: string[] | null }

export function useTagFilter<T extends Taggable>(items: Ref<T[] | null | undefined>) {
    const tags = computed(() => {
        if (!items.value) return []

        const uniqueTags = new Set<string>()
        items.value.forEach(item => {
            if (item.tags && Array.isArray(item.tags)) {
                item.tags.forEach(tag => {
                    if (tag) uniqueTags.add(tag.trim())
                })
            }
        })

        return Array.from(uniqueTags).sort()
    })

    const selectedTag = ref<string | null>(null)

    function toggleTagFilter(tag: string) {
        selectedTag.value = selectedTag.value === tag ? null : tag
    }

    const filteredItems = computed(() => {
        if (!items.value) return []
        if (!selectedTag.value) return items.value

        return items.value.filter(item => Array.isArray(item.tags) && item.tags.includes(selectedTag.value as string))
    })

    return { tags, selectedTag, toggleTagFilter, filteredItems }
}
