import { ref } from 'vue'

export function useTagManager(initialTags: string[] = []) {
    const tags = ref<string[]>([...initialTags])
    const tagToInsert = ref('')

    function addTag() {
        if (!tagToInsert.value) return
        tags.value.push(tagToInsert.value)
        tagToInsert.value = ''
    }

    function removeTag(tag: string) {
        tags.value = tags.value.filter(t => t !== tag)
    }

    function setTags(newTags?: string[] | null) {
        tags.value = newTags ? [...newTags] : []
    }

    return { tags, tagToInsert, addTag, removeTag, setTags }
}
